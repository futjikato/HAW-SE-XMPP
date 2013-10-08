

var xmpp = require('./xmpp');

var client = xmpp.create({
	host: 'jabber.se',
	jid: 'hello@world.de',
	useSSL: true
});

client.on('closed', function(reason) {
	console.log('I have been disconnected: ' + reason);
});

client.connect();

