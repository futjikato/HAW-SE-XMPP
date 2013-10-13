
var XmppClient = require('./XmppClient');

var client = new XmppClient({
	host: 'twattle.net',
	jid: 'twat20',
	password: 'twat20'	
});

client.on('connect', function() {
	console.log('connected');
});

client.on('error', function(e) {
	console.log(e);
});

client.connect();
