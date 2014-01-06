var xmpp = angular.module('xmpp');

// used to only register once to the message event since the controller is called on every contact change

xmpp.controller('contactController', ['$scope', '$stateParams', 'utils', 'xmpp', function ($scope, $stateParams, utils, xmpp) {
    $scope.contact = utils.findById($scope.contacts, $stateParams.contactJid);
    $scope.messages = xmpp.getMessages($stateParams.contactJid);

    $scope.contact.unread = 0;

    var api = xmpp.getApi();
    api.on('message', function(from, message) {
        // only add new messages from our partner
        if (from != $scope.contact.jid) {
            return;
        }

        $scope.messages.push({
            jid: from,
            body: message.body,
            time: Date.now()
        });
        $scope.$apply();
    });

    $scope.send = function() {
        xmpp.sendMessage($scope.contact.jid, $scope.msg);
        $scope.messages.push({
            jid: xmpp.getUsername(),
            body: $scope.msg,
            time: Date.now()
        });
        $scope.msg = '';
    };
}]);