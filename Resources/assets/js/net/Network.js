define(function() {

    /**
     * Network class.
     * Abstraction layer for server communication with TideSDK
     *
     * @constructor
     */
    function Network(ip, port) {
        var self = this;

        /**
         * Current read function to be called for every read on socket
         * If unbound use default
         */
        this.currRead = function(){};

        // create socket
        this.socket = Ti.Network.createTCPSocket(ip, port);

        this.socket.onError(function(err) {
            console.error(err.toString());
        });

        this.socket.onRead(function(data) {
            if(typeof self.currRead == 'function') {
                self.currRead(data.toString());
            } else {
                // fallback
                console.log("NO READ FUNCTION EXISTING !");
                console.log(data.toString());
            }
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
            console.error('Socket closed unexpected.');
            return;
        }

        console.log(message);

        this.currRead = callback;
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