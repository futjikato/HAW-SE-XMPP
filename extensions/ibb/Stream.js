/**
 * @authors     Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date        28-10-13
 * @modified    28-10-13 09:56
 * 
 * Represents an 'in-band bytestream' object through which arbitrary
 * binary data can be exchanged.
 * 
 */

/**
 * Initializes a new instance of the Stream class using the specified
 * set of options.
 * 
 * @param opts
 *  An object made up of the following fields, some of which are
 *  required:
 *  
 * @exception Error
 *  Thrown if the argument is null or undefined or contains any illegal
 *  values.
 */
function Stream(opts) {
	if(opts == null)
		throw new Error('opts must not be null.');
};

var proto = Stream.prototype;

// Event: 'receive'

proto.open = function() {
	// <open>
};

proto.send = function() {
	// <data>
};

proto.close = function() {
	// <close>
};

module.exports = Stream;