var xmpp = angular.module('xmpp');

xmpp.controller('loginController', ['$scope', '$location', 'xmpp',  function ($scope, $location, xmpp) {
    $scope.login = function() {
        if (xmpp.login($scope.user, $scope.password, $scope.domain, $scope.ressource)) {
            $location.path('/index');
        }
    };
}]);