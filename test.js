
var xmpp = require('./xmpp');

var client = xmpp.create({	
//	host: 'jabber.se',
//	jid: 'brezelbube@jabber.se',
//	password: 'brezel',

	host: 'twattle.net',
	jid: 'twat20',
	password: 'twat20'
});

client.on('closed', function(reason) {
	console.log('Disconnected: ' + reason);
});

client.on('connect', function() {
	console.log('Connected to server.');
});

client.on('tlsenabled', function() {
	console.log('Switched to secure TLS stream.');
});

client.on('authenticated', function() {
	console.log('Credentials accepted, logged in.');
});

client.on('error', function(error) {
	console.log('An error occurred: ' + error.message);
});

client.connect();

