/**
 * @authors	 	Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date 		10-10-13
 * 
 */

/**
 * The base 'class' for SASL mechanism implementations.
 */
function mechanism() {
}

/**
 * Adds the specified key/value pair to the mechanism's collection
 * of properties.
 * 
 * @param key
 *  The key under which to add the value.
 * @param value
 *  The value to add to the set of properties.
 * @returns
 *  Nothing.
 */
mechanism.prototype.add = function(key, value) {
	if(this._properties === undefined)
		this._properties = {};
	this._properties[key] = value;
};

module.exports = mechanism;