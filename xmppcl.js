/**
 * @authors     Torben Könke <torben.koenke@haw-hamburg.de>,
 * @date        17-10-13
 * @modified    18-10-13 11:98
 * 
 * A simple command-line XMPP client.
 * 
 */
var XmppIM   = require('./XmppIM');
var readline = require('readline');

// Globals
var client    = null;
var _requests = {};
var rl        = null;

function main(args) {
	if(args.length < 4) {
		console.log('usage: node xmppcl.js <jid> <password> [<port>]');
		return;
	}
	var m = args[2].match(/^([^@]+)@(.+)$/);
	if(m == null) {
		console.log('Invalid JID.');
		return;
	}
	var local = m[1], host = m[2], password = args[3];
	var port = 5222;
	if(args.length > 4)
		port = args[4];	
	// Setup stdin.
	rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	createClient({
		'host':     host,
		'user':     local,
		'password': password,
		'port':     port		
	});
};

function createClient(opts) {
	client = new XmppIM(opts);
	
	client.on('ready', function() {
		console.log('Connected.');
		readLine();
	});
	
	client.on('message', onMessage);
	client.on('status', onStatus);
	client.on('authorize', onAuthorize);
	client.on('authorized', onAuthorized);
	client.on('refused', onRefused);
}

function onMessage(message) {
	console.log('<< ' + message.from + '<< ' + message.body);
}

function onStatus(from, status) {
	console.log(from + ' has set his status to "' + status.description + '" ' +
			((status.show != null ? ('(' + status.show + ')') : '')) + '.');
}

function onAuthorize(request) {
	_requests[request.from] = request;
	console.log(request.from + ' has requested authorization.');
}

function onAuthorized(jid) {
	console.log(jid + ' has accepted your authorization request.');
}

function onRefused(jid) {
	console.log(jid + ' has refused your authorization request.');
}

function readLine() {
	rl.question('> ', processLine);
}

function processLine(line) {
	var m = line.match(/^([^\s]+)\s*(.*)$/);
	if(m == null)
		return readLine();
	var command = m[1].trim(), args = m[2].trim();
	if(typeof global[command] == 'function')
		global[command](args);
	else
		console.log('unknown command, type \'help\' to display a list of ' +
			'supportd commands.');		
	readLine();
}

global.quit = function(args) {
	console.log('Quitting...');
	client.close();
	rl.close();
};

global.send = function(args) {
	var m = args.match(/^([^\s]+)\s*(.*)$/);
	if(m == null)
		return;
	var to = m[1].trim(), text = m[2].trim();
	console.log('>> ' + to + ' >> ' + text);
	client.sendMessage(to, text);
};

global.status = function(args) {
	var m = args.match(/^(\w+)\s*(.*)$/);
	if(m == null)
		return;
	var show = m[1].trim(), description = m[2].trim();
	try {
		client.setStatus({
			'show': show,
			'description': description
		});
		console.log('Status changed to ' + show);		
	} catch(e) {
		console.log('Error: ' + e.message);
	}
};

global.add = function(args) {
	var jid = args.trim();
	try {
		client.addContact(jid);
		console.log('Contact added to roster.');		
	} catch(e) {
		console.log('Error: ' + e.message);
	}
};

global.remove = function(args) {
	var jid = args.trim();
	try {
		client.removeContact(jid);
		console.log('Client removed.');
	} catch(e) {
		console.log('Error: ' + e.message);
	}
};

global.authorize = function(args) {
	var jid = args.trim();
	if(_requests[jid] == null)
		return;
	_requests[jid].accept();
	console.log('Authorized ' + jid);
};

global.refuse = function(args) {
	var jid = args.trim();
	if(_requests[jid] == null)
		return;
	_requests[jid].deny();
	console.log('Authorized ' + jid);
};

global.roster = function(args) {
	client.getRoster(function(success, roster) {
		console.log('Client\'s roster (contact list):');
		console.log(roster);
	});
};

global.help = function(args) {
	console.log(
			['* Send a message: send <recipient-jid> <message>',
			'* Change status:  status <away|dnd|chat|xa> <message>',
			'* Add contact:    add <contact-jid>',
			'* Remove contact: remove <contact-jid>',
			'* Authorize:      authorize <contact-jid>',
			'* Refuse:         refuse <contact-jid>',
			'* Display Roster  roster',
			'* Help            help',
			'* Quit:           quit']
	);
};

main(process.argv);