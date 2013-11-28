var xmpp = angular.module('xmpp', [
    'ngRoute',
    'ui.bootstrap'
]);

xmpp.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
    $routeProvider
    .when('/', {
        templateUrl : 'views/login.html',
        controller : 'loginController'
    })
    .when('/main', {
        templateUrl : 'views/main.html',
        controller : 'mainController'
    })
    .otherwise({
        redirectTo: '/'
    });
}]);