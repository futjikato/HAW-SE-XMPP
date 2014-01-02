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
            callback: function() {
                callback();
            }
        };

        api = new Api(creationOps);

        return api;
    };

    service.getApi = function() {
        return api;
    };

    service.getUserlist = function() {
        if(!api)
            throw new Error("Api not initialized.");

        return api.getUserlist();
    };

    service.getUsername = function() {
        if(!api)
            throw new Error("Api not initialized.");

        return api.getUsername();
    };

    return service;
});