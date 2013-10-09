var mechanism = require('./mechanism');
var util = require('util');

function scramsha1(username, password) {
	this.username = username;
	this.password = password;
	
	/**
	 * True if the mechanisms requires initiation by the client. 
	 */
	this.hasInitial = true;
	
	/**
	 * True if the mechanism has completed.
	 */
	this.isCompleted = false;
	
	/**
	 * The step we are currently at.
	 */
	this._step = 0;
}

util.inherits(scramsha1, mechanism);
var proto = scramsha1.prototype;

proto.getResponse = function(challenge) {
	if(this._step === 0)
		return this._computeInitialResponse();

	throw new Error('Not implemented.');
};

proto._computeInitialResponse = function() {
	var ret = "n,,n=" + this._saslPrep(this.username) + ",r=" +
		"fyko+d2lbbFgONRv9qkxdawL";
	console.log(ret);
	return ret;
};

proto._saslPrep = function(s) {
	return s
	.replace(/=/, "=3D")
	.replace(/\,/, "=2C");
};

module.exports = scramsha1;