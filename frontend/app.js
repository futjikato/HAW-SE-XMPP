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
        abstract: true,
        url: '/main',
        templateUrl : 'views/main.html',
        controller : 'mainController'
    })
    .state('main.index', {
        url: '',
        views: {
            leftside: {
                templateUrl: 'views/leftside.html'
            },
            rightside: {
                templateUrl: 'views/rightside.html'
            }
        }
    })
    .state('main.index.contact', {
        url: '/contact/{contactName:[a-zA-Z]{1,10}}',
        views: {
            '': {
                templateUrl: 'views/contact.html',
                controller: ['$scope', '$stateParams', function ($scope, $stateParams) {
                    $scope.name = $stateParams.contactName;
                }]
            }
        }
    });
}]);