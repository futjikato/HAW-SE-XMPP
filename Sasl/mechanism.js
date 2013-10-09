function mechanism() {
}

var proto = mechanism.prototype;

proto.add = function(key, value) {
	if(this._properties === undefined)
		this._properties = {};
	this._properties[key] = value;
};

module.exports = mechanism;