var xmppControllers = angular.module('xmpp');

xmppControllers.controller('loginController', ['$scope', '$location', 'xmpp',  function ($scope, $location, xmpp) {
    $scope.login = function() {
        if (xmpp.login($scope.user, $scope.password, $scope.domain, $scope.ressource)) {
            $location.path('/main');
        }
    };
}]);