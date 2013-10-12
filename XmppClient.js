/**
 * @authors	 	Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date 		12-10-13
 * 
 * A client library for the Extensible Messaging and Presence Protocol (XMPP).
 */
var net = require('net');
var events = require('events');
var sasl = require('./sasl/sasl');
var XmlParser = require('./XmlParser');

/**
 * A set of default options which is merged with the options passed
 * into the constructor.
 */
var defaultOpts = {
	// Default XMPP port.
	port: 5222
};

function XmppClient(opts) {
	// jsnode events boilerplate.
	events.EventEmitter.call(this);	
			
	/**
	 * Set to true for debugging output.
	 */
	this._debug = true;

	/**
	 * The set of options passed into the constructor.
	 */
	this._opts = require('extend')(defaultOpts, opts);	
	
	/**
	 * True if TLS encryption has been negotiated via STARTTLS.
	 */
	this._tlsEnabled = false;
	
	/**
	 * True if client has authed with the server.
	 */
	this._authenticated = false;
	
	/**
	 * A set of server features populated during stream-negotiation.
	 */
	this._features = {};
	
	if(opts.autoConnect === true)
		this._init();	
}

/**
 * Inherit from EventEmitter.
 */
require('util').inherits(XmppClient, events.EventEmitter);
var proto = XmppClient.prototype;

/**
 **** Public API methods ****
 */

proto.connect = function() {
	this._init();
};

/**
 **** Private methods ****
 */

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
	this._debugPrint('Connecting to ' + this._opts.host + ' on port ' +
			this._opts.port);	
	var sock = net.connect(this._opts);
	var that = this;
	this._sock = sock;
	this._xml = null;
	sock.once('connect',
		function() {
			if(that._debug === true)
				sock.pipe(process.stdout);
			that._xml = new XmlParser(sock);
			// Install an error handler for stream-level errors.
			that._xml.on_('stream:error', that, that._streamError);			
			that.emit('connect');
			
			that._setupConnection.call(that);
		}
	);
	sock.on('error', function(e) {
		that.emit('error', e);
	});
};

/**
 * Sets up the connection with the server which includes negotiating a stream,
 * possibly enabling TLS encryption and authenticating the user.
 * 
 * @this
 *  References the XmppClient instance.
 */
proto._setupConnection = function() {
	// Try to negotiate the initial-stream.
	this._negotiateStream();
	this.once('_streamNegotiated', function(feats) {
		// If the server advertised TLS, try to switch to secured stream.
		if(feats.startTls === true)
			this._startTls();
		else
			this._startAuthentication(this._opts.jid, this._opts.password);
	});
	
	this.once('_tlsStatus', function(success) {
		if(success === true) {
			this._debugPrint('TLS encryption enabled.');
			// Go on with SASL authentication.
			this._startAuthentication(this._opts.jid, this._opts.password);
		}
		else
			this._error('TLS negotiation failed.');
	});
	// Wait for authentication to complete.
	this.once('_authStatus', function(success) {
		if(success === true) {
			this._debugPrint('SASL authentication successful.');
			// Go on with resource-binding, if needed.
		}
		else
			this._error('SASL authentication failed.');
	});
};

/**
 * Negotiate the initial XML stream with the server.
 * 
 * @this
 *  References the XmppClient instance.
 */
proto._negotiateStream = function() {
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
	
	this._xml.once_('stream:features', this, function(node) {
		this._features = this._parseFeatures(node);
		this.emit('_streamNegotiated', this._features);
	});
};

/**
 * Initiates TLS negotiation via the STARTTLS extension.
 * 
 * @this
 *  References the XmppClient instance.
 */
proto._startTls = function() {
	this._write({
		'starttls': '',
		attr: {
			'xmlns': 'urn:ietf:params:xml:ns:xmpp-tls'
		}
	});
	// Server issues 'proceed' if we can go ahead.
	this._xml.once_('proceed', this, this._continueTls);
	// ...or 'failure' in which case we abort the negotiation.
	this._xml.once_('failure', this, this._abortTls);
};

/**
 * Continues the TLS negotiation.
 * 
 * @this
 *  References the XmppClient instance.
 */
proto._continueTls = function() {
	// Remove abort handler.
	this._xml.removeAllListeners('failure');
	this._xml.unpipe(this._sock);
	this._sock.unpipe(process.stdout);
	var that = this;
	require('starttls')(this._sock, function() {
		that._sock = this.cleartext;
		that._xml.pipe(that._sock);
		if(that._debug === true)
			that._sock.pipe(process.stdout);
		that._negotiateStream();
		that.once('_streamNegotiated', function() {
			that._tlsEnabled = true;
			that.emit('_tlsStatus', true);
		});
	});		
};

/**
 * Aborts TLS negotiation.
 * 
 * @this
 *  References the XmppClient instance.
 */
proto._abortTls = function() {
	// Remove continue handler.
	this._xml.removeAllListeners('proceed');
	this.emit('_tlsStatus', false);
};

/**
 * Starts the SASL authentication exchange.
 * 
 * @param username
 *  The username to authenticate with.
 * @param password
 *  The password to authenticate with.
 * @this
 *  References the XmppClient instance.
 */
proto._startAuthentication = function(username, password) {
	// Pick the best mechanism available.
	var name = this._selectSaslMechanism(this._features.mechanisms);	
	// Create an instance of the selected mechanism.
	var saslInstance = sasl.create(name);
	saslInstance.add('username', username);
	saslInstance.add('password', password);
	// If mechanism requires client initiation, send it along.
	var initial = saslInstance.hasInitial ?
			saslInstance.getResponse() : '';
	this._write({
		'auth': new Buffer(initial).toString('base64'),
		'attr': {
			'xmlns': 'urn:ietf:params:xml:ns:xmpp-sasl',
			'mechanism': name
		}
	});
	// Server issues 'challenge' if we can go ahead.
	this._xml.once_('challenge', this, function(node) {
		this._continueAuthentication(saslInstance, node);
	});
	// ...or 'failure' in which case we abort the negotiation.
	this._xml.once_('failure', this, this._abortAuthentication);	
};

/**
 * Continues the SASL authentication exchange.
 *
 * @param saslInstance
 *  The instance of the SASL mechanism that is being used.
 * @param node
 *  The 'challenge' node sent by the server.
 * @this
 *  References the XmppClient instance.
 */
proto._continueAuthentication = function(saslInstance, node) {
	// Remove abort handler.
	this._xml.removeAllListeners('failure');	
	// Base64 decode challenge.
	var challenge = new Buffer(node.text, 'base64').toString('ascii');
	// Hand to SASL instance and get challenge response.
	var response = saslInstance.getResponse(challenge);
	// Base64 encode response.
	response = new Buffer(response).toString('base64');
	// Hand challenge response to server.
	this._write({
		'response': response,
		attr: {
			'xmlns': 'urn:ietf:params:xml:ns:xmpp-sasl'
		}
	});
	// Server responds with 'challenge', 'success' or 'failure'.
	this._xml.once_('challenge', this, function(_node) {
		this._continueAuthentication(saslInstance, _node);
	});
	this._xml.once_('success', this, function(_node) {
		this._completeAuthentication(saslInstance, _node);
	});
	this._xml.once_('failure', this, this._abortAuthentication);
};

/**
 * Aborts the SASL authentication exchange.
 * 
 * @this
 *  References the XmppClient instance.
 */
proto._abortAuthentication = function() {
	// Remove continue and success handlers.
	this._xml.removeAllListeners('challenge')
		.removeAllListeners('success');
	this.emit('_authStatus', false);	
};

/**
 * Completes the SASL authentication exchange.
 * 
 * @param saslInstance
 *  The instance of the SASL mechanism that is being used.
 * @param node
 *  The 'success' node sent by the server.
 * @this
 *  References the XmppClient instance.
 */
proto._completeAuthentication = function(saslInstance, node) {
	// Remove failure and challenge handlers.
	this._xml.removeAllListeners('failure')
		.removeAllListeners('challenge');
	// The final challenge is optional.
	if(node.text != null) {
		var challenge = new Buffer(node.text, 'base64').toString('ascii');
		// Hand to SASL instance and get challenge response.
		var response = saslInstance.getResponse(challenge);
		// If response is not the empty string, abort the authentication exchange.
		if(response !== '') {
			this._abortAuthentication();
			return;
		}
	}
	// Finally, we need to negotiate a new stream.
	this._negotiateStream();
	this.once('_streamNegotiated', function() {
		this._authenticated = true;
		this.emit('_authStatus', true);	
	});	
};

/**
 * Parses the features of an XMPP server advertised through a
 * stream-feature node.
 */
proto._parseFeatures = function(node) {
	var feats = {
		startTls: node.starttls != null,
		bind: node.bind != null,
		mechanisms: []
	};
	if(node.mechanisms != null) {
		for(var i in node.mechanisms.mechanism) {
			var mech = node.mechanisms.mechanism[i];
			feats.mechanisms.push(mech.text);
		}
	}
	return feats;
};

/**
 * Picks the best SASL mechanism from the specified list of mechanisms.
 * 
 * @param list
 *  The list of mechanisms to select from.
 * @returns
 *  The selected SASL mechanism.
 * @exception Error
 *  Thrown if no suitable SASL mechanism could be selected.
 */
proto._selectSaslMechanism = function(list) {
	var order = {
		"SCRAM-SHA-1": 3,
		"DIGEST-MD5": 2,
		"PLAIN": 1
	};
	var ret = [0, ''];
	for(var i in list) {
		var mech = list[i].toUpperCase();
		if(order[mech] == null)
			continue;	
		if(order[mech] > ret[0]) {
			ret[0] = order[mech];
			ret[1] = list[i];
		}
	}
	if(ret[1] === '')
		throw new Error('Could not select SASL mechanism.');
	return ret[1];
};

/**
 * Callback invoked when a stream-level error condition is encountered.
 */
proto._streamError = function(node) {
	this.emit('error', 'Fehler');
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
	var xml = require('json2xml')(json, opts);
	if(opts.dontClose === true)
		xml = xml.replace(/\/>$/, '>');
	if(this._debug === true)
		console.log('C -> ' + xml);
	this._sock.write(xml);
};

/**
 * Raises the 'error' event and shuts client down.
 * 
 * @this
 *  References the XmppClient instance.
 */
proto._error = function(reason) {
	this._debugPrint('_error: ' + reason);
	this.emit('error', new Error(reason));
	// FIXME: Shutdown.
};

/**
 * Prints the specified data to standard output if debugging is enabled.
 */
proto._debugPrint = function(s) {
	if(this._debug === true)
		console.log(s);
};

module.exports = XmppClient;