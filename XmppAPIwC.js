/**
 * @authors     Tobias Heitmann <tobias.heitmann@haw-hamburg.de>
 *
 * It's important to mention that everytime this API emits an event all parameter that are linked to a person are without the serverpart of the jid, to get this call getSername on your API object.
 */

var XmppIM = require('./XmppIM');

/**
 * Initializes a new instance of the XmppIM class and also registers an observer to notify about any changes.
 *
 * @param opts
 *  A set of options, some of which are required (all options except the 'callback' are for the XmppCore):
 *   'callback'  the observer to notify.
 *      this callback object needs certain functions to handle incoming events which are:
 *          'handleLoginDone'                       Login was successful
 *          'handleMessage'         (who, message)  handle an incoming message
 *          'handleStatusChange'    (who, status)   handle a contacts status change
 *          'handleError'           (error)         handle occuring errors
 *          'handleContactRequest'  (who, request)  handle contact request from someone else
 *          'handleContactDeny'     (who)           some of your contactrequests was denied
 *          'handleContactConfirm'  (who)           some of your contactrequests was accepted
 *
 *   'host'      specifies the hostname of the XMPP server.
 *   'user'      the local part of the jid to connect with.
 *   'password'  the password for the respective jid.
 *  optional:
 *   'port'      the port on which to connect. Defaults to 5222,
 *               if not specified.
 */

function XmppAPIwC(opts){
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
        //save servername
        that.servername = info.jid.split("@")[1];
        // inform frontend about success
        observer.handleLoginDone();
    }).on('status', function(who, status){
        var user = who.split("@")[0];

        observer.handleStatusChange(user, status);
    }).on('message', function(message){
        var user = message.from.split("@")[0];

        observer.handleMessage(user, message);
    }).on('error', function(error){
        observer.handleError(error);
    }).on('authorize', function(request){
        var user = request.from.split("@")[0];
        observer.handleContactRequest(user, request);
        //call accept on the request object to accept and deny to decline the request
    }).on('authorized', function(jid){
        observer.handleContactDeny(jid.split("@")[0]);
    }).on('refused', function(jid){
        observer.handleContactConfirm(jid.split("@")[0]);
    });
}

var proto = XmppAPIwC.prototype;


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

proto.getServername = function(){
    return this.servername;
};

proto.getUsername = function() {
    return this.username;
};

proto.getUserlist = function() {
    return this.userlist;
};

proto.setStatus = function(o) {
    XmppIM.setStatus(o);
};

// expose API
module.exports = XmppAPIwC;