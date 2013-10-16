
var XmppIM = require('./XmppIM');

var client = new XmppIM({
	host: 'twattle.net',
	user: 'twat20',
	password: 'twat20'
});

client.on('ready', function(info) {
	console.log('Verbunden als ' + info.jid);
	console.log('Meine Contactlist:');
	console.log(info.roster);
	
	// Status auf away setzen.
	this.setStatus({
		show: 'away',
		description: 'Ich bin nicht da...'
	});
		
 }).on('status', function(contact, status) {
	console.log(contact + ' hat seinen Status geändert:');
	console.log(status);
 }).on('message', function(message) {
	console.log('Neue Nachricht von ' + message.from);
	console.log(message);
 });

