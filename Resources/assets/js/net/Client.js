define([ "net/Network", "jquery" ], function(Network, $) {
    /**
     * This is the XMPP Client.
     * It uses the Network class which is an abstraction of the network possibilities
     * of the platform that we are currently working on.
     *
     * @constructor
     */
    function Client(server, port, hostName, secret) {

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

        /**
         * The shared secret ( APP ID ??? ) used to make a handshake
         *
         * @type {String}
         */
        this.secret = secret;

        // initialize client
        this._init();
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
        var self = this,
            saluteMessage = '<?xml version="1.0"?>\
<stream:stream to="' + this.hostName + '"\
    xmlns:stream="http://etherx.jabber.org/streams"\
    xmlns="jabber:client"\
    version="1.0" />';

        // first contact with server. Ask for stream ID
        function salute() {
            this.network.send(saluteMessage, function(response) {
                var response = $(response);
                if(response && response.attr('id')) {
                    var key = self._createHandshakeKey(response.attr('id'));
                }
            });
        }

        // start with a nice salute
        salute();
    }

    /**
     * Authenticate a user with the server.
     *
     * @param username
     * @param password
     * @return boolean
     */
    Client.prototype.auth = function(username, password) {

    };

    return Client;
});