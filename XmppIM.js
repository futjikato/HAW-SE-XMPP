/**
 * @authors     Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date        14-10-13
 * @modified	14-10-13 13:11
 * 
 * Implements the basic instant messaging (IM) and presence functionality of the
 * Extensible Messaging and Presence Protocol (XMPP) as defined per RFC 3921.
 * 
 */
var events = require('events');
var XmppCore = require('./XmppCore');

/**
 * Initializes a new instance of the XmppIM class.
 * 
 * @param opts
 *  A set of options, some of which are required:
 *   'host'      specifies the hostname of the XMPP server.
 *   'jid'       the bare jid/username to connect with.
 *   'password'  the password for the respective jid.
 *  optional:
 *   'port'      the port on which to connect. Defaults to 5222,
 *               if not specified.
 */
function XmppIM(opts) {
	var core = new XmppCore(opts);
	var that = this;
	// Setup handlers for events exposed by XmppCore.
	core.on('message',  function(s) {
		that._onMessage.call(that, s); })
		.on('presence', function(s) {
			that._onPresence.call(that, s); })
		.on('ready',    function() {
			that._onReady.call(that); })
		.on('error',	function(e) {
			that.emit('error', e); })
		.connect();
	this._core = core;
}

/**
 * Inherit from EventEmitter.
 */
require('util').inherits(XmppIM, events.EventEmitter);
var proto = XmppIM.prototype;

proto._onMessage = function(stanza) {
	
};

proto._onPresence = function(stanza) {
	
};

proto._onReady = function() {
	console.log('Send a presence stanza');
};

module.exports = XmppIM;