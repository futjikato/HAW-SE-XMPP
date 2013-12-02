var xmpp = angular.module('xmpp');

xmpp.factory('xmpp', function() {
    var service = {};

    console.log('xmpp schnittstelle init');

    service.login = function(user, password, domain, ressource) {
        console.log('login: ' + user + ', ' + password);
        return true;
    };

    return service;
});