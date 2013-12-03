var xmpp = angular.module('xmpp');

xmpp.controller('loginController', ['$scope', '$state', 'xmpp',  function ($scope, $state, xmpp) {
    $scope.login = function() {
        xmpp.login($scope.user, $scope.password, $scope.domain, $scope.ressource, function(ok) {
            if(ok) {
                $state.go('main.index');
            } else {
                // @todo show some kind of error to the user
            }
        });
    };
}]);