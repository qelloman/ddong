//Part1 : preload
function preload() {
	
	//Default
    game.load.baseURL = 'http://examples.phaser.io/assets/';
    game.load.crossOrigin = 'anonymous';

	//Load image reuqired for display
	//In my case, I need a phaser for player and a ball for osbtacles.
    game.load.image('phaser', 'sprites/phaser-dude.png');
    game.load.image('ball', 'sprites/blue_ball.png');


}
//Part2 : create

//Some variables are needed in both create() and update(), so it is declared as global variables.

//character
var sprite;
//# of ball for scores
var ballNumber;
//cursor
var cursors;
var jumpButton;
var stateText;

//timer is very important variable since it manages the loop for repeating events.
var timer;
var myLoop;
var startInterval;
var Interval;

var WINDOW_WIDTH = 750;
var WINDOW_HEIGHT = 600;
var game = new Phaser.Game(WINDOW_WIDTH, WINDOW_HEIGHT, Phaser.AUTO, '', {preload:preload, create:create, update:update, render:render} );
var WORLD_SIZE = {w:750,h:500};

function create() {
    
    game.stage.backgroundColor = '#6688ee';

	//Set the entire physical system as a ARCADE
    game.physics.startSystem(Phaser.Physics.ARCADE);

	//Set the Gameover message and make it invisiable for now.
    stateText = game.add.text(game.world.centerX,game.world.centerY,' ', { font: '84px Arial', fill: '#fff' });
    stateText.anchor.setTo(0.5, 0.5);
    stateText.visiable = false;

	//Create an object for user
    sprite = game.add.sprite(400, 550, 'phaser'); //(x,y,picture)
    game.physics.enable(sprite, Phaser.Physics.ARCADE);
	sprite.body.collideWorldBounds=true;
    sprite.body.gravity.y = 500;
 
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
    myLoop = timer.loop(startInterval, createBall, this); //(period, callback, context)
    timer.start();

}

// Generate falling balls randomly
function createBall() {
	//randomize event interval
    myLoop.delay = game.rnd.integerInRange(1, 10) * Interval;
    
    ballNumber = ballNumber + 1;

	//make it difficult as it goes
    if (ballNumber % 20 === 0) {
        Interval = 0.9 * Interval;
    }
	var ball = balls.create(game.world.randomX, 0, 'ball');
	game.physics.enable(ball, Phaser.Physics.ARCADE);

	ball.body.gravity.y = 150;
	ball.body.collideWorldBounds = false;

}

//Part3: Update
//Respond the event during play
function update() {
	//Register callback for overlap event between character and balls 
	game.physics.arcade.overlap(sprite, balls, collisionHandler, null, this);
   
	//Initial velocity of character 
    sprite.body.velocity.x = 0;
    //sprite.body.velocity.y = 0;
    
	//User control 
    if (cursors.left.isDown)
    {
        sprite.body.velocity.x = -300;
    }
    else if (cursors.right.isDown)
    {
        sprite.body.velocity.x = 300;
    }
    if (jumpButton.isDown && (sprite.body.onFloor() || sprite.body.touching.down))
    {
        sprite.body.velocity.y = -400;
    }
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
