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

function XmppAPI(opts){
    events.EventEmitter.call(this);

    var xmppIM = new XmppIM(opts);
    this.im = xmppIM;
    var observer = opts.callback;

    this.username = "UNKNOWN";
    this.servername = "UNKNOWN";
    this.userlist = [];

    this._errors = [];
    this._statuschanges = [];
    this._messages = [];
    this._contactR = [];
    this._contactReRe = [];


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
        //save servername
        that.servername = info.jid.split("@")[1];
        // inform frontend about success
        observer();

    }).on('status', function(who, status){
            // safe statuschanges on the message stack
            that._statuschanges.push({who: who, status: status, time: Date.now()});
            // chop of resource
            var strippedWho = who;
            if(who.indexOf('/') !== -1) {
                strippedWho = who.substr(0, who.indexOf('/'));
            }
            // inform frontend about statuschange
            that.emit('status', strippedWho, status);

        }).on('message', function(message){
            // chop of resource
            var strippedFrom = message.from;
            if(strippedFrom.indexOf('/') !== -1) {
                strippedFrom = strippedFrom.substr(0, strippedFrom.indexOf('/'));
            }
            // safe message on the message stack
            that._messages.push({message: message, from: strippedFrom, time: Date.now()});
            // emit message event
            that.emit('message', strippedFrom, message);

        }).on('error', function(error){
            // save errors on the error stack
            that._errors.push({error: error, time: Date.now()});
            // emit error event
            that.emit('error', error);

        }).on('authorize', function(request){
            // save contactrequests on the contactR stack
            that._contactR.push({from: request.from, request: request, time: Date.now()});
            // emit contactRequest event
            that.emit('contactRequest', request.from, request);

        }).on('authorized', function(jid){
            // save contactRequestResponses on the contactReRe stack
            that._contactReRe.push({from: jid, time: Date.now(), accepted: true});
            // emit contactRequestResponse event
            that.emit('contactRequestResponse', jid, true);

        }).on('refused', function(jid){
            // save contactRequestResponses on the contactReRe stack
            that._contactReRe.push({from: jid, time: Date.now(), accepted: false});
            // emit contactRequestResponse event
            that.emit('contactRequestResponse', jid, false);
        });
}

require('util').inherits(XmppAPI, events.EventEmitter);
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
    try {
        this._messages.push({from: this.getUsername(), body: msg, time: Date.now()});
        this.im.sendMessage(to, msg);
    } catch(e) {
        console.log(e);
    }
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

/**
 * Searches for a contactRequestAnswer from a certain contact
 * @param jid
 * this is the jid it searches for
 * @returns {null/true/false}
 * True or false are returned if there is an answer. Null if there is no answer.
 */

proto.getContactRequestResponseFrom = function(jid){
    this._contactReRe.forEach(function(requestAnswer){
        if(requestAnswer.from == jid){
            return requestAnswer.accepted;
        }
    });
    return null;
};

proto.getContactRequestResponses = function(){
    var tmpStack = this._contactReRe;
    return tmpStack;
};

proto.getContactRequests = function(){
    var tmpStack = this._contactR;
    return tmpStack;
};

proto.addContact = function(jid, item){
    this.im.addContact(jid, item);
};

proto.removeContact = function(jid){
    this.im.removeContact(jid);
};

proto.logout = function(){
    this.im.close();
};
/**
 * This returns all errors, that occured since the last call of this function.
 *
 * It clears the error stack!!!
 * @returns {Array}
 */
proto.getLatestErrors = function() {
    var tmpStack = this._errors;
    this._errors = [];
    return tmpStack;
};

/**
 * Returns all messages recieved from one certain jid
 *
 * @param jid
 * This is the jid the function will search for.
 * @returns {Array}
 * returns an array of objects with two variables.
 *  'time' is the time the message was recieved
 *  'message' is the messageobject. It is an object made up of the properties 'from' which contains the JID of the sender of the message, 'type' which contains the type of the message and the fields 'subject' and 'body' which contain the subject and body of the message, respectively.
 */
proto.getMessages = function(jid){
    var that = this;
    this._tmpStack = [];
    this._messages.forEach(function(message){
        var strippedWho = message.from;
        if(message.from.indexOf('/') !== -1) {
            strippedWho = message.from.substr(0, message.from.indexOf('/'));
        }
        if(strippedWho == jid || message.from == that.getUsername()){
            that._tmpStack.push({jid: strippedWho, body: message.message.body, time: message.time});
        }
    });
    return this._tmpStack;
};

proto.removeListener = function(event){
    this.removeAllListeners(event);
};


/**
 * Returns all status changes.
 * @returns {Array}
 * This array contains objects made up of the properties 'who' which is the jid of the contact who changed its status, 'status' which is the new status and 'time' which is the time the status was changed.
 */
proto.getAllStatusChanges = function(){
    var tmpStack = this._statuschanges;
    return tmpStack;
};

/**
 * Retruns all status changes of a certain jid
 *
 * @param jid
 * this is the jid it will search for
 * @returns {Array}
 * This array contains objects made up of the properties 'who' which is the jid of the contact who changed its status, 'status' which is the new status and 'time' which is the time the status was changed.
 */
proto.getStatusChanges = function(jid){
    this._tmpStack = [];
    this._statuschanges.forEach(function(statusC){
        if(statusC.from == jid){
            that._tmpStack.push(statusC);
        }
    });
    return this._tmpStack;
};

// expose API
module.exports = XmppAPI;
