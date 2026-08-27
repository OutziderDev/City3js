// City grid
export const GRID_SIZE = 6;
export const BLOCK_SIZE = 40;
export const ROAD_WIDTH = 12;
export const SIDEWALK_WIDTH = 3;
export const SIDEWALK_HEIGHT = 0.3;

// Buildings
export const MIN_FLOORS = 3;
export const MAX_FLOORS = 10;
export const FLOOR_HEIGHT = 3.5;
export const WINDOW_ROWS_PER_FLOOR = 2;
export const WINDOW_COLS_PER_SIDE = 3;
export const BUILDING_COLORS = [
  0x8899aa, 0x7788aa, 0x667799, 0x99aabb, 0xaabbcc,
  0x889999, 0x7799aa, 0x668899, 0x88aacc, 0x99bbdd
];

// Cars
export const CAR_COUNT = 30;
export const CAR_LENGTH = 4;
export const CAR_WIDTH = 2;
export const CAR_HEIGHT = 1.4;
export const CAR_SPEEDS = [6, 8, 10, 12, 14];
export const CAR_COLORS = [
  0xff3333, 0x3366ff, 0xffffff, 0x222222, 0xffcc00,
  0x33cc33, 0xff6600, 0x9933cc, 0x00cccc, 0xcc6699
];

// People
export const PERSON_COUNT = 40;
export const PERSON_HEIGHT = 1.6;
export const PERSON_SPEEDS = [1.5, 2.0, 2.5, 3.0, 3.5];
export const PERSON_COLORS = [
  0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181,
  0xaa96da, 0xfcbad3, 0xa8d8ea, 0xffd3b6, 0xd4a5a5
];

// Traffic lights
export const GREEN_DURATION = 5;
export const YELLOW_DURATION = 1;
export const RED_DURATION = 5;

// Day/Night cycle
export const DAY_CYCLE_SPEED = 0.003;
export const DAY_DURATION = 120;

// Buses
export const BUS_LENGTH = 8;
export const BUS_WIDTH = 2.5;
export const BUS_HEIGHT = 2.8;
export const BUS_SPEED = 8;
export const BUS_LIFETIME_MIN = 30;
export const BUS_LIFETIME_MAX = 60;
export const BUS_SPAWN_INTERVAL_MIN = 20;
export const BUS_SPAWN_INTERVAL_MAX = 45;
export const BUS_MAX_ACTIVE = 3;
export const BUS_COLORS = [
  0xffcc00, 0x2255aa, 0xcc2222, 0x22aa44, 0xffffff
];

// Road directions
export const DIR_POS_X = 0;
export const DIR_NEG_X = 1;
export const DIR_POS_Z = 2;
export const DIR_NEG_Z = 3;

// Weather
export const RAIN_EVENT_INTERVAL_MIN = 120;
export const RAIN_EVENT_INTERVAL_MAX = 300;
export const RAIN_DURATION_MIN = 60;
export const RAIN_DURATION_MAX = 120;
export const RAIN_INTENSITY = 1.5;
export const CLOUD_COUNT = 12;
export const CLOUD_SPEED = 8;
export const RAIN_PARTICLE_COUNT = 3000;
export const RAIN_TRANSITION_DURATION = 10;
