var express = require('express');
var app = express();

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.htm')
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

app.use('/js', express.static(__dirname + '/js'));

