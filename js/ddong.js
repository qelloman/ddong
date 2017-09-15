//Part1 : preload
function preload() {
	
	//Default
    game.load.baseURL = './assets/';
    game.load.crossOrigin = 'anonymous';

	//Load image reuqired for display
	//In my case, I need a phaser for player and a poop for osbtacles.
    //game.load.image('phaser', 'sprites/phaser-dude.png');
    game.load.image('poop', 'poop.png');
    game.load.spritesheet('dude', 'dude.png', 32, 48);
	game.load.audio('poop_sound', 'poop_sound.mp3');
}

//Part2 : create

//# of poop for scores
var poopNumber = 0;
var poops;
var poop_sound;
var isdead;
var other_players_group;

//cursor
var cursors;
var jumpButton;
var stateText;
var poopNumberText;

//timer is very important variable since it manages the loop for repeating events.
var timer;
var myLoop;
var startInterval;
var Interval;
var jumpTimer = 0;
var WINDOW_WIDTH = 750;
var WINDOW_HEIGHT = 600;
var config, game;
//config = {  forceSetTimeOut: true,  renderer: Phaser.CANVAS,  width: 700,  height: 400};
config = {  forceSetTimeOut: true};
//game = new Phaser.Game(config);
game = new Phaser.Game(WINDOW_WIDTH, WINDOW_HEIGHT, Phaser.AUTO, '', {preload:preload, create:create, update:update, render:render});
game.config = config;

//var game = new Phaser.Game(WINDOW_WIDTH, WINDOW_HEIGHT, Phaser.AUTO, '', {preload:preload, create:create, update:update, render:render} );
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
	game.stage.disableVisibilityChange = true;
	game.raf.forceSetTimeOut = true;
	//Set the entire physical system as a ARCADE
    game.physics.startSystem(Phaser.Physics.ARCADE);
	game.physics.arcade.gravity.y = 900;
	game.time.desiredFps = 30;
	//Set the Gameover message and make it invisiable for now.
    stateText = game.add.text(game.world.centerX,game.world.centerY,' ', { font: '42px Arial', fill: '#fff' });
    stateText.anchor.setTo(0.5, 0.5);
    stateText.visiable = false;
    poopNumberText = game.add.text(10,10, '# of poops: '+poopNumber, { font: '12px Arial', fill: '#fff' });
    stateText.visiable = true;
	poop_sound = game.add.audio('poop_sound');

	//Create an object for user

	CreateFloor();    

	other_players_group = game.add.physicsGroup();
    game.physics.enable(other_players_group, Phaser.Physics.ARCADE);
	
	poops = game.add.physicsGroup();
    game.physics.enable(poops, Phaser.Physics.ARCADE);

	socket = io(); // This triggers the 'connection' event on the server

	CreatePlayer();    
	socket.on('event_from_server',function(data){
	//	if (isdead == false) {
			CreatePoop(data.randomX, data.randomvX, data.randomaY);
	//	}
	});

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
		  		other_players[id].body.x = players_data[id].x; // Update target, not actual position, so we can interpolate
				other_players[id].body.y = players_data[id].y;
		  		other_players[id].body.velocity.x = players_data[id].vx; 
				other_players[id].body.velocity.y = players_data[id].vy;
				if (players_data[id].vx > 0) { 
					other_players[id].animations.play('right');
				} else if (players_data[id].vx < 0) { 
					other_players[id].animations.play('left');
				} else if (players_data[id].vx == 0) { 
					other_players[id].frame = 4;
				}
			}
		}
			// Check if a player is missing and delete them 
		for(var id in other_players){
			if(!players_found[id]){
				other_players[id].kill();
				delete other_players[id];
				console.log(id + " destroyed");
			}
		}	   
	});

	//Register cursors for user control
	//You might want to use SPACE later, but it requires a different method. 
    cursors = game.input.keyboard.createCursorKeys();
    jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
   
}

function CreatePlayer () {

	isdead = false;
	poopNumber = 0;
	player.sprite = game.add.sprite(game.world.randomX, 550, 'dude');
    game.physics.enable(player.sprite, Phaser.Physics.ARCADE);
    player.sprite.animations.add('left', [0, 1, 2, 3], 10, true);
    player.sprite.animations.add('right', [5, 6, 7, 8], 10, true);
    player.sprite.body.enable = true;
	player.sprite.body.bounce.setTo(1,0.2);
	player.sprite.body.collideWorldBounds = true;
	
	socket.emit('new-player',{x:player.sprite.body.x, y:player.sprite.body.y, vx:player.sprite.body.velocity.x, vy:player.sprite.body.velocity.y});

}

function CreateOtherPlayer(x, y, vx, vy) {
	// returns the sprite just created 
	var other_player = other_players_group.create(x, y, 'dude');
    other_player.animations.add('left', [0, 1, 2, 3], 10, true);
    other_player.animations.add('right', [5, 6, 7, 8], 10, true);
    game.physics.enable(other_player, Phaser.Physics.ARCADE);
    other_player.body.enable = true;
	other_player.body.bounce.setTo(1,0.2);
	other_player.body.collideWorldBounds = true;
	return other_player;
}

function CreateFloor () {

	floor = game.add.tileSprite(0, WINDOW_HEIGHT, WINDOW_WIDTH, WINDOW_HEIGHT, 'poop');
	game.physics.enable(floor, Phaser.Physics.ARCADE);
	floor.body.immovable = true;
	floor.body.allowGravity = false;

}
// Generate falling poops randomly
function CreatePoop(randomX, randomvX, randomaY) {
	//randomize event interval
	var poop = poops.create(randomX, 0, 'poop');
	game.physics.enable(poop, Phaser.Physics.ARCADE);

	poop.body.velocity.x = randomvX;
	poop.body.gravity.y = randomaY;
	poop.body.collideWorldBounds = false;
	
	UpdatePoopNumberText();
}

function UpdatePoopNumberText() {
	poopNumberText.text="# of poops: " + poopNumber;
}

function PoopHitFloor (floor, poop) {
	poop_sound.play();
	poop.kill();
	if (isdead == false) {
		poopNumber++;	
		UpdatePoopNumberText();
	}
}

function PoopHitPlayer (sprite, poop) {
	isdead = true;
//	poops.removeAll(); 
    stateText.text=" GAME OVER \nYou avoided " + poopNumber + " of poops\nClick to restart";
    stateText.visible = true;
	socket.emit('kill-player',{x:sprite.body.x, y:sprite.body.y, vx:sprite.body.velocity.x, vy:sprite.body.velocity.y});
	sprite.kill();
	game.input.onTap.addOnce(restart,this);
		
}

//Part3: Update
//Respond the event during play
function update() {
	game.physics.arcade.collide(floor, poops, PoopHitFloor);
	game.physics.arcade.collide(player.sprite, poops, PoopHitPlayer);
	game.physics.arcade.collide(player.sprite, other_players_group);
	if (isdead == false) {	
		player.update();
   } 
}

function restart () {

    //hides the text
	CreatePlayer();
    stateText.visible = false;

}


//Part4: Render
//Determine what to show
function render() {

}
