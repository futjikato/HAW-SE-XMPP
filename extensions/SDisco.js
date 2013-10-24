/**
 * @authors     Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date        23-10-13
 * @modified    23-10-13 19:03
 * 
 * Implements the 'service discovery' extension of the Extensible
 * Messaging and Presence Protocol (XMPP) as defined per Standards
 * Track XEP-0030.
 * 
 */

/**
 * Initializes a new instance of the SDisco class.
 * 
 * @param im
 *  A reference to the XmmpIM instance on whose behalf this instance
 *  is being created.
 */
function SDisco(im) {
	console.log('Initializing [Service Discovery] extension.');
	
	// Store a reference to the XmmpIM instance.
	this._im = im;
}

var proto = SDisco.prototype;

// Add the following list of methods to the XmppIM class.
proto.exports = ['_discoverServices'];

//The XML namespace of the extension we're implementing.
proto.xmlns = 'http://jabber.org/protocol/disco';

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
	if(!this._isDisco(stanza))
		return false;	
	// Construct a list of all installed extensions.
	var services = [];
	for(var i in this._im._extensions) {
		var ext = this._im._extensions[i];
		if(ext.xmlns != null)
			services.push(ext.xmlns);
	}
	// Construct the IQ response.
	var q = { query: [], attr: { xmlns: 'http://jabber.org/protocol/disco#info' }};
	for(var i in services)
		q.query.push({ 'feature': '', attr: { 'var': services[i]}});
	// Add the mandatory identity field.
	q.query.push({ 'identity': '', attr: { 'type': 'pc', name: 'HAW-SE-XMPP',
		category: 'client'}});
	// Send the response IQ stanza.
	var attr = { type: 'result', to: stanza.attributes.from,
			id: stanza.attributes.id };
	this._im._iq(attr, q);
	// Don't pass the stanza on to the next handler.
	return true;
};

/**
 * Determines whether the specified IQ-stanza contains a service
 * discovery request.
 * 
 * @param stanza
 *  The stanza to examine.
 * @returns
 *  true if the stanza contains a service discovery request,
 *  otherwise false.
 * @exception Error
 *  Thrown if the stanza parameter is null or undefined.
 */
proto._isDisco = function(stanza) {
	if(stanza == null)
		throw new Error('stanza must not be null.');
	if(stanza.query == null)
		return false;
	if(stanza.query.attributes == null)
		return false;
	var x = stanza.query.attributes.xmlns;
	if(x == null)
		return false;
	return x.indexOf('http://jabber.org/protocol/disco#info') == 0;
};

/**
 * Discovers the services supported by the client using the specified JID.
 * 
 * @param jid
 *  The JID to discover the supported services for. Note that this will
 *  usually be a 'full jid' (i.e. including a resource identifier).
 * @param cb
 *  A callback method which will be invoked once the supported services
 *  have been fetched.
 * @exception Error
 *  Thrown if either parameter is null or undefined.
 */
proto._discoverServices = function(jid, cb) {
	if(jid == null)
		throw new Error('jid must not be null.');
	if(cb == null)
		throw new Error('cb must not be null.');
	var q = { query: '', attr: {
		xmlns: 'http://jabber.org/protocol/disco#info'}
	};
	
	this._im._iq({ type: 'get', to: jid }, q, function(success, node) {
		if(!success)
			return cb(false);
		var feats = node.query.feature instanceof Array ?
				node.query.feature : [node.query.feature];
		var offered = [];
		for(var i in feats) {
			var f = feats[i];
			if(f.attributes['var'] == null)
				continue;
			offered.push(f.attributes['var']);
		}
		var ret = { 'features': offered };
		if(node.query.identity != null)
			ret.identity = node.query.identity.attributes;	
		// Pass constructed object to callback.
		cb(true, ret);
	});
};

module.exports = SDisco;