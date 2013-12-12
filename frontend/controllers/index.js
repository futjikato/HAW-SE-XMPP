var xmpp = angular.module('xmpp');

xmpp.controller('indexController', ['$scope', function ($scope) {
    $scope.left = 'views/leftside.html';
    $scope.right = 'views/rightside.html';

    $scope.contacts = [
        {
            id: 1,
            name: 'Torben',
            unread: 1
        },
        {
            id: 2,
            name: 'Vince',
            unread: 5
        },
        {
            id: 3,
            name: 'André',
            unread: 0
        },
        {
            id: 4,
            name: 'Tobias',
            unread: 0
        },
        {
            id: 5,
            name: 'Michael',
            unread: 0
        },
        {
            id: 6,
            name: 'Moritz',
            unread: 0
        }
    ];
}]);