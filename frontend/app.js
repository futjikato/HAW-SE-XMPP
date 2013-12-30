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
        url: '/contact/:contactJid',
        templateUrl: 'views/contact.html',
        controller: 'contactController'
    });
}]);

xmpp.filter('reverse', function() {
    return function(items) {
        return items.slice().reverse();
    };
});

xmpp.factory('utils', function () {
    return {
        findById: function (a, id) {
            for (var i = 0; i < a.length; i++) {
                if (a[i].jid == id) return a[i];
            }
            return null;
        }
    }
});
