/**
 * @authors     Tobias Heitmann <tobias.heitmann@haw-hamburg.de>
 */

var XmppIM = require('./XmppIM'),
    events = require('events'),
    util = require('util');

/**
 * Initializes a new instance of the XmppIM class and also registers an observer to notify about any changes.
 * Because the frontend may currently not listens for some events we just inform about new data the frontend must get the data manually!
 *
 * Events:
 * - `message`
 *      Informs about a new message. The message can then be retrieved by calling `getNewMessages()`
 * - `error`
 *      Informs about a new error. The message can then be retrieved by calling `getLatestErrors()`
 *
 * @param opts
 *  A set of options, some of which are required (all options except the 'callback' are for the XmppCore):
 *   'callback'  the observer to notify.
 *   'host'      specifies the hostname of the XMPP server.
 *   'user'      the local part of the jid to connect with.
 *   'password'  the password for the respective jid.
 *  optional:
 *   'port'      the port on which to connect. Defaults to 5222,
 *               if not specified.
 */

function XmppAPI(opts){
    events.EventEmitter.call(this);

    var xmppIM = new XmppIM(opts);
    var observer = opts.callback;

    this.username = "UNKNOWN";
    this.userlist = [];

    this.errors = [];
    this.messages = [];

    // that is instance of API
    var that = this;

    xmppIM.on('ready', function(info){
        // prepare roster
        info.roster.forEach(function(contact) {
            that.userlist.push({
                jid: contact.jid,
                name: (contact.name ? contact.name : (contact.jid.split("@")[0])),
                online: false, // todo get contact status and update later
                unread: 0 // todo get unread messages and update later
            });
        });
        // save username
        that.username = info.jid.split("@")[0];
        // inform frontend about success
        observer();
    }).on('status', function(who, status){

    }).on('message', function(message){
        // safe message oin the message stack
        that.messages.push(message);
        // inform may listening frontend
        that.emit("message");
    }).on('error', function(error){
        // DEBUG output
        console.error(error);

        // stack error so it can be retrieved by frontend
        that.errors.push(error);

        // inform frontend
        that.emit("error");
    }).on('authorize', function(request){

    }).on('authorized', function(jid){

    }).on('refused', function(jid){

    });
}

util.inherits(XmppAPI, events.EventEmitter);
var proto = XmppAPI.prototype;


/**
 * Hands a massage over to the XmppIM class
 *
 * @param to
 *  A string that specifies the JID of the recipient of the message.
 * @param msg
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
proto.sendMessage = function(to, msg){
    XmppIM.sendMessage(to, msg);
};

proto.getUsername = function() {
    return this.username;
};

proto.getUserlist = function() {
    return this.userlist;
};

proto.getLatestErrors = function() {
    var tmpStack = this.errors;
    this.errors = [];
    return tmpStack;
};

proto.getNewMessages = function() {
    var tmpStack = this.messages;
    this.messages = [];
    return tmpStack;
};

// expose API
module.exports = XmppAPI;