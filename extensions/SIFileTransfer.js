/**
 * @authors     Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date        28-10-13
 * @modified    29-10-13 12:07
 * 
 * Implements the 'SI File Transfer' extension of the Extensible
 * Messaging and Presence Protocol (XMPP) as defined per Standards
 * Track XEP-0096.
 * 
 */
var path = require('path');
var fs   = require('fs');

/**
 * Initializes a new instance of the SIFileTransfer class.
 * 
 * @param im
 *  A reference to the XmmpIM instance on whose behalf this instance
 *  is being created.
 */
function SIFileTransfer(im) {
	console.log('Initializing [SI File Transfer] extension.');
	
	// Store a reference to the XmmpIM instance.
	this._im = im;		
};

var proto = SIFileTransfer.prototype;

// Add the following list of methods to the XmppIM class.
proto.exports = ['sendFile'];

// The XML namespace of the extension we're implementing.
proto.xmlns = 'http://jabber.org/protocol/si/profile/file-transfer';

// The name of the extension.
proto.name = 'SIFileTransfer';

/**
 * Callback method invoked whenever an IQ request stanza has been
 * received.
 * 
 * @param stanza
 *  The received IQ stanza.
 * @returns
 *  true if the stanza was handled by the extension. false if the
 *  stanza was not handled and should be passed on to the next
 *  extension.
 */
proto.onIQ = function(stanza) {
	// Check if it's a SI File Transfer request.
	if(!this._isSIFileRequest(stanza))
		return false;
	try {
		var request = this._parseSIRequest(stanza);	
		// Check if we support any of the proposed transfer methods.
		var method = this._selectMethod(request.methods);
		// Reject stream initiation.
		if(method == null)
			this._rejectRequest(stanza, 'Not supported.');
		else {
			var that = this;
			// FIXME: Is this safe for several requests happening at the
			// same time?
			var opt = {
				name: request.file.name,
				size: request.file.size,
				accept: function(savePath) {
					// Let IBB know of incoming request.
					that._im._extension('Ibb').allow({
						'jid':  stanza.attributes.from,
						'path': savePath,
						'size': request.file.size
					});
					that._acceptRequest(stanza, method);
				},
				deny: function() {
					// reject the request.
					that._rejectRequest(stanza, "User declined.");
				}
			};
			// Trigger public event.
			this._im.emit('file.transfer.request', stanza.attributes.from, opt);
		}
	} catch(e) {
	}
	return true;
};

/**
 * Initiates a file transfer with the specified jid.
 * 
 * @param jid
 *  The JID to initiate a file transfer with. Note that this will
 *  usually be a 'full jid' (i.e. including a resource identifier).
 * @param file
 *  The file to transfer. This can either be a string denoting a single
 *  file or an object made up of the following fields:
 *   'path'           The path of the file to transfer.
 *   'description'    A description of the file being sent.
 * @param cb
 *  A callback method which will be invoked to inform the caller on
 *  the progress of the file transfer.
 * @exception Error
 *  Thrown if either parameter is null or undefined.
 */
proto.sendFile = function(jid, file, cb) {
	if(jid == null)
		throw new Error('jid must not be null.');
	if(file == null)
		throw new Error('file must not be null.');
	if(cb == null)
		throw new Error('cb must not be null.');
	var _f = file;
	if(typeof file == 'string')
		_f = { path: file };
	var stats = this._getFileStats(_f.path);
	if(stats == false)
		return cb(false, 'File not found');
	// Probe for Stream Initiation support.
	var sdisco = this._im._extension('SDisco');
	if(sdisco == null)
		throw new Error('Could not find SDisco extension.');
	var that = this;
	sdisco.supports(jid,
		['http://jabber.org/protocol/si',
		 'http://jabber.org/protocol/si/profile/file-transfer'],
		 function(supported) {
			// Fall back to Out-Of-Band Data (XEP-0066)?
			if(!supported)
				return cb(false, 'Not supported.');
			that._negotiateStream(jid, stats,
				_f.description, function(success, method) {
					// Stream initiation failed.
					if(success == false)
						return cb(false, 'Stream Initiation failed.');
					// Dispatch to negotiated method.					
					that._dispatch.call(that, jid, _f.path, method, cb);
				}
			);
		}
	);
};

/**
 * Attempts to initiate a stream with the specified jid.
 * 
 * @param jid
 *  The JID to initiate a file transfer with. Note that this will
 *  usually be a 'full jid' (i.e. including a resource identifier).
 * @param stats
 *  An object made up of the fields 'name' and 'size', denoting the
 *  file's name and size, respectively.
 * @param desc
 *  If supplied, a string containing a description for the file.
 * @param cb
 *  A callback method invoked once the operation has been completed.
 * @exception Error
 *  Thrown if the jid or stats parameter is null or undefined.
 */
proto._negotiateStream = function(jid, stats, desc, cb) {
	if(jid == null)
		throw new Error('jid must not be null.');
	if(stats == null)
		throw new Error('stats must not be null.');
	var req = this._buildRequest(jid, stats, desc);
	this._im._iq({type: 'set', to: jid}, req, function(success, node) {
		if(success == false)
			return cb(false);
		var method = node.si.feature.x.field.value.text;
		// Return negotiated method to caller.
		return cb(true, method);
	});
};

/**
 * Constructs the stream initiation request.
 * 
 * @param jid
 *  The JID to initiate a file transfer with. Note that this will
 *  usually be a 'full jid' (i.e. including a resource identifier).
 * @param stats
 *  An object made up of the fields 'name' and 'size', denoting the
 *  file's name and size, respectively.
 * @param desc
 *  If supplied, a string containing a description for the file.
 * @returns
 *  The constructed JSON-object.
 */
proto._buildRequest = function(jid, stats, desc) {
	// Construct the SI request, refer to XEP-0095
	// (3.2 Negotiating Profile and Stream) for the ugly details.
	var o = { si: [], attr: {
		'xmlns':	 'http://jabber.org/protocol/si',
		'profile':	 'http://jabber.org/protocol/si/profile/file-transfer',
		'id':		 this._generateId(10),
		// FIXME: Figure out which MIME type to send?
		'mime-type': 'application/octet-stream'
	}};
	// Add the mandatory fields and attributes.
	o.si.push([{ file: { 'desc': desc || '' }, attr: {
		'name':  stats.name,
	   	'size':  stats.size,
	   	'xmlns': 'http://jabber.org/protocol/si/profile/file-transfer'
	   		// FIXME: Add support for SOCKS5.
	  }}, { feature: { x: { field: [{ option: { value:
		  'http://jabber.org/protocol/ibb' }}], attr: {
	    'var':  'stream-method',
	    'type': 'list-single'
	  }}, attr: {
	   	'xmlns': 'jabber:x:data',
	   	'type': 'form' }
	  }, attr: {
	   	'xmlns': 'http://jabber.org/protocol/feature-neg'
	  }}]);
	return o;
};

/**
 * Dispatches to the transfer method negotiated during stream initiation.
 * 
 * @param jid
 *  The JID to initiate a file transfer with. Note that this will
 *  usually be a 'full jid' (i.e. including a resource identifier).
 * @param path
 *  The path of the file to transfer.
 * @param cb
 *  The user supplied callback, that is invoked to inform the user
 *  of file transfer status and progress.
 * @param method
 *  The XML namespace of the transfer method that was negotiated.
 */
proto._dispatch = function(jid, path, method, cb) {
	var m = {
		// FIXME: Add support for SOCKS5.
		'http://jabber.org/protocol/ibb': '_ibb'	
	};
	if(m[method] == false)
		return cb(false, 'Unsupported method.');
	if(this._im[m[method]] == false)
		return cb(false, 'Unsupported method.');
	// Invoke extension.
	this._im[m[method]](jid, path, cb);
};

/**
 * Generates a random id which identifies a stream session.
 * 
 * @param length
 *  The length of the random string to construct.
 * @returns
 *  A random string.
 */
proto._generateId = function(length) {
    var s = '';
    var c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for(var i = 0; i < length; i++)
        s += c.charAt(Math.floor(Math.random() * c.length));
    return s;	
};

/**
 * Retrieves a set of statistics such as size and basename for the
 * specified file.
 * 
 * @param f
 *  The file to retrieve stats for.
 * @returns
 *  An object containing the file stats or false if the stats could
 *  not be retrieved.
 * @exception Error
 *  Thrown if the f parameter is null or undefined.
 */
proto._getFileStats = function(f) {
	if(f == null)
		throw new Error('f must not be null.');
	try {
		var s = fs.statSync(f);
		if(!s.isFile())
			return false;
		return { size: s.size, name: path.basename(f) };
	} catch(e) {
		return false;
	}
};

/**
 * Determines whether the specified stanza contains a SI file reqest.
 * 
 * @param stanza
 *  The received IQ stanza.
 */
proto._isSIFileRequest = function(stanza) {
	if(stanza.si == null)
		return false;
	if(stanza.si.attributes.profile == null)
		return false;
	if(stanza.si.attributes.profile !=
		'http://jabber.org/protocol/si/profile/file-transfer')
		return false;
	if(stanza.si.file == null)
		return false;
	if(stanza.si.file.attributes.xmlns !=
		'http://jabber.org/protocol/si/profile/file-transfer')
		return false;
	return true;
};

/**
 * Parses a SI File Request from the specified stanza.
 * 
 * @param stanza
 *  An IQ stanza containing a SI File Request.
 * @returns
 *  An object containing the name and size of the file to be
 *  transfered as well as a list of proposed transfer methods.
 */
proto._parseSIRequest = function(stanza) {
	var ret = { file: {
			name: stanza.si.file.attributes.name,
			size: stanza.si.file.attributes.size
		},
		methods: []
	};
	if(stanza.si.file.desc != null)
		ret.file.description = stanza.si.file.desc.text;
	var opts = stanza.si.feature.x.field.option;
	if(!(opts instanceof Array))
		opts = [opts];
	for(var i in opts)
		ret.methods.push(opts[i].value.text);
	return ret;
};

/**
 * Selects a method of transfer from the list of proposed methods.
 * 
 * @param methods
 *  A list of transfer methods.
 * @returns
 *  The selected method or null if none of the proposed methods is
 *  supported.
 */
proto._selectMethod = function(methods) {
	if(methods == null)
		throw new Error('methods must not be null.');
	if(!(methods instanceof Array))
		throw new Error('methods must be an array.');
	// FIXME: Add support for SOCKS5.
	var supported = ['http://jabber.org/protocol/ibb'];	
	for(var i in supported) {
		var m = supported[i];
		for(var c in methods) {
			if(methods[c] == m)
				return m;
		}
	}
	return null;
};

/**
 * Rejects the SI File Request contained within the specified stanza.
 * 
 * @param stanza
 *  An IQ stanza containing a SI File Request.
 * @param reason
 *  The reason why the request is being rejected.
 * @exception Error
 *  Thrown if either parameter is null or undefined.
 */
proto._rejectRequest = function(stanza, reason) {
	if(stanza == null)
		throw new Error('stanza must not be null.');
	if(reason == null)
		throw new Error('reason must not be null.');
	var e = { error:
		[ { forbidden: '', attr: {
			xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'
		}}, {text: reason, attr: {
			xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}
		// FIXME: Do some more error differentiating?
		}], attr: { type: 'cancel', code: 403 }};
	this._im._iq({ type: 'error', to: stanza.attributes.from,
		id: stanza.attributes.id }, e);
};

/**
 * Completes the stream initiation procecure by accepting the request.
 * 
 * @param stanza
 *  An IQ stanza containing a SI File Request.
 * @param method
 *  The selected method to be used for transfering the file.
 * @exception Error
 *  Thrown if either parameter is null or undefined.
 */
proto._acceptRequest = function(stanza, method) {
	if(stanza == null)
		throw new Error('stanza must not be null.');
	if(method == null)
		throw new Error('method must not be null.');
	// Construct and send the stream initiation result.
	var o = { si: { feature: { x: { field: { value: method }, attr: {
		'var': 'stream-method'
	}}, attr: {
		xmlns: 'jabber:x:data', type: 'submit'
	}}, attr: {
		xmlns: 'http://jabber.org/protocol/feature-neg'
	}}, attr: {
		xmlns: 'http://jabber.org/protocol/si'
	}};
	this._im._iq({ type: 'result', to: stanza.attributes.from,
		id: stanza.attributes.id }, o);
};

module.exports = SIFileTransfer;