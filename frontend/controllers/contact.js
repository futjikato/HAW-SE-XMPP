var xmpp = angular.module('xmpp');

xmpp.controller('contactController', ['$scope', '$stateParams', 'utils', 'xmpp', function ($scope, $stateParams, utils, xmpp) {
    $scope.contact = utils.findById($scope.contacts, $stateParams.contactJid);
    $scope.messages = xmpp.getMessages($stateParams.contactJid);

    $scope.contact.unread = 0;

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

    var api = xmpp.getApi();

    api.on('message', function(from, message) {
        $scope.messages.push({
            jid: from,
            body: message.body
        });
        $scope.$apply();
    });

    $scope.send = function() {
        xmpp.sendMessage($scope.contact.jid, $scope.msg);
        $scope.msg = '';
    };
}]);