/**
 * @authors	 	Torben Könke <torben.koenke@haw-hamburg.de>
 * @date 		12-10-13
 * 
 * An events-based XML parser based on sax-js to simplify parsing
 * of XMPP documents.
 */
var util = require('util');
var events = require('events');

/**
 * Initializes a new instance of the XmlParser class.
 * 
 * @param stream
 *  The input stream to parse the XML from.
 * @this
 *  References the new object being constructed.
 */
function XmlParser(stream) {
	// jsnode events boilerplate.
	events.EventEmitter.call(this);
	var saxStream = require('sax').createStream(true);
	var that = this;
	saxStream.on('opentag',
			function(node) { that._openTag.call(that, node); });
	saxStream.on('closetag',
			function(name) { that._closeTag.call(that, name); });
	saxStream.on('text',
			function(text) { that._text.call(that, text); });
	this._root = {};
	this._parent = this._root;
	this._parents = [];	
	this._saxStream = saxStream;
	
	this.pipe(stream);
}

/**
 * Inherit from EventEmitter.
 */
util.inherits(XmlParser, events.EventEmitter);
var proto = XmlParser.prototype;

proto.pipe = function(stream) {
	stream.pipe(this._saxStream);
};

proto.unpipe = function(stream) {
	stream.unpipe(this._saxStream);
}

proto.once_ = function(event, context, listener) {
	this.once(event, function(args) {
		listener.call(context, args);
	});
};

proto.on_ = function(event, context, listener) {
	this.on(event, function(args) {
		listener.call(context, args);
	});
};

/**
 * Callback invoked when an opening tag has been parsed.
 * 
 * @param node
 *  An object containing the name and attributes of the parsed tag.
 *  
 */
proto._openTag = function(node) {
	this._parents.push(this._parent);
	if(this._parent[node.name] == null) {
		this._parent[node.name] = {
				attributes: node.attributes
		};
	} else {
		if(this._parent[node.name] instanceof Array) {
			this._parent[node.name].push({
				attributes: node.attributes
			});
		} else {
			var tmp = this._parent[node.name];
			this._parent[node.name] = [tmp, {
				attributes: node.attributes }];
		}
	}
	this._parent = this._parent[node.name];	
};

/**
 * Callback invoked when a close tag has been parsed.
 * 
 * @param name
 *  The name of the tag.
 */
proto._closeTag = function(name) {
	this.emit(name, this._parent);
	this._parent = this._parents.pop();
};

/**
 * Callback invoked when a text node has been parsed.
 * 
 * @param text
 *  The parsed text.
 */
proto._text = function(text) {
	if(this._parent instanceof Array)
		this._parent[this._parent.length - 1].text = text;
	else
		this._parent.text = text;
};

module.exports = XmlParser;