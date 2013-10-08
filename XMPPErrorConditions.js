
/**
 * An object of stream-level error conditions as defined by the XMPP:Core
 * specification (4.7.3. Defined Conditions).
 */
module.exports = {
	'xml-not-well-formed': 'The initiating entity has sent XML that is not well-formed.',
	'host-unknown': 'The value of the "to" attribute provided by the initiating entity ' +
		'in the stream header does not correspond to a hostname that is hosted by the server.'
};
