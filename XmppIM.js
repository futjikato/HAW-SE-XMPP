/**
 * @authors     Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date        14-10-13
 * @modified    23-10-13 13:08
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
 *   'user'      the local part of the jid to connect with.
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
		.on('iq',       function(s) {
			that._onIq.call(that, s); })
		.on('ready',    function() {
			that._onReady.call(that); })
		.on('error',    function(e) {
			that.emit('error', e); })
		.connect();
	this._core = core;
	this._extensions = [];
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
 *  'authorize'  emitted when another user has requested authorization
 *               for receiving status information of the client.
 *  'authorized' emitted when a previously issued authorize request
 *               of the client has been accepted by the respective
 *               contact.
 *  'refused'    emitted when a previously issued authorize request
 *               of the client has been denied by the respective
 *               contact.
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
 *  body or an object made up of the following fields, all of which are optional:
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
 * Adds the contact with the specified JID to the client's roster and
 * sends an authorization request to the contact.
 * 
 * @param jid
 *  The JID of the contact to add.
 * @param item
 *  If specified, this parameter is an object made up of the following
 *  fields, all of which are optional:
 *   'name'     the name under which the contact will be added to the
 *              client's contact list.
 *   'groups'   An array of strings each of which specifies the name
 *              of a group the contact will be added to.
 *  The item parameter is optional and may be omitted.
 *  @exception Error
 *   Thrown if either argument is null or undefined or if any of the
 *   arguments fields or values are invalid.
 */
proto.addContact = function(jid, item) {
	if(jid == null)
		throw new Error('jid must not be null.');
	if(typeof jid != 'string')
		throw new Error('jid must be a string.');
	if(item != null && typeof item != 'object')
		throw new Error('item must be an object.');
	var o = { item: [], attr: { 'jid': jid } };
	if(item != null) {
		if(item.name != null)
			o.attr.name = item.name;
		if(item.groups != null) {
			for(var i in item.groups)
				o.item.push({group: item.groups[i]});
		}
	}
	var query = { 'query': o, attr: { 'xmlns': 'jabber:iq:roster' }};
	// Perform a 'roster set' for the new roster item.
	this._iq({ type: 'set' }, query, function(success, node) {
		// Request a subscription from the contact.
		this._presence({ to: jid, type: 'subscribe' });
	});	
};

/**
 * Removes the contact with the specified JID from the client's roster.
 * 
 * @param jid
 *  The JID of the contact to remove.
 * @exception Error
 *  Thrown if the jid argument is null or undefined.
 */
proto.removeContact = function(jid) {
	if(jid == null)
		throw new Error('jid must not be null.');
	if(typeof jid != 'string')
		throw new Error('jid must be a string.');
	var query = { 'query': {'item' : '',
		attr: {'jid': jid, 'subscription': 'remove'}},
		attr: {'xmlns': 'jabber:iq:roster'} };
	this._iq({ type: 'set' }, query, function(success, node) {
		// FIXME: What do we do if this fails?
	});
};

/**
 * Retrieves the client's roster (contact list).
 * 
 * @param cb
 *  A callback method invoked once the roster has been retrieves from
 *  the server.
 * @exception Error
 *  Thrown if the cb parameter is null or invalid.
 */
proto.getRoster = function(cb) {
	if(cb == null)
		throw new Error('cb must not be null.');
	if(typeof cb != 'function')
		throw new Error('cb must be a function.');
	this._retrieveRoster(cb);
};

/**
 * Blocks communication with the specified contact.
 * 
 * @param jid
 *  A string containing the JID of the contact to block.
 * @param granularity
 *  This parameter is optional and may be omitted. It is an array of
 *  identifiers specifying which kinds of stanzas are to be blocked.
 *  The following values may be specified:
 *   'message'         blocks incoming message stanzas.
 *   'iq'              blocks incoming IQ stanzas.
 *   'presence-in'     blocks incoming presence notifications.
 *   'presence-out'    blocks outgoing presence notifications.
 *  @exception Error
 *   Thrown if the jid paramater is null or undefined or if the
 *   optional granularity parameter is specified and contains invalid
 *   values.
 */
proto.block = function(jid, granularity) {
	if(jid == null)
		throw new Error('jid must not be null.');
	if(typeof jid != 'string')
		throw new Error('jid must be a string.');
	var v = ['message', 'iq', 'presence-in', 'presence-out'];
	var o = { 'jid': jid };
	if(granularity != null) {
		if(!(granularity instanceof Array))
			throw new Error('granularity must be an array.');
		for(var i in granularity) {
			if(v.indexOf(granularity[i]) < 0)
				throw new Error('granularity contains invalid identifiers.');
			o[granularity[i]] = true;
		}
	}
	this._addToBlockList(o);
};

/**
 * Unblocks the contact with the specified JID.
 * 
 * @param jid
 *  The JID of the contact to unblock.
 * @exception Error
 *  Thrown if the jid parameter is null or undefined or not of
 *  type string.
 */
proto.unblock = function(jid) {
	if(jid == null)
		throw new Error('jid must not be null.');
	if(typeof jid != 'string')
		throw new Error('jid must be a string.');
	this._removeFromBlockList(jid);
};

/**
 * Retrieves a list of blocked contacts.
 * 
 * @param cb
 *  A callback method invoked once the list of blocked contacts has been
 *  retrieved. The first parameter of the callback is an array of blocked
 *  contacts.
 * @exception Error
 *  Thrown if the cb parameter is null or undefined.
 */
proto.getBlockList = function(cb) {
	if(cb == null)
		throw new Error('cb must not be null.');
	this._getDefaultList(function(success, name, list) {
		if(success == false)
			cb.call(this, []);
		cb.call(this, list);
	});
};

/**
 * Closes the connection with the XMPP server.
 */
proto.close = function() {
	// Gracefully log off from the server.
	this._presence({type: 'unavailable'});
	// Close the connection.
	this._core.close();
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
 *  Thrown if the 'data' parameter are null or undefined.
 */
proto._iq = function(attr, data, cb) {
	// Call callback in the context of the XmppIM instance.
	var that = this;
	this._core.iq(attr, data, function(success, node) {
		if(cb != null)
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
	if(this._invokeExtensions('message', stanza))
		return;
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
	if(this._invokeExtensions('presence', stanza))
		return;
	var type = stanza.attributes.type;
	// Status notifications don't have the 'type' attribute.
	if(type == null)
		return this._handleStatusNotification(stanza);
	type = type.toLowerCase();
	var calltable = {
		'subscribe':    this._handleSubscribeRequest,
		'subscribed':   this._handleSubscribed,
		'unsubscribed': this._handleUnsubscribed
	};
	if(calltable[type] != null)
		calltable[type].call(this, stanza);	
};

/**
 * Callback method invoked when a new iq request stanza has been received.
 * 
 * @param stanza
 *  The 'iq'-stanza received from the server.
 * @this
 *  References the XmppIM instance.
 */
proto._onIq = function(stanza) {
	if(this._invokeExtensions('iq', stanza))
		return;
	// Nothing to do here, XMPP:IM does not define any set/get
	// requests that are handled by the client.
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
	
	// Initialize extensions.
	this._initExtensions('./extensions');
	
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
 * Initializes possible extensions.
 * 
 * @param path
 *  The path at which to look for extensions.
 * @exception Error
 *  Thrown if the path parameter is null or undefined.
 */
proto._initExtensions = function(path) {
	if(path == null)
		throw new Error('path must not be null.');
	var fs = require('fs');
	var files = fs.readdirSync(path);
	for(var i in files) {
		var _stat = fs.statSync(path + '/' + files[i]);
		if(_stat.isFile() == false)
			continue;
		var _class = require(path + '/' + files[i]);		
		var ext = new _class(this);
		this._extensions.push(ext);
		if(ext.exports == null)
			continue;
		for(var c in ext.exports) {
			var name = ext.exports[c];
			if(proto[name] != null)
				throw new Error('prototype conflict for ' + name + '.');
			if(ext[name] == null || typeof ext[name] != 'function')
				throw new Error(files[i] + ' has invalid export ' + name + '.');
			// Javascript closures are tricky; Scopes are function-level,
			// not block-level. For details, read
			// http://stackoverflow.com/questions/643542/doesnt-javascript-support-closures-with-local-variables
			proto[name] = (function(tmp, _n) {
		        return function() {
		        	tmp[_n].apply(tmp, arguments);
		        };
		    })(ext, name);
		}
	}
};

/**
 * Returns the extension with the specified name.
 * 
 * @param name
 *  The name of the extension to return.
 * @exception Error
 *  Thrown if the name parameter is null or undefined.
 * @returns
 *  The extension instance associated with the specified name or null
 *  if no such extension exists.
 */
proto._extension = function(name) {
	for(var i = 0; i < this._extensions.length; i++) {
		var ext = this._extensions[i];
		if(ext.name == name)
			return ext;
	}
	return null;
};

/**
 * Invokes the callback method for the specified type for each
 * registered extension.
 * 
 * @param type
 *  The type of event triggering the callback invocation. Must be
 *  one of the following: 'message', 'presence', 'iq'.
 * @param stanza
 *  The stanza node passed to the callback methods.
 * @returns
 *  true if any of the registered extensions handled the stanza
 *  and it should not be passed on or false if no extensions
 *  handled the stanza.
 * @exception Error
 *  Thrown if either argument is null or undefined or contains
 *  an invalid value.
 */
proto._invokeExtensions = function(type, stanza) {
	if(type == null)
		throw new Error('type must not be null.');
	if(stanza == null)
		throw new Error('stanza must not be null.');
	var methods = {
		'message':  'onMessage',
		'presence': 'onPresence',
		'iq':       'onIQ'
	};
	if(methods[type] == null)
		throw new Error('Invalid value for type.');
	for(var i in this._extensions) {
		var ext = this._extensions[i];
		if(ext[methods[type]] == null)
			continue;
		var ret = ext[methods[type]].call(ext, stanza);
		if(ret === true)
			return true;
	}
	return false;
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
 * Parses the specified subscription request and emits an 'authorize'
 * event.
 * 
 * @param stanza
 *  A 'presence' stanza of type 'subscribe'.
 * @this
 *  References the XmppIM instance.
 */
proto._handleSubscribeRequest = function(stanza) {
	var from = stanza.attributes.from;
	// If the stanza for some reason does not have the 'from'-attribute
	// silently ignore it.
	if(from == null)
		return;
	var that = this;
	var o = { 'from': from,
		'accept': function(item) {
			// Issue a 'roster set'.
			var o = { item: [], attr: { 'jid': from } };			
			if(item != null && typeof item == 'object') {
				if(item.name != null)
					o.attr.name = item.name;
				if(item.groups != null) {
					for(var i in item.groups)
						o.item.push({group: item.groups[i]});
				}
			}
			var query = { 'query': o, attr: { 'xmlns': 'jabber:iq:roster' }};
			that._iq({ type: 'set' }, query);
			// Acknowledge the authorization request.
			that._presence({ to:from, type: 'subscribed' });
		},
		'deny': function() {
			// Deny the authorization request.
			that._presence({ to:from, type: 'unsubscribed' });
		}
	};
	this.emit('authorize', o);
};

/**
 * Handles acceptance of a previous subscription request and emits an
 * 'authorized' event.
 * 
 * @param stanza
 *  A 'presence' stanza of type 'subscribed'.
 * @this
 *  References the XmppIM instance.
 */
proto._handleSubscribed = function(stanza) {
	var from = stanza.attributes.from;
	// If the stanza for some reason does not have the 'from'-attribute
	// silently ignore it.
	if(from == null)
		return;
	this.emit('authorized', from);
};

/**
 * Handles refusal of a previous subscription request and emits an
 * 'authorized' event.
 * 
 * @param stanza
 *  A 'presence' stanza of type 'unsubscribed'.
 * @this
 *  References the XmppIM instance.
 */
proto._handleUnsubscribed = function(stanza) {
	var from = stanza.attributes.from;
	// If the stanza for some reason does not have the 'from'-attribute
	// silently ignore it.
	if(from == null)
		return;
	this.emit('refused', from);	
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

/**
 * Privacy List Management (For details, refer to XMPP-IM,
 *  10. Blocking Communication).
 */

/**
 * Adds an entry to the block list.
 * 
 * @param o
 *  A string or an object specifying the contact to block. If this is
 *  a string, it is the JID of the contact to block. If this is an
 *  object, it is made up of the following fields, the 'jid' field being
 *  mandatory:
 *   'jid'             the JID of the contact to block.
 *   'message'         blocks incoming message stanzas.
 *   'iq'              blocks incoming IQ stanzas.
 *   'presence-in'     blocks incoming presence notifications.
 *   'presence-out'    blocks outgoing presence notifications.   
 *
 *  If only the 'jid' field is provided, all communication with the
 *  respective contact will be blocked.
 * @exception Error
 *  Thrown if the parameter is null or undefined or contains an invalid
 *  value.
 */
proto._addToBlockList = function(o) {
	if(o == null)
		throw new Error('o must not be null.');
	if(typeof o != 'object' && typeof o != 'string')
		throw new Error('o must be a string or an object.');
	var lit = typeof o == 'string' ? { jid: o } : o;
	var overwritten = false;
	this._getDefaultList(function(success, name, list) {
		if(success == true) {
			for(var i in list) {
				if(list[i].jid == lit.jid) {
					list[i] = lit;
					overwritten = true;
				}
			}
			if(!overwritten)
				list.push(lit);
			// Overwrite the old list.
			this._createList(name, list);
		} else {
			// Create new list and set it up as the default list.
			this._createList('_default', [lit]);
			this._setDefaultList('_default');
		}
	});
};

/**
 * Removes an entry from the block list.
 * 
 * @param jid
 *  The JID of the contact to unblock.
 * @exception Error
 *  Thrown if the jid parameter is null or undefined or not of
 *  type string.
 */
proto._removeFromBlockList = function(jid) {
	if(jid == null)
		throw new Error('jid must not be null.');
	if(typeof jid != 'string')
		throw new Error('jid must be a string.');
	this._getDefaultList(function(success, name, list) {
		var removed = false;
		if(success == false)
			return;
		for(var i in list) {
			if(list[i].jid == jid) {
				list.splice(i, 1);
				removed = true;
			}
		}		
		// Overwrite the old list.
		if(removed)
			this._createList(name, list);	
	});
};

/**
 * Attempts to retrieve the default privacy list.
 * 
 * @param cb
 *  Callback method invoked once the default privacy list has been
 *  retrieved.
 * @exception Error
 *  Thrown if the cb parameter is null or undefined.
 */
proto._getDefaultList = function(cb) {
	if(cb == null)
		throw new Error('cb must not be null.');
	var q = { query: '', attr: { 'xmlns': 'jabber:iq:privacy' }};
	this._iq({ type: 'get' }, q, function(success, node) {
		if(node.query['default'] == null)
			return cb.call(this, false);
		var name = node.query['default'].attributes.name;
		if(node.query.list == null)
			return cb.call(this, false);
		var l = typeof node.query.list == 'object' ?
				[node.query.list] : node.query.list;
		for(var i in l) {
			if(l[i].attributes.name === name) {
				return this._getList(name, function(success, list) {
					if(success == false)
						return cb.call(this, false);
					return cb.call(this, true, name, list);
				});
			}
		}
		cb.call(this, false);
	});
};

/**
 * Sets the default list to the list with the specified name.
 * 
 * @param name
 *  The name of the list to be made the default list.
 * @param cb
 *  A callback method invoked once the operation has completed.
 * @exception Error
 *  Thrown if the name parameter is null or undefined.
 */
proto._setDefaultList = function(name, cb) {
	if(name == null)
		throw new Error('name must not be null.');
	var q = { query: { 'default': '', attr: {'name': name}},
			attr: {'xmlns': 'jabber:iq:privacy'}};
	this._iq({type: 'set'}, q, cb);
};

/**
 * Retrieves the privacy list with the specified name.
 * 
 * @param name
 *  The name of the privacy list to retrieve.
 * @param cb
 *  A callback method invoked once the privacy list has been retrieved.
 * @exception Error
 *  Thrown if either parameter is null or undefined.
 */
proto._getList = function(name, cb) {
	if(name == null)
		throw new Error('name must not be null.');
	if(cb == null)
		throw new Error('cb must not be null.');
	var q = { query: { list: '', attr: {'name': name}},
			attr: { 'xmlns': 'jabber:iq:privacy'}};
	this._iq({type: 'get'}, q, function(success, node) {
		if(success == false)
			return cb.call(this, false);
		var list = [];
		if(node.query.list != null) {
			if(node.query.list.item != null) {
				var _l = node.query.list.item instanceof Array ?
					node.query.list.item : [node.query.list.item];
				for(var i in _l) {
					var o = { jid: _l[i].attributes.value };
					var gran = ['message', 'iq', 'presence-in', 'presence-out'];
					for(var c in gran) {
						if(_l[i][gran[c]] != null)
							o[gran[c]] = true;
					}
					list.push(o);
				}
			}
		}
		return cb.call(this, true, list);
	});	
};

/**
 * Creates the privacy list with the specified name.
 * 
 * @param name
 *  The name of the privacy list to create. If a privacy list with
 *  the specified name already exists, it will be overwritten.
 * @param items
 *  An array of entries of the privacy list. At least one must be
 *  specified. An entry is an object made up of the following
 *  fields, the 'jid' field being mandatory:
 *   'jid'             the JID of the contact to block.
 *   'message'         blocks incoming message stanzas.
 *   'iq'              blocks incoming IQ stanzas.
 *   'presence-in'     blocks incoming presence notifications.
 *   'presence-out'    blocks outgoing presence notifications.
 * @exception Error
 *  Thrown if the name parameter is null or undefined or if the
 *  items parameter is null, is not an array or does not at least
 *  contain one entry.
 */
proto._createList = function(name, items) {
	if(name == null)
		throw new Error('name must not be null.');
	if(items == null)
		throw new Error('items must not be null.');
	if((items instanceof Array) == false)
		throw new Error('items must be an array.');
	if(items.length < 1)
		throw new Error('items must contain at least one entry.');
	var q = { query: { list: [], attr: {'name': name}},
			attr: {'xmlns': 'jabber:iq:privacy'}};
	for(var i in items) {
		var o = { item: {}, attr: {
			type: 'jid',
			order: i,
			action: 'deny',
			value: items[i].jid
		}};
		for(var c in items[i]) {
			if(c != 'jid')
				o.item[c] = '';
		}
		q.query.list.push(o);
	}
	this._iq({type: 'set'}, q);
};

/**
 * Removes the privacy list with the specified name.
 * 
 * @param name
 *  The name of the privacy list to remove.
 * @param cb
 *  A callback method invoked once the operation has been completed.
 *  This parameter may be omitted if not needed.
 * @exception Error
 *  Thrown if the name parameter is null or undefined.
 */
proto._removeList = function(name, cb) {
	if(name == null)
		throw new Error('name must not be null.');
	var q = { query: { list: '', attr: {'name': name}},
			attr: {'xmlns': 'jabber:iq:privacy'}};
	this._iq({type: 'set'}, q, function(success, node) {
		if(cb != null)
			cb.call(this, success, node);
	});
};

module.exports = XmppIM;