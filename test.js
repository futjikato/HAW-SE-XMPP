/*
var mech = require('./sasl/mechanisms/scram-sha-1');
var scram = new mech();

scram.add('username', 'twat20');
scram.add('password', 'twat20');

var response = scram._computeFinalResponse('r=fyko+d2lbbFgONRv9qkxdawL1ed74ae0-2c0c-4d05-a51f-fb5ce708aedd,s=NjRlZWJkM2QtNWFmZi00MzQzLWE3NzQtNTg1YWY5YmY2ZWY2,i=4096');
console.log(response);
*/


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

