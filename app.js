var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http); // Here's where we include socket.io as a node module 

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.htm')
});

app.use('/js', express.static(__dirname + '/js'));
app.use('/assets', express.static(__dirname + '/assets'));

app.set('port', (process.env.PORT || 3000));
http.listen(app.get('port'), function(){
	console.log('listening on port',app.get('port'));
});


var players = {};
var WINDOW_WIDTH = 750;

io.on('connection', function(socket){
	var t = setInterval( function () {
		var rndX = Math.floor(Math.random()*WINDOW_WIDTH);
		var rndvX = Math.floor(Math.random()*400-200);
		var rndaY = Math.floor(Math.random()*(50-20)+20);
		io.emit('event_from_server', {randomX:rndX, randomvX:rndvX, randomaY:rndaY});
	}, 1000);	

	// Listen for a new player trying to connect
	socket.on('new-player',function(state){
		
		console.log("New player joined with state:",state);
		players[socket.id] = state;
		io.emit('update-players',players);

	});
  
	// Listen for move events and tell all other clients that something has moved 
	socket.on('move-player',function(data){
		if(players[socket.id] == undefined) return; // Happens if the server restarts and a client is still connected
		players[socket.id] = data;
		io.emit('update-players',players);
 
 	});
	
	// Listen for a disconnection and update our player table 
	socket.on('disconnect',function(state){

		delete players[socket.id];
		io.emit('update-players',players);

	}); 
	socket.on('kill-player',function(state){
		delete players[socket.id];
		io.emit('update-players',players);

	}); 
  
});
