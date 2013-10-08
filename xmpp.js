var net = require('net');
var cl = require('./XMPPClient');

/**
 * A module for connecting to an XMPP server.
 */
function xmpp() {
}

/**
 * A reference to the prototype.
 */
var proto = xmpp.prototype;

/**
 * 
 */

proto.create = function(opts) {
	return new cl(opts);
};

/**
 * The version of the module.
 */
proto.version = 'v12.34.i3';


module.exports = new xmpp();