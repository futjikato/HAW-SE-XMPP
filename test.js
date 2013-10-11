
var xmpp = require('./xmpp');

var client = xmpp.create({	
//	host: 'jabber.se',
//	jid: 'brezelbube@jabber.se',
//	password: 'brezel',

	host: 'twattle.net',
	jid: 'twat20',
	password: 'twat20',
	useTls: true
});

client.on('closed', function(reason) {
	console.log('I have been disconnected: ' + reason);
});

client.on('connect', function() {
	console.log('Connected to server...');
});

client.on('tlsenabled', function() {
	console.log('Switchted to secure TLS stream.');
});

client.on('authenticated', function() {
	console.log('My credentials have been accepted, now logged in.');
});

client.connect();

