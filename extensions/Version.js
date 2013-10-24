/**
 * @authors     Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date        23-10-13
 * @modified    23-10-13 21:06
 * 
 * Implements the 'software version' extension of the Extensible
 * Messaging and Presence Protocol (XMPP) as defined per Standards
 * Track XEP-0092.
 * 
 */
var _name    = 'HAW-SE-XMPP';
var _version = '1.2.3.4';

/**
 * Initializes a new instance of the Version class.
 * 
 * @param im
 *  A reference to the XmmpIM instance on whose behalf this instance
 *  is being created.
 */
function Version(im) {
	console.log('Initializing [Software Version] extension.');
	
	// Store a reference to the XmmpIM instance.
	this._im = im;
}

var proto = Version.prototype;

// Add the following list of methods to the XmppIM class.
proto.exports = ['getVersion'];

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
	if(!this._isVersion(stanza))
		return false;
	// Handle version stanza.
	var attr = {
		type: 'result',
		to: stanza.from,
		id: stanza.id
	};
	// FIXME: Where should we store name and version information?
	// Construct the response.
	var q = { query: {name: _name, version: _version},
		attr: { xmlns: 'jabber:iq:version'}};
	// Send the response IQ stanza.
	this._im._iq(attr, q);
	// Don't pass the stanza on to the next handler.
	return true;
};

/**
 * Determines whether the specified IQ-stanza contains a software
 * version request.
 * 
 * @param stanza
 *  The stanza to examine.
 * @returns
 *  true if the stanza contains a software version request,
 *  otherwise false.
 * @exception Error
 *  Thrown if the stanza parameter is null or undefined.
 */
proto._isVersion = function(stanza) {
	if(stanza == null)
		throw new Error('stanza must not be null.');
	if(stanza.query == null)
		return false;
	if(stanza.query.attributes == null)
		return false;
	var x = stanza.query.attributes.xmlns;
	if(x == null)
		return false;
	return x.indexOf('jabber:iq:version') == 0;
};

/**
 * Retrieves the name and version of the client used by the specified JID.
 * 
 * @param jid
 *  The JID to retrieve version information for. Note that this will usually
 *  be a 'full jid' (i.e. including a resource identifier).
 * @param cb
 *  A callback method which will be invoked once the operation has been
 *  completed.
 * @exception Error
 *  Thrown if either parameter is null or undefined.
 */
proto.getVersion = function(jid, cb) {
	if(jid == null)
		throw new Error('jid must not be null.');
	if(cb == null)
		throw new Error('cb must not be null.');
	var q = { query: '', attr: {
		xmlns: 'jabber:iq:version' }
	};
	// Perform the IQ request.
	this._im._iq({ type: 'get', to: jid }, q, function(success, node) {
		if(!success)
			return cb(false);
		// Name and version are mandatory, os is optional.
		var ret = {
			name: node.query.name.text,
			version: node.query.version.text
		};
		if(node.query.os != null)
			ret.os = node.query.os.text;
		cb(true, ret);
	});
};

module.exports = Version;