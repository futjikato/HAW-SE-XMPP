
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

- **setStatus(object status)**

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

