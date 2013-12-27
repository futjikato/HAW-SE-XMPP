var xmpp = angular.module('xmpp');

xmpp.controller('indexController', ['$scope', 'xmpp', function ($scope, xmpp) {
    $scope.left = 'views/leftside.html';
    $scope.right = 'views/rightside.html';

    $scope.contacts = xmpp.getContacts();

    // show badge in contact list on new message
    xmpp.on('message', function(contact) {

    });

    xmpp.on('contact_online', function(contact) {

    });

    xmpp.on('contact_offline', function(contact) {

    });

//    $scope.contacts = [
//        {
//            id: 1,
//            name: 'Torben',
//            unread: 1
//        },
//        {
//            id: 2,
//            name: 'Vince',
//            unread: 5
//        },
//        {
//            id: 3,
//            name: 'André',
//            unread: 0
//        },
//        {
//            id: 4,
//            name: 'Tobias',
//            unread: 0
//        },
//        {
//            id: 5,
//            name: 'Michael',
//            unread: 0
//        },
//        {
//            id: 6,
//            name: 'Moritz',
//            unread: 0
//        }
//    ];
}]);