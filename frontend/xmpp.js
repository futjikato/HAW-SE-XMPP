var xmpp = angular.module('xmpp'),
    Api = require('./../XmppAPI');

xmpp.factory('xmpp', function() {
    var service = {},
        api;

    console.log('xmpp schnittstelle init');

    service.login = function(user, password, domain, ressource, callback) {
        var creationOps = {
            host: domain,
            user: user,
            password: password,
            // @todo port can be passed optional ... may include in frontend ?
            callback: function(ok) {
                callback(ok);
            }
        };

        api = new Api(creationOps);
    };

    return service;
});