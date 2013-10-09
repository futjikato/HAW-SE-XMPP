function SASLScramSha1(username, password) {
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

var proto = SASLScramSha1.prototype;

proto.getResponse = function(challenge) {
	if(this._step === 0)
		return this._computeInitialResponse();
	
	return "\0" + this.username + "\0" + this.password;	
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

module.exports = SASLScramSha1;