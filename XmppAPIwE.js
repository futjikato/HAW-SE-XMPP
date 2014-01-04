/**
 * @authors     Tobias Heitmann <tobias.heitmann@haw-hamburg.de>
 *
 * It's important to mention that everytime this API emits an event all parameter that are linked to a person are without the serverpart of the jid, to get this call getSername on your API object.
 */

var events = require('events');
var XmppIM = require('./XmppIM');

/**
 * Initializes a new instance of the XmppIM class and also registers an observer to notify about any changes.
 *
 * @param opts
 *  A set of options, some of which are required (all options except the 'callback' are for the XmppCore):
 *   'callback'  the observer to notify that the API is ready is only used for the login process all other events occurring are processed via emitting events.
 *              This observer will be called with the parameter 'true'.
 *   'host'      specifies the hostname of the XMPP server.
 *   'user'      the local part of the jid to connect with.
 *   'password'  the password for the respective jid.
 *  optional:
 *   'port'      the port on which to connect. Defaults to 5222,
 *               if not specified.
 *
 *  This Version of the API emits events which are:
 *
 *      'status' (who, status)                      One of the users contacts (who) changed it's status.
 *      'message' (who, message)                    A message from (who) arrived
 *      'error' (error)                             An error occurred
 *      'contactRequest' (from, request)            Someone (from) requested you to add him to your contactlist.
 *      'contactRequestResponse' (from, positive)   You recieved an answer to your contactrequest.
 *                                                  You requested (from) and positive is a boolean and is true if you got accepted and false if not.
 */

function XmppAPIwE(opts){
    var xmppIM = new XmppIM(opts);
    var observer = opts.callback;

    //this.username;
    //this.userlist;

    // that is instance of API
    var that = this;

    xmppIM.on('ready', function(info){
        // save roster
        that.userlist = info.roster;
        // save username
        that.username = info.jid.split("@")[0];
        // inform frontend about success
        observer(true);
    }).on('status', function(who, status){

        that.emit('status', who.split("@")[0], status);
    }).on('message', function(message){

        that.emit('message', message.from.split("@")[0], message);
    }).on('error', function(error){

        that.emit('error', error);
    }).on('authorize', function(request){

        that.emit('contactRequest', request.from.split("@")[0], request);
    }).on('authorized', function(jid){

        that.emit('contactRequestResponse', jid.split("@")[0], true);
    }).on('refused', function(jid){

        that.emit('contactRequestResponse', jid.split("@")[0], false);
    });
}

var proto = XmppAPIwE.prototype;


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

proto.getServername = function(){
    return this.servername;
};

proto.setStatus = function(o) {
    XmppIM.setStatus(o);
};

// expose API
module.exports = XmppAPIwE;