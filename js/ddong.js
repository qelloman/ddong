//Part1 : preload
function preload() {
	
	//Default
    game.load.baseURL = './assets/';
    game.load.crossOrigin = 'anonymous';

	//Load image reuqired for display
	//In my case, I need a phaser for player and a ball for osbtacles.
    //game.load.image('phaser', 'sprites/phaser-dude.png');
    game.load.image('ball', 'blue_ball.png');
    game.load.spritesheet('dude', 'dude.png', 32, 48);

}



//Part2 : create

//# of ball for scores
var ballNumber;
var balls;
var other_players_group;

//cursor
var cursors;
var jumpButton;
var stateText;

//timer is very important variable since it manages the loop for repeating events.
var timer;
var myLoop;
var startInterval;
var Interval;
var jumpTimer = 0;
var WINDOW_WIDTH = 750;
var WINDOW_HEIGHT = 600;
var game = new Phaser.Game(WINDOW_WIDTH, WINDOW_HEIGHT, Phaser.AUTO, '', {preload:preload, create:create, update:update, render:render} );
var WORLD_SIZE = {w:750,h:500};

//Multi-play
var socket; //Declare it in this scope, initialize in the `create` function
var other_players = {};

var player = {
sprite:null,//Will hold the sprite when it's created 
speed_x:0,// This is the speed it's currently moving at
speed_y:0,
face:'front',
update: function(){

	// No button pressed
	if (this.sprite.body.velocity.x < 5 && this.sprite.body.velocity.x > -5 ) {
		//this.sprite.body.velocity.x = 0;
		this.face = 'front';
	} else if (this.sprite.body.velocity.x >= 5 ) {
		this.sprite.body.velocity.x -= 5; 
		this.face = 'right';
	} else if (this.sprite.body.velocity.x <= -5 ) {
		this.sprite.body.velocity.x += 5; 
		this.face = 'left';
	}
	
	// Button pressed
	if(game.input.keyboard.isDown(Phaser.Keyboard.RIGHT)){
		if (this.sprite.body.velocity.x < 400) {
	        this.sprite.body.velocity.x += 50;
		}
	} else if (game.input.keyboard.isDown(Phaser.Keyboard.LEFT)){
		if (this.sprite.body.velocity.x > -400) {
	        this.sprite.body.velocity.x -= 50;
		}
	}
	if (game.input.keyboard.isDown(Phaser.Keyboard.UP) && this.sprite.body.onFloor() && game.time.now > jumpTimer){
	    this.sprite.body.velocity.y = -500;
		jumpTimer = game.time.now + 750;
	}
	
	// Determine animation.
	if (this.face == 'right') {	
		this.sprite.animations.play('right');
	} else if (this.face == 'left') {
		this.sprite.animations.play('left');
	} else if (this.face == 'front') {
		this.sprite.frame = 4;
	}	
	socket.emit('move-player',{x:this.sprite.body.x,y:this.sprite.body.y,vx:this.sprite.body.velocity.x, vy:this.sprite.body.velocity.y})

}
};


function create() {
    
    game.stage.backgroundColor = '#6688ee';

	//Set the entire physical system as a ARCADE
    game.physics.startSystem(Phaser.Physics.ARCADE);
	game.physics.arcade.gravity.y = 900;
	game.time.desiredFps = 30;
	//Set the Gameover message and make it invisiable for now.
    stateText = game.add.text(game.world.centerX,game.world.centerY,' ', { font: '84px Arial', fill: '#fff' });
    stateText.anchor.setTo(0.5, 0.5);
    stateText.visiable = false;


	//Create an object for user
	player.sprite = game.add.sprite(game.world.randomX, 550, 'dude');
    game.physics.enable(player.sprite, Phaser.Physics.ARCADE);
    player.sprite.animations.add('left', [0, 1, 2, 3], 10, true);
    player.sprite.animations.add('right', [5, 6, 7, 8], 10, true);
    player.sprite.body.enable = true;
	player.sprite.body.bounce.setTo(1,0.2);
	player.sprite.body.collideWorldBounds = true;
    
	other_players_group = game.add.physicsGroup();
    game.physics.enable(other_players_group, Phaser.Physics.ARCADE);


	socket = io(); // This triggers the 'connection' event on the server

	socket.emit('new-player',{x:player.sprite.body.x, y:player.sprite.body.y, vx:player.sprite.body.velocity.x, vy:player.sprite.body.velocity.y});

	socket.on('update-players',function(players_data){
		var players_found = {};
		// Loop over all the player data received
		for(var id in players_data){
			// If the player hasn't been created yet
			if(other_players[id] == undefined && id != socket.id){ // Make sure you don't create yourself
				var data = players_data[id];
				var p = CreateOtherPlayer(data.x,data.y,data.vx,data.vy);
				other_players[id] = p;
				console.log("Created new player at (" + data.x + ", " + data.y + ")");
			}
			players_found[id] = true;
				
			// Update positions of other players 
			if(id != socket.id){
		  		other_players[id].x = players_data[id].x; // Update target, not actual position, so we can interpolate
				other_players[id].y = players_data[id].y;
		  		other_players[id].body.velocity.x = players_data[id].vx; 
				other_players[id].body.velocity.y = players_data[id].vy;
				//console.log(players_data[id].vx + ',' + players_data[id].vy);
			}
		}
			// Check if a player is missing and delete them 
		for(var id in other_players){
			if(!players_found[id]){
				other_players[id].destroy();
			}
		}	   
	});

	//Balls are controlled together as a group 
    balls = game.add.group();
    balls.enableBody = true;
    balls.physicsBodyType = Phaser.Physics.ARCADE;
    ballNumber = 0;
   	
	//Register cursors for user control
	//You might want to use SPACE later, but it requires a different method. 
    cursors = game.input.keyboard.createCursorKeys();
    jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
   
	//Set timer to measure the play time and set repeating events. 
	timer = game.time.create(false);
    startInterval = Phaser.Timer.SECOND / 20;
    Interval = startInterval;
	
	//to manipulate the event interval, get timer object as myLoop
    //myLoop = timer.loop(startInterval, createBall, this); //(period, callback, context)
    //timer.start();

}

function CreateOtherPlayer(x, y, vx, vy) {
	// returns the sprite just created 
	var other_player = other_players_group.create(x, y, 'dude');
    other_player.animations.add('left', [0, 1, 2, 3], 10, true);
    other_player.animations.add('right', [5, 6, 7, 8], 10, true);
    game.physics.enable(other_player, Phaser.Physics.ARCADE);
    other_player.body.enable = true;
	other_player.body.bounce.setTo(1.5,0.2);
	other_player.body.collideWorldBounds = true;
	return other_player;
}

// Generate falling balls randomly
function createBall() {
	//randomize event interval
    myLoop.delay = game.rnd.integerInRange(1, 10) * Interval;
    
    ballNumber = ballNumber + 1;

	//make it difficult as it goes
    if (ballNumber % 20 === 0) {
        Interval = 1 * Interval;
    }
	var ball = balls.create(game.world.randomX, 0, 'ball');
	game.physics.enable(ball, Phaser.Physics.ARCADE);

	ball.body.gravity.y = 150;
	ball.body.collideWorldBounds = false;

}

//Part3: Update
//Respond the event during play
function update() {
	//game.physics.arcade.collide(player.sprite, other_players_group, collision, process, this);
	game.physics.arcade.collide(player.sprite, other_players_group, collide_callback);
	game.physics.arcade.collide(other_players_group,player.sprite, collide_callback);
	player.update();
    
}

function collide_callback (sprite, group) {
	console.log('collide')
}
//Callback function
function collisionHandler (phaser, ball) {
	
	//Remove the ball sprite
    balls.removeAll();
	
	//Display game-over message
    stateText.text=" GAME OVER \n " + Number(timer.seconds).toFixed(2) + "\n Click to restart";
    stateText.visible = true;
    timer.stop(false);

    //the "click to restart" handler
    game.input.onTap.addOnce(restart,this);

}

function restart () {

    //Reset the count of balls)
    ballNumber = 0;

    //hides the text
    stateText.visible = false;
    timer.start(0);
}


//Part4: Render
//Determine what to show
function render() {

	//Display ball count and the elapsed time
    game.debug.text("# of ball: " + ballNumber, 0, 10);
    game.debug.text('Elapsed seconds: ' + Number(timer.seconds).toFixed(2), 32, 32);

}
