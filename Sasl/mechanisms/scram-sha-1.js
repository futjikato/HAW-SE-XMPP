var mechanism = require('../mechanism');
var util = require('util');
var crypto = require('crypto');

function scramsha1() {	
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
	
	/**
	 * 
	 */
	this._cnonce = this._generateCnonce();
}

util.inherits(scramsha1, mechanism);
var proto = scramsha1.prototype;

/**
 * Computes the client response to the specified SCRAM-SHA-1 challenge.
 * 
 * @param challenge
 *  The server-challenge to respond to.
 * @returns
 *  The client-response to the specified server-challenge.
 */
proto.getResponse = function(challenge) {
		
	if (this._step == 2)
		this._isCompleted = true;
	var ret = this._step === 0 ? this._computeInitialResponse() :
		(this._step === 1 ? this._computeFinalResponse(challenge) :
		this._verifyServerSignature(challenge));
	this._step = this._step + 1;	
	
	return ret;
};

/**
 * Computes the initial response sent by the client to the server.
 * 
 * @returns
 *  The initial-response-string to be sent to the server.
 */
proto._computeInitialResponse = function() {
	var username = this._properties.username;
	var ret = "n,,n=" + this._saslPrep(username) + ",r=" +
		this._cnonce;
	console.log(ret);
	return ret;
};

/**
 * Computes the "client-final-message" which completes the authentication
 * process.
 * 
 * @param challenge
 *  The "server-first-message" challenge received from the server in response
 *  to the initial client response.
 * @returns
 *  The client's challenge response.
 */
proto._computeFinalResponse = function(challenge) {
	var username = this._properties.username;
	var password = this._properties.password;
	var nv = this._parseServerFirstMessage(challenge);
	// Extract the server data needed to calculate the client proof.
	var salt = nv["s"], nonce = nv["r"];
	var iterationCount = nv["i"];
	if (!this._verifyServerNonce(nonce))
		throw new Error("Invalid server nonce: " + nonce);
	// Calculate the client proof (refer to RFC 5802, p.7).
	var clientFirstBare = "n=" + this._saslPrep(username) + ",r=" + this._cnonce,
		serverFirstMessage = challenge,
		withoutProof = "c=" + (new Buffer('n,,').toString('base64')) + ",r=" +
			nonce;
	
	var authMessage = clientFirstBare + "," + serverFirstMessage + "," +
		withoutProof;
	var saltedPassword = this._hi(password, salt, iterationCount);
	var clientKey = this._hmac(saltedPassword, 'Client Key'),
		storedKey = this._h(clientKey),
		clientSignature = this._hmac(storedKey, authMessage),
		clientProof = this._xor(clientKey, clientSignature);
};

/**
 * Computes the "Hi()"-formular which is part of the client's response
 * to the server challenge.
 * 
 * @param password
 *  The supplied password to use.
 * @param salt
 *  The salt received from the server.
 * @param count
 *  The iteration count.
 * @returns
 *  An array of bytes containing the result of the computation
 *  of the "Hi()"-formula.
 */
proto._hi = function() {
	var saltBytes = new Buffer(salt, 'base64');	
	return crypto.pbkdf2Sync(password, saltBytes, count, 20);
};

/**
 * Applies the HMAC keyed hash algorithm using the specified key to
 * the specified input data.
 * 
 * @param key
 *  The key to use for initializing the HMAC provider.
 * @param data
 *  The input to compute the hashcode for.
 * @returns
 *  The hashcode of the specified input data as an array of bytes.
 */
proto._hmac = function(key, data) {
	return crypto.createHmac('sha1', key).update(data).digest();
};

/**
 * Applies the cryptographic hash function SHA-1 to the specified data.
 * 
 * @param data
 *  The data to hash.
 * @returns
 *  The hash value as an array of bytes for the specified data.
 */
proto._h = function(data) {
	return crypto.createHash('sha1').update(data).digest();	
};

/**
 * Applies the exclusive-or operation to combine the specified byte array
 * a with the specified byte array b.
 * 
 * @param a
 *  The first byte array.
 * @param b
 *  The second byte array.
 * @returns
 *  An array of bytes of the same length as the input arrays containing
 *  the result of the exclusive-or operation.
 */
proto._xor = function(a, b) {
	
}

/**
 * Verifies the nonce value sent by the server.
 * 
 * @param nonce
 *  The nonce value sent by the server as part of the server-first-message.
 * @returns
 *  True if the nonce value is valid, otherwise false.
 */
proto._verifyServerNonce = function(nonce) {
	return nonce.indexOf(this._cnonce) === 0;
};

/**
 * Parses the "server-first-message" received from the server.
 * 
 * @param challenge
 *  The challenge received from the server.
 * @returns
 *  An object containing key/value pairs extracted from the
 *  server message.
 */
proto._parseServerFirstMessage = function(challenge) {
	var coll = {};
	var p = challenge.split(',');
	for(var i in p) {
		var s = p[i];
		var delimiter = s.indexOf('=');
		if (delimiter < 0)
			continue;
		var name = s.substring(0, delimiter), value =
			s.substring(delimiter + 1);
		coll[name] = value;
	}
	return coll;
};

/**
 * Prepares the specified string as is described in RFC 5802.
 * 
 * @param s
 *  The string to SASL-prepare.
 * @returns
 *  The SASL prep'd string.
 */
proto._saslPrep = function(s) {
	return s
	.replace(/=/, "=3D")
	.replace(/\,/, "=2C");
};

/**
 * Generates a random cnonce-value which is a "client-specified data string
 * which must be different each time a digest-response is sent".
 * 
 * @returns
 *  A random "cnonce-value" string.
 */
proto._generateCnonce = function() {
	return "fyko+d2lbbFgONRv9qkxdawL";
};

module.exports = scramsha1;