/**
 * @authors	 	Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date 		12-10-13
 * 
 * A client for the Extensible Messaging and Presence Protocol (XMPP).
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
	 * The SASL mechanism to use during authentication.
	 */
	this.saslMechanism = null;
	
	/**
	 * The instance of the SASL mechanism plugin used for authentication.
	 */
	this._saslInstance = null;
	
	/**
	 * Set to true for debugging output.
	 */
	this._debug = true;

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
	console.log('Connecting to ' + this._opts.host + ' on port ' +
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
		else {
			// FIXME: raise 'error' event and shutdown.
			this._debugPrint('TLS negotiation failed.');
		}
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
	this._xml.once_('proceed', this, function(node) {
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
	});
	// FIXME: Handle failure case.
};

/**
 * Starts the SASL authentication exchange.
 * 
 * @param username
 *  The username to authenticate with.
 * @param password
 *  The password to authenticate with.
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
};

/**
 * Parses the features of an XMPP server advertised through a
 * stream-feature node.
 */
proto._parseFeatures = function(node) {
	var feats = {
		startTls: node.starttls != null,
		mechanisms: []
	};
	for(var i in node.mechanisms.mechanism) {
		var mech = node.mechanisms.mechanism[i];
		feats.mechanisms.push(mech.text);
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
 * Prints the specified data to standard output if debugging is enabled.
 */
proto._debugPrint = function(s) {
	if(this._debug === true)
		console.log(s);
};

module.exports = XmppClient;