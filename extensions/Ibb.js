/**
 * @authors     Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date        23-10-13
 * @modified    30-10-13 15:24
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

/**
 * Initiates a file-transfer through in-band bytestreaming.
 * 
 * @param jid
 *  The jid with which to initiate an in-band bytestream.
 * @param file
 *  The path of the file to transfer.
 * @param sid
 *  The id of the session through which in-band bytestreaming has
 *  been negotiated. This is usually received during stream initiation.
 * @cb
 *  A user-provided callback invoked to inform the user on the status
 *  and progress of the file transfer.
 * @exception Error
 *  Thrown if the jid, file or sid parameter is null or undefined.
 */
proto._ibb = function(jid, file, sid, cb) {
	if(jid == null)
		throw new Error('jid must not be null.');
	if(file == null)
		throw new Error('file must not be null.');
	if(sid == null)
		throw new Error('sid must not be null.');
	// Make sure file exists.
	var stats = fs.statSync(file);
	if(stats == false)
		throw new Error('Could not open file: ' + file + '.');
	var chunkSize = 4096;
	// Open IBB stream.
	this._openStream(jid, sid, chunkSize, function(success) {
		if(!success)
			return cb(false, 'Could not establish in-band bytestream.');
		// Open the file.
		var fd = fs.openSync(file, 'r');
		if(fd == null)
			return cb(false, 'Could not open file.');
		// Keep reading and sending chunks.
		this._transmit({ 'fd': fd, 'size': chunkSize, 'to': jid,
			'sid': sid, 'filename': file, 'filesize': stats.size }, cb);
	});	
};

/**
 * Attempts to open an in-band bytestream with the specified jid.
 * 
 * @param jid
 *  The jid to establish an in-band bytestream with.
 * @param sid
 *  The session identifier for the stream as negotiated during
 *  stream initiation.
 * @blockSize
 *  The maximum size of a single block of data prior to base64
 *  encoding.
 * @cb
 *  A callback method invoked once the operation has completed.
 * @exception Error
 *  Thrown if any of the parameters is null or invalid.
 */
proto._openStream = function(jid, sid, blockSize, cb) {
	if(jid == null)
		throw new Error('jid must not be null.');
	if(sid == null)
		throw new Error('sid must not be null.');
	if(blockSize == null)
		throw new Error('blockSize must not be null.');
	if(cb == null)
		throw new Error('cb must not be null.');
	var o = { open: '', attr: {
		'xmlns': 'http://jabber.org/protocol/ibb',
		'block-size': blockSize,
		'sid': sid,
		'stanza': 'iq'
	}};
	var that = this;
	this._im._iq({ type: 'set', to: jid }, o, function(success, node) {
		cb.call(that, success);
	});
};

/**
 * Closes an established in-band bytestream.
 * 
 * @param jid
 *  The jid with which the in-band bytestream should be closed.
 * @param sid
 *  The session id associated with the bytestream.
 * @exception Error
 *  Thrown if either parameter is null or undefined.
 */
proto._closeStream = function(jid, sid) {
	if(jid == null)
		throw new Error('jid must not be null.');
	if(sid == null)
		throw new Error('sid must not be null.');
	var o = { close: '', attr: {
		'xmlns': 'http://jabber.org/protocol/ibb',
		'sid':   sid
	}};
	this._im._iq({ type: 'set', to: jid }, o);
};

/**
 * Transmits chunks of the file until it has been fully transferred
 * after which the in-band bytestream is torn down.
 * 
 * @param opts.
 *  An object containing the jid, sid, chunk-size, file descriptor
 *  of the file being sent and other attributes.
 * @param cb
 *  The user-provided callback to invoke once the file transfer has
 *  completed.
 * @param seq
 *  This is optional. If provided it contains the sequence-id of the
 *  in-band data-unit being sent.
 * @exception Error
 *  Thrown if either parameter is null or undefined.
 */
proto._transmit = function(opts, cb, seq) {
	if(opts == null)
		throw new Error('opts must not be null.');
	if(seq == null)
		seq = 0;
	if(opts.bytesRead == null)
		opts.bytesRead = 0;
	var buf = new Buffer(opts.size);
	var bytesRead = fs.readSync(opts.fd, buf, 0, opts.size, null);
	// Done.
	if(bytesRead == 0)
		return this._completeTransfer(opts, cb);
	// Base64 decode chunk of data.
	var b64 = buf.toString('base64', 0, bytesRead);
	var o = { data: b64, attr: {
		'xmlns': 'http://jabber.org/protocol/ibb',
		'sid': opts.sid,
		'seq': seq
	}};
	var that = this;
	this._im._iq({
		type: 'set',
		to: opts.to }, o, function(success, node) {
			if(!success) {
				if(cb != null)
					cb(false, opts.to + ' cancelled the file transfer.');
			}
			// Sequence is defined as being 16-bit unsigned.
			var next_seq = seq + 1;
			if(next_seq > 65535)
				next_seq = 0;
			opts.bytesRead += bytesRead;
			// Inform the user.
			if(cb != null) {
				cb(true, {
					transferred: opts.bytesRead,
					size: opts.filesize,
					name: opts.filename
				});
			}
			that._transmit(opts, cb, next_seq);
		}
	);
};

/**
 * Closes the in-band bytestream and completes the file transfer.
 * 
 * @param opts.
 *  An object containing the jid, sid, chunk-size and file descriptor
 *  of the file being sent.
 * @param cb
 *  A user-provided callback.
 * @exception Error
 *  Thrown if the opts parameter is null or invalid.
 */
proto._completeTransfer = function(opts, cb) {
	if(opts == null)
		throw new Error('opts must not be null.');
	// Close the file.
	fs.closeSync(opts.fd);
	// Tear down the in-band bytestream.
	this._closeStream(opts.to, opts.sid);
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