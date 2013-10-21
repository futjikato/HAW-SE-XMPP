
var XmppIM = require('./XmppIM');

var client = new XmppIM({
	host:     'twattle.net',
	user:     'twat20',
	password: 'twat20'
});

client.on('ready', function(info) {
	console.log('Verbunden als ' + info.jid);
	console.log('Meine Contactlist:');
	console.log(info.roster);
			
/*	
	// Status auf away setzen.
	this.setStatus({
		show: 'away',
		description: 'Ich bin nicht da...'
	});
	
	// Nach 5 Sekunden beenden.
	setTimeout(function() {
		client.close();
	}, 5000);
*/			
 });
 
client.on('status', function(contact, status) {
	console.log(contact + ' hat seinen Status geändert:');
	console.log(status);
 });
 
client.on('message', function(message) {
	console.log('Neue Nachricht von ' + message.from);
	console.log(message);
 });

client.on('authorize', function(request) {
	console.log(request.from +
			' hat eine Authorisierungsanfrage gesendet.');
	// GUI-Dialog anzeigen mit Ja/Nein Auswahl.
	if(request.from == 'abc')
		request.deny();
	else
		request.accept();
});

client.on('authorized', function(name) {
	console.log(name +
			' hat deine Authorisierungsanfrage akzeptiert.');
});

client.on('refused', function(name) {
	console.log(name +
			' hat deine Authorisierungsanfrage abgelehnt.');
});
