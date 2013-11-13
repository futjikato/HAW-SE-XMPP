/**
 * @authors     Moritz Spindelhirn <moritz.spindelhirn@haw-hamburg.de>,
 * @date        13-11-13
 * @modified    13-11-13 10:28
 *
 * Monitoring class
 * Sends anonymous data to a StatsD server for monitoring the use of the application.
 */

// Dependencies
var dgram = require('dgram');

// todo create some kind of settings manager
var MONITORING_PREFIX   = "sexmpp";
var MONITORING_SERVER   = "localhost";
var MONITORING_PORT     = 8125;
var DEBUG = 1;

/**
 * Creates a new monitor instance.
 * The monitor class is used to send anonymous data to a monitoring server.
 * It uses the UDP protocol for sending the packages.
 *
 * @this
 *  Reference the newly created instance of the monitor
 */
function Monitor() {
    this._client = dgram.createSocket('udp4');
}

/**
 *
 * @param data
 *  A string containing the information for the monitoring server.
 *  Format should be somthing like : <eventarea>.[<eventarea>.]*<eventname>:<value>|<metric type>
 *  e.g. user.status.change:1|c
 *   This would increase the user.status.change metric by 1.
 *
 *  Read more about the formats for StatsD here:
 *  https://github.com/etsy/statsd/blob/master/docs/metric_types.md
 *
 * @private
 */
Monitor.prototype._send = function( data ) {
    if(DEBUG) {
        console.log("[Monitor] Sending : `" + data + "` to " + MONITORING_SERVER + ":" + MONITORING_PORT);
    }
    var buf = new Buffer(data);
    this._client.send(buf, 0, buf.length, MONITORING_PORT, MONITORING_SERVER, function(err, bytes) {
        console.log('done ?');
        if(err) {
            console.log("[Monitor] Error : " + err);
        } else {
            console.log("[Monitor] Success : Send " + bytes + " bytes");
        }
    });
}

/**
 * Send an event to the monitoring server.
 *
 * @param eventareas
 *  Array or string with eventareas
 * @param eventname
 *  String with the name of the final event
 * @param increaseValue
 *  Optional. Value by with the counter should be increased. If none is given 1 is assumed.
 */
Monitor.prototype.send = function( eventareas, eventname, increaseValue ) {
    // if no increaseValue is given set 1 as default
    if(!increaseValue) increaseValue = 1;

    // check if increaseValue is a value
    if(!parseInt(increaseValue)) {
        throw new Error("Counter increase value must be an integer.");
    }

    // always start with prefix
    var data = MONITORING_PREFIX + ".";

    // add all eventareas
    if(Array.isArray(eventareas)) {
        eventareas.forEach(function(area) {
            data += area + ".";
        })
    } else {
        // or just a single on if its a string
        data += eventareas + ".";
    }

    // add eventname
    data += eventname;

    // use countertype and increase by 1
    data += ":" + increaseValue + "|c";

    // send package
    this._send(data);
}

// create a singleton instance
var monitor = new Monitor();

// expose the singleton instance as module
module.exports = monitor;