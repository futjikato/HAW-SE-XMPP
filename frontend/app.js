var xmpp = angular.module('xmpp', [
    'ui.router',
    'ui.bootstrap'
]);

xmpp.config(['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/login');

    $stateProvider
    .state('main', {
        abstract: true,
        url: '',
        templateUrl : 'views/main.html',
        controller : 'mainController'
    })
    .state('main.login', {
        url: '/login',
        templateUrl : 'views/login.html',
        controller : 'loginController'
    })
    .state('main.index', {
        url: '/index',
        templateUrl : 'views/index.html',
        controller : 'indexController'
    })
    .state('main.index.contact', {
        url: '/contact/:contactId',
        templateUrl: 'views/contact.html',
        controller: 'contactController'
    });
}]);