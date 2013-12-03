/**
 * @authors     Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date        12-10-13
 * @modified    16-10-13 16:40
 * 
 * Implements the core features of the Extensible Messaging and Presence
 * Protocol (XMPP) as defined per RFC 3920.
 * 
 */
var net = require('net');
var events = require('events');
var sasl = require('./sasl/sasl');
var winston = require('winston');
var config = require('./configuration/Config');
var XmlParser = require('./XmlParser');

/**
 * A set of default options which is merged with the options passed
 * into the constructor.
 */
var defaultOpts = {
	// Default XMPP port.
	port: 5222
};

/**
 * Initializes a new instance of the XmppCore class.
 * 
 * @param opts
 *  A set of options, some of which are required:
 *   'host'      specifies the hostname of the XMPP server.
 *   'user'      the local part of the jid to connect with.
 *   'password'  the password for the respective jid.
 *  optional:
 *   'port'      the port on which to connect. Defaults to 5222,
 *               if not specified.
 */
function XmppCore(opts) {
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
	
	/**
	 * The JID used for sending and receiving stanzas.
	 */
	this.jid = opts.user + "@" + opts.host;
	
	/**
	 * A set of callback handlers for IQ stanzas.
	 */
	this._iqHandler = {};

    this._logger;
	
	if(opts.autoConnect === true)
		this._init();
}

/**
 * Inherit from EventEmitter.
 */
require('util').inherits(XmppCore, events.EventEmitter);
var proto = XmppCore.prototype;

/**
 **** Public API ****
 *
 * Public events which may be subscribed to:
 * 
 *  'ready'      emitted when the initial negotiation with the XMPP
 *               server has been completed and messages can be sent.
 *  'message'    emitted when a new message stanza has been received.
 *               The first event argument is the stanza received.
 *  'presence'   emitted when a new presence stanza has been received.
 *               The first event argument is the stanza received.
 *  'iq'         emitted when a new iq request of type 'set' or 'get'
 *               has been received.
 *  'error'      emitted when an error occurs.
 */

/**
 * Connects to the server and starts the initial negotiation phase.
 */
proto.connect = function() {
	this._init();
};

/**
 * Closes the connection with the server.
 */
proto.close = function() {
	if(this._xml != null)
		this._xml.unpipe(this._sock);
	// Close the XML stream.
	if(this._sock != null)
		this._sock.write('</stream:stream>');
};

/**
 * Constructs and sends an IQ stanza to the server.
 * 
 * @param attr
 *  The attributes of the IQ stanza element. The 'id' attribute is
 *  added automatically. This may be null if not needed.
 * @param data
 *  The content of the IQ stanza as a json object.
 * @param cb
 *  A callback method invoked once the respective result stanza
 *  gets back to the client. The callback is executed in the context
 *  of the caller.
 * @exception Error
 *  Thrown if the 'data' or 'cb' parameters are null or undefined.
 */
proto.iq = function(attr, data, cb) {
	if(data == null)
		throw new Error('data must not be null.');
	if(cb == null)
		throw new Error('cb must not be null.');
	this._iq(attr, data, cb);
};

/**
 * Constructs and sends a message stanza to the server.
 * 
 * @param attr
 *  The attributes of the stanza some of which are required.
 * @param o
 *  The content of the message.
 * @exception Error
 *  Thrown if the arguments or any of their fields are invalid.
 */
proto.message = function(attr, o) {
	if(attr == null)
		throw new Error('attr must not be null.');
	if(typeof attr != 'object')
		throw new Error('attr must be an object.');
	if(attr.to == null || typeof attr.to != 'string')
		throw new Error('No recipient specified.');
	var m = { message: o, 'attr': { from: this.jid,
		to: attr.to, type: attr.type }
	};
	this._write(m);
};

/**
 * Constructs and sends a presence stanza to the server.
 * 
 * @param attr
 *  The attributes of the stanza. This may be null.
 * @param o
 *  The content of the presence stanza. This may be null.
 * @exception Error
 *  Thrown if the arguments or any of their fields are invalid.
 */
proto.presence = function(attr, o) {
	if(attr != null && typeof attr != 'object')
		throw new Error('attr must be an object.');
	this._write({ presence: o || '',
		'attr': attr || {} });
};

/**
 **** Private methods ****
 */

proto._initLogger = function(){
    var logLevel = config.get('log-level');
    this._logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({
                level: logLevel,
                colorize: true,
                timestamp: true
            }),
            new (winston.transports.File)({
                filename: './logs/Core.log',
                handleExceptions : true,
                json : true,
                timestamp: true,
                maxsize: 1500,
                maxFiles: 10,
                level: logLevel,
                colorize: true
            })
        ]
    });
    this._logger.info('- Logger initialized ( log-level: ' + logLevel + ' ) -');
};

/**
 * Sets up a new instance as part of object construction.
 *
 * @param opts
 *  Object containing contructing options.
 * @this
 *  Reference to XmppCore object being constructed.
 * @returns
 *  Nothing.
 */
proto._init = function() {
    // save scope of XmppCore
    var that = this;

    // initialize logger
    that._initLogger();

    // connect to server
    that._logger.info('Connecting to ' + that._opts.host + ' on port ' + that._opts.port);
    var sock = net.connect(that._opts);
    that._sock = sock;
    that._xml = null;
    sock.once('connect', function() {
        if(that._debug === true)
            sock.pipe(process.stdout);
        that._xml = new XmlParser(sock);
        // Install handlers for stream-level errors and stanzas.
        that._xml.on_('stream:error', that, that._error)
            .on_('iq', that, that._onIqStanza)
            .on_('message', that, that._onMessageStanza)
            .on_('presence', that, that._onPresenceStanza);

        that._setupConnection.call(that);
        that.once('_ready', function() {
            that._debugPrint('XML stream is ready.');
            // Emit 'ready' event which is part of the public API.
            that.emit('ready');
        });
    });
    sock.on('error', function(e) {
        that.emit('error', e);
    });
};

/**
 * Sets up the connection with the server which includes negotiating a stream,
 * possibly enabling TLS encryption and authenticating the user.
 * 
 * @this
 *  References the XmppCore instance.
 */
proto._setupConnection = function() {
	// Try to negotiate the initial-stream.
	this._negotiateStream();
	this.once('_streamNegotiated', function(feats) {
		// If the server advertised TLS, try to switch to secured stream.
		if(feats.startTls === true)
			this._startTls();
		else
			this._startAuthentication(this._opts.user, this._opts.password);
	});
	
	this.once('_tlsStatus', function(success) {
		if(success === true) {
			this._debugPrint('TLS encryption enabled.');
			// Go on with SASL authentication.
			this._startAuthentication(this._opts.user, this._opts.password);
		}
		else
			this._error('TLS negotiation failed.');
	});
	// Wait for authentication to complete.
	this.once('_authStatus', function(success, feats) {
		if(success === true) {
			this._debugPrint('SASL authentication successful.');
			// Go on with resource-binding, if needed.
			if(feats.bind === true)
				this._startBinding();
			else if(feats.session === true)
				this._establishSession();
			else
				this.emit('_ready');
		}
		else
			this._error('SASL authentication failed.');
	});
	// Wait for resource-binding to complete.
	this.once('_bindStatus', function(success) {
		if(success === true) {
			this._debugPrint('Resource binding successful, jid = ' +
					this.jid);
			if(this._features.session === true)
				this._establishSession();
			else
				// If session establishment is not required, we're ready.
				this.emit('_ready');
		}
		else
			this._error('Resource Binding failed.');
	});
	// Wait for session establishment.
	this.once('_sessionStatus', function(success) {
		if(success === true) {
			this._debugPrint('Session established, jid is now active.');
			this.emit('_ready');
		}
		else
			this._error('Session could not be established.');
	});
};

/**
 * Negotiate the initial XML stream with the server.
 * 
 * @this
 *  References the XmppCore instance.
 */
proto._negotiateStream = function() {
	this._write({
		'stream:stream': '',
		attr: {
			'to': this._opts.host,
			'from': this._opts.user,
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
 *  References the XmppCore instance.
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
 *  References the XmppCore instance.
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
 *  References the XmppCore instance.
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
 *  References the XmppCore instance.
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
 *  References the XmppCore instance.
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
 *  References the XmppCore instance.
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
 *  References the XmppCore instance.
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
	this.once('_streamNegotiated', function(feats) {
		this._authenticated = true;
		this.emit('_authStatus', true, feats);	
	});	
};

/**
 * Starts the resource-binding process.
 * 
 * @this
 *  References the XmppCore instance.
 */
proto._startBinding = function() {
	// Refer to RFC3920, 7. Resource Binding.
	var e = { bind: '', attr: {
		'xmlns': 'urn:ietf:params:xml:ns:xmpp-bind'} };
	this._iq({ type: 'set' }, e, function(success, node) {
		if(success === true) {
			this.jid = node.bind.jid.text;
			this.emit('_bindStatus', true);
		} else
			this.emit('_bindStatus', false);
	});	
};

/**
 * Establishes a session.
 * 
 * @this
 *  References the XmppCore instance.
 */
proto._establishSession = function() {
	// Refer to RFC3921, 3. Session Establishment.
	var sess = { session: '', attr: {
		'xmlns': 'urn:ietf:params:xml:ns:xmpp-session'} };
	this._iq({ type: 'set', to: this._opts.host}, sess,
		function(success, node) {
			this.emit('_sessionStatus', success);
		}
	);	
};

/**
 * Parses the features of an XMPP server advertised through a
 * stream-feature node.
 * 
 * @param node
 *  The 'stream:features' node containing the features supported
 *  by the server.
 */
proto._parseFeatures = function(node) {
	var feats = {
		startTls: node.starttls != null,
		bind: node.bind != null,
		session: node.session != null,
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
		console.log("\nC -> " + xml);
	this._sock.write(xml);
};

/**
 * Constructs and sends an IQ stanza to the server.
 * 
 * @param attr
 *  The attributes of the IQ stanza element. The 'id' attribute is
 *  added automatically.
 * @param data
 *  The content of the IQ stanza as a json object.
 * @param cb
 *  A callback method invoked once the respective result stanza
 *  gets back to the client.
 * @this
 *  References the XmppCore instance.
 */
proto._iq = function(attr, data, cb) {
	if(attr == null)
		attr = {};
	if(attr.id == null)
		attr.id = this._id();
	this._iqHandler[attr.id] = cb;
	this._write({ iq: data, 'attr': attr });
};

/**
 * Callback invoked when an IQ stanza has been received.
 * 
 * @param node
 *  The 'IQ'-node received from the server.
 * @this
 *  References the XmppCore instance.
 */
proto._onIqStanza = function(node) {
	var isRequest = node.attributes.type.match(/^(set|get)$/i) != null;
	if(isRequest) {
		this.emit('iq', node);
		return;
	}
	// It's a response to a previous request.
	var id = node.attributes.id;
	if(id == null)
		return;
	var success = node.attributes.type.match(/result/i) != null;	
	// Invoke handler tied to the stanza's id.
	if(this._iqHandler[id] !== undefined)
		this._iqHandler[id].call(this, success, node);
};

/**
 * Callback invoked when a message stanza has been received.
 * 
 * @param node
 *  The 'message'-node received from the server.
 * @this
 *  References the XmppCore instance.
 */
proto._onMessageStanza = function(node) {
	this.emit('message', node);
};

/**
 * Callback invoked when a presence stanza has been received.
 * 
 * @param node
 *  The 'presence'-node received from the server.
 * @this
 *  References the XmppCore instance.
 */
proto._onPresenceStanza = function(node) {
	this.emit('presence', node);
};

/**
 * Returns a unique identifier (id) used for tracking stanzas.
 * 
 * @returns
 *  A unique identifier (id) value.
 */
proto._id = function() {
	if(this._nextId == null)
		this._nextId = 0;
	return this._nextId++;
};

/**
 * Raises the 'error' event and shuts client down.
 * 
 * @this
 *  References the XmppCore instance.
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
    this._logger.info(s);
	//if(this._debug === true) // not needed anymore!
	//	console.log(s);
};

module.exports = XmppCore;