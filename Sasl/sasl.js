var fs = require('fs');

/**
 * Factory for creating SASL mechanism instances. 
 */
function sasl() {
}

var proto = sasl.prototype;

proto.create = function(mechanism) {
	if(fs.existsSync('./sasl/' + mechanism + '.js') === false)
		throw new Error('SASL mechanism "' + mechanism + '" not found');
	var mech = require('./' + mechanism);
	
	return new mech();
};


module.exports = new sasl();