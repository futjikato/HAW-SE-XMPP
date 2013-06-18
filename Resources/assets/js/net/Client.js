define([ "net/Network", "jquery", "Mustache", "Filesystem" ], function(Network, $, Mustache, Filesystem) {
    /**
     * This is the XMPP Client.
     * It uses the Network class which is an abstraction of the network possibilities
     * of the platform that we are currently working on.
     *
     * @constructor
     */
    function Client(server, port, hostName) {

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

        // send message to server
        var str = '';
        self.network.send(saluteMessage, function(response) {
            // the callback function can be triggered multiple times !
            str += response.toString();

            var jqResponse = $(str);
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
        this.auth("foo", "bar");
    };

    /**
     * Authenticate a user with the server.
     *
     * @param username
     * @param password
     * @return boolean
     */
    Client.prototype.auth = function(username, password) {

        // TODO Ti.Codec.encodeBase64 ends at a FUCKING \0 BULLSHIT !!!
        //var data = "foo\0foo\0bar";
        //data = Ti.Codec.encodeBase64(data);
        var data = "Zm9vAGZvbwBiYXI=";

        var authMsg = Filesystem.getXmlTemplate('auth');
        // render template with server url
        authMsg = Mustache.render(authMsg, {mechanism: "PLAIN", data: data});

        // send message to server
        this.network.send(authMsg, function(response) {
            // the callback function can be triggered multiple times !
            console.log(response.toString());
        });
    };

    return Client;
});