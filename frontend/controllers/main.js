var xmppControllers = angular.module('xmpp');

xmppControllers.controller('mainController', ['$scope', function ($scope) {
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