var mechanism = require('./mechanism');
var util = require('util');

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

util.inherits(plain, mechanism);
var proto = plain.prototype;

proto.getResponse = function(challenge) {
	var username = this._properties.username;
	var password = this._properties.password;
	
	this.isCompleted = true;
	
	return "\0" + username + "\0" + password;	
};

module.exports = plain;
