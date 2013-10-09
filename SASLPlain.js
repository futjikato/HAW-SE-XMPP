function SASLPlain(username, password) {
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
}

var proto = SASLPlain.prototype;

proto.getResponse = function(challenge) {
	this.isCompleted = true;
	
	return "\0" + this.username + "\0" + this.password;	
};

module.exports = SASLPlain;
