var fs = require('fs');

/**
 * Factory for creating SASL mechanism instances. 
 */
function sasl() {
}

var proto = sasl.prototype;

/**
 * Creates an instance of the SASL mechanism with the specified name.
 * 
 * @param mechanism
 *  The IANA name of the authentication mechanism.
 * @returns
 *  An instance of the respective SASL mechanism class.
 * @exception Error
 *  Thrown if the mechanism parameter is null or undefined or if
 *  an instance of the specified mechanism could not be instantiated.
 */
proto.create = function(mechanism) {
	if(mechanism == null)
		throw new Error('mechanism must not be null.');
	mechanism = mechanism.toLowerCase();
	if(fs.existsSync('./sasl/mechanisms/' + mechanism + '.js') === false)
		throw new Error('mechanism "' + mechanism + '" not found.');
	var mech = require('./mechanisms/' + mechanism);
	
	return new mech();
};

module.exports = new sasl();