var xmpp = angular.module('xmpp');

xmpp.controller('indexController', ['$scope', 'utils', 'xmpp', function ($scope, utils, xmpp) {
    $scope.left = 'views/leftside.html';
    $scope.right = 'views/rightside.html';

    $scope.contacts = xmpp.getContacts();

    // show badge in contact list on new message
    xmpp.on('message', function(message) {
        utils.findById($scope.contacts, message.from).unread += 1;
        $scope.$apply();
    });

//    xmpp.on('contact_online', function(contact) {
//
//    });
//
//    xmpp.on('contact_offline', function(contact) {
//
//    });

    $scope.contacts = [
        {
            jid: 1,
            name: 'Torben',
            online: true,
            unread: 1
        },
        {
            jid: 2,
            name: 'Vince',
            online: true,
            unread: 5
        },
        {
            jid: 3,
            name: 'André',
            online: false,
            unread: 0
        },
        {
            jid: 4,
            name: 'Tobias',
            online: true,
            unread: 0
        },
        {
            jid: 5,
            name: 'Michael',
            online: false,
            unread: 0
        },
        {
            jid: 6,
            name: 'Moritz',
            online: true,
            unread: 0
        }
    ];
}]);