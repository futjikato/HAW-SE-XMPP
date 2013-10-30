/**
 * @authors	 	Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date 		10-10-13
 * 
 * Implements th PLAIN authentication mechanism.
 */
var mechanism = require('../mechanism');
var util = require('util');

/**
 * Implements the PLAIN authentication mechanism.
 * @returns
 */
function plain() {	
	/**
	 * True if the mechanisms requires initiation by the client. 
	 */
	this.hasInitial = true;
	
	/**
	 * True if the mechanism has completed.
	 */
	this.isCompleted = false;
}

/**
 * Inherit from mechanism base class.
 */
util.inherits(plain, mechanism);
var proto = plain.prototype;

/**
 * Computes the client response to the specified challenge.
 * 
 * @param challenge
 *  The server-challenge to respond to.
 * @returns
 *  The client-response to the server-challenge.
 */
proto.getResponse = function(challenge) {
	var username = this._properties.username;
	var password = this._properties.password;
	
	this.isCompleted = true;
	
	return "\0" + username + "\0" + password;	
};

module.exports = plain;
