var fs = require('fs');

/**
 * Factory for creating SASL mechanism instances. 
 */
function sasl() {
}

var proto = sasl.prototype;

proto.create = function(mechanism) {
	mechanism = mechanism.toLowerCase();
	if(fs.existsSync('./sasl/mechanisms/' + mechanism + '.js') === false)
		throw new Error('SASL mechanism "' + mechanism + '" not found');
	var mech = require('./mechanisms/' + mechanism);
	
	return new mech();
};


module.exports = new sasl();