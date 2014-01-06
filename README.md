### Introduction

This repository contains an easy-to-use and well-documented node.js module for
communicating and exchanging messages with an XMPP server.

### Usage

The module depends on the following list of modules all of which can be
installed with **npm**:

 * sax-js	(npm install sax)
 * json2xml	(npm install json2xml)
 * extend	(npm install extend)
 * starttls	(npm install starttls)
 * winston  (npm install winston)
 
The module exports a single class which can be referenced by simply
requiring *XmppIm*.
 
### API

The API description can be found [here](API.md).

### Example

    var XmppIM = require('./XmppIM');
    
    var client = new XmppIM({
      host:     'twattle.net',
      user:     'myUsername',
      password: 'myPassword'
    });
    
    client.on('ready', function(info) {
      console.log('Connected as ' + info.jid);

      console.log('My contact-list:');
      console.log(info.roster);
    });
    
    client.on('status', function(who, status) {
      console.log(who + '\'s status has changed:');
      console.log(status);
    });
    
    client.on('message', function(message) {
      console.log('New message from ' + message.from);
      console.log(message);
    });
    
For a more elaborate example, take a look at the [xmppcl](xmppcl.js) program
which implements a simple XMPP command-line client.
