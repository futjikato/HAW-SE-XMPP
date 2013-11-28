var xmpp = angular.module('xmpp', [
    'ui.router',
    'ui.bootstrap'
]);

xmpp.config(['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/');

    $stateProvider
    .state('login', {
        url:    '/',
        templateUrl : 'views/login.html',
        controller : 'loginController'
    })
    .state('main', {
        url:    '/main',
        templateUrl : 'views/main.html',
        controller : 'mainController'
    });
}]);