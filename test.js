
var XmppIM = require('./XmppIM');

var client = new XmppIM({
	host: 'twattle.net',
	jid: 'twat20',
	password: 'twat20'
});

client.on('ready', function() {
	console.log('client ready.');
});
