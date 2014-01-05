var xmpp = angular.module('xmpp');

xmpp.controller('loginController', ['$scope', '$state', 'xmpp',  function ($scope, $state, xmpp) {
    var api;
    $scope.errors = [];
    var errorCallback = function(error) {
        $scope.errors.push(JSON.stringify(error.error));
        $scope.$apply();
    };

    $scope.login = function() {
        $scope.errors = [];
        api = xmpp.login($scope.user, $scope.password, $scope.domain, function() {
            $state.go('main.index');
        });

        api.once('error', errorCallback);
    };
}]);