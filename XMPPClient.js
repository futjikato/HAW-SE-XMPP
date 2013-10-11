var util = require('util');
var events = require('events');
var net = require('net');
var sax = require('sax');
var json2xml = require('json2xml');
var sasl = require('./sasl/sasl');
var starttls = require('starttls');

var XMPPState = require('./XMPPState');

/**
 * A set of default options which is merged with the options passed
 * into the constructor.
 */
var defaultOpts = {
	// Default XMPP port.
	port: 5222
};

/**
 * Initializes a new instance of the XMPPClient class.
 * 
 * @param opts
 * 
 * @this
 *  Reference to the new object being constructed.
 */
function XMPPClient(opts) {
	// jsnode events boilerplate.
	events.EventEmitter.call(this);
	
	/**
	 * The SASL mechanism to use during authentication.
	 */
	this.saslMechanism = null;
	
	/**
	 * The instance of the SASL mechanism plugin used for authentication.
	 */
	this._saslInstance = null;

	/**
	 * The set of options passed into the constructor.
	 */
	this._opts = require('extend')(defaultOpts, opts);	
	
	/**
	 * The state the XMPPClient is currently in.
	 */
	this._state = null;
	
	/**
	 * True if TLS encryption has been negotiated via STARTTLS.
	 */
	this._tlsEnabled = false;
	
	/**
	 * A set of server options populated during stream-negotiation.
	 */
	this._serverOpts = {
		/**
		 * A list of SASL mechanisms supported by the server.
		 */
		saslMechanisms: [],
		
		/**
		 * True if the server supports TLS via STARTTLS.
		 */
		startTls: false,
		
		/**
		 * True if STARTTLS is mandatory before authentication can be
		 * performed.
		 */
		startTlsMandatory: false
	};
	
	if(opts.autoConnect === true)
		this._init();
}

/**
 * Inherit from EventEmitter.
 */
util.inherits(XMPPClient, events.EventEmitter);
var proto = XMPPClient.prototype;

/**
 * Sets up a new instance as part of object construction.
 *
 * @param opts
 *  Object containing contructing options.
 * @this
 *  Reference to XMPPClient object being constructed.
 * @returns
 *  Nothing.
 */
proto._init = function() {
	console.log('Connecting to ' + this._opts.host + ' on port ' +
			this._opts.port);
	this._state = XMPPState.connecting;
	
	var sock = net.connect(this._opts);
	var stream = sax.createStream(true);
	// Setup SAX event handlers.
	var that = this;
	stream.on('opentag', function(node) {
		that._saxOnOpentag.call(that, node);
	});
	stream.on('closetag', function(node) {
		that._saxOnClosetag.call(that, node);
	});
	stream.on('text', function(text) {
		that._saxOnText.call(that, text);
	});
//	sock.pipe(stream).pipe(process.stdout);
	sock.pipe(stream);	
	this._sock = sock;
	this._saxStream = stream;
	sock.once('connect',
		function() {
			that.emit('connect');
			that._negotiateStream.call(that, true);
		}
	);	
};

/**
 * Callback invoked when an opening XML tag has been parsed.
 * 
 * @param node
 *  An object describing the encountered tag and its attributes.
 * @this
 *  Reference to the XMPPClient object.
 * @returns
 *  Nothing.
 */
proto._saxOnOpentag = function(node) {
	// Keep track of nested tags.
	if(this._tags === undefined)
		this._tags = [];
	if(this._openTag !== undefined)
		this._tags.push(this._openTag);
	this._openTag = node.name;
	
	if(this._pendingError === true)
		this._errorId = node.name;
	
	// The next opening tag should be a stream-level error.
	if(node.name.match(/stream:error/i) !== null)
		this._pendingError = true;
	else
		this._pendingError = false;
	
	var tag = this._openTag.toLowerCase();
	
	// FIXME: Refactor into dispatch methods?
	if(this._state == XMPPState.negotiatingStream) {
		switch(tag) {
		case 'starttls':
			this._serverOpts.startTls = true;
			break;
		}
	}
	else if(this._state == XMPPState.negotiatingTls) {
		switch(tag) {
		case 'proceed':
			this._continueTls();
			break;
		// Fixme: Handle failure.
		}
	}
	else if(this._state == XMPPState.authenticating) {
		switch(tag) {
		case 'failure':
			console.log('SASL authentication failed.');
			break;
			
		case 'success':
//			this._completeAuthentication();
			break;
		}
	}
};

/**
 * Callback invoked when a closing XML tag has been parsed.
 * 
 * @param node
 *  The name of the closing tag.
 * @this
 *  Reference to the XMPPClient object.
 * @returns
 *  Nothing.
 */
proto._saxOnClosetag = function(node) {
	var tag = node.toLowerCase();
	this._openTag = this._tags.pop();
		
	if(node.match(/stream:stream/i) !== null) {
		this.emit('closed',
			require('./XMPPErrorConditions')
			[this._errorId]
		);
	}
	
	if(this._state == XMPPState.negotiatingStream) {
		switch(tag) {
		// Server has sent features. Continue with TLS or SASL negotiation.
		case 'stream:features':
			if(this._serverOpts.startTls === true) {
				if(this._tlsEnabled === true)
					this._startAuthentication();			
				else
					this._startTls();
			}
			else {
				// If server does not support STARTTLS, go on with
				// SASL authentication.
				this._startAuthentication();
			}
			break;
		}
	}
};

/**
 * Callback invoked when a text node has been parsed.
 * 
 * @param text
 *  The text of the parsed node.
 */
proto._saxOnText = function(text) {
	var tag = this._openTag.toLowerCase();
	if(this._state == XMPPState.negotiatingStream) {
		switch(tag) {
		// Parse SASL mechanism advertised by server.
		case 'mechanism':
			if(this._serverOpts.saslMechanisms.indexOf(text) < 0)
				this._serverOpts.saslMechanisms.push(text);
			break;
		}		
	}
	else if(this._state == XMPPState.authenticating) {
		switch(tag) {
		case 'challenge':
			this._continueAuthentication(text);
			break;
		case 'success':
			this._completeAuthentication(text);
			break;
		}
	}
};

/**
 * Attempts to negotiate the initial XML stream with the server.
 * 
 * @param xmlHeader
 *  Set to true to send XML header.
 */
proto._negotiateStream = function(xmlHeader) {
	this._state = XMPPState.negotiatingStream;
	
	this._write({
		'stream:stream': '',
		attr: {
			'to': this._opts.host,
			'from': this._opts.jid,
			'xmlns': 'jabber:client',
			'xmlns:stream': 'http://etherx.jabber.org/streams',
			'version': '1.0'
		}
	}, { header: xmlHeader, dontClose: true });	
};

/**
 * Initiates TLS negotiation via the STARTTLS extension.
 */
proto._startTls = function() {
	this._state = XMPPState.negotiatingTls;
	this._write({
		'starttls': '',
		attr: {
			'xmlns': 'urn:ietf:params:xml:ns:xmpp-tls'
		}
	});
};

/**
 * Continues the TLS negotiation with the server.
 */
proto._continueTls = function() {
	this._sock.unpipe(this._saxStream);
	var that = this;
	starttls(this._sock, function() {
		that._sock = this.cleartext;
		that._sock.pipe(that._saxStream);
		that._tlsEnabled = true;
		that.emit('tlsenabled');
		// Need to start over with stream negotiation.
		that._negotiateStream(false);
	});	
};

/**
 * Initiates the SASL authentication exchange.
 * 
 * @this
 *  Reference to the XMPPClient instance.
 */
proto._startAuthentication = function() {
	this._state = XMPPState.authenticating;
	// Pick the best mechanism available.
	this.saslMechanism = this._selectSaslMechanism();
	// Create an instance of the selected mechanism.
	this._saslInstance = sasl.create(this.saslMechanism);
	// Add jid and password to mechanism's properties.
	this._saslInstance.add('username', this._opts.jid);
	this._saslInstance.add('password', this._opts.password);
	// If mechanism requires client initiation, send it along.
	var initial = this._saslInstance.hasInitial ?
			this._saslInstance.getResponse() : '';	
	this._write({
		'auth': new Buffer(initial).toString('base64'),
		'attr': {
			'xmlns': 'urn:ietf:params:xml:ns:xmpp-sasl',
			'mechanism': this.saslMechanism
		}
	});	
};

/**
 * Continues the SASL authentication exchange.
 * 
 * @param challenge
 *  The challenge sent by the server.
 * @returns
 *  Nothing.
 */
proto._continueAuthentication = function(challenge) {
	// Base64 decode challenge.
	challenge = new Buffer(challenge, 'base64').toString('ascii');
	// Hand to SASL instance and get challenge response.
	var response = this._saslInstance.getResponse(challenge);
	// Base64 encode response.
	response = new Buffer(response).toString('base64');
	// Hand challenge response to server.
	this._write({
		'response': response,
		attr: {
			'xmlns': 'urn:ietf:params:xml:ns:xmpp-sasl'
		}
	});
};

/**
 * Completes the authentication exchange.
 * 
 * @param challenge
 *  The final challenge sent by the server. This is optional and may
 *  be omitted if the chosen mechanism does not require a final
 *  server challenge.
 * @returns
 *  Nothing.
 */
proto._completeAuthentication = function(challenge) {
	// The challenge is optional.
	if(challenge !== undefined) {
		challenge = new Buffer(challenge, 'base64').toString('ascii');
		// Hand to SASL instance and get challenge response.
		var response = this._saslInstance.getResponse(challenge);
		// If response is not the empty string, abort the authentication exchange.
		if(response !== '') {
			this._write({
				'abort': '',
				attr: {
					'xmlns': 'urn:ietf:params:xml:ns:xmpp-sasl'
				}
			});
			throw new Error('Authentication aborted.');
		}
	}
	console.log('SASL authentication completed.');
	// Switch to authenticated state.
	this._state = XMPPState.authenticated;
	this.emit('authenticated');
};

/**
 * Picks the best SASL mechanisms from the list of mechanisms advertised by
 * the server.
 * 
 * @returns
 *  The selected SASL mechanism.
 * @exception Error
 *  Thrown if no suitable SASL mechanism could be selected.
 */
proto._selectSaslMechanism = function() {
	var order = {
		"SCRAM-SHA-1": 3,
		"DIGEST-MD5": 2,
		"PLAIN": 1
	};
	var ret = [0, ''];
	var available = this._serverOpts.saslMechanisms;
	for(var i in available) {
		var mech = available[i].toUpperCase();
		if(order[mech] == null)
			continue;	
		if(order[mech] > ret[0]) {
			ret[0] = order[mech];
			ret[1] = available[i];
		}
	}
	if(ret[1] === '')
		throw new Error('Could not select SASL mechanism.');
	return ret[1];
};

/**
 * Serializes the specified object into XML and sends it to the server.
 * 
 * @param json
 *  The object to send to the server as serialized XML.
 * @param opts
 *  A set of serialization options.
 */
proto._write = function(json, opts) {
	opts = opts || {};
	if(json.attr !== undefined)
		opts.attributes_key = 'attr';
	var xml = json2xml(json, opts);
	if(opts.dontClose === true)
		xml = xml.replace(/\/>$/, '>');
//	console.log('C -> ' + xml);
	this._sock.write(xml);
};

/**
 * Connect to the server.
 */
proto.connect = function() {
	this._init();
};

/**
 * Closes the connection to the server.
 */
proto.close = function() {
	// Closing the XML document initiates the shutdown.
	var xml = '</stream:stream>';
	console.log('C -> ' + xml);	
	this._sock.write(xml);
};

module.exports = XMPPClient;