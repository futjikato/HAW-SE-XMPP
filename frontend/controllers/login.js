var xmpp = angular.module('xmpp');

xmpp.controller('loginController', ['$scope', '$location', 'xmpp',  function ($scope, $location, xmpp) {
    $scope.login = function() {
        xmpp.login($scope.user, $scope.password, $scope.domain, $scope.ressource, function(ok) {
            if(ok) {
                $location.path('/index');
                $scope.$apply();
            } else {
                // @todo show some kind of error to the user
            }
        });
    };
}]);