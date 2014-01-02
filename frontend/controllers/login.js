var xmpp = angular.module('xmpp');

xmpp.controller('loginController', ['$scope', '$state', 'xmpp',  function ($scope, $state, xmpp) {
    $scope.login = function() {
        var api = xmpp.login($scope.user, $scope.password, $scope.domain, $scope.ressource, function() {
            $state.go('main.index');
        });

        // todo show errors somewhere
        $scope.errors = [];
        api.on("error", function() {
            var newErrors = api.getLatestErrors();
            newErrors.forEach(function(i, error) {
                $scope.errors.push(error);
            });
            $scope.$apply();
        });
        // todo if page goes away YOU NEED TO DETACH FROM THE EVENT-EMITTER !!!!!!!!!!!!!
    };
}]);