
var XmppIM = require('./XmppIM');

var client = new XmppIM({
	host: 'twattle.net',
	jid: 'twat20',
	password: 'twat20'
});

client.on('ready', function() {
	// Status auf away setzen.
	this.setStatus({
		show: 'away',
		status: 'Ich bin nicht da...'
	});
});
