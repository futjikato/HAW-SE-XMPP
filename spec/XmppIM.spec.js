var XmppIM = require('../XmppIM'),
    assert = require("assert");

function IllegalArgumentException(message) {
    this.message = message;
    this.name = "IllegalArgumentException";
}

var im = new XmppIM({user:'fake', host:'alsoFake', autoConnect: false});

var core = {

    _listener : {},

    _assertions : [],

    on : function(name, listener) {
        this._listener[name] = listener;
    },

    presence : function(attr, m) {
        this._assertions.push({attr : attr, m : m});
    },

    retrieveRoster : function(cb) {
        this._assertions.push("roster retrieved");
    },

    message : function(object) {
        if (object == null){
            throw new IllegalArgumentException("Object is null but should contain the message");
        }
        this._assertions.push(object);
    },

    iq : function(attr, data, cb) {
        // Call callback in the context of the XmppIM instance.
        this._assertions.push({attr : attr, data : data});
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

describe("getRooster", function() {
    it("should work", function(done) {
        im.getRoster(function() {
            // dummy
        });

        assert.equal(core._assertions.length, 2);

        done();
    })
});

describe("addContact", function() {
   it("should work", function(done) {
       im.addContact("jid", "the Item");

       assert.equal(core._assertions.length, 3);

       done();
   })
});

describe("sendMessage", function() {
    it("should work", function(done) {
        im.sendMessage("localhost", "Just a Test");

        assert.equal(core._assertions.length, 4);

        done();
    })
});

describe("setStatus", function() {
    it("should work", function(done) {
        im.setStatus("under Test");

        assert.equal(core._assertions.length, 5);

        done();
    })
});