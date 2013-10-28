/**
 * @authors     Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date        28-10-13
 * @modified    28-10-13 10:51
 * 
 * Implements the 'SI File Transfer' extension of the Extensible
 * Messaging and Presence Protocol (XMPP) as defined per Standards
 * Track XEP-0096.
 * 
 */

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
 *  The file(s) to transfer. This can be a string denoting a single
 *  file or an array of strings denoting several files.
 * @param cb
 *  A callback method which will be invoked to inform the caller on
 *  the progress of the file transfer.
 * @exception Error
 *  Thrown if either parameter is null or undefined.
 *  
 */
proto.sendFile = function(jid, file, cb) {
	if(jid == null)
		throw new Error('jid must not be null.');
	if(file == null)
		throw new Error('file must not be null.');
	if(cb == null)
		throw new Error('cb must not be null.');
	
	// Probe for Stream Initiation support.
	var that = this;
	this._im._supports(jid,
		['http://jabber.org/protocol/si',
		 'http://jabber.org/protocol/si/profile/file-transfer'],
		 function(supported) {
			// Fall back to Out-Of-Band Data (XEP-0066)?
			if(!supported)
				return cb(false, 'Not supported');
			that._negotiateStream();
		}
	);
	// TODO:	
	// Stream Initiation with Profile of File Transfer.
	// Advertise SOCKS5 and IBB.
	// Negotiate Method.
	// Dispatch to negotiated method.
};

proto._negotiateStream = function() {
	// Construct the SI request, refer to XEP-0095
	// (3.2 Negotiating Profile and Stream) for the ugly details.
	var o = { si: [], attr: {
		'xmlns':	 'http://jabber.org/protocol/si',
		'profile':	 'http://jabber.org/protocol/si/profile/file-transfer',
		'id':		 this._generateId(10),
		// FIXME: Figure out which MIME type to send.
		'mime-type': ''
	}};
	
	// FIXME: add description is supplied.
	o.si.push([{ file: { 'desc': 'FIXME' }, attr: {
		// FIXME: name and size are mandatory.
		'name':  'FIXME',
	   	'size':  '1024',
	   	'xmlns': 'http://jabber.org/protocol/si/profile/file-transfer'
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
	
	this._im._iq({type: 'set'}, o, function(success, node) {
		console.log(success);
		console.log(node);
	});
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

module.exports = SIFileTransfer;