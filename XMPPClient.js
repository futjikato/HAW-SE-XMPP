var util = require('util');
var events = require('events');
var net = require('net');
var sax = require('sax');
var json2xml = require('json2xml');

var XMPPState = require('./XMPPState');
var XMPPException = require('./XMPPException');

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
	 * The set of options passed into the constructor.
	 */
	this._opts = require('extend')(defaultOpts, opts);	
	
	/**
	 * The state the XMPPClient is currently in.
	 */
	this._state = null;
	
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
	this._stream = stream;
	sock.once('connect',
		function() {
			that.emit('connect');
			that._negotiateStream.call(that);
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
	// Look for tags sent during stream-negotiating.
	if(this._state == XMPPState.negotiatingStream) {
		switch(tag) {
		case 'starttls':
			this._serverOpts.startTls = true;
			break;
		}
	}
	else if(this._state == XMPPState.authenticating) {
		switch(tag) {
		case 'failure':
			console.log('SASL authentication failed.');
			break;
			
		case 'success':
			console.log('SASL authentication completed.');
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
		// Server has sent its set of features. Continue with TLS or
		// SASL negotiation.
		case 'stream:features':
			if(this._serverOpts.startTlsMandatory === true)
				throw new XMPPException('STARTTLS not yet implemented.');
			// Go on with SASL authentication.
			this._startAuthentication();
			break;
		}
	}
};

proto._saxOnText = function(text) {
	var tag = this._openTag.toLowerCase();
	// Look for text sent during stream-negotiating.
	if(this._state == XMPPState.negotiatingStream) {
		switch(tag) {
		// Parse SASL mechanism advertised by server.
		case 'mechanism':
			this._serverOpts.saslMechanisms.push(text);
			break;
		}		
	}
};

/**
 * Attempts to negotiate the initial XML stream with the server.
 */
proto._negotiateStream = function() {
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
	}, { header: true, dontClose: true });	
};

proto._startAuthentication = function() {
	this._state = XMPPState.authenticating;
	
	// Pick the best mechanism:
	//  1. Scram-Sha-1
	//  2. Digest-Md5
	//  3. Plain
	// --> TODO.
	this.saslMechanism = 'PLAIN';
	
	// Give user a chance to override preferred SASL mechanism.
	this.emit('pickSASLMechanism', this._serverOpts.saslMechanisms);
	
	//  Lookup SASL plugin. If does not exist -> failure
	//  instantiate sasl mechanism.
	//  if mechanism is client initiated, send data along with
	//  auth tag.
	var fs = require('fs');
	var name = this.saslMechanism.charAt(0).toUpperCase() +
		this.saslMechanism.toLowerCase().slice(1);
	if(fs.existsSync('./SASL' + name + '.js') === false)
		throw new XMPPException('SASL mechanism not found');
	
	var mechanism = require('./SASL' + name);
	// Todo: save instance
	var instance = new mechanism(this._opts.jid, this._opts.password);
	var initial = instance.hasInitial ? instance.getResponse() : '';
		
	this._write({
		'auth': new Buffer(initial).toString('base64'),
		'attr': {
			'xmlns': 'urn:ietf:params:xml:ns:xmpp-sasl',
			'mechanism': this.saslMechanism
		}
	});	
};

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

proto.connect = function() {
	this._init();
};

proto.close = function() {
	// close xml stream.
};

module.exports = XMPPClient;