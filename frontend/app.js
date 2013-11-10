var xmpp = angular.module('xmpp', [
    'ngRoute',
    'ui.bootstrap',
    'xmppControllers'
]);

xmpp.config(['$routeProvider', function ($routeProvider) {
    $routeProvider
    .when('/', {
        templateUrl : 'views/login.html',
        controller : 'loginController'
    })
    .when('/main', {
        templateUrl : 'views/main.html',
        controller : 'mainController'
    });
}]);

angular.module('xmppControllers', []);