var mechanism = require('./mechanism');
var util = require('util');

/**
 * Implements the DIGEST-MD5 SASL authentication mechanism.
 */
function digestmd5() {	
	/**
	 * True if the mechanisms requires initiation by the client. 
	 */
	this.hasInitial = false;
	
	/**
	 * True if the mechanism has completed.
	 */
	this.isCompleted = false;
}

/**
 * Inherit from mechanism base class.
 */
util.inherits(digestmd5, mechanism);
var proto = digestmd5.prototype;

/**
 * Computes the client response to the specified SCRAM-SHA-1 challenge.
 * 
 * @param challenge
 *  The server-challenge to respond to.
 * @returns
 *  The client-response to the specified server-challenge.
 */
proto.getResponse = function(challenge) {
	throw new Error('Not implemented.');
};

module.exports = digestmd5;