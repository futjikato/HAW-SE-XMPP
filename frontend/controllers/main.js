var xmppControllers = angular.module('xmppControllers');

xmppControllers.controller('mainController', ['$scope', function ($scope) {
    $scope.message = 'data from mainController';
}]);