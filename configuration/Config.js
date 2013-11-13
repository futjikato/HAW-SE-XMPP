/**
 * @authors     Moritz Spindelhirn <moritz.spindelhirn@haw-hamburg.de>
 * @date        13-11-13
 * @modified    13-11-13 13:46
 *
 * Configuration manager
 * Parses a configurationfile and supplies an interface to access the configuration easily.
 */

// Dependencies
var fs = require('fs');

/**
 * Configuration manager class
 */
function Config() {
    /**
     * @type Object
     *  Key-Value storage for configuration
     *
     * @private
     */
    this._configs = {};

    /**
     * @type String
     *  Name of the configurationfile
     *
     * @private
     */
    this._configFilename = "./configuration/config.json";

    // read config as initialization
    this._readConfig();
}

/**
 * Read the configuration file.
 * This method is part of the initialization process.
 *
 * @private
 */
Config.prototype._readConfig = function() {
    // read config file ( will block app )
    var configStr = fs.readFileSync(this._configFilename);
    // config file must be JSON format. That way we can easily inject the config.
    this._configs = JSON.parse(configStr);
};

/**
 * Getter for configuration
 *
 * @param variable
 *  String name of the configuration variable
 *
 * @return
 *  String value of the configuration parameter
 *  If no configuration parameter is set for the requested variable null is returned
 */
Config.prototype.get = function(variable) {
    return this._configs[variable];
};


// create singleton instance
var config = new Config();

// expose only the singleton instance
module.exports = config;