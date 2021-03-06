// ***********************************************
// global variables
// ***********************************************

var DEBUG = false; // display debug info + activate deug control (ex right arrow to accelerate)

var TARGET_FRAMES_PER_SECOND = 40; // default is 50
var WORLD_WIDTH = 600;
var WORLD_HEIGHT = Math.round((WORLD_WIDTH / 16) * 9);
var FLOOR_HEIGHT = 50;
var Y_FLOOR = WORLD_HEIGHT - FLOOR_HEIGHT;
var BUSH_HEIGHT = 120;
var Y_HORIZON = Y_FLOOR - BUSH_HEIGHT;
var Y_STRATOSPHERE = -20;
var LEFT_MARGIN = 50;
var CANVAS_WIDTH = LEFT_MARGIN + WORLD_WIDTH;
var CANVAS_HEIGHT = WORLD_HEIGHT;

var COLOR_FLOOR = "sandybrown";
var COLOR_BUSH = "sandybrown"; //"#f7b77a";
var COLOR_TRACES = "white";
var COLOR_SKY = "skyblue";
var COLOR_SCORPION = "black";
var COLOR_CLOUD = "white";
var COLOR_ROCK = "crimson";
var COLOR_ULURU = "peru";
var COLOR_CACTUS = "forestgreen";
var COLOR_PARASOL = "blue";
var COLOR_FOOTBALL = "white";
var COLOR_GOAL = "darkgray";
var COLOR_MESSAGE = "deepskyblue";
var COLOR_KANGAROO = "darkorange";

var SPEED_MIN = 40;
var SPEED_START = 60; // initial speed, in pixels/second
var ENERGY_START = 25; // energy = height in pixels of the jump
var ENERGY_MIN = 10;
var ENERGY_DEFAULT_JUMP = 12; // default jump if no request from the player
var ENERGY_GAIN_ON_LANDING = 15; // energy gain after a default jump while energy < ENERGY_MAX_FOR_GAIN_ON_LANDING
var ENERGY_MAX_FOR_GAIN_ON_LANDING = 150; // max energy that can be reached by consecutive default jumps
var ACCEPTANCE_DELAY_BEFORE_LANDING = 500; // milliseconds, delay to accept player jump request before landing
var ACCEPTANCE_DELAY_AFTER_LANDING = 0; // milliseconds, delay between landing and rebounce where we stay on the ground, to allow player to fire the jump
var ACCEPTANCE_DELAY_AFTER_LIFTOFF = 300; // milliseconds, delay to accept player jump request after a jump has started
var JUMP_RANDOMNESS_PERCENT = 0; // +/- randomness on jump height and distance; 0 means no randomness
var JUMP_RATIO_DEFAULT = 0.5; // shape of the jump: jump height / jump distance
var GRAVITY_RATIO_DEFAULT = 5; // shape of the jump: gravity multiplication factor when going down
// >1.0 for heavy fall, <1.0 for lighter and longer fall
// riseTime/fallTime = sqrt(GRAVITY_RATIO)
/** max gravity */
var GRAVITY_MAX = 1000;
var GRAVITY_FAST_FALL = 500;
var TRACE_FRAME_STEP = 2; // number of frames between each trace update
var TRACE_MAX_COUNT = 50; // max number of traces to remember
var TRACE_SIZE = 2; // size of trace blocks
var POPULATE_WORLD_DISTANCE_STEP = 10; // pixel distance between two calls of populateWorld
var PRE_POPULATE_DURATION = 60000; // milliseconds simulated in the past to prepopulate the world
var DELAY_TO_DISAPPEAR = 200; // milliseconds: delay to destroy a symbol after exiting the world on the left side, if z=0. if z<0: the delay will be longer
var Y_DISAPPEAR_TOP = -100; // y position too far above: symbol is destroyed
var Y_DISAPPEAR_BOTTOM = WORLD_HEIGHT + 100; // y too far below: symbol must be destroyed
var MESSAGE_Z_RANDOMNESS_PERCENT = 10; // +/- randomness on z for messages, to prevent from horizontal lines to be too obviously visible
var PIXELS_PER_METER = 10; // scale to convert pixels into metres
var DISTANCE_FINISH_LINE = 50000; // pixels
var DISTANCE_LAST_OBSTACLES = DISTANCE_FINISH_LINE - 400;

// horizontal position of the kangaroo
var X_KANGAROO = CANVAS_WIDTH / 3;

// Z values: Z must be integer (see Crafty doc)
// z<0 is behind the kangaroo. z decreases as we go further back
// z=0 is the vertical plane where the kangaroo is
// z>0 is in front of the kangaroo. z increases as we go in front towards the viewer
var Z_BACKGROUND = -1000; // in the background, objects are fixed, their visual speed is 0
var Z_SYMBOLS_DEFAULT = 0; // at z=0: visual speed = speed
var Z_TRACES = 1; // in front of symbols
var Z_KANGAROO = 3; // use Z=2 and not zero, to be in front of symbols. We should not put anything else in this Z plane
var Z_ATTRIBUTES = 4; // attributes of kang, when in the air or worn by Kang: in front of kangaroo
var Z_ATTRIBUTES_LOST = 2; // attributes when lost on a cactus: behinf Kang
var Z_OBSERVER = 100; // at Z_OBSERVER the visual speed is infinite
var Z_PANEL = 1000; // in front, to hide objects behind
var Z_PAUSE_BUTTON = Z_PANEL+1; // in front of panel
var Z_GAME_OVER = Z_PANEL+2; // in front of pause button

// Characteristics of symbols hit actions
var SCORPION_PAIN_SYMBOL_DURATION = 750; // milliseconds
var SCORPION_ENERGY_DECREMENT = 150; // decrement energy when hitting a scorpion
var PARASOL_GRAVITY_RATIO = 0.5; // shape of the jump when we have a parasol, see GRAVITY_RATIO_DEFAULT
var PARASOL_GRAVITY_FALL = 20; // gravity applied in "startFall" falling down
var PARASOL_JUMP_RATIO = 0.3; // shape of the jump: jump height / jump distance
var GOAL_BUBBLE_DURATION = 2500; // milliseconds
var GOAL_ENERGY_INCREMENT = 150; // energy increment when scoring a goal
var CHILLI_BUBBLE_DURATION = 1000; // milliseconds
var CAULIFLOWER_BUBBLE_DURATION = 1000; // milliseconds
var HAMBURGER_ENERGY_INCREMENT = 150; // energy increment when hitting ("eating") a hamburger 
var HAMBURGER_BUBBLE_DURATION = 1000; // milliseconds
var MAX_CACTUS_WIDTH = 50; // pixels
var CACTUS_BUBBLE_DURATION = 1000; // milliseconds

var startTime;
/** speed of the game, in pixels/seconds.
 *  >0 means that the kangaroo goes rightwards, in fact the fixed objects go leftwards
 * <0 the kangaroo goes leftwards, the fixed objects go rightwards
 * */
var speed;
var distance; // distance travelled in pixels
var distanceLastPopulate; // distance last time populateWorld was called
var distanceLastCactusHit; // distance of last cactus hit
var traces = []; // array of arrays of entities: trace of kangaroo(s)
var jumpButton; // make it globally visible
var pauseButton; // make it globally visible

// ***********************************************
// world inhabitants
// ***********************************************
var symbols = [
  {
    components: ["Banner"],
    distanceFirst: -CANVAS_WIDTH/4,
    // distanceIntervalMin: 2000, omitted: means no repetition
    // distanceIntervalMax: 10000, omitted: means no repetition
    yMin: 25,
    yMax: 25,
    zAtYMin: -50,
    zAtYMax: -50,
    speedMin: -20, // speed of the symbol in pixel/second. <0 means go leftwards
    speedMax: -20,
  },
  {
    components: ["Cloud"],
    color: COLOR_CLOUD,
    // distanceFirst : 0,  if omitted: means that it will be pre-populated
    // distanceMax  if omitted: no limit
    distanceIntervalMin: 0, // min pixel distance between two    if omitted: no repetition
    distanceIntervalMax: 200, // max pixel distance between two  if omitted: no repetition
    yMin: -20,
    yMax: 100,
    zAtYMin: -10, // if omitted: Z_SYMBOLS_DEFAULT
    zAtYMax: -850,// if omitted: Z_SYMBOLS_DEFAULT
    //speedMin: -50, // speed of the symbol in pixel/second. <0 means go leftwards. If omitted: 0
    //speedMax: -10,
    // patterns: [[{x:0, y:0}]] default pattern: can be omitted
    onHitOn: function (aEntity,hitDatas) {
      onHitOnCloud(aEntity,hitDatas);
    },
    onHitOff: function (componentName) {
      onHitOffCloud(componentName);
    },
  },
  {
    // rocks in the background
    components: ["Rock"],
    color: COLOR_ROCK,
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 0, // min pixel distance between two
    distanceIntervalMax: 200, // max pixel distance between two
    yMin: 200,
    yMax: Y_FLOOR - 40, // = 247.5
    zAtYMin: -600,
    zAtYMax: -20,
  },
  {
    // rocks in the way of Kangaroo
    components: ["Rock"],
    color: COLOR_ROCK,
    distanceFirst: 500,
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 20, // min pixel distance between two
    distanceIntervalMax: 400, // max pixel distance between two
    yMin: Y_FLOOR - 19,
    yMax: Y_FLOOR - 19,
    onHitOn: function (aEntity,hitDatas) {
      onHitOnRock(aEntity,hitDatas);
    },
    patterns: [
      [
        // one rock
        { x: 0, y: 0 },
      ],
      [
        // 3 rocks - height 2, 
        { x: 0, y: -2 },{ x: 15, y: 0 },{ x: 10, y: -14 }
      ],
      [
        // height 3
        { x: 0, y: -3 }, {x: 17,y:-1},{x:34,y:0}, {x:10,y:-15}, {x:27,y:-14},{x:23,y:-28}
      ],
    ],
  },
  {
    // platform in the way of Kangaroo
    components: ["Rock"],
    color: COLOR_ROCK,
    distanceFirst: 2000,
    distanceMax: DISTANCE_LAST_OBSTACLES - 200,
    distanceIntervalMin: 500, // min pixel distance between two
    distanceIntervalMax: 3000, // max pixel distance between two
    yMin: Y_FLOOR - 19,
    yMax: Y_FLOOR - 19,
    onHitOn: function (aEntity,hitDatas) {
      onHitOnRock(aEntity,hitDatas);
    },
    patterns: [
      [
        // platform - arch
        {x:0,y:0},{x:10,y:-8},{x:20,y:-15},{x:30,y:-25},{x:40,y:-30},{x:50,y:-37},{x:60,y:-45},{x:70,y:-51},{x:80,y:-55},{x:90,y:-59},
        {x:100,y:-61},{x:110,y:-64},{x:120,y:-68},{x:130,y:-70},{x:140,y:-69},{x:150,y:-66},{x:160,y:-61},{x:170,y:-51},{x:180,y:-42},
        {x:185,y:-29},{x:190,y:-18},{x:192,y:-5},
      ],
    ],
  },
  {
    // rocks in front of Kangaroo
    components: ["Rock"],
    color: COLOR_ROCK,
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 20, // min pixel distance between two
    distanceIntervalMax: 300, // max pixel distance between two
    yMin: Y_FLOOR - 10,
    yMax: WORLD_HEIGHT - 25,
    zAtYMin: 100,
    zAtYMax: 200, // positive: in front of the kangaroo
    patterns: [
      [
        // one rock
        { x: 0, y: 0 },
      ],
      [
        // 3 rocks - height 2, 
        { x: 0, y: 0 },{ x: 15, y: 2 },{ x: 10, y: -12 }
      ],
      [
        // height 3
        { x: 0, y: 0 }, {x: 17,y:2},{x:34,y:3}, {x:10,y:-12}, {x:27,y:-11},{x:23,y:-25}
      ],
    ],
  },
  {
    components: ["Uluru"],
    color: COLOR_ULURU,
    distanceIntervalMin: 10000, // min pixel distance between two
    distanceIntervalMax: 15000, // max pixel distance between two
    yMin: Y_HORIZON-20,
    yMax: Y_HORIZON-20,
    zAtYMin: -940,
    zAtYMax: -940,
  },
  {
    components: ["Scorpion"],
    color: COLOR_SCORPION,
    distanceFirst: 1000, // first distance to appear in the world
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 100, // min pixel distance between two
    distanceIntervalMax: 1000, // max pixel distance between two
    yMin: Y_FLOOR - 10,
    yMax: Y_FLOOR - 10,
    speedMin: -50, // speed of the symbol in pixel/second. <0 means go leftwards
    speedMax: -10,
    onHitOn: function (aEntity,hitDatas) {
      onHitOnScorpion(aEntity,hitDatas);
    },
  },
  {
    components: ["Cactus"], // little cactuses at the beginning
    color: COLOR_CACTUS,
    distanceFirst: 0, // first distance to appear in the world
    distanceMax: 8000,
    distanceIntervalMin: 300, // min pixel distance between two
    distanceIntervalMax: 600, // max pixel distance between two
    yMin: Y_FLOOR - 10,
    yMax: Y_FLOOR - 10,
    onHitOn: function (aEntity,hitDatas) {
      onHitOnCactus(aEntity,hitDatas);
    },
    patterns: [
      [
        // very small cactus
        { x: 0, y: 0 },
        { x: 0, y: -10 }, // trunk
        { x: 10, y: -10 },
        { x: 10, y: -20 }, // right arm
      ],
    ],
  },
  {
    components: ["Cactus"],
    color: COLOR_CACTUS,
    distanceFirst: 8100, // first distance to appear in the world
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 150, // min pixel distance between two
    distanceIntervalMax: 600, // max pixel distance between two
    yMin: Y_FLOOR - 10,
    yMax: Y_FLOOR - 10,
    onHitOn: function (aEntity,hitDatas) {
      onHitOnCactus(aEntity,hitDatas);
    },
    patterns: [
      [
        // very small cactus
        { x: 0, y: 0 },
        { x: 0, y: -10 }, // trunk
        { x: 10, y: -10 },
        { x: 10, y: -20 }, // right arm
      ],
      [
        // small cactus
        { x: 0, y: 0 },
        { x: 0, y: -10 },
        { x: 0, y: -20 }, // trunk
        { x: -10, y: -20 },
        { x: -10, y: -30 }, // left arm
        { x: 10, y: -10 },
        { x: 20, y: -10 },
        { x: 20, y: -20 }, // right arm
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
  },
  {
    components: ["Cactus"],
    color: COLOR_CACTUS,
    distanceFirst: 35000, // first distance to appear in the world
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 2000, // min pixel distance between two
    distanceIntervalMax: 10000, // max pixel distance between two
    yMin: Y_FLOOR - 10,
    yMax: Y_FLOOR - 10,
    onHitOn: function (aEntity,hitDatas) {
      onHitOnCactus(aEntity,hitDatas);
    },
    patterns: [
      [
        // giant cactus
        { x: 0, y: 0 },
        { x: 0, y: -10 },
        { x: 0, y: -20 },
        { x: 0, y: -30 },
        { x: 0, y: -40 },
        { x: 0, y: -50 },
        { x: 0, y: -60 },
        { x: 0, y: -70 }, // trunk
        { x: 10, y: -10 },
        { x: 20, y: -10 },
        { x: 20, y: -20 }, // right arm 1
        { x: 10, y: -40 },
        { x: 20, y: -40 },
        { x: 20, y: -50 }, // right arm 2
        { x: -10, y: -20 },
        { x: -20, y: -20 },
        { x: -20, y: -30 }, // left arm 1
        { x: -10, y: -70 },
        { x: -10, y: -80 }, // left arm 2
      ],
    ],
  },
  {
    components: ["Parasol"],
    color: COLOR_PARASOL,
    distanceFirst: 9000, // first distance to appear in the world
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 100, // min pixel distance between two
    distanceIntervalMax: 1000, // max pixel distance between two
    yMin: 80,
    yMax: Y_FLOOR - 80,
    onHitOn: function (aEntity,hitDatas) {
      onHitOnParasol(aEntity,hitDatas);
    },
    patterns : [
      [ // single
        { x: 0, y: 0 },
      ],
    ]
  },
  {
    components: ["Football"],
    color: COLOR_FOOTBALL,
    distanceFirst: 6000, // first distance to appear in the world
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 100, // min pixel distance between two
    distanceIntervalMax: 1000, // max pixel distance between two
    yMin: 70,
    yMax: Y_FLOOR - 30,
    zAtYMin: 1, // in front of symbols
    zAtYMax: 1,
    onHitOn: function (aEntity,hitDatas) {
      onHitOnFootball(aEntity,hitDatas);
    },
    patterns : [
      [ // single
        { x: 0, y: 0 },
      ],
    ]
  },
  {
    components: ["Goal"],
    color: COLOR_GOAL,
    distanceFirst: 6200, // first distance to appear in the world
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 300, // min pixel distance between two
    distanceIntervalMax: 1000, // max pixel distance between two
    yMin: 50,
    yMax: Y_FLOOR - 80,
    zAtYMin: 0, // in front of symbols
    zAtYMax: 0,
    onHitOn: function (aEntity,hitDatas) {
      // do nothing when Kangaroo hits a Goal;
      // But we define the onHitOn function: trick to add the Collision
      // component to Goal, and use the collision polygon.
    },
  },
  {
    components: ["Chilli"],
    distanceFirst: 900, // first distance to appear in the world
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 100, // min pixel distance between two
    distanceIntervalMax: 1000, // max pixel distance between two
    yMin: 80,
    yMax: Y_FLOOR - 80,
    onHitOn: function (aEntity,hitDatas) {
      onHitOnChilli(aEntity,hitDatas);
    },
    patterns : [
      [ // single
        { x: 0, y: 0 },
      ],
    ]
  },
  {
    components: ["Chilli"],
    distanceFirst: 500, // first distance to appear in the world
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 1000, // min pixel distance between two
    distanceIntervalMax: 5000, // max pixel distance between two
    yMin: Y_FLOOR-50,
    yMax: Y_FLOOR-30,
    onHitOn: function (aEntity,hitDatas) {
      onHitOnChilli(aEntity,hitDatas);
    },
    patterns : [
      [ // wall of chilli's
        { x: 3, y: -90 },
        { x: -2, y: -120 },{ x: 5, y: -150 },
        { x: 7, y: -180 },
      ],
    ]
  },
  {
    components: ["Cauliflower"],
    distanceFirst: 1200, // first distance to appear in the world
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 100, // min pixel distance between two
    distanceIntervalMax: 1000, // max pixel distance between two
    yMin: 80,
    yMax: Y_FLOOR - 80,
    onHitOn: function (aEntity,hitDatas) {
      onHitOnCauliflower(aEntity,hitDatas);
    },
    patterns : [
      [ // single
        { x: 0, y: 0 },
      ],
    ]
  },
  {
    components: ["CowBoyHat"],
    distanceFirst: 5000, // first distance to appear in the world
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 2000, // min pixel distance between two
    distanceIntervalMax: 10000, // max pixel distance between two
    yMin: 80,
    yMax: Y_FLOOR - 80,
    zAtYMin: Z_ATTRIBUTES, // in front of kangaroo
    zAtYMax: Z_ATTRIBUTES, // in front of kangaroo
    onHitOn: function (aEntity,hitDatas) {
      onHitOnAttribute(aEntity,hitDatas,this.components[0],33,-6);
    },
    patterns : [
      [ // single
        { x: 0, y: 0 },
      ],
    ]
  },
  {
    components: ["Sunglasses"],
    distanceFirst: 1000, // first distance to appear in the world
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 2000, // min pixel distance between two
    distanceIntervalMax: 10000, // max pixel distance between two
    yMin: 80,
    yMax: Y_FLOOR - 80,
    zAtYMin: Z_ATTRIBUTES, // in front of kangaroo
    zAtYMax: Z_ATTRIBUTES, // in front of kangaroo
    onHitOn: function (aEntity,hitDatas) {
      onHitOnAttribute(aEntity,hitDatas,this.components[0],37,4);
    },
    patterns : [
      [ // single
        { x: 0, y: 0 },
      ],
    ]
  },
  {
    components: ["Sweater"],
    distanceFirst: 15000, // first distance to appear in the world
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 2000, // min pixel distance between two
    distanceIntervalMax: 10000, // max pixel distance between two
    yMin: 80,
    yMax: Y_FLOOR - 80,
    zAtYMin: Z_ATTRIBUTES, // in front of kangaroo
    zAtYMax: Z_ATTRIBUTES, // in front of kangaroo
    onHitOn: function (aEntity,hitDatas) {
      onHitOnAttribute(aEntity,hitDatas,this.components[0],18,2);
    },
    patterns : [
      [ // single
        { x: 0, y: 0 },
      ],
    ]
  },
  {
    components: ["Short"],
    distanceFirst: 10000, // first distance to appear in the world
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 2000, // min pixel distance between two
    distanceIntervalMax: 10000, // max pixel distance between two
    yMin: 80,
    yMax: Y_FLOOR - 80,
    zAtYMin: Z_ATTRIBUTES, // in front of kangaroo
    zAtYMax: Z_ATTRIBUTES, // in front of kangaroo
    onHitOn: function (aEntity,hitDatas) {
      onHitOnAttribute(aEntity,hitDatas,this.components[0],17,10);
    },
    patterns : [
      [ // single
        { x: 0, y: 0 },
      ],
    ]
  },
  {
    components: ["Boot"],
    distanceFirst: 5000, // first distance to appear in the world
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 2000, // min pixel distance between two
    distanceIntervalMax: 10000, // max pixel distance between two
    yMin: 80,
    yMax: Y_FLOOR - 80,
    zAtYMin: Z_ATTRIBUTES, // in front of kangaroo
    zAtYMax: Z_ATTRIBUTES, // in front of kangaroo
    onHitOn: function (aEntity,hitDatas) {
      onHitOnAttribute(aEntity,hitDatas,this.components[0],20,28);
    },
    patterns : [
      [ // single
        { x: 0, y: 0 },
      ],
    ]
  },
  {
    components: ["Hamburger"],
    distanceFirst: 4300, // first distance to appear in the world
    distanceMax: DISTANCE_LAST_OBSTACLES,
    distanceIntervalMin: 2000, // min pixel distance between two
    distanceIntervalMax: 10000, // max pixel distance between two
    yMin: 40,
    yMax: Y_HORIZON - 25,
    onHitOn: function (aEntity,hitDatas) {
      onHitOnHamburger(aEntity,hitDatas);
    },
    patterns : [
      [ // single
        { x: 0, y: 0 },
      ],
    ]
  },
  {
    components: ["Board1km"],
    distanceFirst: DISTANCE_FINISH_LINE - 1000*PIXELS_PER_METER,
    // distanceIntervalMin: 2000, omitted: means no repetition
    // distanceIntervalMax: 10000, omitted: means no repetition
    yMin: 200,
    yMax: 200,
    // z: same as a rock at the same y position:
    // align bottom of rock and bottom of board:
    // y of the rock is then: 200 + 52(height of board) - 20(height of rock) = 232
    // corresponding z of that rock is (see characteristics of "rocks in the background")
    // -600 + (600 - 20) * (232 - 200)/(247.5 - 200)
    zAtYMin: -600 + (600 - 20) * (232-200)/(Y_FLOOR - 40 - 200),
    zAtYMax: -600 + (600 - 20) * (232-200)/(Y_FLOOR - 40 - 200),
  },
  {
    components: ["Friends"],
    distanceFirst: DISTANCE_FINISH_LINE, // first distance to appear in the world
    // distanceIntervalMin: 2000, omitted: means no repetition
    // distanceIntervalMax: 10000, omitted: means no repetition
    yMin: Y_FLOOR - 110,
    yMax: Y_FLOOR - 110,
    onHitOn: function (aEntity,hitDatas) {
      onHitOnFriends(aEntity,hitDatas);
    },
  },
  {
    components: ["Message"],
    color: COLOR_MESSAGE,
    distanceFirst: 25000, // 1st distance where the message is aligned
    distanceIntervalMin: 3000, // if this key is absent: it means the symbol appears only once
    distanceIntervalMax: 3000, // if this key is absent: it means the symbol appears only once
    xReveal: LEFT_MARGIN + 10, // bounding rectangle of message in the sky at the moment it is aligned
    wReveal: WORLD_WIDTH - 30, // width
    yTop: 10,     
    yBottom: 50,
    zTop: -200,
    zBottom: -500,
    message: [
      // ASCII art: http://patorjk.com/software/taag/#p=display&v=1&f=Bright&t=BON%20ANNIVERSAIRE
      " #####    ####   ##  ##           ####   ##  ##  ##  ##  ######  ##  ##  ######  #####    ####    ####   ######  #####   ###### ",
      " ##  ##  ##  ##  ### ##          ##  ##  ### ##  ### ##    ##    ##  ##  ##      ##  ##  ##      ##  ##    ##    ##  ##  ##     ",
      " #####   ##  ##  ## ###          ######  ## ###  ## ###    ##    ##  ##  ####    #####    ####   ######    ##    #####   ####   ",
      " ##  ##  ##  ##  ##  ##          ##  ##  ##  ##  ##  ##    ##     ####   ##      ##  ##      ##  ##  ##    ##    ##  ##  ##     ",
      " #####    ####   ##  ##          ##  ##  ##  ##  ##  ##  ######    ##    ######  ##  ##   ####   ##  ##  ######  ##  ##  ###### ",
    ],
  },
  {
    components: ["Message"],
    color: "chocolate",
    distanceFirst: DISTANCE_FINISH_LINE+(CANVAS_WIDTH-X_KANGAROO)-50+9, // 1st distance where the message is aligned
    // "-50" = kangaroo width
    // "+9" is to account for collision polygons (?): fine-tuning
    //distanceIntervalMin: 3000, // if this key is absent: it means the symbol appears only once
    //distanceIntervalMax: 3000, // if this key is absent: it means the symbol appears only once
    xReveal: LEFT_MARGIN + 100, // bounding rectangle of message in the sky at the moment it is aligned
    wReveal: WORLD_WIDTH - 240, // width
    yTop: 10,     
    yBottom: 50,
    zTop: -200,
    zBottom: -500,
    message: [
      // ASCII art: http://patorjk.com/software/taag/#p=display&v=1&f=Bright&t=BRAVO
      " #####   #####    ####   ##  ##   ####  ",
      " ##  ##  ##  ##  ##  ##  ##  ##  ##  ## ",
      " #####   #####   ######  ##  ##  ##  ## ",
      " ##  ##  ##  ##  ##  ##   ####   ##  ## ",
      " #####   ##  ##  ##  ##    ##     ####  ",
    ],
  },
];

// ***********************************************
// init Crafty
// ***********************************************

var assetsObj = {
  "sprites": {
      "kang.png": {
          "tile": 50,
          "tileh": 39,
          "map": { "Kangaroo": [0,0] }
      },
      "scorpy.png": {
        "tile": 23,
        "tileh": 17,
        "map": { "Scorpion": [0,0] }
      },
      "scorpycrunched.png": {
        "tile": 20,
        "tileh": 14,
        "map": { "ScorpionCrunched": [0,0] }
      },
      "cloud.png": {
          "tile": 50,
          "tileh": 21,
          "map": { "Cloud": [0,0]}
      },
      "cactus.png": {
          "tile": 10,
          "tileh": 10,
          "map": { "Cactus": [0,0]}
      },
      "cactushit.png": {
        "tile": 10,
        "tileh": 10,
        "map": { "CactusHit": [0,0]}
      },
      "cactus_bubble.png": {
        "tile": 60,
        "tileh": 50,
        "map": { "CactusBubble": [0,0]}
      },
      "rock.png": {
        "tile": 20,
        "tileh": 20,
        "map": { "Rock": [0,0]}
      },
      "uluru.png": {
        "tile": 58,
        "tileh": 20,
        "map": { "Uluru": [0,0]}
      },
      "pain.png": {
        "tile": 30,
        "tileh": 12,
        "map": { "Pain": [0,0]}
      },
      "parasol.png": {
        "tile": 39,
        "tileh": 40,
        "map": { "Parasol": [0,0]}
      },
      "football.png": {
        "tile": 15,
        "tileh": 15,
        "map": { "Football": [0,0]}
      },
      "goal.png": {
        "tile": 50,
        "tileh": 30,
        "map": { "Goal": [0,0]}
      },
      "goal_bubble.png": {
        "tile": 60,
        "tileh": 50,
        "map": { "GoalBubble": [0,0]}
      },
      "goal_text.png": {
        "tile": 71,
        "tileh": 26,
        "map": { "GoalText": [0,0]}
      },
      "chilli.png": {
        "tile": 20,
        "tileh": 30,
        "map": { "Chilli": [0,0]}
      },
      "chilli_bubble.png": {
        "tile": 60,
        "tileh": 50,
        "map": { "ChilliBubble": [0,0]}
      },
      "cauliflower.png": {
        "tile": 20,
        "tileh": 30,
        "map": { "Cauliflower": [0,0]}
      },
      "cauliflower_bubble.png": {
        "tile": 60,
        "tileh": 50,
        "map": { "CauliflowerBubble": [0,0]}
      },
      "hamburger.png": {
        "tile": 44,
        "tileh": 30,
        "map": { "Hamburger": [0,0]}
      },
      "hamburgerhit.png": {
        "tile": 44,
        "tileh": 30,
        "map": { "HamburgerHit": [0,0]}
      },
      "hamburger_bubble.png": {
        "tile": 60,
        "tileh": 50,
        "map": { "HamburgerBubble": [0,0]}
      },
      "cowboyhat.png": {
        "tile": 28,
        "tileh": 13,
        "map": { "CowBoyHat": [0,0]}
      },
      "sunglasses.png": {
        "tile": 12,
        "tileh": 7,
        "map": { "Sunglasses": [0,0]}
      },
      "sweater.png": {
        "tile": 25,
        "tileh": 19,
        "map": { "Sweater": [0,0]}
      },
      "short.png": {
        "tile": 17,
        "tileh": 15,
        "map": { "Short": [0,0]}
      },
      "boot.png": {
        "tile": 13,
        "tileh": 11,
        "map": { "Boot": [0,0]}
      },
      "friends.png": {
        "tile": 128,
        "tileh": 110,
        "map": { "Friends": [0,0]}
      },
      "board1km.png": {
        "tile": 100,
        "tileh": 52,
        "map": { "Board1km": [0,0]}
      },
      "banner.png": {
        "tile": 481,
        "tileh": 29,
        "map": { "Banner": [0,0]}
      },
      "pause.png": {
        "tile": 30,
        "tileh": 30,
        "map": { "PauseButton": [0,0]}
      },
      "play.png": {
        "tile": 30,
        "tileh": 30,
        "map": { "PlayButton": [0,0]}
      }
  },
};

var spritePolygons = {
  Kangaroo: new Crafty.polygon(
    6,13, 22,4, 36,0, 45,0, 49,12, 31,38, 24,37
    ), // Caution: The hit area must be a convex shape and not concave
       // for collision detection to work properly.
  Cactus: new Crafty.polygon( // shrink a bit the polygon to be kind ;-)
    4,4, 5,4,  5,5, 4,5
  ),
  Cloud: new Crafty.polygon(
    15,7, 37,7, 37,21, 15,21
  ),
  // Do not define a collision polygon for Rock, because otherwise it
  // generates too much workload with the big arch with many rocks, and
  // this generates performance issues: sometimes it slows down a bit. 
  /*Rock: new Crafty.polygon(
    0,7, 5,0, 15,0, 19,8, 19,18, 0,18
  ),*/
  Goal: new Crafty.polygon(
    10,10, 40,10, 40,20, 10,20
  ),
  Friends: new Crafty.polygon(
    0,0,  128,-500, 128,110, 0,110
  ),
}

var viewportScale = 
      (resizeMode == RESIZE_BY_CRAFTY)? 
      calculateScalingFactor(available_width, available_height) :
      1;
Crafty.init(CANVAS_WIDTH * viewportScale, CANVAS_HEIGHT * viewportScale); // uses by default 'cr-stage' div


Crafty.load(assetsObj, // preload assets
  function() { //when loaded
      Crafty.scene("main"); //go to main scene
  },

  function(e) { //progress
  },

  function(e) { //uh oh, error loading
  }
);

// ***********************************************
// functions
// ***********************************************

// calculate viewport scaling factor
function calculateScalingFactor(availableWidth, availableHeight){
  stageWidth = CANVAS_WIDTH;
  stageHeight = CANVAS_HEIGHT;
  stageAspectRatio = stageWidth/stageHeight;
  availableAspectRatio = availableWidth/availableHeight;
  if (stageAspectRatio < availableAspectRatio){
    // fit on height: the stage will occupy the full window's height
    scaleFactor = availableHeight / stageHeight;
  } else {
    // fit on width: the stage will occupy the full window's width
    scaleFactor = availableWidth / stageWidth;
  }
  return scaleFactor;
}

// resize and scale the viewport upon browser window resize
function resizeViewport(){
  viewportScale = calculateScalingFactor(available_width, available_height);
  Crafty.viewport.width = CANVAS_WIDTH * viewportScale;
  Crafty.viewport.height = CANVAS_HEIGHT * viewportScale;
  Crafty.viewport.scale(viewportScale);
}

// resize mouse areas based on scaling factor
// This is needed after a CSS Scale transform
function resizeMouseAreas(){
  scaleFactor = calculateScalingFactor(available_width, available_height);

  jumpButton.w = scaleFactor * CANVAS_WIDTH;
  jumpButton.h = scaleFactor * CANVAS_HEIGHT;

  pauseButton.x = scaleFactor * (CANVAS_WIDTH - 35);
  pauseButton.y = scaleFactor * (CANVAS_HEIGHT - 35);
  pauseButton.w = scaleFactor * 30;
  pauseButton.h = scaleFactor * 30;
}


// draw initial world
function drawWorld() {
  // floor
  // extend the floor outside of the view, to keep the footballs on the ground,
  // otherwise they fall off
  extensionLength = SPEED_START*DELAY_TO_DISAPPEAR/1000;
  Crafty.e("2D, Canvas, Color, Floor")
    .attr({
      x: LEFT_MARGIN - extensionLength,
      y: Y_FLOOR,
      // keep a bit of margin to hold the balls, but not too much otherwise we keep
      // shooting on the same balls over and over again
      w: WORLD_WIDTH + 4*extensionLength,
      h: FLOOR_HEIGHT,
      z: Z_BACKGROUND,
    })
    .color(COLOR_FLOOR);

  // bush
  Crafty.e("2D, Canvas, Color")
    .attr({
      x: LEFT_MARGIN,
      y: Y_HORIZON,
      w: WORLD_WIDTH,
      h: BUSH_HEIGHT+2, // little overlap with floor to avoid white line wometimes after resizing
      z: Z_BACKGROUND,
    })
    .color(COLOR_BUSH);

  // sky
  Crafty.e("2D, Canvas, Color")
    .attr({
      x: LEFT_MARGIN,
      y: 0,
      w: WORLD_WIDTH,
      h: Y_HORIZON - 0,
      z: Z_BACKGROUND,
    })
    .color(COLOR_SKY);

  // stratosphere
  Crafty.e("2D, Canvas, Color, Stratosphere, Collision")
    .attr({
      x: LEFT_MARGIN,
      y: Y_STRATOSPHERE-50,
      w: WORLD_WIDTH,
      h: 50,
      z: Z_BACKGROUND,
    })
    .color(COLOR_SKY)
    .checkHits("Kangaroo")
    .bind("HitOn", function (hitDatas){
      if(DEBUG){console.log("Hit the stratosphere");}
      // stop parasol effect, and make the kangaroo start falling quicker
      hitDatas.forEach(function(hitData){
        stopParasolEffect(hitData.obj);
        hitData.obj.startFall();
      })
    });

  // Add kangaroo player
  Crafty.e("2D, Canvas, KangarooPlayer, Kangaroo")
    .attr({
      x: X_KANGAROO,
      y: Y_FLOOR - 20, // dropped from a bit above the floor to start rebouncing
      z: Z_KANGAROO,
    })

  // prepopulate the world (clouds, rocks, messages...)
  prePopulateWorld();

  // write elapsed time, distance and speed
  Crafty.e("2D, Canvas, Text")
  .attr({
    x: LEFT_MARGIN + 10,
    y: WORLD_HEIGHT - 60,
    w: 100,
    z: Z_PANEL,
  })
  .text(function () {
    timeNow = new Date().getTime();
    elapsedTime = new Date (timeNow - startTime);
    moreThanOneHour = elapsedTime >= 60*60*1000;
    hourDigits = moreThanOneHour? 3:0;
    return (elapsedTime.toISOString().substr(14-hourDigits, 5+hourDigits)
    );
  })
  .dynamicTextGeneration(true)
  .textColor("white")
  .textFont({size: '20px', weight: 'bold'});

  Crafty.e("2D, Canvas, Text")
  .attr({
    x: LEFT_MARGIN + 10,
    y: WORLD_HEIGHT - 40,
    w: 100,
    z: Z_PANEL,
  })
  .text(function () {
    distanceMetres = distance/PIXELS_PER_METER;
    return ("km " + (distanceMetres/1000).toFixed(3)
    );
  })
  .dynamicTextGeneration(true)
  .textColor("white")
  .textFont({size: '20px', weight: 'bold'});

  Crafty.e("2D, Canvas, Text")
  .attr({
    x: LEFT_MARGIN + 10,
    y: WORLD_HEIGHT - 15,
    w: 100,
    z: Z_PANEL,
  })
  .text(function () {
    speedKph = speed*60*60/PIXELS_PER_METER/1000; // [kph]
    return ("km/h " + Math.round(speedKph).toString()
    );
  })
  .dynamicTextGeneration(true)
  .textColor("white")
  .textFont({size: '14px', weight: 'bold'});
}

// draw left panel(energy level)
function drawLeftPanel() {
  // left panel: white rectangle to hide the objects passing behind
  Crafty.e("2D, Canvas, Color, Mouse")
    .attr({
      x: 0,
      y: 0,
      w: LEFT_MARGIN,
      h: WORLD_HEIGHT,
      z: Z_PANEL,
    })
    .color("white");

  // energy reserve
  energyBar = Crafty.e("2D, Canvas, Color")
    .attr({
      x: LEFT_MARGIN/5,
      y: Y_FLOOR, // initially empty
      w: LEFT_MARGIN/5 * 3,
      h: 0, // initially empty
      z: Z_PANEL,
    })
    .color("orange")
    .bind("UpdateFrame", function (data) {
      // update height according to energy
      energy = Crafty("Kangaroo").get(0).energy;
      this.h = energy;
      this.y = Y_FLOOR - this._h;
    });

  // energy used for the current jump (player-controlled jump)
  // for the first kangaroo entity
  energyUsedBar = Crafty.e("2D, Canvas, Color")
    .attr({
      x: LEFT_MARGIN/5 + 5,
      y: Y_FLOOR, // initially empty
      w: LEFT_MARGIN/5 * 2,
      h: 0, // initially empty
      z: Z_PANEL,
    })
    .color("red", 0.75) // slightly transparent
    .bind("UpdateFrame", function (data) {
      // update height according to energy used by controlled jump
      playerControlledEnergy = Crafty("Kangaroo").get(0).playerControlledEnergy;
      this.h = playerControlledEnergy;
      this.y = Y_FLOOR - this._h;
    });
  
  // button for jump: whole canvas
  jumpButton = Crafty.e("2D, Canvas, Mouse")
  .attr({
    x: 0,
    y: 0,
    w: CANVAS_WIDTH,
    h: CANVAS_HEIGHT,
    z: Z_PANEL,
  })
  .bind("MouseDown", function (MouseEvent) {
    Crafty("Kangaroo").onPlayerJumpRequest();
  })
  .bind("MouseUp", function (MouseEvent) {
    Crafty("Kangaroo").onPlayerJumpStopRequest();
  });

  // pause/play button
  // image is rescaled by CSS scale transform, but the mouse area not.
  // This is why we separate the image from the clickable area.
  pauseButtonImage = Crafty.e("2D, Canvas, PauseButton")
  .attr({
    x: CANVAS_WIDTH - 35,
    y: CANVAS_HEIGHT - 35,
    z: Z_PAUSE_BUTTON,
  });
  pauseButton = Crafty.e("2D, Canvas, Mouse, PauseButton")
  .attr({
    x: CANVAS_WIDTH - 35,
    y: CANVAS_HEIGHT - 35,
    w: 30,
    h: 30,
    z: Z_PAUSE_BUTTON,
  })
  .bind("Click", function (MouseEvent) {
    // ignore pause if distance is zero; this occurs when the pause button is
    // pressed in the "Game Over" screen
    if (distance > 10) {
      Crafty.trigger("GamePaused",0);
    }
  });

}

// draw footer (debug info, logo...)
function drawFooter() {
  // demo text
  if (DEBUG&&0) {
    Crafty.e("2D, Canvas, Text")
      .attr({
        x: LEFT_MARGIN + 10,
        y: 10,
        w: 100,
      })
      .text(function () {
        return (
          "distance:" + Math.round(distance).toString() 
        );
      })
      .dynamicTextGeneration(true)
      .textColor("red");
  }
}

// calculate the jump characteristics to reach a certain height and a certain distance
// see this very usful explanation: https://www.youtube.com/watch?v=hG9SzQxaCm8
// returns [initialJumpSpeed, gravity]
function calculateJump(aHeight, aDistance, aGravityRatio) {
  // compute duration = time to reach peak
  durationToPeak =
    aDistance / (Math.abs(speed) * (1 + 1 / Math.sqrt(aGravityRatio)));
  // then compute speed and gravity
  initialJumpSpeed = (2 * aHeight) / durationToPeak;
  gravity = (2 * aHeight) / (durationToPeak * durationToPeak);
  return [initialJumpSpeed, gravity];
}

/** Calculate the visual observed speed with perspective
 * @param aSpeed the absolute speed
 * @param aZ the z value, z<0 means further away
 */
function calculateVisualSpeed(aSpeed, aZ) {
  method = "linear"; //"linear" or "inverse";
  if (method == "linear"){
    // the visual speed of an object depends on its z value:
    // linear formula by considering that:
    // - the visual speed at z=0 is speed
    // - the visual speed at z=Z_BACKGROUND is zero
    //   visual speed = speed * ( z - Z_BACKGROUND)/(-Z_BACKGROUND) (for perspective)
    visualSpeed = (aSpeed * (aZ - Z_BACKGROUND)/(-Z_BACKGROUND));
  } else if (mehtod == "inverse"){
    // other approach
    // - the visual speed at z=0 is speed
    // - the visual speed at z=-infinite is zero -> we simplify: if z <= Z_BACKGROUND: speed = 0
    // - the visual speed at z=Z_OBSERVER is infinite
    if (aZ <= Z_BACKGROUND) {
      visualSpeed = 0;
    } else {
      visualSpeed = aSpeed / (1 - aZ / Z_OBSERVER);
    }
  }
  return visualSpeed;
}

/** change speed of game, by a multiplication factor.
 *  I don't use an absolute value because elements in the background (trees, clouds)
 *  have a smaller speed. The further back the slower, to convey a perspective feeling.
 * @param aSpeedMultiplier if >1: accelerate <1: decelerate  -1: mirror (useful if we hit
 * a wall or a big rock)
 */
function changeSpeed(aSpeedMultiplier) {
  prevSpeed = speed;
  speed *= aSpeedMultiplier;
  // adapt the speed of all "Motion" components, except the Kangaroo and all its children
  // (attached entities), which stay in place!
  Crafty("Motion")
    .get()
    .forEach(function (entity) {
      isAttachedToKangaroo = false;
      if ( entity._parent){ // check first presence of a parent (returns NULL if absent)
        if (entity._parent.has("Kangaroo")){
          isAttachedToKangaroo = true;
        }        
      }

      if (!entity.has("Kangaroo") && !isAttachedToKangaroo) {
        // visual speed of the entity if it was fixed:
        visualSpeedIfEntityFixed = calculateVisualSpeed(-prevSpeed, entity._z);
        // deduce the absolute horizontal speed of the entity
        // visual speed = visualSpeedIfEntityFixed + visualSpeedIfObserverFixed
        visualSpeedIfObserverFixed = entity.vx - visualSpeedIfEntityFixed
        // and recalculate the new visual speed (vx)
        // only the observer's part is multiplied
        entity.vx = aSpeedMultiplier*visualSpeedIfEntityFixed + visualSpeedIfObserverFixed;
      }
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

    // put a new trace at the new position (at the foot of kang)
    offsetX = 25;
    offsetY = 0;
    traces[i].push(
      Crafty.e("2D, Canvas, Color, Trace, Motion")
        .attr({
          x: kangarooEntities[i]._x + offsetX - TRACE_SIZE,
          y: kangarooEntities[i]._y + kangarooEntities[i]._h + offsetY - TRACE_SIZE,
          w: TRACE_SIZE,
          h: TRACE_SIZE,
          z: Z_TRACES,
          vx: -speed, // linear velocity, inherited from "Motion" component
        })
        .color(COLOR_TRACES)
    );
  }
}

/** Check if a symbol is too far left outside of the world or too high above,
 * or too low (typically happens for footballs falling beyond the floor)
 * and must be destroyed
 * @param x the x position
 * @param vx the horizontal velocity (typically negative)
 * @param y the y position
 */
function isTooFarOutOfWorld(x, vx, y) {
  return (x < LEFT_MARGIN - Math.abs(vx) * (DELAY_TO_DISAPPEAR / 1000))
    || (y < Y_DISAPPEAR_TOP)
    || (y > Y_DISAPPEAR_BOTTOM);
}


/** Create the given symbol at the specified distance 
 * @param aSymbol: the symbol to create
 * @param aDistance: the distance travelled so far. A negative distance means pre-populating
*/
function createSymbol(aSymbol, aDistance){
  // random speed in the min.max range
  if ("speedMin" in aSymbol && "speedMax" in aSymbol) {
    speedNewBorn =
      aSymbol.speedMin +
      Math.random() * (aSymbol.speedMax - aSymbol.speedMin);
  } else {
    speedNewBorn = 0; // by default fixed
  }
  // random y in the min.max range
  yNewBorn =
  aSymbol.yMin + Math.random() * (aSymbol.yMax - aSymbol.yMin);
  // calculate z value
  // if no z info is provided, use default value
  if (!("zAtYMin" in aSymbol) || !("zAtYMax" in aSymbol)) {
    zNewBorn = Z_SYMBOLS_DEFAULT;
  } else {
    // calculate z in function of yNewBorn
    if (aSymbol.yMax == aSymbol.yMin) {
      zNewBorn = aSymbol.zAtYMin;
    } else {
      zNewBorn = Math.round(
        aSymbol.zAtYMin +
          ((yNewBorn - aSymbol.yMin) / (aSymbol.yMax - aSymbol.yMin)) *
            (aSymbol.zAtYMax - aSymbol.zAtYMin)
      );
    }
  }
  // visual horizontal speed of the newBorn entity on the screen
  // speed = kangaroo speed = observer's speed: if >0: make the world move leftwards
  // speedNewBorn = absolute horizontal speed of the newborn (>0 means rightwards)
  // for perspective: further away is slower
  vxNewBorn = calculateVisualSpeed(-speed + speedNewBorn, zNewBorn);
  // calculate x position
  // select a pattern in the list of patterns, if it is available
  // if no list is given, then take a default pattern: only one symbol
  if ("patterns" in aSymbol) {
    // randomly pick a pattern in the list
    pattern =
    aSymbol.patterns[
        Math.floor(Math.random() * aSymbol.patterns.length)
      ];
  } else {
    // default pattern is a single element at relative position {x:0, y:0}
    pattern = [{ x: 0, y: 0 }];
  }
  // calculate the min X offest of the pattern
  xValues = [];
  pattern.forEach(function (subElement) {
    xValues.push(subElement.x);
  });
  patternMinX = Math.min.apply(null, xValues);
  // create at the right side of the world, and even a bit further
  // when a pattern is used which spans on the left side
  xNewBorn = CANVAS_WIDTH - patternMinX; // patternMinX typically negative
  if (aDistance < 0){
    // aDistance is negative, that means pre-populating the world
    // assume a constant speed throughout the past
    timeInThePast = -aDistance / speed; // time in seconds, positive
    xNewBorn += vxNewBorn * timeInThePast; // note that vx is negative
  }
  // do not create the entity if it's too far out of the world on the left
  if (isTooFarOutOfWorld(xNewBorn, vxNewBorn, yNewBorn)) {
    if (DEBUG && 0) {
      console.log(
        "Prepopulate: ",
        aSymbol.components,
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
      var entity = Crafty.e(
        "2D, Canvas, Color, Motion, " +
        aSymbol.components.join()
      )
        .attr({
          x: xNewBorn + subElement.x,
          y: yNewBorn + subElement.y,
          z: zNewBorn,
          vx: vxNewBorn,
        })
        .bind("Move", function (e) {
          // destroy the entity if it has moved too far away on the left or above,
          // and it is not attached to the kangaroo
          if (isTooFarOutOfWorld(this._x + this._w, this.vx, this._y)) {
            isAttachedToKangaroo = false;
            if ( this._parent){ // check first presence of a parent (returns NULL if absent)
              if (this._parent.has("Kangaroo")){
                isAttachedToKangaroo = true;
              }        
            }
            if(!isAttachedToKangaroo) {
              if (DEBUG&&0) {
                console.log(
                  "destroy a " + aSymbol.components + " at x = ",
                  this._x
                );
              }
              this.destroy();
            }
          }
        }); // end of chained calls from Crafty.e()
        // add collision component, only if onHitOn is defined (to reduce workload)
        if ("onHitOn" in aSymbol){
          entity.addComponent("Collision");
          entity.checkHits("Kangaroo");
          entity.bind("HitOn", function (hitDatas) {
            if (DEBUG&&0) {
              console.log("Hit a ", aSymbol.components, " at distance ",Math.round(distance));
            }
            aSymbol.onHitOn(this,hitDatas);
          });
          entity.bind("HitOff", function (componentName) {
            if (DEBUG && 0) {
              console.log("Quit a ", componentName);
            }
            if ("onHitOff" in aSymbol) {
              aSymbol.onHitOff(componentName); // the hitoff returns no hitData, only the componentName
            }
          });
        }
        
        // if at this stage the width is 0, it means that no sprite
        // is available for this symbol; in that case make a 10x10 square
        if (entity.w == 0){
          entity.w = 10;
          entity.h = 10;
          entity.color(aSymbol.color);
        } else {
          // most likely a sprite has been defined
          // define the collision polygon, if the entity has Collision component,
          // and if the custom component of the entity has a polygon defined
          if (entity.has("Collision")){
            firstCustomComponent = aSymbol.components[0];
            if (firstCustomComponent in spritePolygons){
              entity.collision(spritePolygons[firstCustomComponent]);
            }
          }
        }
    });
  }
}

/** Populate the world automatically with some randomness:
 *  give birth to some symbols at the current distance
 *
 */
function populateWorld() {
  symbols.forEach(function (symbol) {
    // set default values for distanceFirst if omitted
    if (!("distanceFirst" in symbol)){
        // immediately schedule the first one at the current distance
        symbol.distanceFirst = distance;
    }
    // we must have reached at least the distance of the next scheduled one
    // but if none schedule yet, schedule it for distanceFirst,
    if (!("distanceNext" in symbol)){
      // it's the first one generated, initialise some dynamic fields
      symbol.continue = true;
      symbol.distanceNext = symbol.distanceFirst;
      if ("message" in symbol){
        // for a message, the distance of birth is the distance where the slowest 
        // cell enters in the Canvas. At this stage, distanceNext represents the
        // next distance where the messgae will be revealed. We need to substract
        // the message expansion to know when the slowest element appears on 
        // screen.
        symbol.distanceNext -= calculateMessageExpansion(symbol);
      }
    }
    // stop if we have reached the distance max for this symbol
    if ("distanceMax" in symbol){
      if (distance > symbol.distanceMax){
        symbol.continue = false;
      }
    }

    // now effectively check that we have reached the next scheduled distance,
    // provided we stll have to continue giving birth to symbols of this kind
    if (symbol.continue && distance >= symbol.distanceNext) {
      if (!("message" in symbol)){
        // Determine all characteristics of the newBorn, and create it
        createSymbol(symbol, distance);
      } else {
        createMessage(symbol, distance);
      }
      // if no interval info is specified: do not schedule a next one
      if (!("distanceIntervalMin" in symbol)){
        symbol.continue = false;
      } else {
        // Schedule the next birth of the same kind, within the specified
        // interval range
        symbol.distanceNext += (symbol.distanceIntervalMin +
        Math.random()*(symbol.distanceIntervalMax - symbol.distanceIntervalMin));
      }
    }
  }); // forEach
}

/**
 * Calculate the distance between the moment the slowest cell enters in the
 * World, and the moment the message is revealed
 * @param {*} aSymbol the message at hand
 */
function calculateMessageExpansion(aSymbol){
  // expansion = visual distance to travel on the screen * speed / visualSpeed
  // where:
  // - distance to travel on the screen = CANVAS_WIDTH - xReveal
  //   (since elements enter by the right side of the canvas)
  // - visualSpeed = visualSpeed of the slowest cell of the message,
  //   i.e. the cell with the lowest Z value (the further away from the observer).
  visualDistance = CANVAS_WIDTH - aSymbol.xReveal;
  zMin = Math.min(aSymbol.zTop, aSymbol.zBottom);
  zMin = zMin - Math.abs(zMin)*MESSAGE_Z_RANDOMNESS_PERCENT / 100; // worst case
  visualSpeed = calculateVisualSpeed(speed, zMin);
  messageExpansion = visualDistance * speed / visualSpeed;
  return (messageExpansion);
}

/**
 * Create a message at a given distance. This message will be revealed at
 * distance + messageExpansion
 * @param {*} aSymbol the symbol describing the message
 * @param {*} aDistance the distance travelled so far. A negative distance means pre-populating
 */
function createMessage(aSymbol, aDistance){
  messageExpansion = calculateMessageExpansion(aSymbol);
  numRows = aSymbol.message.length; // number of rows
  numColumns = aSymbol.message[0].length; // length of string
  for (row = 0; row < numRows; row++) {
    // calculate the y position
    yCell = aSymbol.yTop + (aSymbol.yBottom - aSymbol.yTop) * (row / (numRows - 1));
    for (col = 0; col < numColumns; col++) {
      // create a cell only if the character is not "space"
      if (aSymbol.message[row].charAt(col) != ' '){
      // calculate the x position when the message is revealed (aligned)
      xCellReveal = aSymbol.xReveal + aSymbol.wReveal * (col / (numColumns - 1));
      // calculate the z value in function of y, with some randomness added
      // otherwise the horizontal lines will be too obviously visible
      randomFactor =
        1 -
        MESSAGE_Z_RANDOMNESS_PERCENT / 100 +
        Math.random() * ((2 * MESSAGE_Z_RANDOMNESS_PERCENT) / 100);
      zCell = Math.round(
        randomFactor *
          (aSymbol.zTop +
            ((yCell - aSymbol.yTop) / (aSymbol.yBottom - aSymbol.yTop)) *
              (aSymbol.zBottom - aSymbol.zTop))
      );
      // Now compute the x position at the current distance, to get the message
      // aligned at the requested distance
      vxCell = (-calculateVisualSpeed(speed,zCell));
      timeToReveal = messageExpansion / speed;
      xCell = xCellReveal + timeToReveal * (-vxCell);
      if (aDistance < 0){
        // aDistance is negative, that means pre-populating the world
        // assume a constant speed throughout the past
        timeInThePast = -aDistance / speed; // time in seconds, positive
        xCell += vxCell * timeInThePast; // note that vxCell is negative
      }
      // Now we know all we need to create the entity
      Crafty.e("2D, Canvas, Color, Motion, " +
        aSymbol.components.join())
        .attr({
          x: xCell,
          y: yCell,
          z: zCell,
          w: 10, // will be set by the sprite
          h: 10, // will be set by the sprite
          vx: vxCell,
        })
        .color(aSymbol.color)
        .bind("Move", function (e) {
          // destroy the entity if it has moved too far away on the left border
          if (isTooFarOutOfWorld(this._x + this._w, this.vx, this._y)) {
            if (DEBUG && 0) {
              console.log(
                "destroy a " + aSymbol.components + " at x = ",
                this._x
              );
            }
            this.destroy();
          }
        }); // end of chained calls from Crafty.e()
      }
    }
  }
}

// prepopulate the world (clouds and rocks typically) before starting the game
// simulates a certain play duration in the past
function prePopulateWorld() {
  // Remove any "distanceNext" fields that may remain from a previous run
  // (typically after restarting after a game over)
  symbols.forEach(function (symbol) {
    if ("distanceNext" in symbol){
      delete symbol.distanceNext;
    }
  });

  // Pre-populate the symbols
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

/**
 * Utility function: get a list of attached entities (children) with a given componentName
 * @param {*} entity the entity (parent)
 * @param {*} componentName component name searched for in children
 */
function getAttachedEntities(entity, componentName){
  attachedEntitiesWithGivenComponent = [];
  // For any entity, this._children is the array of its children entity objects (if any),
  // and this._parent is its parent entity object (if any).
  entity._children.forEach( function(childEntity)
  {
    // first check presence of "has" method, because debugging reveals that
    // _children contain two non-entity objects, with "Points"
    if (childEntity.has){
      if (childEntity.has(componentName)){
        attachedEntitiesWithGivenComponent.push(childEntity);
      }
    }
  });
  return (attachedEntitiesWithGivenComponent);
}

/**
 * Attach a bubble(aComponent) to an entity, for a certain duration
 * 
 * @param {*} aEntity 
 * @param {*} aOffsetX 
 * @param {*} aOffsetY 
 * @param {*} aComponent 
 * @param {*} aDuration 
 */
function attachBubble(aEntity, aOffsetX, aOffsetY, aComponent, aDuration){
    // Attach bubble
    var symbol = Crafty.e("2D, Canvas, " + aComponent)
    .attr({
      x: aEntity._x + aOffsetX,
      y: aEntity._y + aOffsetY,
      z: aEntity._z,
    });
    aEntity.attach(symbol);
    // Schedule its destruction
    Crafty.e("Delay").delay(
      function(){
        Crafty(aComponent).destroy();
      },
      aDuration,
      0
    );
}


/**
 * action on hitting a cloud: fly
 * @param {*} aCloudEntity the Cloud entity being hit
 * @param {*} aHitDatas 
 */ 
function onHitOnCloud(aCloudEntityity,aHitDatas) {
  kangarooEntity = aHitDatas[0].obj; // take only the first hit data: this should be the kangaroo
  // only take action when the feet of the Kangaroo are on the cloud, not his head!
  bottomCloud = aCloudEntityity.y + aCloudEntityity.h;
  bottomKangaroo = kangarooEntity.y + kangarooEntity.h;
  if (bottomCloud - bottomKangaroo >= 2){
    kangarooEntity.antigravity(); // fly !
   } else {
     // restart hit detection
     if (DEBUG&&0){console.log("Hit a cloud but not by the feet.")}
     aCloudEntityity.resetHitChecks("Kangaroo");
   }
}

// action on quitting a cloud
function onHitOffCloud(componentName) {
  Crafty(componentName).get(0).gravity(); // start falling again
}

/**
 * Action on hitting a Rock: rebounce (under some conditions)
 * I initially handled the rebound by symply adding "Floor" to the Rock, but then 
 * it does not use the collision polygons to detect landing...
 * @param {*} aRockEntity 
 * @param {*} aHitDatas 
 */
function onHitOnRock(aRockEntity,aHitDatas){
  kangarooEntity = aHitDatas[0].obj; // take only the first hit data: this should be the kangaroo
  // ignore the hit during player control and going up, because
  // player control has priority, and we let the controlled jump go.
  // And only take action when the feet of the Kangaroo are on the rock, not his head!
  bottomRock = aRockEntity.y + aRockEntity.h;
  bottomKangaroo = kangarooEntity.y + kangarooEntity.h;
  if (!(kangarooEntity.playerControl && kangarooEntity.goingUp)
    && bottomRock - bottomKangaroo >= 0){
        kangarooEntity.onLandedOnGround();
   } else {
     // restart hit detection
     if (DEBUG){console.log("Hit a rock but not by the feet, or during player control.")}
     aRockEntity.resetHitChecks("Kangaroo");
   }
}

/**
 * Action on hitting a Scorpion: decrease energy, unless we have boots
 * @param {*} aScorpionEntity 
 * @param {*} aHitDatas 
 */
function onHitOnScorpion(aScorpionEntity,aHitDatas){
  kangarooEntity = aHitDatas[0].obj; // take only the first hit data: this should be the kangaroo
  // At first check if Kang has boots
  if (getAttachedEntities(kangarooEntity, "Boot").length == 0)
  {
    // Attach pain bubble
    attachBubble(kangarooEntity, 11, 26, "Pain", SCORPION_PAIN_SYMBOL_DURATION);
    // decrease energy
    kangarooEntity.energy = Math.max(
        ENERGY_MIN,
        kangarooEntity.energy - SCORPION_ENERGY_DECREMENT);
  }
  else {
    // The kangaroo has boots: crunches the scorpion !
    if (aScorpionEntity.has("Scorpion")){
      aScorpionEntity.removeComponent("Scorpion");
    }
    if (!aScorpionEntity.has("ScorpionCrunched")){
      aScorpionEntity.addComponent("ScorpionCrunched");
    }
    // and stop its absolute speed
    aScorpionEntity.vx = calculateVisualSpeed( -speed, aScorpionEntity._z);
  }
}

/**
 * Action on hitting a cactus.
 * @param {*} aScorpionEntity 
 * @param {*} aHitDatas 
 */
function onHitOnCactus(aCactusEntity,aHitDatas){
  kangarooEntity = aHitDatas[0].obj; // take only the first hit data: this should be the kangaroo

  // check first if this hit is on a new cactus (not previously hit)
  let distanceCactusHit = distance + (aCactusEntity._x - kangarooEntity._x);
  if (Math.abs(distanceCactusHit - distanceLastCactusHit) > MAX_CACTUS_WIDTH ){
    distanceLastCactusHit = distanceCactusHit;

    // If Kang has a protection: remove it and stick it to the cactus.
    // Protections are removed in this order:
    // - CowBoyHat
    // - Sunglasses
    // - Sweater
    // - Short
    // - Boot
    protectionComponents=["CowBoyHat", "Sunglasses", "Sweater", "Short", "Boot"];
    for (let i=0; i<protectionComponents.length; i++){
      attachedProtectionEntities = getAttachedEntities(kangarooEntity, protectionComponents[i]);
      if (attachedProtectionEntities.length > 0){
        break;
      }
    }
    // check if one protection is attached
    if (attachedProtectionEntities.length > 0){
      // Detach the protection from Kang, and stick it to the cactus
      // will be destroyed when isTooFarOutOfWorld() returns true 
      kangarooEntity.detach(attachedProtectionEntities[0]);
      attachedProtectionEntities[0].vx = -speed;
      attachedProtectionEntities[0].x = aCactusEntity._x;
      attachedProtectionEntities[0].y = aCactusEntity._y;
      attachedProtectionEntities[0].z = Z_ATTRIBUTES_LOST;
      // stop detecting collisions to prevent Kang from hitting it again
      attachedProtectionEntities[0].ignoreHits("Kangaroo");
    } else {
      // No protection: ough!! Game over !!
      // Put blood on cactus...
      if (aCactusEntity.has("Cactus")){
        aCactusEntity.toggleComponent("Cactus","CactusHit");
      }
      // attach bubble to Kangaroo
      attachBubble(kangarooEntity, 50, -40, "CactusBubble", CACTUS_BUBBLE_DURATION);
      Crafty.trigger("GameOver",0);
    }
  } else {
    // it's a hit on the same cactus as previously hit: do nothing
  }
}

/**
 * Action on hitting a parasol: fly higher and longer
 * @param {*} aParasolEntity 
 * @param {*} aHitDatas 
 */
function onHitOnParasol(aParasolEntity,aHitDatas){
  kangarooEntity = aHitDatas[0].obj; // take only the first hit data: this should be the kangaroo
  // attach parasol to kangaroo (above his head)
  aParasolEntity.x = kangarooEntity._x + 13;
  aParasolEntity.y = kangarooEntity._y -35;
  aParasolEntity.z = kangarooEntity._z;
  // remove the Motion component since the parasol will now be attached to the kangaroo
  //aParasolEntity.removeComponent("Motion", false); // "false" means hard remove
  // the plan was to re-add this component later on, when we release the parasol.
  // BUT: bug of Crafty? I cannot remove then re-add the "Motion" component.
  // I get an error: "TypeError: can't redefine non-configurable property "vx"" 
  // Therefore I will do it another way... set the vx speed to 0.
  aParasolEntity.vx = 0;
  // attach to the kangaroo
  kangarooEntity.attach(aParasolEntity);
  // freeze the controlled energy: it's the parasol now which carries us!
  kangarooEntity.freezePlayerControlledEnergy();
  // jump to the top of the world
  kangarooEntity.startJump(kangarooEntity._y,PARASOL_JUMP_RATIO);
}

/**
 * Stop parasol effect, typically when releasing the Fire, or when landing
 */
function stopParasolEffect(kangarooEntity){
  // look for parasols
  attachedParasolEntities = getAttachedEntities(kangarooEntity, "Parasol");
  // Remove all parasols (if any) and revert the previous weight
  attachedParasolEntities.forEach( function(parasolEntity)
  {
    // For each parasol:
    // - detach entity from Kangaroo,
    // - make it fly away
    kangarooEntity.detach(parasolEntity);
    parasolEntity.vx = -speed;
    parasolEntity.vy = -10;
    parasolEntity.ay = -20;
    // will be destroyed when isTooFarOutOfWorld() returns true 
  });
  // and revert to normal gravity ratio
  kangarooEntity.gravityRatio = GRAVITY_RATIO_DEFAULT;
}


/**
 * Action on hitting a football:
 * @param {*} aFootballEntity 
 * @param {*} aHitDatas 
 */
function onHitOnFootball(aFootballEntity,aHitDatas){
  // check whether the ball hit a kangaroo, or a goal
  // take only the first hit data: this should be the kangaroo or a goal
  if (aHitDatas[0].obj.has("Kangaroo")){
    // The ball hit a Kangaroo, or better said a Kangaroo hit the ball!
    kangarooEntity = aHitDatas[0].obj;
    // up to now the ball was floating in the sky. Now it's time to apply gravity to it
    aFootballEntity.addComponent("Gravity");
    // shoot the ball
    // aim towards the top of the screen at the right border
    // at low speed we lob, at high speed we shoot straight
    shootPower = 4 * speed;
    yTarget = -150 + speed;
    distanceToTarget = CANVAS_WIDTH - X_KANGAROO;
    absoluteShootSpeedX = shootPower; // absolute speed
    aFootballEntity.vx = absoluteShootSpeedX - speed; // observed speed
    absoluteShootSpeedY = -(aFootballEntity._y - yTarget)*
      Math.abs(absoluteShootSpeedX) / distanceToTarget;
    aFootballEntity.ax = -absoluteShootSpeedX/10;
    aFootballEntity.vy = absoluteShootSpeedY;
    if(DEBUG && 0){
      console.log("shoot: vx=", aFootballEntity.vx," vy=", aFootballEntity.vy, " ax=",aFootballEntity.ax);
    }
    aFootballEntity.gravityConst(300);
    aFootballEntity.gravity("Floor");

    // and activate collision detection with goal, in addition to Kangaroo
    aFootballEntity.checkHits("Kangaroo, Goal");

    // decelerate a lot the ball once landed
    aFootballEntity.one("LandedOnGround", function(){
      this.ax *= 5; // decelerate quicker
      if(DEBUG && 0){
        console.log("football decelerates: vx=", this.vx," vy=", this.vy, " ax=",this.ax);
      }
    });

    // set the origin for rotation
    aFootballEntity.origin("center");
    ballRadius = (aFootballEntity.w+1) / 2;
    aFootballEntity.bind("EnterFrame", function(){
      // stop the acceleration when the ball has reached a still stand
      // (i.e. its vx is quasi equal to -speed), otherwise the ball
      // starts moving backwards
      absoluteBallSpeed = this.vx + speed;
      if ( Math.abs(absoluteBallSpeed) < 10) {
        // glue to ground
        this.vx = -speed;
        this.ax = 0; // stop acceleration
        this.unbind("EnterFrame");
        // CAUTION: If I use UpdateFrame instead of EnterFrame, it does not work: the ball
        // stops and does not move anymore on the screeen
      }
      else {
        // make the ball roll
        if (this.motionDelta().y != 0){
          // if in the air (still moving about y axis): roll in function of x move, but not too much
          this.rotation += this.motionDelta().x;
        } else { 
          // if on the ground: roll on the ground
          absoluteMotionX = this.motionDelta().x + speed/Crafty.timer.FPS();
          this.rotation += (absoluteMotionX / (2 * Math.PI * ballRadius) * 360);
        }
      }
    });

  } else if (aHitDatas[0].obj.has("Goal")){
    goalEntity = aHitDatas[0].obj;
    // the ball hit a goal: bingo!!
    // glue the ball to the goal
    aFootballEntity.antigravity();
    aFootballEntity.resetMotion();
    aFootballEntity.vx = -speed;
    
    // Attach goal bubble to kangaroo
    attachBubble(kangarooEntity, 50, -40, "GoalBubble", GOAL_BUBBLE_DURATION);

    // Attach goal text to the goal
    attachBubble(goalEntity, -10, -30, "GoalText", GOAL_BUBBLE_DURATION);
 
    // and increase energy
    kangarooEntity.energy += GOAL_ENERGY_INCREMENT
  }
}


/**
 * Action on hitting a chilli: accelerate by 1kph
 * @param {*} aChilliEntity 
 * @param {*} aHitDatas 
 */
function onHitOnChilli(aChilliEntity,aHitDatas){
  kangarooEntity = aHitDatas[0].obj; // take only the first hit data: this should be the kangaroo
  // accelerate by 1kph
  // convert one kph into speed in pixels/second
  oneKph = PIXELS_PER_METER*1000 / (60*60);
  newSpeed = Math.sign(speed)*(Math.abs(speed) + oneKph);
  multiplicationFactor = newSpeed / speed;
  changeSpeed(multiplicationFactor);
  // and make the chilli disappear (fly away)
  aChilliEntity.vy = -60;
  aChilliEntity.ay = -100;
  // will be destroyed when isTooFarOutOfWorld() returns true

  // Attach bubble to kangaroo
  attachBubble(kangarooEntity, 50, -40, "ChilliBubble", CHILLI_BUBBLE_DURATION);
}

/**
 * Action on hitting a cauliflower: decelerate by 1kph
 * @param {*} aCauliflowerEntity 
 * @param {*} aHitDatas 
 */
function onHitOnCauliflower(aCauliflowerEntity,aHitDatas){
  kangarooEntity = aHitDatas[0].obj; // take only the first hit data: this should be the kangaroo
  // decelerate by 1kph
  // convert one kph into speed in pixels/second
  oneKph = PIXELS_PER_METER*1000 / (60*60);
  // decelerate only if we are >= min speed
  if (Math.abs(speed) >= SPEED_MIN){
    newSpeed = Math.sign(speed)*(Math.abs(speed) - oneKph);
    multiplicationFactor = newSpeed / speed;
    changeSpeed(multiplicationFactor);

    // Attach bubble to kangaroo
    attachBubble(kangarooEntity, 50, -40, "CauliflowerBubble", CAULIFLOWER_BUBBLE_DURATION);
  }
  // and make the cauliflower disappear (fly away)
  aCauliflowerEntity.vy = -60;
  aCauliflowerEntity.ay = -100;
  // will be destroyed when isTooFarOutOfWorld() returns true
}

/**
 * Action on hitting an attribute: attach to kangaroo
 * 
 * @param {*} aAttributeEntity 
 * @param {*} aHitDatas 
 * @param {*} aComponent component name
 * @param {*} xOffset offset for attaching to kangaroo
 * @param {*} yOffset offset for attaching to kangaroo
 */
function onHitOnAttribute(aAttributeEntity,aHitDatas,aComponent,xOffset,yOffset){
  kangarooEntity = aHitDatas[0].obj; // take only the first hit data: this should be the kangaroo
  // do action only if this attribute is not yet attached to kangaroo
  attachedAttributeEntities = getAttachedEntities(kangarooEntity, aComponent);
  if (attachedAttributeEntities.length == 0){
    // attach to kangaroo
    aAttributeEntity.x = kangarooEntity._x + xOffset;
    aAttributeEntity.y = kangarooEntity._y + yOffset;
    // stop horizontal motion
    aAttributeEntity.vx = 0;
    // attach to the kangaroo
    kangarooEntity.attach(aAttributeEntity);
  }
}


/**
 * Action on hitting a hamburger: add energy
 * @param {*} aHamburgerEntity 
 * @param {*} aHitDatas 
 */
function onHitOnHamburger(aHamburgerEntity,aHitDatas){
  kangarooEntity = aHitDatas[0].obj; // take only the first hit data: this should be the kangaroo

  // eat the hamburger
  if (aHamburgerEntity.has("Hamburger")){
    aHamburgerEntity.toggleComponent("Hamburger", "HamburgerHit");

    // increase energy by a good deal of kCalories
    kangarooEntity.energy += HAMBURGER_ENERGY_INCREMENT;

    // Attach bubble to kangaroo
    attachBubble(kangarooEntity, 50, -40, "HamburgerBubble", HAMBURGER_BUBBLE_DURATION);
  }
}

/**
 * Action on hitting friends: finish!!
 * @param {*} aFriendsEntity 
 * @param {*} aHitDatas 
 */
function onHitOnFriends(aFriendsEntity,aHitDatas){
  kangarooEntity = aHitDatas[0].obj; // take only the first hit data: this should be the kangaroo

  // Finish the game: it's a Win !!
  Crafty.trigger("GameWon",0);
}

/**
 * show message at the end: either game over or game won,
 * stop the game, and restart on click
 * 
 * @param {*} aText 
 * @param {*} aColor 
 */
function stopTheGame(aText,aColor){
  Crafty.trigger("GamePaused",0);
  // Show message, and restart on click or press space bar
  Crafty.e("2D, Canvas, Text, Mouse, Keyboard")
    .attr({
      x: CANVAS_WIDTH/4,
      y: CANVAS_HEIGHT/4,
      w: CANVAS_WIDTH/3,
      h: CANVAS_HEIGHT/3,
      z: Z_GAME_OVER,
    })
    .text(aText)
    .textColor(aColor)
    .textFont({size: '60px', weight: 'bold'});
  
  // button taking the entire available area
  Crafty.e("2D, Canvas, Mouse")
    .attr({
      x: 0,
      y: 0,
      w: available_width, //CANVAS_WIDTH,
      h: available_height,//CANVAS_HEIGHT,
      z: Z_GAME_OVER,
    })
    .bind("MouseDown", function (MouseEvent) {
      // restart the game, and unpause
      Crafty.trigger("GamePaused");
      Crafty.scene("main");
    })
    .bind("KeyDown", function (e){
      if (e.key == Crafty.keys.SPACE){
        // restart the game, and unpause
        Crafty.trigger("GamePaused");
        Crafty.scene("main");
      }
    });
}


// ***********************************************
// game logic
// ***********************************************

Crafty.c("KangarooPlayer", {
  
  required: "2D, Jumper, Gravity, Keyboard, Collision",
  
  init: function () {
    // exported properties. By defining them this way in the init
    // method, they will not be shared: they will be unique per
    // KangarooPlayer.
    // We could also really use "properties", but that seems overkill
    this.yAtLiftOff = Y_FLOOR; // y when last jump was started
    this.timeAtLiftOff = 0; // time of last jump start
    this.yPrevious = Y_FLOOR; // y at the previous frame
    this.goingUp = false; // true if we are going up
    this.energy = ENERGY_START; // energy reserve
    this.currentTargetHeight = 0; // target height of the current jump
    this.currentJumpSpeed = 0; // jump speed used at the start of the current jump
    this.currentGravity = 500; // current gravity used, will be recalculated at each jump
    this.gravityRatio = GRAVITY_RATIO_DEFAULT; // defines the shape of the jump
    this.currentPlayerJump = false; // true if the current jump was triggered by the player, false if it's a  default jump
    this.playerJumpRequestLatched = false; // true if the player requested a jump
    this.playerJumpRequestLatchTime = 0; // time of the request
    this.playerControl = false; // true while the player presses the fire key or button
    this.playerControlledEnergy = 0; // energy requested by controlled jump
    this.playerControlledEnergyFrozen = false; // freeze used energy (ex when hitting a parasol)
    this.timeOfLastLanding = 0; // time of last lading on ground
    // init operations
    this.gravityConst(this.currentGravity);
    this.gravity("Floor"); // the "Floor" component blocks the fall
    this.preventGroundTunneling(true); // Prevent entity from falling through thin ground entities at high speeds.
    this.collision(spritePolygons["Kangaroo"]);
  },

  properties: {
    // weight <1: lighter: will jump higher; >1: heavier
    // we use a property to take immediate action when hitting an object that impacts the weight
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
          if (this.currentGravity > GRAVITY_MAX){
            this.currentGravity = GRAVITY_MAX;
          }
          this._weight = value; // update the private variable
          this.gravity(); // re-enable gravity if it was stopped by antigravity
          this.gravityConst(this.currentGravity);
          if(DEBUG){console.log("weight = ", this._weight," gravity = ", this.currentGravity );}
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
      //this.color("red");
    },
    // checkJumping: triggered when a jump is requested
    CheckJumping: function (ground) {
      this.canJump = true; // always allow jump, even double-jump
    },
    LandedOnGround: function (ground) {
      this.onLandedOnGround();
    },
    Rebounce: function (aEntity) {
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

      // increase the energy, only in case of default jump, and if going down
      // kind of "gain potential energy". If we were going up, it typically means
      // that we are climbing rocks and we hit the next rock in the rising phase
      // of the jump. In that case, do not increase the energy. Otherwise, since this
      // occurs several times in a row when climbing a rock arch, the energy is 
      // far too quickly and easily increased.
      if (!this.currentPlayerJump) {
        // we started a default jump
        if (!this.goingUp){
          // and we were going down:
          // increase the energy until some limit
          if (this.energy < ENERGY_MAX_FOR_GAIN_ON_LANDING) {
            this.energy += ENERGY_GAIN_ON_LANDING;
          }
        }
      }

      // Make a new jump (rebounce)
      if (this.currentPlayerJump) {
        // the new jump is requested by the player
        // use the full energy reserve at start of jump, divided by the weigth
        // (if we are heavier, we'll not jump as high)
        // and limited to the top of the screen, not higher
        this.currentTargetHeight = Math.min(this.energy / this.weight,this.y);
        this.playerControl = true;
      } else {
        // the new jump is a default jump
        // in case the energy has been decreased below the default jump,
        // the jump will be smaller
        this.currentTargetHeight = Math.min(ENERGY_DEFAULT_JUMP, this.energy);
        this.playerControl = false;
      }
      this.startJump(this.currentTargetHeight, JUMP_RATIO_DEFAULT);

      // indicate that we are going up
      this.yAtLiftOff = this._y;
      this.timeAtLiftOff = new Date().getTime();
      this.goingUp = true;
    },
    UpdateFrame: function (eventData) {
      this.checkPeakReached();
      this.updatePlayerControlledEnergy();
    },
    PeakReached: function (peakHeight) {
      // when peak reached we can do special actions,
      // like disable gravity ("flying!") or increase gravity
      // (sudden fall)
      if (DEBUG&&0) {
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
      // fall quicker (we fall quicker than we rise, to give a more natural feeling)
      this.startFall();
    },
  }, // end of events
  // start of methods
  onLandedOnGround: function(){
    // Stop parasol effect, if active
    stopParasolEffect(this);
    // Stop player control, if active
    this.stopPlayerControl();

    this.timeOfLastLanding = new Date().getTime(); // milliseconds
    // rebounce after a short delay, to leave a bit
    // of time for the player to fire the jump
    Crafty.e("Delay").delay(
      this.triggerRebounce, 
      // for some reason I cannot call directly this.rebounce here
      // there is something I don't get, for "this"...
      ACCEPTANCE_DELAY_AFTER_LANDING,
      0
    );
  },
  startJump: function (aTargetHeight, aJumpRatio) {
    // introduce some randomness in the jump height
    randomFactor =
      1 -
      JUMP_RANDOMNESS_PERCENT / 100 +
      Math.random() * ((2 * JUMP_RANDOMNESS_PERCENT) / 100);
    heightOfJump = aTargetHeight * randomFactor;
    distanceOfJump = heightOfJump / aJumpRatio;
    [initialJumpSpeed, gravity] = calculateJump(heightOfJump, distanceOfJump, this.gravityRatio);
    if (DEBUG&&0) {
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
  startFall: function() {
    // Check if the kangaroo has a parasol
    if (getAttachedEntities(this, "Parasol").length > 0){
      // if yes: apply the parasol "fall" gravity
      this.currentGravity = PARASOL_GRAVITY_FALL;
    } else {
      //  start falling down by increasing the gravity
      this.currentGravity *= this.gravityRatio;
      if (this.currentGravity > GRAVITY_MAX){
        this.currentGravity = GRAVITY_MAX;
      }
    }

    this.gravityConst(this.currentGravity);
    if(DEBUG){console.log("in startFall: new gravity = ", this.currentGravity);}
  },
  fallQuicker: function () {
    // precipitate the fall, using a constant gravity
    this.currentGravity = GRAVITY_FAST_FALL;
    this.gravityConst(this.currentGravity);
  },
  freezePlayerControlledEnergy: function(){
    // freeze the controlled energy, if we are in a controlled jump
    if (this.playerControl){
      this.playerControlledEnergyFrozen = true;
    }
  },
  updatePlayerControlledEnergy: function(){
    // continuously update the energy requested by user controlled jump,
    // while the user keeps pressing "Fire"
    // we do this continuously, to be able to observe it in the energy bar
    if (this.playerControl && this.goingUp && !this.playerControlledEnergyFrozen) {
        this.playerControlledEnergy = (this.yAtLiftOff - this._y) * this.weight;
      }
  },
  checkPeakReached: function () {
    // Check if we reached the peak and start going down
    if (this._y >= this.yPrevious && this.goingUp) {
      // we reached the peak, we start going down
      this.goingUp = false;
      peakHeight = this.yAtLiftOff - this._y;
      Crafty.trigger("PeakReached", peakHeight);
    }
    this.yPrevious = this._y;
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
        altitudeFromLiftOff = this.yAtLiftOff - this._y;
        newTargetAltitude = this.energy / this.weight;
        if (newTargetAltitude > altitudeFromLiftOff) {
          // the jump becomes a player jump
          this.currentPlayerJump = true;
          // start player-controlled jump
          this.playerControl = true;
          // and "re-jump" towards the new target
          this.currentTargetHeight = newTargetAltitude;
          this.startJump(this.currentTargetHeight - altitudeFromLiftOff, JUMP_RATIO_DEFAULT);
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
    // Use also the "FIRE" to release a parasol, if we are not (anymore)
    // controlling the jump. If we are controlling the jump, then releasing
    // the FIRE button releases the parasol. Here, we also want to enable
    // the user to release the parasol.
    if (!this.playerControl && 
        getAttachedEntities(this, "Parasol").length > 0){
          stopParasolEffect(this);
          this.fallQuicker();
        }
  },
  stopPlayerControl: function(){
    // if effectively a player control was ongoing: stop it
    if (this.playerControl) {
      // stop the control
      this.playerControl = false;
      // consume the energy
      // remove the used energy
      // and keep at least enough energy for a default jump
      this.energy = Math.max(
        this.energy - this.playerControlledEnergy,
        ENERGY_DEFAULT_JUMP);
      // consume the player controlled energy
      this.playerControlledEnergy=0;
      // and make sure it is not frozen
      this.playerControlledEnergyFrozen= false;
      // fall quicker
      this.fallQuicker();
    }
  },
  onPlayerJumpStopRequest: function () {
    // if a jump request was latched (ie jump not yet started)
    // then the latched request is discarded
    if (this.playerJumpRequestLatched) {
      this.playerJumpRequestLatched = false;
    }
    else {
      // Stop parasol effect, if active
      stopParasolEffect(this);
      // if effectively a player control was ongoing: stop it
      // Note that this must be called after stopping the parasol effect,
      // to make sure that the default gravity ratio is used, and not the
      // parasol one. This way, we fall quicker when releasing the Fire button
      this.stopPlayerControl();
    }
  },
  triggerRebounce: function () {
    Crafty.trigger("Rebounce", this);
  },
}); // end of Kangaroo component

Crafty.bind("KeyDown", function (e) {
  // test game actions
  if (DEBUG) {
    if ((e.key == Crafty.keys.ADD) ||
        (e.key == Crafty.keys.RIGHT_ARROW)){
      // '+' in numeric keypad
      // increase speed
      changeSpeed(1.1);
      console.log("speed = ", speed);
    } else if ((e.key == Crafty.keys.SUBSTRACT) ||
               (e.key == Crafty.keys.LEFT_ARROW)){
      // - on numpad
      // decrease speed
      changeSpeed(0.9);
      console.log("speed = ", speed);
    } else if ((e.key == Crafty.keys.MULTIPLY)  ||
               (e.key == Crafty.keys.DOWN_ARROW)){
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

  // update trace of Kangaroo, every X frames
  if (eventData.frame % TRACE_FRAME_STEP == 0) {
    updateTraces();
  }

  // populate the world
  if (distance - distanceLastPopulate > POPULATE_WORLD_DISTANCE_STEP) {
    distanceLastPopulate = distance;
    populateWorld();
  }
});

Crafty.bind("GameOver", function (eventData){
  stopTheGame("GAME OVER", "red");
});

Crafty.bind("GameWon", function (eventData){
  stopTheGame("TROP FORT", "chocolate");
});

Crafty.bind("GamePaused", function (eventData){
  pauseButtonImage.toggleComponent("PauseButton, PlayButton");
  // Force a redraw of the pause button after toggle
  // Without this call, the impage of the button is not refreshed when pausing
  Crafty.trigger("RenderScene");
  Crafty.pause();
});

Crafty.scene("main", function () {
  Crafty.timer.FPS(TARGET_FRAMES_PER_SECOND);
  if (resizeMode == RESIZE_BY_CRAFTY) { 
    Crafty.viewport.scale(viewportScale);
  }
  startTime = new Date().getTime();
  distance = 0;
  distanceLastPopulate = distance;
  distanceLastCactusHit = distance;
  speed = SPEED_START;
  drawWorld();
  drawLeftPanel();
  drawFooter();
  if (resizeMode == RESIZE_BY_TRANSFORM) { 
    resizeMouseAreas();
  }
});


