var xmpp = angular.module('xmpp');

xmpp.controller('loginController', ['$scope', '$state', 'xmpp',  function ($scope, $state, xmpp) {
    var api;
    $scope.errors = [];
    var errorCallback = function(error) {
        $scope.errors.push(error);
        $scope.$apply();
    };

    $scope.domain = 'twattle.net';
    $scope.user = 'twat20';
    $scope.password = 'twat20';

    $scope.login = function() {
        $scope.errors = [];
        api = xmpp.login($scope.user, $scope.password, $scope.domain, function() {
            $state.go('main.index');
        });

        api.on('error', errorCallback);
    };
}]);