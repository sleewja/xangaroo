// ***********************************************
// global variables
// ***********************************************

var DEBUG = true; // display debug info

var WORLD_WIDTH = 600;
var WORLD_HEIGHT = (WORLD_WIDTH / 16) * 9;
var LEFT_MARGIN = 50;
var FOOTER_HEIGHT = 100;
var CANVAS_WIDTH = LEFT_MARGIN + WORLD_WIDTH;
var CANVAS_HEIGHT = WORLD_HEIGHT + FOOTER_HEIGHT;

var SPEED_START = 60; // initial speed, in pixels/second
var ENERGY_START = 25; // energy = height in pixels of the jump
var ENERGY_DEFAULT_JUMP = 25; // default jump if no request from the player
var ENERGY_GAIN_ON_LANDING = 20; // energy gain after a default jump while energy < ENERGY_MAX_FOR_GAIN_ON_LANDING
var ENERGY_MAX_FOR_GAIN_ON_LANDING = 150; // max energy that can be reached by consecutive default jumps
var ACCEPTANCE_DELAY_BEFORE_LANDING = 500; // milliseconds, delay to accept player jump request before landing
var ACCEPTANCE_DELAY_AFTER_LANDING = 0; // milliseconds, delay between landing and rebounce where we stay on the ground, to allow player to fire the jump
var ACCEPTANCE_DELAY_AFTER_LIFTOFF = 250; // milliseconds, delay to accept player jump request after a jump has startedn 
var JUMP_RANDOMNESS_PERCENT = 5; // +/- randomness on jump height and distance; 0 means no randomness
var JUMP_RATIO = 0.5; // shape of the jump: jump height / jump distance
var GRAVITY_RATIO = 5; // shape of the jump: gravity multiplication factor when going down
// >1.0 for heavy fall, <1.0 for lighter and longer fall
// riseTime/fallTime = sqrt(GRAVITY_RATIO)
var TRACE_FRAME_STEP = 2; // number of frames between each trace update
var TRACE_MAX_COUNT = 200; // max number of traces to remember
var TRACE_SIZE = 2; // size of trace blocks

var X_KANGAROO = CANVAS_WIDTH / 1.1;
var Z_KANGAROO = 1; // a bit in front

var startTime;
var speed; // speed of the game, in pixels/seconds
var distance; // distance travelled in pixels
var traces = []; // array of arrays of entities: trace of kangaroo(s)

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
    .color("white", 0) // transparent
    .bind("MouseDown", function (MouseEvent) {
      Crafty("Kangaroo").onPlayerJumpRequest();
    })
    .bind("MouseUp", function (MouseEvent) {
      Crafty("Kangaroo").onPlayerJumpStopRequest();
    });

  // energy reserve
  energyBar = Crafty.e("2D, Canvas, Color")
    .attr({
      x: 0,
      y: WORLD_HEIGHT,
      w: 30,
      h: 0, // initially empty
    })
    .color("orange")
    .bind("UpdateFrame", function (data) {
      // update height according to energy
      energy = Crafty("Kangaroo").get(0).energy;
      this.h = energy;
      this.y = WORLD_HEIGHT - this.h;
    });

  // energy used for the current jump (player-controlled jump)
  energyUsedBar = Crafty.e("2D, Canvas, Color")
    .attr({
      x: 5,
      y: WORLD_HEIGHT,
      w: 20,
      h: 0, // initially empty
    })
    .color("red", 0.75) // slightly transparent
    .bind("UpdateFrame", function (data) {
      // update height according to energy used by controlled jump
      kangarooEntity = Crafty("Kangaroo").get(0);
      if (kangarooEntity.playerControl) {
        currentJumpHeight = kangarooEntity.yAtLiftOff - kangarooEntity.y;
        this.h = currentJumpHeight;
        this.y = WORLD_HEIGHT - this.h;
      } else {
        // empty the control bar when we start going down
        if (this.h > 0 && !kangarooEntity.goingUp){
          this.h = 0;
          this.y = WORLD_HEIGHT;
        }
      }
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
  // compute duration = time to reach peak
  durationToPeak =
    aDistance / (Math.abs(speed) * (1 + 1 / Math.sqrt(GRAVITY_RATIO)));
  // then compute speed and gravity
  initialJumpSpeed = (2 * aHeight) / durationToPeak;
  gravity = (2 * aHeight) / (durationToPeak * durationToPeak);
  return [initialJumpSpeed, gravity];
}

// change speed of game, by a multiplication factor
// I don't use an absolute value because elements in the background (trees, clouds)
// have a smaller speed. The further back the slower, to convey a perspective feeling.
// multiplier: >1: accelerate <1: decelerate  -1: mirror (useful if we hit a wall or
// a big rock)
function changeSpeed(aSpeedMultiplier) {
  speed *= aSpeedMultiplier;
  // adapt the speed of all "Motion" components
  Crafty("Motion")
    .get()
    .forEach(function (entity) {
      entity.vx *= aSpeedMultiplier;
    });
}

// update trace of each kangaroo: (supports multiple kangaroos, who knows
// could be needed in the future)
// Actions:
// - remove too old traces
// - set older traces more transparent
// - put a new trace at the new position
// Notes:
// - the motion is managed by the "Motion" component
// - the traces are a FIFO list
function updateTraces() {
  kangarooEntities = Crafty("Kangaroo").get();
  // i = kangaroo index
  // j = trace index
  for (i = 0; i < kangarooEntities.length; i++) {
    // first check if there are already traces for this kangaroo
    if (traces.length > i) {
      // remove too old traces, at beginning of list
      if (traces[i].length > TRACE_MAX_COUNT) {
        for (j = 0; j < traces[i].length - TRACE_MAX_COUNT; j++) {
          // destroy the entity
          traces[i][j].destroy();
        }
        // and remove them from the list
        traces[i].splice(0, traces[i].length - TRACE_MAX_COUNT);
      }
      // make old traces more transparent
      for (j = 0; j < traces[i].length; j++) {
        // strength = 1.0 for last element (the newest)
        // strength = 1/TRACE_MAX_COUNT for first element (the oldest)
        colorStrength = (j + 1) / traces[i].length;
        traces[i][j].color("sandybrown", colorStrength);
      }
    } else {
      // create the list of traces for this kangaroo
      traces[i] = [];
    }

    // put a new trace at the new position (bottom left)
    traces[i].push(
      Crafty.e("2D, Canvas, Color, Trace, Motion")
        .attr({
          x: kangarooEntities[i].x - TRACE_SIZE,
          y: kangarooEntities[i].y + kangarooEntities[i].h - TRACE_SIZE,
          w: TRACE_SIZE,
          h: TRACE_SIZE,
          vx: -speed, // linear velocity, inherited from "Motion" component
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
    // exported properties
    // We could also really use "properties", but that seems overkill
    this.yAtLiftOff = WORLD_HEIGHT; // y when last jump was started
    this.timeAtLiftOff = 0; // time of last jump start
    this.yPrevious = WORLD_HEIGHT; // y at the previous frame
    this.goingUp = false; // true if we are going up
    this.energy = ENERGY_START; // energy reserve
    this.currentTargetHeight = 0; // target height of the current jump
    this.currentJumpSpeed = ENERGY_DEFAULT_JUMP; // jump speed used at the start of the current jump
    this.currentGravity = 500; // current gravity used, will be recalculated at each jump
    this.currentPlayerJump = false; // true if the current jump was triggered by the player (ie not a default jump)
    this.playerJumpRequestLatched = false; // true if the player requested a jump
    this.playerJumpRequestLatchTime = 0; // time of the request
    this.playerControl = false; // true while the player presses the fire key or button
    this.playerControlledEnergy = 0; // energy requested by controlled jump
    this.timeOfLastLanding = 0; // time of last lading on ground
    // init operations
    this.gravityConst(this.currentGravity);
    this.gravity("Floor");
    this.preventGroundTunneling(true); // Prevent entity from falling through thin ground entities at high speeds.
  },
  events: {
    KeyDown: function (e) {
      if (e.key == Crafty.keys.SPACE || e.key == Crafty.keys.UP_ARROW) {
        this.onPlayerJumpRequest();
      }
    },
    KeyUp: function (e) {
      if (e.key == Crafty.keys.SPACE || e.key == Crafty.keys.UP_ARROW) {
        this.onPlayerJumpStopRequest();
      }
    },
    // CheckLanding: triggered when the kangaroo is about to land
    CheckLanding: function (ground) {
      this.color("red");
    },
    // checkJumping: triggered when a jump is requested
    CheckJumping: function(ground) {
      this.canJump = true; // always allow jump, even double-jump
    },
    LandedOnGround: function (ground) {
      this.timeOfLastLanding = new Date().getTime(); // milliseconds
      // rebounce after a short delay, to leave a bit
      // of time for the player to fire the jump
      Crafty.e("Delay").delay(
        this.triggerRebounce,
        ACCEPTANCE_DELAY_AFTER_LANDING,
        0
      );
    },
    Rebounce: function (aEntity) {
      this.color("orange");
      // check if the player requested a jump within the acceptance window
      this.currentPlayerJump = false;
      if (this.playerJumpRequestLatched) {
        this.playerJumpRequestLatched = false; // consume the latched request
        requestDelay = new Date().getTime() - this.playerJumpRequestLatchTime; // in milliseconds
        if (
          requestDelay <
          ACCEPTANCE_DELAY_BEFORE_LANDING + ACCEPTANCE_DELAY_AFTER_LANDING
        ) {
          this.currentPlayerJump = true;
        }
      }

      // Make a new jump (rebounce)
      if (this.currentPlayerJump) {
        // the new jump is requested by the player
        this.currentTargetHeight = this.energy; // use the full energy reserve at start of jump
        this.playerControl = true;
      } else {
        // the new jump is a default jump
        // in case the energy has been decreased below the default jump,
        // the jump will be smaller
        this.currentTargetHeight = Math.min(ENERGY_DEFAULT_JUMP, this.energy);
        this.playerControl = false;
      }
      this.startJump(this.currentTargetHeight);

      // indicate that we are going up
      this.yAtLiftOff = this.y;
      this.timeAtLiftOff = new Date().getTime();
      this.goingUp = true;

      // increase the energy, only in case of default jump
      if (!this.currentPlayerJump) {
        // we started a default jump: increase the energy until some limit
        if (this.energy < ENERGY_MAX_FOR_GAIN_ON_LANDING) {
          this.energy += ENERGY_GAIN_ON_LANDING;
        }
      }
    },
    UpdateFrame: function (eventData) {
      this.checkPeakReached();
    },
    PeakReached: function (peakHeight) {
      // when peak reached we can do special actions,
      // like disable gravity ("flying!") or increase gravity
      // (sudden fall)
      if (DEBUG && 0) {
        console.log(
          "Peak reached: gravity = ",
          this.currentGravity,
          " jumpSpeed = ",
          this.currentJumpSpeed,
          " height reached = ",
          Math.round(peakHeight),
          " in ",
          new Date().getTime() - this.timeAtLiftOff,
          "[ms]"
        );
      } 
      // stop player jump request (if not yet stopped by the player)
      // and in case of default jump: apply the heavier gravity also
      // (like for user-controlled jumps)
      if (this.playerControl || !this.currentPlayerJump) {
        this.playerControl = false;
        this.playerControlledEnergy = this.yAtLiftOff - this.y; // remember the energy requested by the controlled jump
        this.currentGravity *= GRAVITY_RATIO;
        this.gravityConst(this.currentGravity);
      }
      // remove the used energy, in case of user jump
      // and keep at least enough energy for a default jump
      if (this.currentPlayerJump) {
        this.energy = Math.max(
          this.energy - this.playerControlledEnergy,
          ENERGY_DEFAULT_JUMP
        );
      }
    },
  },
  startJump: function(aTargetHeight) {
      // introduce some randomness in the jump height
      randomFactor =
        1 -
        JUMP_RANDOMNESS_PERCENT / 100 +
        Math.random() * ((2 * JUMP_RANDOMNESS_PERCENT) / 100);
      heightOfJump = aTargetHeight * randomFactor;
      distanceOfJump = heightOfJump / JUMP_RATIO;
      [initialJumpSpeed, gravity] = calculateJump(heightOfJump, distanceOfJump);
      this.currentJumpSpeed = initialJumpSpeed;
      this.currentGravity = gravity;
      this.gravityConst(gravity);
      this.jumpSpeed(this.currentJumpSpeed);
      // and now: jump !
      this.jump();
  },
  checkPeakReached: function () {
    // Check if we reached the peak and start going down
    if (this.y >= this.yPrevious && this.goingUp) {
      // we reached the peak, we start going down
      this.goingUp = false;
      peakHeight = this.yAtLiftOff - this.y;
      Crafty.trigger("PeakReached", peakHeight);
    }
    this.yPrevious = this.y;
  },
  onPlayerJumpRequest: function () {
    // if we are going up and it's a default jump,
    // then check if we are in the acceptance window,
    // and if yes adapt the jump (double-jump)
    if (this.goingUp && !this.currentPlayerJump){
      if ( new Date().getTime() - this.timeAtLiftOff <= ACCEPTANCE_DELAY_AFTER_LIFTOFF){
        // the jump becomes a player jump
        this.currentPlayerJump = true;
        this.currentTargetHeight = this.energy; // the target is relative to the liftoff altitude
        this.playerControl = true; // start player-controlled jump
        altitudeFromLiftOff = (this.yAtLiftOff - this.y);
        this.startJump(this.currentTargetHeight - altitudeFromLiftOff);
      }
    }
    // if we are still in the falling phase (not yet landed),
    // latch the request and the current time, we'll check at rebounce if
    // the request was in the acceptance window
    else {
      this.playerJumpRequestLatched = true;
      this.playerJumpRequestLatchTime = new Date().getTime();
    }

  },
  onPlayerJumpStopRequest: function () {
    // if a jump request was latched (ie jump not yet started)
    // then the latched request is discarded
    if (this.playerJumpRequestLatched) {
      this.playerJumpRequestLatched = false;
    }
    // if we are in a player-controlled jump: stop the jump
    // and start falling down by increasing the gravity
    if (this.playerControl) {
      this.playerControl = false;
      this.playerControlledEnergy = this.yAtLiftOff - this.y; // remember the energy requested by the controlled jump
      this.currentGravity *= GRAVITY_RATIO;
      this.gravityConst(this.currentGravity);
    }
  },
  triggerRebounce: function () {
    Crafty.trigger("Rebounce", this);
  },
}); // end of Kangaroo component

Crafty.bind("KeyDown", function (e) {
  if (DEBUG) {
    if (e.key == Crafty.keys.ADD) {
      // '+' in numeric keypad
      // increase speed
      changeSpeed(1.1);
      console.log("speed = ", speed);
    } else if (e.key == Crafty.keys.SUBSTRACT) {
      // - on numpad
      // decrease speed
      changeSpeed(0.9);
      console.log("speed = ", speed);
    } else if (e.key == Crafty.keys.MULTIPLY) {
      // * on numpad
      // mirror effect
      changeSpeed(-1.0);
      console.log("speed = ", speed);
    }
  }
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
