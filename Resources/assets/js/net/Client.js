define([ "net/Network", "jquery", "Mustache", "Filesystem" ], function(Network, $, Mustache, Filesystem) {
    /**
     * This is the XMPP Client.
     * It uses the Network class which is an abstraction of the network possibilities
     * of the platform that we are currently working on.
     *
     * @constructor
     */
    function Client(server, port, hostName, username, password) {

        /**
         * Network instance to work with.
         * A new connection is generated for every client object.
         *
         * @type {net.Network}
         */
        this.network = new Network(server, port);

        /**
         * URL of the server this client can talk to.
         *
         * @type {String}
         */
        this.hostName = hostName;

        /**
         * Authentication identity
         *
         * @type {String}
         */
        this.username = username;

        /**
         * Password
         * @type {String}
         */
        this.password = password;

        /**
         * After authentication with the server the client will receive a token.
         * NULL if no authentication has yet succeeded.
         *
         * @type {String|null}
         */
        this.userToken = null;

        this.authHandle = null;

        // initialize client
        var self = this;
        // use timeout of 1500 ms because of TideSDK bug
        // https://github.com/TideSDK/TideSDK/issues/13
        setTimeout(function() {
            self._init();
        }, 1500);
    }

    /**
     * Initialize the client by salute the server and receive a client token as well
     * as possible authentication methods.
     *
     * See protocol flow here :
     * http://xmpp.org/extensions/xep-0114.html
     *
     * @private
     */
    Client.prototype._init = function() {
        var self = this;

        // load xml message template
        var saluteMessage = Filesystem.getXmlTemplate('salute');
        // render template with server url
        saluteMessage = Mustache.render(saluteMessage, {url: self.hostName});

        // onRead muss komplett umgebaut werden
        var wut = 0;

        // send message to server
        self.network.send(saluteMessage, function(response) {
            if (wut == 2) return; else wut++;

            // the callback function can be triggered multiple times !
            var jqResponse = $(response.toString());
            if(jqResponse.find('mechanisms').length > 0) {
                self._selectAuthMethod(jqResponse);
            }
        });
    }

    Client.prototype._selectAuthMethod = function(jqElem) {
        var availableMechanisms = [];
        jqElem.find('mechanisms').children().each(function() {
            availableMechanisms.push($(this).text());
        });

        console.dir(availableMechanisms);
        this.auth(this.username, this.password);
    };

    /**
     * Authenticate a user with the server.
     *
     * @param username
     * @param password
     * @return boolean
     */
    Client.prototype.auth = function(username, password) {
        var self = this;
        var data = btoa("\0" + this.username + "\0" + this.password);

        var authMsg = Filesystem.getXmlTemplate('auth');
        // render template with server url
        authMsg = Mustache.render(authMsg, {mechanism: "PLAIN", data: data});


        // win
        var wut = false;
        var is = false;
        var dis = false;
        var shiat = false;
        console.log("yo");
        // send message to server
        this.network.send(authMsg, function() {
            if (wut) return; else wut = true;
            console.log("yoyo");
            self.network.send(Mustache.render(Filesystem.getXmlTemplate('salute'), {url: self.hostName}), function() {
                if (is) return; else is = true;
                self.network.send('<iq type="set" id="sd1"><bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"><resource>Pandion</resource></bind></iq>', function() {
                    if (dis) return; else dis = true;
                    self.network.send('<iq type="set" id="sd2" to="jabber.ccc.de"><session xmlns="urn:ietf:params:xml:ns:xmpp-session"/></iq>', function() {
                        if (shiat) return; else shiat = true;
                        self.network.send('<presence><x xmlns="jabber:x:avatar"><hash>fea759d5f9f52b795d35dae169dbfcd0b8e5585b</hash></x><priority>8</priority></presence><iq type="set" id="sd10"><query xmlns="jabber:iq:privacy"><list name="invisible"><item action="deny" order="1"><presence-out/></item></list></query></iq>', function() {
                            console.log("online!");
                        });
                    });
                });
            });
        });
    };

    return Client;
});