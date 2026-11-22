// Every tuning number and colour in one place. The garden is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Thickness of the garden's outer wall. */
export const WALL = 24;

export const PLAYER = {
  radius: 13,
  walkSpeed: 165,
  sneakSpeed: 88,
  /** How close a guard must be to hear running footsteps. */
  hearRadius: 150,
  /** How close a guard must be to hear sneaking footsteps. */
  hearSneakRadius: 55,
};

export const GUARD = {
  radius: 14,
  /** Half of the vision cone, in radians (~35 degrees each side). */
  coneHalfAngle: 0.61,
  coneRange: 185,
  /** Cone range while the player stands in lamplight. */
  coneRangeLit: 245,
  /** Cone range while the player hides in a shadow pool. */
  coneRangeShadow: 130,
  /** Detection meter (0..1) fill per second while the player is seen. */
  detectRate: 0.55,
  detectRateLit: 1.0,
  detectRateShadow: 0.3,
  detectRateSneak: 0.6,
  detectDrain: 0.35,
  /** Meter at which a guard gets suspicious and investigates. */
  suspiciousAt: 0.35,
  /** Seconds a guard keeps chasing after losing sight. */
  giveUpAfter: 4,
  chaseSpeed: 195,
  investigateSpeed: 130,
  catchRadius: 26,
};

export const LIVES = 3;

/**
 * One garden, three nights. Level 1 is the layout below; later levels reuse it with
 * faster patrols, an extra guard and extra lamps, so routes learned early stay useful.
 */
export const LEVELS = [
  {
    name: 'Night One',
    guardSpeed: 72,
    guards: [
      { waypoints: [[500, 200], [800, 200], [800, 420], [500, 420]] },
      { waypoints: [[880, 560], [1200, 560]] },
      { waypoints: [[600, 100], [1100, 100]] },
    ],
    lamps: [[460, 180], [900, 200], [300, 560], [1080, 120]],
  },
  {
    name: 'Night Two',
    guardSpeed: 90,
    guards: [
      { waypoints: [[500, 200], [800, 200], [800, 420], [500, 420]] },
      { waypoints: [[880, 560], [1200, 560]] },
      { waypoints: [[600, 100], [1100, 100]] },
      { waypoints: [[300, 640], [840, 640]] },
    ],
    lamps: [[460, 180], [900, 200], [300, 560], [1080, 120], [700, 420]],
  },
  {
    name: 'Night Three',
    guardSpeed: 108,
    guards: [
      { waypoints: [[500, 200], [800, 200], [800, 420], [500, 420]] },
      { waypoints: [[880, 560], [1200, 560]] },
      { waypoints: [[600, 100], [1100, 100]] },
      { waypoints: [[300, 640], [840, 640]] },
      { waypoints: [[150, 300], [150, 600]] },
    ],
    lamps: [[460, 180], [900, 200], [300, 560], [1080, 120], [700, 420], [180, 320]],
  },
];

export const PALETTE = {
  backdrop: '#0b0e1a',
  lawn: '#131a26',
  lawnDark: '#0f1522',
  path: '#3a3f4d',
  pathEdge: '#2c3140',
  wall: '#232838',
  wallTop: '#31374d',
  hedge: '#1d5c46',
  hedgeDark: '#144233',
  hedgeLight: '#2a7a5e',
  crate: '#5a4632',
  crateDark: '#41321f',
  shadow: '#05070d',
  lampGlow: '#f7b733',
  lampCore: '#ffe9a8',
  cone: '#f7c948',
  guard: '#a63a3a',
  guardDark: '#7c2a2a',
  player: '#232838',
  scarf: '#e8e4d8',
  gate: '#ffd76a',
  gateDark: '#b98a1e',
  text: '#eef1f5',
  muted: '#9aa3b5',
  danger: '#e5534b',
  panel: '#171c2b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
