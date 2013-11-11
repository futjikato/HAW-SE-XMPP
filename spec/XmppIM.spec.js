var XmppIM = require('../XmppIM'),
    assert = require("assert");

var im = new XmppIM({user:'fake', host:'alsoFake', autoConnect: false});

var core = {

    _listener : {},

    _assertions : [],

    on : function(name, listener) {
        this._listener[name] = listener;
    },

    presence : function(attr, m) {
        this._assertions.push({attr : attr, m : m});
    }
};

im._core = core;

describe("The XmppIM", function () {
    it("shouzld work", function(done) {
        im.getStatus("a");

        assert.equal(core._assertions.length, 1);
        assert.deepEqual(core._assertions[0].attr, {
            to: "a",
            type: "probe"
        });

        done();
    });
});