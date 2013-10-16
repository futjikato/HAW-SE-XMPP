/**
 * @authors     Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date        14-10-13
 * @modified	15-10-13 15:26
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
 *
 * Public events which may be subscribed to:
 * 
 *  'ready'      emitted when the initial negotiation with the XMPP
 *               server has been completed and messages can be sent.
 *  'status'     emitted when the status of a contact of the client
 *               has changed. 
 *  'message'    emitted when a new chat message for the client has
 *               been received.
 *  'error'      emitted when an unrecoverable error has occurred and
 *               the connection to the server has been closed.
 */

/**
 * Sets the availability status of the client.
 * 
 * @param o
 *  A string specifying a natural-language description of the availability
 *  status or an object made up of the following fields, at least one of
 *  which must be provided:
 *  
 *   'show'        specifies the particular availability status of the client.
 *                 Can be one of the following values:
 *                  'away' (user is away)
 *                  'chat' (user is interested in chatting)
 *                  'dnd'  (user is busy, do not disturb)
 *                  'xa'   (user has been away for an extended period)
 *
 *   'description' a string specifying a natural-language description of the
 *                 availability status or an object literal in the form of:
 *                 {
 *                  'de': 'Statusbeschreibung auf Deutsch',
 *                  'en': 'Status description in English'
 *                 }
 *              
 * @exception Error
 *  Thrown if the parameter is null, not of the proper type or if any of the
 *  parameter's fields contain invalid values.
 */
proto.setStatus = function(o) {
	if(o == null)
		throw new Error('o must not be null.');
	if(typeof o != 'string' && typeof o != 'object')
		throw new Error('o must be a string or an object.');
	if(typeof o == 'object' && o.description == null && o.show == null)
		throw new Error('o must provide either the "description" or ' +
			'the "show" property or both.');
	var p = {};
	if(typeof o == 'string')
		p.status = o;
	else {
		if(o.description != null)
			p.status = o.description;
		if(o.show != null)
			p.show = o.show;
	}
	this._presence(p);
};

proto.getStatus = function(contact, cb) {
	if(contact == null)
		throw new Error('contact must not be null.');
	if(typeof contact != 'string')
		throw new Error('contact must be a string.');
	var p = { type: 'probe', to: contact };
	this._presence(p);
};

/**
 * Sends the specified chat message to the specified recipient.
 * 
 * @param to
 *  A string that specifies the JID of the recipient of the message.
 * @param message
 *  This can either be a string in which case it specifies the message's
 *  body or object made up of the following fields, all of which are optional:
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
 * @exception Error
 *  Thrown if either argument is null or undefined or if any of the
 *  arguments fields or values are invalid.
 */
proto.sendMessage = function(to, message) {
	if(to == null || message == null)
		throw new Error('The arguments must not be null.');
	if(typeof to != 'string')
		throw new Error('to must be a string.');
	if(typeof message != 'string' && typeof message != 'object')
		throw new Error('message must be a string or an object.');
	var o = { 'to': to };
	if(typeof message == 'string')
		o.body = message;
	else {
		if(message.type != null)
			o.type = message.type;
		if(message.thread != null)
			o.thread = message.thread;
		if(message.subject != null)
			o.subject = message.subject;
		if(message.body != null)
			o.body = message.body;
		}
	this._message(o);
};

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
	var attr = {};
	if(o.to != null)
		attr.to = o.to;
	if(o.type != null)
		attr.type = o.type;
	this._core.presence(attr, m);
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
	// Ignore messages without subject and body.
	// FIXME: should we do this?
	if(stanza.subject == null && stanza.body == null)
		return;	
	// Parse message.
	var o = { from: stanza.attributes.from || '',
		subject: '', subjects: { _default: '' },
		body: '', bodies: { _default: '' },
		type: stanza.attributes.type || 'normal' };
	if(stanza.thread != null)
		o.thread = stanza.thread.text;
	if(stanza.subject != null) {
		if(stanza.subject instanceof Array) {
			for(var i in stanza.subject) {
				var tmp = stanza.subject[i];
				var lang = tmp.attributes['xml:lang'];
				if(lang == null)
					continue;
				o.subjects[lang] = tmp.text;
			}
		} else {
			o.subject = stanza.subject.text;
			o.subject._default = o.subject;
		}
	}
	if(stanza.body != null) {
		if(stanza.body instanceof Array) {
			for(var i in stanza.body) {
				var tmp = stanza.body[i];
				var lang = tmp.attributes['xml:lang'];
				if(lang == null)
					continue;
				o.bodies[lang] = tmp.text;
			}
		} else {
			o.body = stanza.body.text;
			o.bodies._default = o.body;
		}		
	}
	// Emit the 'message' event.
	this.emit('message', o);
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
	// Status notifications don't have the 'type' attribute.
	if(stanza.attributes.type == null)
		this._handleStatusNotification(stanza);
	
};

/**
 * Callback method invoked when the core-component has finished negotiating
 * the XML stream with the server. At this point, messages may be sent.
 *
 * @this
 *  References the XmppIM instance.
 */
proto._onReady = function() {
	// Shortcut for convenience.
	this._jid = this._core.jid;
	
	// Request roster on login (as recommended in XMPP-IM).
	this._retrieveRoster(function(success, roster) {			
		// Announce initial presence
		// (Refer to XMPP-IM 'Initial Presence').
		this._presence();
		
		// Emit the public 'ready' event.
		this.emit('ready', { jid: this._jid, 'roster': roster });
	});	
};

/**
 * Presence Information
 */

/**
 * Parses the specified status notification and emits the parsed data as
 * part of the public 'status' event.
 * 
 * @param stanza
 *  A 'presence' stanza which contains status information of a contact.
 * @this
 *  References the XmppIM instance.
 */
proto._handleStatusNotification = function(stanza) {
	var from = stanza.attributes.from;
	// Ignore our own status changes.
	if(from == this._jid)
		return;
	// Parse notification.
	var o = { available: stanza.show == null, description: '',
		descriptions: { _default: '' } };
	if(stanza.show != null)
		o.show = stanza.show.text;
	if(stanza.status != null) {
		if(stanza.status instanceof Array) {
			for(var i in stanza.status) {
				var tmp = stanza.status[i];
				var lang = tmp.attributes['xml:lang'];
				if(lang == null)
					continue;
				o.descriptions[lang] = tmp.text;
			}
		} else {
			o.description = stanza.status.text;
			o.descriptions._default = o.description;
		}
	}	
	// Emit the 'status' event.
	this.emit('status', from, o);
};

/**
 * Roster Management (For details, refer to XMPP-IM, 7. Roster Management).
 */

/**
 * Retrieves the client's current roster from the server.
 * 
 * @param cb
 *  A callback method invoked once the roster has been received.
 * @this
 *  References the XmmpIM instance.
 */
proto._retrieveRoster = function(cb) {
	var q = { query:'', attr: { 'xmlns': 'jabber:iq:roster' } };
	this._iq({ type: 'get' }, q, function(success, node) {
		if(cb == null)
			return;
		if(success !== true)
			cb.call(this, false, node);
		// Parse response and hand parsed roster to callback.
		else
			cb.call(this, true, this._parseRoster(node.query));
	});
};

/**
 * Parses the roster items contained in the 'query'-node returned by
 * the server on requesting the client's roster.
 * 
 * @param query
 *  The 'query'-node containing a list of roster items.
 * @this
 *  References the XmppIM instance.
 * @returns
 *  An array of roster items each of which is at least guaranteed to
 *  have the 'jid' property. Optional properties are 'name',
 *  'subscription' and 'groups'.
 */
proto._parseRoster = function(query) {
	var ret = [];
	// empty roster.
	if(query.item == null)
		return ret;
	var entries = query.item instanceof Array ? query.item :
		[query.item];
	for(var i in entries) {
		var c = entries[i];
		var item = {
			jid: c.attributes.jid,
			name: c.attributes.name || null,
			subscription: c.attributes.subscription || null,
			groups: []
		};
		var groups = c.group != null ? (c.group instanceof Array ?
			c.group : [c.group]) : [];
		for(var i in groups) {
			item.groups.push(groups[i].text);
		}
		ret.push(item);
	}
	return ret;
};

module.exports = XmppIM;