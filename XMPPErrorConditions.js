
/**
 * An object of stream-level error conditions as defined by the XMPP:Core
 * specification (4.7.3. Defined Conditions).
 */
module.exports = {
	'bad-format':
		'The entity has sent XML that cannot be processed',
	'bad-namespace-prefix':
		'The entity has sent a namespace prefix that is unsupported, or has ' +
		'sent no namespace prefix on an element that requires such a prefix',
	'conflict':
		'The server is closing the active stream for this entity because a ' +
		'new stream has been initiated that conflicts with the existing stream.',
	'connection-timeout':
		'the entity has not generated any traffic over the stream for some ' +
		'period of time',
	'host-gone':
		'The value of the "to" attribute provided by the initiating entity in ' +
		'the stream header corresponds to a hostname that is no longer hosted ' +
		'by the server.',
	'host-unknown':
		'The value of the "to" attribute provided by the initiating entity ' +
		'in the stream header does not correspond to a hostname that is hosted ' +
		'by the server.',
	'improper-addressing':
		'A stanza sent between two servers lacks a "to" or "from" attribute',
	'internal-server-error':
		'The server has experienced a misconfiguration or an otherwise ' +
		'undefined internal error.',
	'invalid-from':
		'The JID or hostname provided in a "from" address does not match ' +
		'an authorized JID or validated domain negotiated between servers ' +
		'via SASL or dialback, or between a client and a server via ' +
		'authentication and resource binding.',
	'invalid-id':
		'The stream ID or dialback ID is invalid or does not match an ID ' +
		'previously provided.',
	'invalid-namespace':
		'The streams namespace name is invalid.',
	'invalid-xml':
		'The entity has sent invalid XML over the stream to a server that ' +
		'performs validation',
	'not-authorized':
		'The entity has attempted to send data before the stream has been ' +
		'authenticated',
	'policy-violation':
		'The entity has violated a local service policy',
	'remote-connection-failed':
		'The server is unable to properly connect to a remote entity that ' +
		'is required for authentication or authorization.',
	'resource-constraint':
		'The server lacks the system resources necessary to service the stream.',
	'restricted-xml':
		'The entity has attempted to send restricted XML features.',
	'see-other-host':
		'The server will not provide service to the initiating entity but ' +
		'is redirecting traffic to another host',
	'system-shutdown':
		'The server is being shut down and all active streams are being ' +
		'closed.',
	'undefined-condition':
		'The error condition is undefined.',
	'unsupported-encoding':
		'The initiating entity has encoded the stream in an encoding that ' +
		'is not supported by the server.',
	'unsupported-stanza-type':
		'The initiating entity has sent a first-level child of the stream ' +
		'that is not supported by the server.',
	'unsupported-version':
		'The value of the "version" attribute provided by the initiating ' +
		'entity in the stream header specifies a version of XMPP that is ' +
		'not supported by the server.',
	'xml-not-well-formed':
		'The initiating entity has sent XML that is not well-formed.'
};
