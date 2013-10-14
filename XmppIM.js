/**
 * @authors     Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date        14-10-13
 * @modified	14-10-13 14:57
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

/**
 **** Public API ****
 */

/**
 **** Private methods ****
 */

/**
 * Constructs and sends a message stanza to the server.
 * 
 * @param o
 *  An object made up of the following fields, some of which are required:
 *   'to'       specifies the recipient of the message (required).
 *   'type'     specifies the type of the message. Possible values are:
 *              'chat', 'error', 'groupchat', 'headline' or 'normal'. If this
 *              is not specified, it defaults to 'normal'.
 *   'thread'   the identifier of the conversation thread this message should
 *              be added to (optional).
 *   'subject'  the subject of the message (optional). If specified, this can
 *              either be a string or an object literal in the form of:
 *              {
 *                'de': 'Deutscher Text',
 *                'en': 'English Text'
 *              }
 *   'body'     the body of the message (optional). If specified, this can
 *              either be a string or an object literal in the form of:
 *              {
 *                'de': 'Deutscher Text',
 *                'en': 'English Text'
 *              }
 * @this
 *  References the XmppIM instance.
 * @exception Error
 *  Thrown if the argument or any of its fields are invalid.
 */
proto._message = function(o) {
	var types = ['chat', 'error', 'groupchat', 'headline', 'normal'];
	if(o.type != null && types.indexOf(o.type) < 0)
		throw new Error('Invalid message type.');
	var m = [];
	if(o.thread != null) {
		if(typeof o.thread != 'string')
			throw new Error('Thread must be of type string.');
		m.push({ thread: o.thread });
	}
	if(o.subject != null) {
		if(typeof o.subject == 'string')
			m.push({subject: o.subject});
		else if(typeof o.subject == 'object') {
			for(var e in o.subject)
				m.push({subject: o.subject[e], attr: {'xml:lang': e}});
		}
		else
			throw new Error('Subject must be a string or an object.');
	}
	if(o.body != null) {
		if(typeof o.body == 'string')
			m.push({body: o.body});
		else if(typeof o.body == 'object') {
			for(var d in o.body)
				m.push({body: o.body[d], attr: {'xml:lang': d}});
		}
		else
			throw new Error('Body must be a string or an object.');
	}
	this._core.message({ to: o.to, type: o.type || 'normal' }, m);
};

/**
 * Constructs and sends a presence stanza to the server.
 * 
 * @param o
 *  An object made up of the following fields, all of which are optional:
 *   'to'       specifies the recipient of the presence stanza.
 *   'type'     specifies the type of the presence stanze. Possible values are:
 *              'unavailable', 'subscribe', 'subscribed', 'unsubscribe',
 *              'unsubscribed', 'probe' or 'error'.
 *   'show'     specifies the particular availability status. Possible values
 *              are:
 *              'away', 'chat', 'dnd' or 'xa' (extended away).
 *   'priority' specifies the priority of the stanza and must be an integer in
 *              the range from -128 to +127.
 *   'status'   specifies a natural-language description of the availability
 *              status. If specified, this can either be a string or an object
 *              literal in the form of:
 *              {
 *                'de': 'Deutscher Text',
 *                'en': 'English Text'
 *              }
 * @this
 *  References the XmppIM instance.
 * @exception Error
 *  Thrown if the argument or any of its fields are invalid.
 */
proto._presence = function(o) {
	var types = ['unavailable', 'subscribe', 'subscribed', 'unsubscribe',
	             'unsubscribed', 'probe', 'error'];
	var show = ['away', 'chat', 'dnd', 'xa'];
	if(o == null)
		return this._core.presence();
	if(o.type != null && types.indexOf(o.type) < 0)
		throw new Error('Invalid presence type.');	
	if(o.show != null && show.indexOf(o.show) < 0)
		throw new Error('Invalid value for show.');
	var m = [];
	if(o.priority != null)
		m.push({ priority: o.priority });
	if(o.show != null)
		m.push({ show: o.show });
	if(o.status != null) {
		if(typeof o.status == 'string')
			m.push({status: o.status});
		else if(typeof o.status == 'object') {
			for(var e in o.status)
				m.push({status: o.status[e], attr: {'xml:lang': e}});
		}
		else
			throw new Error('Subject must be a string or an object.');
	}
	this._core.presence({ to: o.to, type: o.type }, m);
};

/**
 * Constructs and sends an IQ stanza to the server.
 * 
 * @param attr
 *  The attributes of the IQ stanza element. The 'id' attribute is
 *  added automatically. This may be null if not needed.
 * @param data
 *  The content of the IQ stanza as a json object.
 * @param cb
 *  A callback method invoked once the respective result stanza
 *  gets back to the client. The callback is executed in the context
 *  of the caller.
 * @this
 *  References the XmppIM instance. 
 * @exception Error
 *  Thrown if the 'data' or 'cb' parameters are null or undefined.
 */
proto._iq = function(attr, data, cb) {
	// Call callback in the context of the XmppIM instance.
	var that = this;
	this._core.iq(attr, data, function(success, node) {
		cb.call(that, success, node);
	});
};

/**
 * Callback method invoked when a new message stanza has been received.
 * 
 * @param stanza
 *  The 'message'-stanza received from the server.
 * @this
 *  References the XmppIM instance.
 */
proto._onMessage = function(stanza) {
	console.log('Neue Nachricht ----');
	console.log(stanza);
};

/**
 * Callback method invoked when a new presence stanza has been received.
 * 
 * @param stanza
 *  The 'presence'-stanza received from the server.
 * @this
 *  References the XmppIM instance.
 */
proto._onPresence = function(stanza) {
	console.log('Neue Presence ----');
	console.log(stanza);
};

/**
 * Callback method invoked when the core-component has finished negotiating
 * the XML stream with the server. At this point, messages may be sent.
 * 
 * @this
 *  References the XmppIM instance.
 */
proto._onReady = function() {
	console.log('Send a presence stanza');
	this._presence();
};

module.exports = XmppIM;