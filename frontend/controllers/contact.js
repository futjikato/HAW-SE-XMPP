var xmpp = angular.module('xmpp');

xmpp.controller('contactController', ['$scope', '$stateParams', 'xmpp', function ($scope, $stateParams, xmpp) {
    $scope.name = $stateParams.contactId;
}]);