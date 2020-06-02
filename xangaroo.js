// ***********************************************
// global variables
// ***********************************************

var DEBUG = false; // display debug info

var WORLD_WIDTH = 600;
var WORLD_HEIGHT = WORLD_WIDTH/16*9;
var LEFT_MARGIN = 50;
var FOOTER_HEIGHT = 100;
var CANVAS_WIDTH = LEFT_MARGIN + WORLD_WIDTH;
var CANVAS_HEIGHT = WORLD_HEIGHT + FOOTER_HEIGHT;

var SPEED_START = 30; // initial speed, in pixels/second
var ENERGY_START = 50; // energy = height in pixels of the jump
var ENERGY_SMALLEST_JUMP = 50; // smallest jump = the jump by default
var ENERGY_GAIN_ON_LANDING = 50; // energy gain when landing
var ENERGY_EXTRA_GAIN_ON_LANDING = 20; // extra energy gain on landing while energy < some threshold
var ENERGY_MAX_FOR_EXTRA_GAIN_ON_LANDING = 150;
var ACCEPTANCE_DELAY_BEFORE_LANDING = 50; // milliseconds, delay to accept user jump request before landing
var ACCEPTANCE_DELAY_AFTER_LANDING = 50; // milliseconds, delay between landing and rebounce, to allow user to fire the jump
var JUMP_RANDOMNESS_PERCENT = 5; // +/- randomness on jump height and distance; 0 means no randomness
var JUMP_RATIO = 0.8; // jump height / jump distance, if GRAVITY_RATIO = 1.0
var GRAVITY_RATIO = 5; // gravity multiplication factor when going down (>1.0 for fast fall, <1.0 for long fall)
var TRACE_FRAME_STEP = 2; // number of frames between each trace update
var TRACE_SIZE = 3; // size of trace blocks

var X_KANGAROO = CANVAS_WIDTH / 1.1;
var Z_KANGAROO = 1; // a bit in front

var startTime;
var speed; // speed of the game, in pixels/seconds
var distance; // distance in pixels
var traces = []; // array of arrays of entities: trace of kangaroo(s)
var tracesLastDistance = 0; // last distance where traces were updated

// ***********************************************
// init Crafty
// ***********************************************

Crafty.init(CANVAS_WIDTH, CANVAS_HEIGHT, document.getElementById("xangaroo"));

// ***********************************************
// functions
// ***********************************************

// draw initial world
function drawWorld() {
  // floor
  Crafty.e("Floor, 2D, Canvas, Color")
    .attr({
      x: LEFT_MARGIN,
      y: WORLD_HEIGHT,
      w: CANVAS_WIDTH,
      h: 10,
    })
    .color("sandybrown");

  // Add kangaroo player
  Crafty.e("2D, DOM, Color, Kangaroo")
    .attr({
      x: X_KANGAROO,
      y: WORLD_HEIGHT - 20, // dropped from a bit above the floor
      w: 10,
      h: 10,
      z: Z_KANGAROO,
    })
    .color("orange");
}

// draw left panel(energy level)
function drawLeftPanel() {
  // button for jump
  Crafty.e("2D, Canvas, Color, Mouse")
    .attr({
      x: 0,
      y: 0,
      w: LEFT_MARGIN,
      h: WORLD_HEIGHT,
    })
    .color("white",0) // transparent
    .bind("MouseDown", function (MouseEvent) {
      Crafty("Kangaroo").userJumpRequest();
    });

  // energy reserve
  barEnergyReserve = Crafty.e("2D, Canvas, Color")
    .attr({
      x: 0,
      y: WORLD_HEIGHT,
      w: 30,
      h: 0,
    })
    .color("orange")
    .bind("UpdateFrame", function (data) {
      // update height according to energy reserve
      energyReserve = Crafty("Kangaroo").get(0).energyReserve;
      this.y = WORLD_HEIGHT - energyReserve;
      this.h = energyReserve;
    });

  // energy for next jump
  barEnergyForNextJump = Crafty.e("2D, Canvas, Color")
    .attr({
      x: 5,
      y: WORLD_HEIGHT,
      w: 20,
      h: 0,
    })
    .color("orangered")
    .bind("UpdateFrame", function (data) {
      // update height according to energy for next jump
      energyForNextJump = Crafty("Kangaroo").get(0).energyForNextJump;
      this.y = WORLD_HEIGHT - energyForNextJump;
      this.h = energyForNextJump;
    });
}

// draw footer (debug info, logo...)
function drawFooter() {
  // demo text
  if (DEBUG) {
    Crafty.e("2D, Text")
      .attr({
        x: 0,
        y: CANVAS_HEIGHT - 40,
        w: 100,
      })
      .text(function () {
        return (
          "energy reserve: " +
          Crafty("Kangaroo").get(0).energyReserve +
          "\nfor next jump: " +
          Crafty("Kangaroo").get(0).energyForNextJump
        );
      })
      .dynamicTextGeneration(true)
      .textColor("red");
  }
}

// calculate the jump characteristics to reach a certain height and a certain distance
// see this very usful explanation: https://www.youtube.com/watch?v=hG9SzQxaCm8
// returns [initialJumpSpeed, gravity]
function calculateJump(aHeight, aDistance) {
  // deduce duration (= time to reach peak = half time of whole jump)
  aDuration = 0.5*aDistance / speed;
  // them compute speed and gravity
  initialJumpSpeed = (2 * aHeight) / aDuration;
  gravity = (2 * aHeight) / (aDuration * aDuration);
  return [initialJumpSpeed, gravity];
}

// update trace of each kangaroo:
// - move previous traces to the left, by the distance travelled since last call
// - remove trace outside of the world
// - put a new trace at the new position
function updateTraces() {
  distanceTravelled = distance - tracesLastDistance;
  tracesLastDistance = distance;
  kangarooEntities = Crafty("Kangaroo").get();
  for (i = 0; i < kangarooEntities.length; i++) {
    // first check if there are already traces for this kangaroo
    if (traces.length > i) {
      // move previous traces and made them more transparent
      for (j = 0; j < traces[i].length; j++) {
        traces[i][j].x -= distanceTravelled;
        colorStrength = (traces[i][j].x - LEFT_MARGIN)/(X_KANGAROO - LEFT_MARGIN);
        traces[i][j].color("sandybrown",colorStrength);
        // remove it if too far left, outside of the world
        if (traces[i][j].x < LEFT_MARGIN) {
          // destroy the entity
          traces[i][j].destroy();
          // and remove it from the list, it should be the first one
          // therefore we use the shift() method
          traces[i].shift();
        }
      }
    } else {
      // create the list of traces for this kangaroo
      traces[i] = [];
    }
    // put a new trace at the new position (bottom left)
    traces[i].push(
      Crafty.e("2D, Canvas, Color")
        .attr({
          x: kangarooEntities[i].x - TRACE_SIZE,
          y: kangarooEntities[i].y + kangarooEntities[i].h - TRACE_SIZE,
          w: TRACE_SIZE,
          h: TRACE_SIZE,
        })
        .color("sandybrown")
    );
  }
}

// ***********************************************
// game logic
// ***********************************************

Crafty.c("Kangaroo", {
  required: "2D, Jumper, Gravity, Keyboard",
  init: function () {
    this.currentGravity = 500;
    this.gravityConst(this.currentGravity);
    this.gravity("Floor");
  },
  properties: {
    yAtLiftOff: {
      writable: true,
    },
    timeAtLiftOff: {
      writable: true,
    },
    yPrevious: {
      value: 1000,
      writable: true,
    },
    goingUp: {
      value: false,
      writable: true,
    },
    energyReserve: {
      value: ENERGY_START,
      writable: true,
    },
    energyForNextJump: {
      value: ENERGY_SMALLEST_JUMP,
      writable: true,
    },
    currentJumpSpeed: {
      value: ENERGY_SMALLEST_JUMP,
      writable: true,
    },
    currentGravity: {
      writable: true,
    },
  },
  events: {
    KeyDown: function (e) {
      if (e.key == Crafty.keys.SPACE) {
        this.userJumpRequest();
      }
    },
    // CheckLanding: triggered when the kangaroo is about to land
    CheckLanding: function(ground){
      this.color("red");
    },
    LandedOnGround: function (ground) {
      // open the acceptance window for jump request
      this.toggleComponent("AcceptUserJumpRequest");
      // rebounce after a short delay, to leave a bit
      // of time for the user to fire the jump
      Crafty.e("Delay").delay(this.triggerRebounce, ACCEPTANCE_DELAY_AFTER_LANDING, 0);
    },
    Rebounce: function(aEntity) {
      this.color("orange");
      this.toggleComponent("AcceptUserJumpRequest");
      randomFactor = 1 - JUMP_RANDOMNESS_PERCENT/100 + (Math.random())*(2*JUMP_RANDOMNESS_PERCENT/100);
      heightOfJump = this.energyForNextJump * randomFactor;
      distanceOfJump = heightOfJump / JUMP_RATIO;
      [initialJumpSpeed, gravity] = calculateJump(heightOfJump, distanceOfJump);
      this.currentJumpSpeed = initialJumpSpeed;
      this.currentGravity = gravity;
      this.gravityConst(gravity);
      this.jumpSpeed(this.currentJumpSpeed);
      this.jump();
      // consume the energy for the jump
      this.energyReserve -= this.energyForNextJump;
      // gain from landing, unconditional
      this.energyReserve += ENERGY_GAIN_ON_LANDING;
      // extra gain on landing while the energy is under some threshold,
      // and only if jump is the smallest jump
      if (this.energyForNextJump <= ENERGY_SMALLEST_JUMP &&
        this.energyReserve < ENERGY_MAX_FOR_EXTRA_GAIN_ON_LANDING) {
        this.energyReserve += ENERGY_EXTRA_GAIN_ON_LANDING;
      }
      // by default reset to minimal jump for next time
      this.energyForNextJump = ENERGY_SMALLEST_JUMP;
      // indicate that we are going up
      this.yAtLiftOff = this.y;
      this.timeAtLiftOff = new Date().getTime();
      this.goingUp = true;
    },
    UpdateFrame: function (eventData) {
      this.checkPeakReached();
    },
    PeakReached: function (y) {
      // when peak reached we could decide to do special actions,
      // like disable gravity ("flying!") or increase gravity
      // (sudden fall)
      if (DEBUG) {
        console.log(
          "Peak reached: gravity = ",
          this.currentGravity,
          " jumpSpeed = ",
          this.currentJumpSpeed,
          " height reached = ",
          Math.round(this.yAtLiftOff - y),
          " in ",
          new Date().getTime() - this.timeAtLiftOff,
          "[ms]"
        );
      }
      // heavier fall
      this.currentGravity *= GRAVITY_RATIO;
      this.gravityConst(this.currentGravity);
    },
    RetryUserJumpRequest: function(){
      this.userJumpRequest();
    }
  },
  checkPeakReached: function () {
    // Check if we reached the peak and start going down
    if (this.y >= this.yPrevious && this.goingUp) {
      // we reached the peak, we start going down
      this.goingUp = false;
      Crafty.trigger("PeakReached", this.y);
    }
    this.yPrevious = this.y;
  },
  userJumpRequest: function () {
    // treat request from the user, to use the entire energy available
    // This request is only accepted in a small window before rebounce
    if (this.has("AcceptUserJumpRequest")){
      this.energyForNextJump = this.energyReserve;
    }
    else
    {
      // if we are not yet in the acceptance window, try again a bit later
      Crafty.e("Delay").delay(this.triggerRetryUserJumpRequest, ACCEPTANCE_DELAY_BEFORE_LANDING, 0);
    }
  },
  triggerRetryUserJumpRequest: function() {
    Crafty.trigger("RetryUserJumpRequest");
  },
  triggerRebounce: function(){
    Crafty.trigger("Rebounce", this);
  },
});

Crafty.bind("UpdateFrame", function (eventData) {
  // update the distance
  distance += speed * (eventData.dt / 1000); // dt is in milliseconds

  // update trace of Kangaroo, every 10 frames
  if (eventData.frame % TRACE_FRAME_STEP == 0) {
    updateTraces();
  }
});

Crafty.scene("main", function () {
  startTime = new Date().getTime();
  distance = 0;
  speed = SPEED_START;
  drawWorld();
  drawLeftPanel();
  drawFooter();
});

Crafty.scene("main");
