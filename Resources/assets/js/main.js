/**
 * Require.js configuration
 *
 * Please use absolute paths in any case
 * Notice that absolute paths start in the Resources directory
 *
 * Notice that for all javascript files you _must_ omit the file extension.
 *
 * Add any used library as a special path. That way we update much easier.
 */
requirejs.config({
    baseUrl: '/assets/js',
    paths: {
        jquery: '/libs/jquery/jquery-2.0.0'
    }
});

// load jquery
require([ "jquery" ], function($) {
    // wait for DOM ready
    $(function() {

        //TODO do stuff here
        console.log("System is ready and waiting for your orders.");

    });
});