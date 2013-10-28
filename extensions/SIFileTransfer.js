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
//proto.exports = [];

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
	return false;
};

module.exports = SIFileTransfer;