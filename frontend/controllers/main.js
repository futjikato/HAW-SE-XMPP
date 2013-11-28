var xmppControllers = angular.module('xmpp');

xmppControllers.controller('mainController', ['$scope', function ($scope) {
    $scope.message = 'data from mainController';
}]);