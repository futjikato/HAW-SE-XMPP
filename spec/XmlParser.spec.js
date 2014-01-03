/**
 * @authors     Moritz Spindelhirn <moritz.spindelhirn@haw-hamburg.de>
 * @date        06-11-13
 * @modified    06-11-13 17:52
 *
 * Jasmine test specs for the XmlParser class
 *
 * Start `jasmine-node spec` to run all tests!
 */

// get fs module to load mock files
var fs = require("fs"),
    XmlParser = require('../XmlParser'),
    assert = require("assert");

describe("The XmlParser", function () {

    // define global vars here

    beforeEach(function() {
        // in here you can inialize your global vars to some defined value.
        // this will be called prior to every test.
    });

    it("should parse the simple.sml", function(done){
        // create stream and pause to prevent parser to eat all the xml before callbacks are assigned
        var stream = fs.createReadStream('spec/mocks/xml/simple.xml');
        stream.pause();

        // create xml parser
        var parser = new XmlParser(stream);

        // create counter
        var counter = 0;

        // on every child tag call method on stub
        parser.on('child', function() {
            counter++;
        });

        // after root tag is processed there should be 4 child tags
        parser.on('root', function() {
            assert.equal(4, counter);
            // and we are done testing.
            done();
        });

        // resume stream to push all data to the parser.
        stream.resume();
    });

    it("should rename the event for an error tag to _error", function(done) {
        // create stream and pause to prevent parser to eat all the xml before callbacks are assigned
        var stream = fs.createReadStream('spec/mocks/xml/xmpperror.xml');
        stream.pause();

        // create xml parser
        var parser = new XmlParser(stream);

        // on error call done as success of the test
        parser.on('_error', function() {
            done();
        });

        // resume stream to push all data to the parser.
        stream.resume();
    });
});