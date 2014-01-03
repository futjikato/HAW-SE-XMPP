/**
 * @authors     Moritz Spindelhirn <moritz.spindelhirn@haw-hamburg.de>
 * @date        03-12-13
 * @modified    03-12-13 13:27
 *
 * Log module
 * Singleton instance of logger class.
 * Can be used anywhere in the code.
 */

// Dependencies
var config = require('./configuration/Config');

// Load needed configs
var logLevel = config.get('log-level'),
    logFile = config.get('log-file');

// create winston logger instance
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            level: logLevel,
            colorize: true,
            timestamp: true
        }),
        new (winston.transports.File)({
            filename: './../logs/Core.log',
            handleExceptions : true,
            json : true,
            timestamp: true,
            maxsize: 1500,
            maxFiles: 10,
            level: logLevel,
            colorize: true
        })
    ]
});

// expose winston instance directly
module.exports = logger;