var xmpp = angular.module('xmpp');

xmpp.controller('indexController', ['$scope', 'utils', 'xmpp', function ($scope, utils, xmpp) {
    $scope.left = 'views/leftside.html';
    $scope.right = 'views/rightside.html';

    // assign username to view
    try {
        $scope.myName = xmpp.getUsername();
    } catch(e) {
        //todo handle error and show some info to the user
        console.error(e);
    }

    // assign contact list to view
    try {
        $scope.contacts = xmpp.getUserlist();;
    } catch(e) {
        //todo handle error and show some info to the user
        console.error(e);
    }

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
    // todo if page goes away YOU NEED TO DETACH FROM THE EVENT-EMITTER !!!!!!!!!!!!!

    $scope.addContact = function(newContactJid) {
        xmpp.addContact(newContactJid);
        console.log(newContactJid);
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
        online: true,
        unread: 1
    });
    $scope.contacts.push({
        jid: 2,
        name: 'Vincent',
        online: false,
        unread: 100
    });
}]);