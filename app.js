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

io.on('connection', function(socket){
	// Listen for a new player trying to connect
	socket.on('new-player',function(state){

		console.log("New player joined with state:",state);
	
		players[socket.id] = state;
		io.emit('update-players',players);

	});
  
	// Listen for move events and tell all other clients that something has moved 
	socket.on('move-player',function(position_data){
		if(players[socket.id] == undefined) return; // Happens if the server restarts and a client is still connected
 
		players[socket.id].x = position_data.x;  
		players[socket.id].y = position_data.y; 
		io.emit('update-players',players);
 
 	});
	
	// Listen for a disconnection and update our player table 
	socket.on('disconnect',function(state){

		delete players[socket.id];
		io.emit('update-players',players);

	}); 
  
});
