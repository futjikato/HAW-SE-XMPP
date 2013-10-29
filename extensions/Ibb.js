/**
 * @authors     Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date        23-10-13
 * @modified    28-10-13 09:22
 * 
 * Implements the 'in-band bytestreams' extension of the Extensible
 * Messaging and Presence Protocol (XMPP) as defined per Standards
 * Track XEP-0047.
 * 
 */
var Stream = require('./ibb/Stream');

/**
 * Initializes a new instance of the Ibb class.
 * 
 * @param im
 *  A reference to the XmmpIM instance on whose behalf this instance
 *  is being created.
 */
function Ibb(im) {
	console.log('Initializing [In-Band Bytestreams] extension.');
	
	// Store a reference to the XmmpIM instance.
	this._im = im;
}

var proto = Ibb.prototype;

//Add the following list of methods to the XmppIM class.
proto.exports = ['_ibb'];

//The XML namespace of the extension we're implementing.
proto.xmlns = 'http://jabber.org/protocol/ibb';

proto.onIQ = function(stanza) {
	return false;
};

proto._ibb = function(jid, file, cb) {
	if(jid == null)
		throw new Error('jid must not be null.');
	if(file == null)
		throw new Error('file must not be null.');
	// Can have more than one bytestream instance at a time
	// identified by unique SID.
	console.log('****');
	console.log('IBB Invoked.');
	console.log('****');
	// Open bytestream
	// Encode data as BASE64 chunks
	// Transfer BASE64 chunks
	// Close bytestream
};

/**
 * Generates a random session id which identifies the IBB session.
 * 
 * @param length
 *  The length of the random string to construct.
 * @returns
 *  A random string.
 */
proto._generateSid = function(length) {
    var s = '';
    var c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for(var i = 0; i < length; i++)
        s += c.charAt(Math.floor(Math.random() * c.length));
    return s;	
};

module.exports = Ibb;