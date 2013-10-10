var xmpp = require('./xmpp');

var client = xmpp.create({	
//	host: 'jabber.se',
//	jid: 'brezelbube@jabber.se',
//	password: 'brezel',

	host: 'twattle.net',
	jid: 'twat20',
	password: 'twat20',
	useSSL: true
});

client.on('closed', function(reason) {
	console.log('I have been disconnected: ' + reason);
});

client.on('connect', function() {
	console.log('Connected to server...');
});

client.on('pickSASLMechanism', function(mechanisms) {
	console.log('Server supports following SASL mechanisms:');
	console.log(mechanisms);
});

client.on('authenticated', function() {
	console.log('My credentials have been accepted, now logged in.');
});

client.connect();

