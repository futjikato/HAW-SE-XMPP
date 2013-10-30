/**
 * @authors	 	Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date 		10-10-13
 * 
 * Implements the SCRAM-SHA-1 authentication mechanism.
 */
var mechanism = require('../mechanism');
var util = require('util');
var crypto = require('crypto');

/**
 * Implements the SCRAM-SHA-1 SASL authentication mechanism.
 */
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
	 * The client nonce value used during authentication.
	 */
	this._cnonce = this._generateCnonce();
	
	/**
	 * The salted password hash. This is populated during the authentication
	 * exchange.
	 */
	this._saltedPassword = null;
	
	/**
	 * The auth message component of the algorithm. This is populated during
	 * the authentication exchange.
	 */
	this._authMessage = null;
}

/**
 * Inherit from mechanism base class.
 */
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
 * @throws Error
 *  Thrown if the username and/or password properties have not
 *  been set.
 */
proto._computeInitialResponse = function() {
	if(this._properties.username == null)
		throw new Error('The "username" property must be set.');
	if(this._properties.password == null)
		throw new Error('The "password" property must be set.');
	var username = this._properties.username;
	var ret = "n,,n=" + this._saslPrep(username) + ",r=" +
		this._cnonce;
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
 * @exception Error
 *  Thrown if the challenge parameter is null or undefined.
 */
proto._computeFinalResponse = function(challenge) {
	if(challenge == null)
		throw new Error('challenge must not be null.');
	var username = this._properties.username;
	var password = this._properties.password;
	var nv = this._parseServerFirstMessage(challenge);
	// Extract the server data needed to calculate the client proof.
	var salt = nv.s, nonce = nv.r;
	var iterationCount = nv.i;
	if (!this._verifyServerNonce(nonce))
		throw new Error("Invalid server nonce: " + nonce);
	// Calculate the client proof (refer to RFC 5802, p.7).
	var clientFirstBare = "n=" + this._saslPrep(username) + ",r=" + this._cnonce,
		serverFirstMessage = challenge,
		withoutProof = "c=" + (new Buffer('n,,').toString('base64')) + ",r=" +
			nonce;
	// Needed later on to verify server's signature.
	this._authMessage = clientFirstBare + "," + serverFirstMessage + "," +
		withoutProof;
	this._saltedPassword = this._hi(password, salt, iterationCount);
	var clientKey = this._hmac(this._saltedPassword, 'Client Key'),
		storedKey = this._h(clientKey),
		clientSignature = this._hmac(storedKey, this._authMessage),
		clientProof = this._xor(clientKey, clientSignature);
	// Construct the client final message.
	return withoutProof + ",p=" + (new Buffer(clientProof).toString('base64'));
};

/**
 * Verifies the server signature which is sent by the server as the final
 * step of the authentication process.
 * 
 * @param challenge
 *  The server signature.
 * @returns
 *  The client's response to the server. This will be an empty string if
 *  verification was successful or any other value to indicate failure.
 * @exception Error
 *  Thrown if the challenge parameter is null or undefined.
 */
proto._verifyServerSignature = function(challenge) {
	if(challenge == null)
		throw new Error('challenge must not be null.');
	// The server must respond with a "v=signature" message.
	if (challenge.indexOf("v=") !== 0) {
		// Cancel authentication process.
		return 'invalid';
	}
	var serverSignature = new Buffer(challenge.substring(2), 'base64');
	// Verify server's signature.
	var serverKey = this._hmac(this._saltedPassword, "Server Key");
	var	calculatedSignature = this._hmac(serverKey, this._authMessage);
	// If both signatures are equal, server has been authenticated. Otherwise
	// cancel the authentication process.
	for(var i = 0; i < serverSignature.length; i++) {
		if(serverSignature[i] != calculatedSignature[i])
			return 'invalid';
	}
	// The empty string indicates successful authentication.
	return '';
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
 * @exception Error
 *  Thrown if any of the arguments is null or undefined or if
 *  the count parameter is not of type integer.
 */
proto._hi = function(password, salt, count) {
	if(password == null)
		throw new Error('password must not be null.');
	if(salt == null)
		throw new Error('salt must not be null.');
	if(count == null)
		throw new Error('count must not be null.');
	// count must be an actual integer, otherwise pbkdf2Sync
	// complains about it.
	if(typeof count !== 'number' || count % 1 != 0)
		throw new Error('count must be an integer.');
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
 * @exception Error
 *  Thrown if either argument is null or undefined.
 */
proto._hmac = function(key, data) {
	if(key == null)
		throw new Error('key must not be null.');
	if(data == null)
		throw new Error('data must not be null.');
	return crypto.createHmac('sha1', key).update(data).digest();
};

/**
 * Applies the cryptographic hash function SHA-1 to the specified data.
 * 
 * @param data
 *  The data to hash.
 * @returns
 *  The hash value as an array of bytes for the specified data.
 * @exception Error
 *  Thrown if the data argument is null or undefined.
 */
proto._h = function(data) {
	if(data == null)
		throw new Error('data must not be null.');
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
 * @exception Error
 *  Thrown if either argument is null or undefined or if both
 *  arguments are not of the same length.
 */
proto._xor = function(a, b) {
	if(a == null)
		throw new Error('a must not be null.');
	if(b == null)
		throw new Error('b must not be null.');
	if(a.length != b.length)
		throw new Error('Arrays must be of same length.');
	var ret = [];
	for(var i = 0; i < a.length; i++)
		ret[i] = a[i] ^ b[i];
	return ret;
};

/**
 * Verifies the nonce value sent by the server.
 * 
 * @param nonce
 *  The nonce value sent by the server as part of the server-first-message.
 * @returns
 *  True if the nonce value is valid, otherwise false.
 * @exception Error
 *  Thrown if the nonce parameter is null or undefined.
 */
proto._verifyServerNonce = function(nonce) {
	if(nonce == null)
		throw new Error('nonce must not be null.');
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
 * @exception Error
 *  Thrown if the challenge parameter is null or undefined.
 */
proto._parseServerFirstMessage = function(challenge) {
	if(challenge == null)
		throw new Error('challenge must not be null.');
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
	if(coll.i !== undefined)
		coll.i = parseInt(coll.i, 10);
	return coll;
};

/**
 * Prepares the specified string as is described in RFC 5802.
 * 
 * @param s
 *  The string to SASL-prepare.
 * @returns
 *  The SASL prep'd string.
 * @exception Error
 *  Thrown if the parameter s is null or undefined.
 */
proto._saslPrep = function(s) {
	if(s == null)
		throw new Error('s must not be null.');
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
    var s = '';
    var c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for(var i = 0; i < 24; i++)
        s += c.charAt(Math.floor(Math.random() * c.length));
    return s;	
};

module.exports = scramsha1;