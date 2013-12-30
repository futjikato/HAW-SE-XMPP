var xmpp = angular.module('xmpp');

xmpp.controller('contactController', ['$scope', '$stateParams', 'utils', 'xmpp', function ($scope, $stateParams, utils, xmpp) {
    $scope.contact = utils.findById($scope.contacts, $stateParams.contactJid);
    $scope.messages = xmpp.getMessages($stateParams.contactJid);

    $scope.messages = [
        {
            jid: 'a@a.a',
            body: 'test'
        },
        {
            jid: 'a@a.a',
            body: 'test'
        },
        {
            jid: 'a@a.a',
            body: 'test'
        },
        {
            jid: 'a@a.a',
            body: 'test'
        },
        {
            jid: 'a@a.a',
            body: 'test'
        },
        {
            jid: 'a@a.a',
            body: 'test'
        },
        {
            jid: 'a@a.a',
            body: 'test'
        },
        {
            jid: 'a@a.a',
            body: 'test'
        },
        {
            jid: 'a@a.a',
            body: 'test'
        },
        {
            jid: 'a@a.a',
            body: 'test'
        },
        {
            jid: 'a@a.a',
            body: 'test'
        },
        {
            jid: 'a@a.a',
            body: 'test'
        },
        {
            jid: 'a@a.a',
            body: 'test'
        },
        {
            jid: 'a@a.a',
            body: 'test'
        }
    ];

    xmpp.on('message', function(message) {
        $scope.messages.push(message);
        $scope.$apply();
    });

    $scope.send = function() {
        xmpp.sendMessage($scope.contact.jid, $scope.msg);
        $scope.msg = '';
    };
}]);