/**
 * @authors     Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date        23-10-13
 * @modified    23-10-13 11:28
 * 
 * Implements the 'in-band bytestreams' extension of the Extensible
 * Messaging and Presence Protocol (XMPP) as defined per Standards
 * Track XEP-0047.
 * 
 */

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
// proto.exports = ['sendFile'];

//The XML namespace of the extension we're implementing.
proto.xmlns = 'http://jabber.org/protocol/ibb';

proto.onMessage = function(stanza) {
	return false;
};

proto.onPresence = function() {
	return false;
};

proto.onIQ = function(stanza) {
	return false;
};

module.exports = Ibb;