/**
 * @authors	 	Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date 		10-10-13
 * 
 * Implements the DIGEST-MD5 authentication mechanism.
 */
var mechanism = require('../mechanism');
var util = require('util');
var crypto = require('crypto');

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
	
	/**
	 * The step we are currently at.
	 */
	this._step = 0;
	
	/**
	 * The client nonce value used during authentication.
	 */
	this._cnonce = this._generateCnonce();	
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
	if(this._step === 1)
		this.isCompleted = true;
	// If authentication succeeds, the server responds with another
	// challenge for signature validation (which we ignore).
	var ret = this._step === 0 ? this._computeDigestResponse(challenge) :
		'';
	this._step = this._step + 1;
	return ret;
};

/**
 * Computes the digest response sent by the client to the server.
 * 
 * @param challenge
 *  The challenge sent by the server.
 * @returns
 *  The digest-response-string to be sent to the server.
 * @throws Error
 *  Thrown if the username and/or password properties have not
 *  been set.
 */
proto._computeDigestResponse = function(challenge) {
	if(this._properties.username == null)
		throw new Error('The "username" property must be set.');
	if(this._properties.password == null)
		throw new Error('The "password" property must be set.');
	var username = this._properties.username;
	var fields = this._parseDigestChallenge(challenge);
	var digestUri = 'xmpp/' + fields.realm;
	var responseValue = this._computeDigestResponseValue(fields,
		this._cnonce, digestUri);
	// Create the challenge-response string.
	var directives = [
		'charset=utf-8',
		'username=' + this._dquote(username),
		'realm=' + this._dquote(fields.realm),
		'nonce='+ this._dquote(fields.nonce),
		'nc=00000001',
		'cnonce=' + this._dquote(this._cnonce),
		'digest-uri=' + this._dquote(digestUri),
		'response=' + responseValue,
		'qop=' + fields.qop
	];
	// Finally, return the response as a comma-separated string.	
	return directives.join();
};

/**
 * Computes the 'response-value' hex-string which is part of the
 * digest-md5 challenge-response.
 * 
 * @param challenge
 *  A collection containing the attributes and values of the challenge
 *  sent by the server.
 * @param cnonce
 *  The cnonce value to use for computing the response-value.
 * @param digestUri
 *  The 'digest-uri' string to use for computing the response-value.
 * @returns
 *  A string containing the hash-value which is part of the response
 *  sent by the client.
 */
proto._computeDigestResponseValue = function(challenge, cnonce, digestUri) {
	var username = this._properties.username;
	var password = this._properties.password;
	// FIXME: This expects encoding to be 'utf-8' whereas 'ascii' is also
	// allowed.
	var ncValue = '00000001', realm = challenge.realm;	
	// Construct A1.
	var data = new Buffer(username + ':' + realm + ':' + password);
	data = crypto.createHash('md5').update(data).digest();
	var A1 = data.toString('utf-8') + ':' + challenge.nonce + ':' + cnonce;
	// Construct A2.
	var A2 = "AUTHENTICATE:" + digestUri;
	if(challenge.qop.match(/^auth$/) === null)
		A2 = A2 + ':00000000000000000000000000000000';
	var ret = this._md5(A1) + ':' + challenge.nonce + ':' + ncValue + ':' +
		cnonce + ':' + challenge.qop + ':' + this._md5(A2);
	return this._md5(ret);
};

/**
 * Computes the MD5-hash of the specified data and returns it as a
 * hex-string.
 * 
 * @param s
 *  The data to compute the MD5-hash for.
 * @returns
 *  The MD5-hash of the data as a hex-string. 
 */
proto._md5 = function(s) {
	return crypto.createHash('md5').update(s, 'utf-8').digest('hex');
};

/**
 * Parses the challenge string sent by the server.
 * 
 * @param challenge
 *  The challenge sent by the server.
 * @returns
 *  An object containing key/value pairs extracted from the
 *  server message.
 * @exception Error
 *  Thrown if the challenge parameter is null or undefined.
 */
proto._parseDigestChallenge = function(challenge) {
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
		coll[name] = this._trimQuotes(value);
	}
	return coll;	
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

/**
 * Trims leading and trailing double-quotes off a string.
 * 
 * @param s
 *  The string to trim.
 * @returns
 *  The trimmed string.
 */
proto._trimQuotes = function(s) {
	return s.replace(/^\"|\"$/g, '');
};

/**
 * Encloses the specified string in double-quotes.
 * 
 * @param s
 *  The string to enclose in double-quotes.
 * @return
 *  The input string enclosed in double-quotes.
 */
proto._dquote = function(s) {
	return '"' + s + '"';
};

module.exports = digestmd5;