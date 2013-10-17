
The module exports a class *XmppIM* which exposes the following public interface

**Events**

 - **'ready'** (object info)
 
 Emitted when the connection to the XMPP server has been negotiated and chat
 messages can be sent and received. The parameter *'info'* is an object made up of
 the properties *'jid'* which contains the JID under which the connection has been
 negotiated and *'roster'* which contains the client's contact list as received
 from the server upon login.
 
 - **'status'** (string who, object status)
 
 Emitted when the status of a contact on the client's contact list changes. The
 parameter *'who'* is a string containing the JID of the contact whose status
 has changed. The parameter *'status'* is an object made up of the properties
 *'description'* which is a textual description of the contact's new status,
 *'available'* which is boolean value determining the contact's availability and
 the optional field 'show' which, if present, contains the away status of the
 contact.
 
 - **'message'** (object message)
 
 Emitted when a new chat message has been received. The parameter *'message'* is
 an object made up of the properties *'from'* which contains the JID of the sender
 of the message, *'type'* which contains the type of the message and the fields
 *'subject'* and *'body'* which contain the subject and body of the message,
 respectively.
 
 - **'error'** (object error)
 
 Emitted when an error occurs. The parameter error is an Error object.
 
 
**Methods**

- **XmppIM(object opts)**

 Constructs a new XmppIM object using the specified set of options.
 
 *param opts*  
  A set of options, some of which are required:
    * 'host'  
       specifies the hostname of the XMPP server.
    * 'user'  
       the username to connect with.
    * 'password'  
       the password for the username.
    * 'port'  
       the port on which to connect. Defaults to 5222, if not specified. 

- **setStatus(object status)**

 Sets the availability status of the client.
 
 *param status*  
 A string specifying a natural-language description of the availability
 status or an object made up of the following fields, at least one of
 which must be provided:
   * 'show'  
      specifies the particular availability status of the client.
      Can be one of the following values:
      - 'away' (user is away)
      - 'chat' (user is interested in chatting)
      - 'dnd'  (user is busy, do not disturb)
      - 'xa'   (user has been away for an extended period)

    * 'description'  
       a string specifying a natural-language description of the
       availability status or an object literal in the form of:  
       { 'de': 'Statusbeschreibung auf Deutsch', 'en': 'Status description in English' }

 *exception Error*  
 Thrown if the parameter is null, not of the proper type or if any of the
 parameter's fields contain invalid values.

- **sendMessage(string to, object message)**

 Sends the specified chat message to the specified recipient.
  
 *param to*  
 A string that specifies the JID of the recipient of the message.  

 *param message*  
  This can either be a string in which case it specifies the message's
  body or an object made up of the following fields, all of which are optional:  

    * 'type'  
      specifies the type of the message. Possible values are:
      'chat', 'error', 'groupchat', 'headline' or 'normal'. If this is not specified,
      it defaults to 'normal'.
    * 'thread'  
      the identifier of the conversation thread this message should
      be added to (optional).  
    * 'subject'  
      the subject of the message (optional). If specified, this can
      either be a string or an object literal in the form of:  
      {  'de': 'Deutscher Text', 'en': 'English Text'  }  
    * 'body'  
     the body of the message (optional). If specified, this can
     either be a string or an object literal in the form of:  
     {  'de': 'Deutscher Text',  'en': 'English Text'  }  

 *Exception Error*  
  Thrown if either argument is null or undefined or if any of the
  arguments fields or values are invalid.

- **addContact(string jid, object item)**
 
 Adds the contact with the specified JID to the client's roster and
 sends an authorization request to the contact.

 *param jid*  
 A string that specifies the JID of the contact to add.  

 *param item*  
  If specified, this parameter is an object made up of the following
  fields, all of which are optional:  

    * 'name'  
      the name under which the contact will be added to the
      client's contact list.
    * 'groups'  
      An array of strings each of which specifies the name
      of a group the contact will be added to.

 The item parameter is optional and may be omitted.
 
 *Exception Error*  
  Thrown if the jid argument is null or undefined or if any of the
  arguments fields or values are invalid. 

- **removeContact(string jid)**

 Removes the contact with the specified JID from the client's roster.

 *param jid*  
 A string that specifies the JID of the contact to remove from the
 client's roster.  

 *Exception Error*  
  Thrown if the jid argument is null or undefined.
   
- **close()**

  Closes the connection to the XMPP server.
