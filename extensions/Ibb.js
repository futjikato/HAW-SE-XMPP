/**
 * @authors     Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date        23-10-13
 * @modified    30-10-13 13:12
 * 
 * Implements the 'in-band bytestreams' extension of the Extensible
 * Messaging and Presence Protocol (XMPP) as defined per Standards
 * Track XEP-0047.
 * 
 */
var fs = require('fs');

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
	// The set of active data transmissions.
	this._transmissions = {};
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
	if(!this._isIbb(stanza))
		return false;
	// As per spec the stanza contains an 'open', a 'close'
	// or a 'data' tag.
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

/**
 * Callback method invoked when an <open> tag has been received.
 * 
 * @param stanza
 *  The stanza containing the 'open' tag.
 */
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
	// Open a file stream and associate it with the sid.
	var tm = this._createStream(sid, from);
	if(tm == false)
		return this._error(stanza);
	// Accept session.
	this._im._iq({
		type: 'result',
		to: from, id: stanza.attributes.id }, {}
	);	
	this._im.emit('file.transfer.started', {
		'sid':		sid,
		'from': 	from,
		'to':   	stanza.attributes.to,
		'filename': tm.path,
		'filesize': tm.size
	});
	// Reset the 'allowed' flag for the respective jid.
	this._allowed[from] = null;
	
};

/**
 * Callback method invoked when a <close> tag has been received.
 * 
 * @param stanza
 *  The stanza containing the 'close' tag.
 */
proto._onClose = function(stanza) {
	var from = stanza.attributes.from;	
	var sid = stanza.close.attributes.sid;
	// If sid is missing or is not associated with a file stream,
	// error out.
	if(sid == null)
		return this._error(stanza);
	var transmission = this._transmissions[sid];	
	if(transmission == null)
		return this._error(stanza);
	// Close the file stream associated with sid.
	transmission.stream.end();
	// Emit 'file.transfer.completed' event.
	this._im.emit('file.transfer.completed', {
		'sid':		sid,
		'from': 	from,
		'to':   	stanza.attributes.to,
		'filename': transmission.path,
		'filesize': transmission.size	
	});
	// Acknowledge IQ.
	this._im._iq({
		type: 'result',
		to: from, id: stanza.attributes.id }, {}
	);	
};

/**
 * Callback method invoked when a <data> tag has been received.
 * 
 * @param stanza
 *  The stanza containing the 'data' tag.
 */
proto._onData = function(stanza) {
	var from = stanza.attributes.from;
	var sid = stanza.data.attributes.sid;
	if(sid == null)
		return this._error(stanza);
	var transmission = this._transmissions[sid];
	if(transmission == null)
		return this._error(stanza);
	var b64 = stanza.data.text;
	// FIXME: Does this throw on failure or what?	
	var buf = new Buffer(b64, 'base64');
	// Write data to file.
	transmission.stream.write(buf);
	transmission.transferred += buf.length;
	// Acknowledge IQ.
	this._im._iq({
		type: 'result',
		to: from, id: stanza.attributes.id }, {}
	);		
	this._im.emit('file.transfer.progress', {
		'sid':			sid,
		'from': 		from,
		'to':   		stanza.attributes.to,
		'filename': 	transmission.path,
		'filesize': 	transmission.size,
		'transferred': 	transmission.transferred
	});
};

/**
 * Errors out of a transmission by sending an IQ stanza of type
 * error to the sender of the stanza specified.
 * 
 * @param stanza
 *  The stanza to issue the error in response to.
 * @exception Error
 *  Thrown if the stanza parameter is null or undefined.
 */
proto._error = function(stanza) {
	if(stanza == null)
		throw new Error('stanza must not be null.');
	var err = { error: { 'not-acceptable': '', attr: {
		xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'
		}}, attr: { type: 'cancel' }};
	this._im._iq({ type: 'error',
		to: stanza.attributes.from,
		id: stanza.attributes.from }, err);	
};

/**
 * Creates a file stream and associates it with the specified sid.
 * 
 * @param sid
 *  The sid of the file transfer the file stream will be associated
 *  with.
 * @param jid
 *  The jid of the sender on whose behalf the file stream is being
 *  created.
 * @exception Error
 *  Thrown if either parameter is null or undefined.
 */
proto._createStream = function(sid, jid) {
	if(sid == null)
		throw new Error('sid must not be null.');
	if(jid == null)
		throw new Error('jid must not be null.');
	var attrib = this._allowed[jid];
	if(attrib == null)
		return false;
	var path = attrib.path;
	var size = attrib.size;
	// Create the file stream.
	var _s = fs.createWriteStream(path, { flags: 'w+'});
	if(_s == null)
		return false;
	this._transmissions[sid] = { 'stream': _s, 'size': size,
		'path': path,
		'jid': jid,
		'transferred': 0
	};
	return this._transmissions[sid];
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

/**
 * Determines whether the specified stanza contains IBB data.
 * 
 * @param stanza
 *  The stanza to examine.
 * @returns
 *  true if the stanza contains IBB data, otherwise false.
 * @exception Error
 *  Thrown if the stanza parameter is null or undefined.
 */
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

/**
 * Determines whether the specified jid is allowed to initiate an in-band
 * bytestream with us.
 * 
 * @param jid
 *  The jid that is requesting to initiate an in-band bytestream.
 * @returns
 *  true if the in-band bytestream may be established, otherwise false.
 * @exception Error
 *  Thrown if the jid parameter is null or undefined.
 */
proto._isAllowed = function(jid) {
	if(jid == null)
		throw new Error('jid must not be null.');
	return this._allowed[jid] != null;
};

module.exports = Ibb;