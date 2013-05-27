define(function() {

    /**
     * Network class.
     * Abstraction layer for server communication with TideSDK
     *
     * @constructor
     */
    function Network(ip, port) {
        // create socket
        this.socket = Ti.Network.createTCPSocket(ip, port);
        this.socket.connect();
    }

    /**
     * Send a message to the given url .
     * The given callback is triggered after the response of the request is received.
     *
     * @param url
     * @param message
     * @param callback
     */
    Network.prototype.send = function(message, callback) {
        this.socket.onReadComplete(callback);
        this.socket.write(message);
    }

    /**
     * Close the network connection to the server
     */
    Network.prototype.close = function() {
        this.socket.close();
    }

    return Network;
});