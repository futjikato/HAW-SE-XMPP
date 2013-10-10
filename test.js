var crypto = require('crypto');

function Hi(password, salt, count) {
	var saltBytes = new Buffer(salt, 'base64');	
	return crypto.pbkdf2Sync(password, saltBytes, count, 20);
}

function hmac(key, data) {
	return crypto.createHmac('sha1', key).update(data).digest();
};

function h(s) {
	return crypto.createHash('sha1').update(s).digest();
}

function xor(a, b) {
	if(a.length != b.length)
		throw new Error('Arrays must be of same length.');
	var ret = [];
	for(var i = 0; i < a.length; i++)
		ret[i] = a[i] ^ b[i];
	return ret;
}

xor(h('meineDaten'), h('meineDaten'));

/*
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

client.connect();
*/
