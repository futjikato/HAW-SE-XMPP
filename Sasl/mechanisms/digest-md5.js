var mechanism = require('./mechanism');
var util = require('util');

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

util.inherits(digestmd5, mechanism);
var proto = digestmd5.prototype;

proto.getResponse = function(challenge) {
	this.isCompleted = true;

	throw new Error('Not implemented.');
};

module.exports = digestmd5;