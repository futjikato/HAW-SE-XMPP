var gui = require('nw.gui');
var win = gui.Window.get();

var xmpp = angular.module('xmpp');

xmpp.controller('mainController', ['$rootScope', '$scope', 'xmpp', function ($rootScope, $scope, xmpp) {
    win.on('close', function() {
        try {
            xmpp.getApi().close();
        } catch(e) {
            // user didn't login
        }
        this.close(true);
    });
    $scope.close = function() {
        win.close();
    };
    $scope.showSettings = function() {
        $scope.settings = true;
    };
    $rootScope.hideSettings = function() {
        $scope.settings = false;
    };
}]);