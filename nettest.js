var request = require('request');
request('http://www.google.com', function (error, response, body) {
    if (!error && response.statusCode == 200) {
        document.getElementsByTagName('body')[0].innerHTML = body;
    }
});