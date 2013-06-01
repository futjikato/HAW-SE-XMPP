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

        this.socket.onError(function(err) {
            console.err(err.toString());
        });

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

        if(this.socket.isClosed()) {
            console.err('Socket closed unexpected.');
            return;
        }

        this.socket.onRead(callback);
        this.socket.write(message);
    };

    /**
     * Close the network connection to the server
     */
    Network.prototype.close = function() {
        this.socket.close();
    };

    return Network;
});