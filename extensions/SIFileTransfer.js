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
	// TODO:
	// Check for SI File Transfer requests
	// Trigger 'file' event with accept/deny methods.
	return false;
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
	var that = this;
	this._im._supports(jid,
		['http://jabber.org/protocol/si',
		 'http://jabber.org/protocol/si/profile/file-transfer'],
		 function(supported) {
			// Fall back to Out-Of-Band Data (XEP-0066)?
			if(!supported)
				return cb(false, 'Not supported');
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

module.exports = SIFileTransfer;