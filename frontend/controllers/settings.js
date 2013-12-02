var xmpp = angular.module('xmpp');

xmpp.controller('settingsController', ['$scope', '$rootScope', function ($scope, $rootScope) {
    $scope.root = $rootScope;
}]);