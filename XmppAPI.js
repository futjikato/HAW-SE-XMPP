/**
 * @authors     Tobias Heitmann <tobias.heitmann@haw-hamburg.de>
 */

var XmppIM = require('./XmppIM');

/**
 * Initializes a new instance of the XmppIM class and also registers an observer to notify about any changes.
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
    var xmppIM = new XmppIM(opts);
    var observer = opts.callback;

    this.username;
    this.userlist;

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

    }).on('message', function(message){

    }).on('error', function(error){
        // @todo provide method to bubble to frontend somehow ( maaaaagic )
        console.log(error);
    }).on('authorize', function(request){

    }).on('authorized', function(jid){

    }).on('refused', function(jid){

    });
}

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

// expose API
module.exports = XmppAPI;