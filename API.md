
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

