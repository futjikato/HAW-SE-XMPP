var xmpp = angular.module('xmpp'),
    Api = require('./../XmppAPI');

xmpp.factory('xmpp', function() {
    var service = {},
        api;

    service.login = function(user, password, domain, callback) {
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

    service.getMessages = function(jid) {
        if(!api)
            throw new Error("Api not initialized.");

        return api.getMessages(jid);
    };

    service.sendMessage = function(to, msg) {
        if(!api)
            throw new Error("Api not initialized.");

        return api.sendMessage(to, msg);
    };

    return service;
});