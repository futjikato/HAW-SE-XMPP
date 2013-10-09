
/**
 * An enumeration of possible states the XMPP client can be in.
 */
module.exports = {
	/**
	 * The connection to the server is being established.
	 */
	connecting: 0,
	
	/**
	 * The initial XML stream is being negotiated with the server.
	 */
	negotiatingStream: 1,
	
	/**
	 * SASL authentication is being performed.
	 */
	authenticating: 2
};