var util = require('util');

function XMPPException(S) {
	this.message = S || 'General exception';
}

util.inherits(XMPPException, Error);
XMPPException.prototype.name = 'XMPPException';

module.exports = XMPPException;