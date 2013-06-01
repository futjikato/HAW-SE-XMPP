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
        jquery: '/libs/jquery/jquery-2.0.0',
        Mustache: '/libs/mustache.js/mustache'
    }
});

// load jquery
require([ "jquery", "net/Client" ], function($, Client) {
    // wait for DOM ready
    $(function() {

        //TODO do stuff here
        console.log("System is ready and waiting for your orders.");

        // test xmpp client
        $('#go').on('click', function() {
            var c = new Client('chat.facebook.com', 5222, 'chat.facebook.com');
        });
    });
});