var xmpp = angular.module('xmpp', [
    'ui.router',
    'ui.bootstrap'
]);

xmpp.config(['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/login');

    $stateProvider
    .state('login', {
        url: '/login',
        templateUrl : 'views/login.html',
        controller : 'loginController'
    })
    .state('main', {
        url: '/main',
        templateUrl : 'views/main.html',
        controller : 'mainController'
    })
    .state('main.contact', {
        url: '/contact/:contactId',
        templateUrl: 'views/contact.html',
        controller: 'contactController'
    });
}]);