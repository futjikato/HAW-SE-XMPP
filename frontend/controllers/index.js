var xmpp = angular.module('xmpp');

xmpp.controller('indexController', ['$scope', 'utils', 'xmpp', function ($scope, utils, xmpp) {
    $scope.left = 'views/leftside.html';
    $scope.right = 'views/rightside.html';

    // assign username to view
    $scope.myName = xmpp.getUsername();

    // assign contact list to view
    $scope.contacts = xmpp.getUserlist();

    // get XmppAPI class
    var api = xmpp.getApi();

    // show badge in contact list on new message
    api.on('message', function() {
        var messages = api.getNewMessages();
        messages.forEach(function(i, message) {
            utils.findById($scope.contacts, message.from).unread += 1;
        });
        $scope.$apply();
    });

    api.on('status', function(who, status) {
        utils.findById($scope.contacts, who).status = status.show;
    });

    $scope.addContact = function(newContactJid) {
        xmpp.addContact(newContactJid);
    };

    $scope.setOnline = function() {
        xmpp.setStatus({show:'chat'});
    };

    $scope.setDnd = function() {
        xmpp.setStatus({show:'dnd'});
    };

    // add dummy contacts
    $scope.contacts.push({
        jid: 1,
        name: 'Torben',
        status: 'chat',
        unread: 1
    });
    $scope.contacts.push({
        jid: 2,
        name: 'Vincent',
        status: 'dnd',
        unread: 100
    });
}]);