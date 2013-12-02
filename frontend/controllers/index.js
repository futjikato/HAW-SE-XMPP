var xmpp = angular.module('xmpp');

xmpp.controller('indexController', ['$scope', function ($scope) {
    $scope.left = 'views/leftside.html';
    $scope.right = 'views/rightside.html';

    $scope.contacts = [
        {
            id: 1,
            name: 'Torben'
        },
        {
            id: 2,
            name: 'Vince'
        },
        {
            id: 3,
            name: 'André'
        },
        {
            id: 4,
            name: 'Tobias'
        },
        {
            id: 5,
            name: 'Michael'
        },
        {
            id: 6,
            name: 'Moritz'
        }
    ];
}]);