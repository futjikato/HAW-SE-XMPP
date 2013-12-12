var xmpp = angular.module('xmpp');

xmpp.controller('mainController', ['$rootScope', '$scope', function ($rootScope, $scope) {
    $scope.show = function() {
        $scope.settings = true;
    };
    $rootScope.hideSettings = function() {
        $scope.settings = false;
    };
}]);