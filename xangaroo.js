// ***********************************************
// global variables
// ***********************************************

var DEBUG = true; // display debug info

var WORLD_WIDTH = 600;
var WORLD_HEIGHT = Math.round((WORLD_WIDTH / 16) * 9);
var FLOOR_HEIGHT = 50;
var Y_FLOOR = WORLD_HEIGHT - FLOOR_HEIGHT;
var BUSH_HEIGHT = 120;
var FOOTER_HEIGHT = 100;
var LEFT_MARGIN = 50;
var CANVAS_WIDTH = LEFT_MARGIN + WORLD_WIDTH;
var CANVAS_HEIGHT = WORLD_HEIGHT + FOOTER_HEIGHT;

var COLOR_FLOOR = "sandybrown";
var COLOR_BUSH = "sandybrown"; //"#f7b77a";
var COLOR_TRACES = "white";
var COLOR_SKY = "skyblue";
var COLOR_SCORPION = "black";
var COLOR_CLOUD = "white";
var COLOR_ROCK = "crimson";
var COLOR_CACTUS = "forestgreen";
var COLOR_KANGAROO = "darkorange";

var SPEED_START = 60; // initial speed, in pixels/second
var ENERGY_START = 25; // energy = height in pixels of the jump
var ENERGY_DEFAULT_JUMP = 25; // default jump if no request from the player
var ENERGY_GAIN_ON_LANDING = 20; // energy gain after a default jump while energy < ENERGY_MAX_FOR_GAIN_ON_LANDING
var ENERGY_MAX_FOR_GAIN_ON_LANDING = 150; // max energy that can be reached by consecutive default jumps
var ACCEPTANCE_DELAY_BEFORE_LANDING = 500; // milliseconds, delay to accept player jump request before landing
var ACCEPTANCE_DELAY_AFTER_LANDING = 0; // milliseconds, delay between landing and rebounce where we stay on the ground, to allow player to fire the jump
var ACCEPTANCE_DELAY_AFTER_LIFTOFF = 250; // milliseconds, delay to accept player jump request after a jump has startedn
var JUMP_RANDOMNESS_PERCENT = 0; // +/- randomness on jump height and distance; 0 means no randomness
var JUMP_RATIO = 0.5; // shape of the jump: jump height / jump distance
var GRAVITY_RATIO = 5; // shape of the jump: gravity multiplication factor when going down
// >1.0 for heavy fall, <1.0 for lighter and longer fall
// riseTime/fallTime = sqrt(GRAVITY_RATIO)
var TRACE_FRAME_STEP = 2; // number of frames between each trace update
var TRACE_MAX_COUNT = 100; // max number of traces to remember
var TRACE_SIZE = 2; // size of trace blocks
var POPULATE_WORLD_DISTANCE_STEP = 10; // pixel distance between two calls of populateWorld
var PRE_POPULATE_DURATION = 60000; // milliseconds simulated in the past to prepopulate the world
var DELAY_TO_DISAPPEAR = 5000; // milliseconds: delay to destroy a symbol after exiting the world on the left side, if depth=0. if depth >0: the delay will be longer

var X_KANGAROO = CANVAS_WIDTH / 3;
var Z_SYMBOLS_DEFAULT = 1;
var Z_KANGAROO = 2; // a bit in front
var Z_PANEL = 10; // in front, to hide objects behind

var startTime;
var speed; // speed of the game, in pixels/seconds
var distance; // distance travelled in pixels
var distanceLastPopulate; // distance last time populateWorld was called
var traces = []; // array of arrays of entities: trace of kangaroo(s)

// ***********************************************
// world inhabitants
// ***********************************************
var symbols = [
  {
    component: "cloud",
    color: COLOR_CLOUD,
    distanceIntervalMin: 0, // min pixel distance between two
    distanceIntervalMax: 500, // max pixel distance between two
    yMin: -20,
    yMax: 100,
    depthAtYMin: 1, // depth 0 = front, visual speed = (speed + symbol.speed) / (1 + depth) (for perspective)
    depthAtYMax: 10,
    // default values: can be ommitted here:
    // distanceMin : 0, // min distance to appear in the world */
    // z : 1,
    // speedMin : 0, // speed of the symbol (go leftwards) pixel/second
    // speedMax : 0,
    onHitOn: function (hitDatas) {
      onHitOnCloud(hitDatas);
    },
    onHitOff: function (componentName) {
      onHitOffCloud(componentName);
    },
  },
  {
    component: "rock",
    color: COLOR_ROCK,
    distanceIntervalMin: 0, // min pixel distance between two
    distanceIntervalMax: 500, // max pixel distance between two
    yMin: 200,
    yMax: WORLD_HEIGHT - 10,
    depthAtYMin: 2, // depth 0 = front, visual speed = speed / (1 + depth) (for perspective)
    depthAtYMax: -0.2, // negative depth = in front of the kangaroo
    onHitOn: function (hitDatas) {
      if (speed > 40) {
        changeSpeed(1 / 1.1);
      }
    },
  },
  {
    component: "scorpion",
    color: COLOR_SCORPION,
    distanceMin: 0, // min distance to appear in the world */
    distanceIntervalMin: 0, // min pixel distance between two
    distanceIntervalMax: 100, // max pixel distance between two
    yMin: Y_FLOOR - 10,
    yMax: Y_FLOOR - 10,
    depthAtYMin: 0, // depth 0 = front, visual speed = speed / (1 + depth) (for perspective)
    depthAtYMax: 0,
    speedMin: 10, // speed of the symbol (go leftwards) pixel/second
    speedMax: 50,
    onHitOn: function (hitDatas) {
      hitDatas[0].obj.weight /= 1.1;
    },
  },
  {
    component: "cactus",
    color: COLOR_CACTUS,
    distanceMin: 0, // min distance to appear in the world */
    distanceIntervalMin: 150, // min pixel distance between two
    distanceIntervalMax: 1000, // max pixel distance between two
    yMin: Y_FLOOR - 10,
    yMax: Y_FLOOR - 10,
    depthAtYMin: 0, // depth 0 = front, visual speed = speed / (1 + depth) (for perspective)
    depthAtYMax: 0,
    patterns: [
      [
        // small cactus
        {x:0, y:0},{x:0, y:-10},{x:0, y:-20}, // trunk 
        { x: -10, y: -20 },
        { x: -10, y: -30 }, // left arm
        {x:10, y:-10},{x:20, y:-10},{x:20, y:-20} // right arm
      ],
      [
        // medium cactus
        { x: 0, y: 0 },
        { x: 0, y: -10 },
        { x: 0, y: -20 },
        { x: 0, y: -30 },
        { x: 0, y: -40 }, // trunk
        { x: -10, y: -10 },
        { x: -20, y: -10 },
        { x: -20, y: -20 }, // left arm
        { x: 10, y: -30 },
        { x: 20, y: -30 },
        { x: 20, y: -40 }, // right arm
      ],
    ],
    onHitOn: function (hitDatas) {
      hitDatas[0].obj.weight *= 1.1;
    },
  },
];

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
      y: Y_FLOOR,
      w: CANVAS_WIDTH,
      h: FLOOR_HEIGHT,
    })
    .color(COLOR_FLOOR);

  // bush
  Crafty.e("2D, Canvas, Color")
    .attr({
      x: LEFT_MARGIN,
      y: Y_FLOOR - BUSH_HEIGHT,
      w: CANVAS_WIDTH,
      h: BUSH_HEIGHT,
    })
    .color(COLOR_BUSH);

  // sky
  Crafty.e("2D, Canvas, Color")
    .attr({
      x: LEFT_MARGIN,
      y: 0,
      w: CANVAS_WIDTH,
      h: WORLD_HEIGHT - FLOOR_HEIGHT - BUSH_HEIGHT,
    })
    .color(COLOR_SKY);

  // Add kangaroo player
  Crafty.e("2D, DOM, Color, Kangaroo")
    .attr({
      x: X_KANGAROO,
      y: Y_FLOOR - 20, // dropped from a bit above the floor to start rebouncing
      w: 10,
      h: 10,
      z: Z_KANGAROO,
    })
    .color(COLOR_KANGAROO);

  // prepopulate the world (clouds, rocks...)
  prePopulateWorld();
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
      z: Z_PANEL,
    })
    .color("white")
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
      y: Y_FLOOR, // initially empty
      w: 30,
      h: 0, // initially empty
      z: Z_PANEL,
    })
    .color("orange")
    .bind("UpdateFrame", function (data) {
      // update height according to energy
      energy = Crafty("Kangaroo").get(0).energy;
      this.h = energy;
      this.y = Y_FLOOR - this.h;
    });

  // energy used for the current jump (player-controlled jump)
  // for the first kangaroo entity
  energyUsedBar = Crafty.e("2D, Canvas, Color")
    .attr({
      x: 5,
      y: Y_FLOOR, // initially empty
      w: 20,
      h: 0, // initially empty
      z: Z_PANEL,
    })
    .color("red", 0.75) // slightly transparent
    .bind("UpdateFrame", function (data) {
      // update height according to energy used by controlled jump
      kangarooEntity = Crafty("Kangaroo").get(0);
      if (kangarooEntity.playerControl) {
        currentJumpHeight = kangarooEntity.yAtLiftOff - kangarooEntity.y;
        this.h = currentJumpHeight * kangarooEntity.weight; // = used energy: we need more energy when we are heavier
        this.y = Y_FLOOR - this.h;
      } else {
        // empty the control bar when we start going down
        if (this.h > 0 && !kangarooEntity.goingUp) {
          this.h = 0;
          this.y = Y_FLOOR;
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

/** change speed of game, by a multiplication factor.
 *  I don't use an absolute value because elements in the background (trees, clouds)
 *  have a smaller speed. The further back the slower, to convey a perspective feeling.
 * @param aSpeedMultiplier if >1: accelerate <1: decelerate  -1: mirror (useful if we hit
 * a wall or a big rock)
 */
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
        traces[i][j].color(COLOR_TRACES, colorStrength);
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
          z: Z_KANGAROO,
          vx: -speed, // linear velocity, inherited from "Motion" component
        })
        .color(COLOR_TRACES)
    );
  }
}

/** Check if a symbol is too far left outside of the world, and must be destroyed
 * @param x the x position
 * @param avx the horizontal velocity (typically negative)
 */
function isTooFarOutOfWorld(ax, avx) {
  return ax < LEFT_MARGIN - Math.abs(avx) * (DELAY_TO_DISAPPEAR / 1000);
}

/** Populate the world automatically with some randomness
 *
 */
function populateWorld() {
  symbols.forEach(function (symbol) {
    // randomly decide if we create a new symbol
    // we must have reached at least the min distance, if specified
    if (!("distanceMin" in symbol) || distance >= symbol.distanceMin) {
      // and be separated from the last one by at least a minimal interval
      if (!("distanceLast" in symbol)) {
        // if no symbol of this kind yet created: create the field "distanceLast"
        // and pretend one was just created long enough ago
        symbol.distanceLast = distance - symbol.distanceIntervalMin;
      }
      distanceSinceLast = distance - symbol.distanceLast;
      if (distanceSinceLast >= symbol.distanceIntervalMin) {
        intervalLength =
          symbol.distanceIntervalMax - symbol.distanceIntervalMin;
        distanceTillEndOfInterval =
          symbol.distanceIntervalMax - distanceSinceLast;
        // the probability to generate a symbol increases as we progress in the interval,
        // if the symbol has not yet been generated
        probability = 1 - distanceTillEndOfInterval / intervalLength;
        if (Math.random() <= probability) {
          // give birth to a symbol!
          symbol.distanceLast = distance;
          // random speed in the min.max range
          if ("speedMin" in symbol && "speedMax" in symbol) {
            speedNewBorn =
              symbol.speedMin +
              Math.random() * (symbol.speedMax - symbol.speedMin);
          } else {
            speedNewBorn = 0; // by default fixed
          }
          // random y in the min.max range
          yNewBorn = symbol.yMin + Math.random() * (symbol.yMax - symbol.yMin);
          // calculate depth in function of yNewBorn
          if (symbol.yMax == symbol.yMin) {
            depthNewBorn = symbol.depthAtYMin;
          } else {
            depthNewBorn =
              symbol.depthAtYMin +
              ((yNewBorn - symbol.yMin) / (symbol.yMax - symbol.yMin)) *
                (symbol.depthAtYMax - symbol.depthAtYMin);
          }
          // visual horizontal speed of the newBorn entity on the screen
          vxNewBorn = -(speed + speedNewBorn) / (1 + depthNewBorn); // for perspective: further away is slower
          // calculate x position
          // select a pattern in the list of patterns, if it is available
          // if no list is given, then take a default pattern: only one symbol
          if ("patterns" in symbol) {
            // randomly pick a pattern in the list
            pattern =
              symbol.patterns[
                Math.floor(Math.random() * symbol.patterns.length)
              ];
          } else {
            // default pattern is a single element at relative position {x:0, y:0}
            pattern = [{ x: 0, y: 0 }];
          }
          if (distance >= 0) {
            // calculate the min X offest of the pattern
            xValues = [];
            pattern.forEach(function (subElement) {
              xValues.push(subElement.x);
            });
            patternMinX = Math.min.apply(null, xValues);
            // create at the right side of the world, and even a bit further
            // when a pattern is used which spans on the left side
            xNewBorn = CANVAS_WIDTH - patternMinX; // patternMinX typically negative
          } else {
            // distance is negative, that means pre-populating the world
            // assume a constane speed throughout the past
            timeInThePast = -distance / speed; // time in seconds, positive
            xNewBorn = CANVAS_WIDTH + vxNewBorn * timeInThePast; // note that vx is negative
          }
          // do not create the entity if it's too far out of the world on the left
          if (isTooFarOutOfWorld(xNewBorn, vxNewBorn)) {
            if (DEBUG) {
              console.log(
                "Prepopulate: ",
                symbol.component,
                " too far left at x = ",
                xNewBorn,
                " vx = ",
                vxNewBorn
              );
            }
          } else {
            // create a pattern of entities
            // the pattern defines the relative positions of repeated elements of the same kind
            pattern.forEach(function (subElement) {
              Crafty.e(
                "2D, Canvas, Color, Motion, Collision, " + symbol.component
              )
                .attr({
                  x: xNewBorn + subElement.x,
                  y: yNewBorn + subElement.y,
                  z: "z" in symbol ? symbol.z : Z_SYMBOLS_DEFAULT,
                  w: 10, // will be set by the sprite
                  h: 10, // will be set by the sprite
                  vx: vxNewBorn,
                })
                .color(symbol.color)
                .checkHits("Kangaroo")
                .bind("HitOn", function (hitDatas) {
                  if (DEBUG && 0) {
                    console.log("Hit a ", symbol.component);
                  }
                  if ("onHitOn" in symbol) {
                    symbol.onHitOn(hitDatas);
                  }
                })
                .bind("HitOff", function (componentName) {
                  if (DEBUG & 00) {
                    console.log("Quit a ", componentName);
                  }
                  if ("onHitOff" in symbol) {
                    symbol.onHitOff(componentName); // the hitoff returns no hitData, only the componentName
                  }
                })
                .bind("Move", function (e) {
                  // destroy the entity if it has moved too far away on the left border
                  if (isTooFarOutOfWorld(this.x, this.vx)) {
                    if (DEBUG && 0) {
                      console.log(
                        "destroy a " + symbol.component + " at x = ",
                        this.x
                      );
                    }
                    this.destroy();
                  }
                }); // end of chained calls from Crafty.e()
            });
          }
        }
      }
    }
  }); // forEach
}

// prepopulate the world (clouds and rocks typically) before starting the game
// simulates a certain play duration in the past
function prePopulateWorld() {
  distancePrev = distance;
  // initialise the distance in the past
  distanceBackInTime = -speed * (PRE_POPULATE_DURATION / 1000);
  // Loop from the distance in the past until the start (at distance=0)
  for (
    distance = distanceBackInTime;
    distance < 0;
    distance += POPULATE_WORLD_DISTANCE_STEP
  ) {
    // the function populateWorld has special management if distance is negative
    populateWorld();
  }
  // restore the previous distance (normally zero)
  distance = distancePrev;
}

// action on hitting a cloud
function onHitOnCloud(aHitDatas) {
  entityHit = aHitDatas[0].obj; // take only the first hit data: this should be the kangaroo
  entityHit.antigravity(); // fly !
}

// action on quitting a cloud
function onHitOffCloud(componentName) {
  Crafty("Kangaroo").get(0).gravity(); // start falling again
}

// ***********************************************
// game logic
// ***********************************************

Crafty.c("Kangaroo", {
  required: "2D, Jumper, Gravity, Keyboard",
  init: function () {
    // exported properties
    // We could also really use "properties", but that seems overkill
    this.yAtLiftOff = Y_FLOOR; // y when last jump was started
    this.timeAtLiftOff = 0; // time of last jump start
    this.yPrevious = Y_FLOOR; // y at the previous frame
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

  properties: {
    // weight <1: lighter: will jump higher; >1: heavier
    // we use a property to take action when hitting an object that impacts the weight
    // public value
    weight: {
      set: function (value) {
        if (value < 0) {
          // safety check: weight must be >= 0
        } else if (value == 0) {
          // become gravity free!
          // do not change the cached gravity nor weight: will be needed when we resume falling!
          this.antigravity();
        } else {
          // when the weight is changed, we change the gravity to simulate being heavier/lighter
          this.currentGravity *= value / this._weight;
          this._weight = value; // update the private variable
          this.gravity(); // re-enable gravity if it was stopped by antigravity
          this.gravityConst(this.currentGravity);
        }
      },

      get: function () {
        return this._weight;
      },
    },
    // private cached value
    _weight: {
      value: 1.0, // initial value
      writable: true,
    },
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
    CheckJumping: function (ground) {
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
      this.color(COLOR_KANGAROO);
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
        // use the full energy reserve at start of jump, divided by the weigth
        // (if we are heavier, we'll not jump as high)
        this.currentTargetHeight = this.energy / this.weight;
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
      // stop jump
      this.stopJump();
      // remove the used energy, in case of player jump
      // and keep at least enough energy for a default jump
      if (this.currentPlayerJump) {
        this.energy = Math.max(
          this.energy - this.playerControlledEnergy,
          ENERGY_DEFAULT_JUMP
        );
      }
    },
  }, // end of events
  startJump: function (aTargetHeight) {
    // introduce some randomness in the jump height
    randomFactor =
      1 -
      JUMP_RANDOMNESS_PERCENT / 100 +
      Math.random() * ((2 * JUMP_RANDOMNESS_PERCENT) / 100);
    heightOfJump = aTargetHeight * randomFactor;
    distanceOfJump = heightOfJump / JUMP_RATIO;
    [initialJumpSpeed, gravity] = calculateJump(heightOfJump, distanceOfJump);
    if (DEBUG) {
      console.log(
        "initialJumpSpeed: ",
        initialJumpSpeed,
        " gravity: ",
        gravity
      );
    }
    this.currentJumpSpeed = initialJumpSpeed;
    this.currentGravity = gravity;
    this.gravityConst(gravity);
    this.jumpSpeed(this.currentJumpSpeed);
    // and now: jump !
    this.jump();
  },
  stopJump: function () {
    // in case of player-controlled jump: stop the control
    if (this.playerControl) {
      this.playerControl = false;
      // remember the energy requested by the controlled jump, to remove it later,
      // typically when we reach the peak
      this.playerControlledEnergy = (this.yAtLiftOff - this.y) * this.weight;
    }
    // and start falling down by increasing the gravity
    this.currentGravity *= GRAVITY_RATIO;
    this.gravityConst(this.currentGravity);
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
    if (this.goingUp && !this.currentPlayerJump) {
      if (
        new Date().getTime() - this.timeAtLiftOff <=
        ACCEPTANCE_DELAY_AFTER_LIFTOFF
      ) {
        // start jumping only if the target is higher than where we are now !
        // if the weight is heavy it could be that the target is lower
        altitudeFromLiftOff = this.yAtLiftOff - this.y;
        newTargetAltitude = this.energy / this.weight;
        if (newTargetAltitude > altitudeFromLiftOff) {
          // the jump becomes a player jump
          this.currentPlayerJump = true;
          // start player-controlled jump
          this.playerControl = true;
          // and "re-jump" towards the new target
          this.currentTargetHeight = newTargetAltitude;
          this.startJump(this.currentTargetHeight - altitudeFromLiftOff);
        }
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
    // then effectively stop the jump
    this.stopJump();
  },
  triggerRebounce: function () {
    Crafty.trigger("Rebounce", this);
  },
}); // end of Kangaroo component

Crafty.bind("KeyDown", function (e) {
  // test game actions
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
    } else if (e.key == Crafty.keys.PAGE_UP) {
      // make lighter
      Crafty("Kangaroo").weight /= 1.1;
      console.log("weight = ", Crafty("Kangaroo").get(0).weight);
    } else if (e.key == Crafty.keys.PAGE_DOWN) {
      // make heavier
      if (Crafty("Kangaroo").get(0).weight == 0) {
        Crafty("Kangaroo").get(0).weight = 0.1;
      } else {
        Crafty("Kangaroo").weight *= 1.1;
      }
      console.log("weight = ", Crafty("Kangaroo").get(0).weight);
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

  // populate the world
  if (distance - distanceLastPopulate > POPULATE_WORLD_DISTANCE_STEP) {
    distanceLastPopulate = distance;
    populateWorld();
  }
});

Crafty.scene("main", function () {
  startTime = new Date().getTime();
  distance = 0;
  distanceLastPopulate = distance;
  speed = SPEED_START;
  drawWorld();
  drawLeftPanel();
  drawFooter();
});

Crafty.scene("main");
