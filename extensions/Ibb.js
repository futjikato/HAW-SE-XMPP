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
	
	// Keep track of who is allowed to initiate an IBB with us.
	this._allowed = {};
	
	// Store a reference to the XmmpIM instance.
	this._im = im;
}

var proto = Ibb.prototype;

// Add the following list of methods to the XmppIM class.
proto.exports = ['_ibb'];

// The XML namespace of the extension we're implementing.
proto.xmlns = 'http://jabber.org/protocol/ibb';

// The name of the extension.
proto.name = 'Ibb';

proto.onIQ = function(stanza) {
	if(!this._isIbb(stanza))
		return false;
	if(stanza.open != null)
		this._onOpen(stanza);
	else if(stanza.close != null)
		this._onClose(stanza);
	else if(stanza.data != null)
		this._onData(stanza);
	return true;
};

/**
 * Invoked by stream initiation to let IBB module know we are expecting
 * an IBB transfer from the specified jid.
 */
proto.allow = function(opts) {
	if(opts == null)
		throw new Error('opts must not be null.');	
	this._allowed[opts.jid] = {
			size: opts.size,
			path: opts.path
	};
};

proto._onOpen = function(stanza) {
	var from = stanza.attributes.from;
	// See if the request has been acknowledged.
	if(this._isAllowed(from) == false)
		return this._error(stanza);
	// 'sid' and 'block-size' attributes must be present.
	var sid = stanza.open.attributes.sid;
	var blockSize = stanza.open.attributes['block-size'];
	// We only accept IQ stanzas for data transmission.
	var _s = stanza.open.attributes.stanza;
	if(_s != null && _s != 'iq')
			return this._error(stanza);
	if(sid == null || blockSize == null)
		return this._error(stanza);
	// Open a file stream and associate with sid.
	console.log('OK');
	console.log('Opening file stream, associating with sid = ' + sid);
	// Accept session.
	this._im._iq({
		type: 'result',
		to: from, id: stanza.attributes.id }, {}
	);
	// Reset allowed.
	
	// Emit 'file.transfer.started' event.
};

proto._onClose = function(stanza) {
	// if sid is missing or is not associated with a file stream
	// -> send error result.
	
	// Close file stream associated with sid.
	// Emit 'file.transfer.completed' event.
	// Acknowledge IQ.
};

proto._onData = function(stanza) {
	console.log('Got data');
	console.log(stanza);
	
	// if data tag does not have sid or if base64 data
	// is invalid
	//  -> send error result
	
	// decode base64 string.
	// write data to filestream.
	// acknowledge IQ.
	
	// Emit 'file.transfer.progress' event.
};

proto._error = function(stanza) {
	var err = { error: { 'not-acceptable': '', attr: {
		xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'
		}}, attr: { type: 'cancel' }};
	this._im._iq({ type: 'error',
		to: stanza.attributes.from,
		id: stanza.attributes.from }, err);	
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

proto._isIbb = function(stanza) {
	if(stanza == null)
		throw new Error('stanza must not be null.');
	var tags = ['open', 'data', 'close'];
	for(var i in tags) {
		var tag = tags[i];
		if(stanza[tag] == null)
			continue;
		if(stanza[tag].attributes == null)
			return false;
		if(stanza[tag].attributes.xmlns == null)
			return false;
		return stanza[tag].attributes.xmlns ==
			'http://jabber.org/protocol/ibb';
	}
	return false;
};

proto._isAllowed = function(jid) {
	return this._allowed[jid] != null;
};

module.exports = Ibb;