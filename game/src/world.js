// The garden: walls, hedges, crates, shadow pools, lamps and the exit gate.
// Everything here is fixed data for a level — no randomness — so the same seed
// always renders the same garden. Walls and hedges block movement and sight;
// crates block movement and sight; shadow pools hide the player; lamplight pools
// are danger zones where guards see further.

import { FIELD, WALL, LEVELS } from './config.js';

/** Rectangles that block movement and line of sight. */
function rect(x, y, width, height) {
  return { x, y, width, height };
}

/** The garden's fixed furniture, shared by all three nights. */
const WALLS = [
  rect(420, 120, 24, 300), // manor wing, west
  rect(700, 480, 300, 24), // low wall, south-east
  rect(860, 120, 24, 180), // manor wing, east
];

const HEDGES = [
  rect(120, 180, 240, 28),
  rect(520, 150, 240, 28),
  rect(180, 480, 240, 28),
  rect(940, 380, 240, 28),
  rect(560, 560, 80, 28),
];

const CRATES = [
  rect(480, 260, 40, 40),
  rect(520, 260, 40, 40),
  rect(880, 620, 40, 40),
  rect(700, 340, 40, 40),
];

/** Dark circles where the player is harder to spot. */
const SHADOWS = [
  { x: 300, y: 360, r: 80 },
  { x: 760, y: 220, r: 70 },
  { x: 1060, y: 460, r: 90 },
  { x: 620, y: 620, r: 70 },
];

/** Where the thief starts, bottom-left by the garden door. */
export const PLAYER_START = { x: 80, y: 640 };

/** The glowing gate: reach it unseen to finish the night. */
export const GATE = rect(1150, 36, 106, 74);

/** Lamp radius: the warm pool of light around each post. */
export const LAMP_RADIUS = 120;

/** Build the world for a level index (0, 1 or 2). */
export function buildWorld(levelIndex) {
  const level = LEVELS[levelIndex];
  return {
    levelIndex,
    level,
    walls: WALLS,
    hedges: HEDGES,
    crates: CRATES,
    shadows: SHADOWS,
    lamps: level.lamps.map(([x, y]) => ({ x, y, r: LAMP_RADIUS })),
    gate: GATE,
  };
}

/** Every rectangle that blocks movement. */
export function solidRects(world) {
  return [...world.walls, ...world.hedges, ...world.crates];
}

/** Every rectangle that blocks a guard's line of sight. */
export function sightBlockers(world) {
  return [...world.walls, ...world.hedges, ...world.crates];
}

/** True when the point is inside the outer wall or any solid rectangle. */
export function hitsSolid(world, x, y, radius) {
  if (x - radius < WALL || x + radius > FIELD.width - WALL) return true;
  if (y - radius < WALL || y + radius > FIELD.height - WALL) return true;
  for (const r of solidRects(world)) {
    if (circleHitsRect(x, y, radius, r)) return true;
  }
  return false;
}

/** Circle-vs-rectangle test, used for movement collision. */
export function circleHitsRect(cx, cy, radius, r) {
  const nearestX = Math.max(r.x, Math.min(cx, r.x + r.width));
  const nearestY = Math.max(r.y, Math.min(cy, r.y + r.height));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

/**
 * Move a circle by (dx, dy) one axis at a time, so it slides along walls
 * instead of sticking to corners.
 */
export function moveCircle(world, pos, radius, dx, dy) {
  const nextX = pos.x + dx;
  if (!hitsSolid(world, nextX, pos.y, radius)) pos.x = nextX;
  const nextY = pos.y + dy;
  if (!hitsSolid(world, pos.x, nextY, radius)) pos.y = nextY;
}

/** True when the point lies inside any shadow pool. */
export function inShadow(world, x, y) {
  for (const s of world.shadows) {
    const dx = x - s.x;
    const dy = y - s.y;
    if (dx * dx + dy * dy < s.r * s.r) return true;
  }
  return false;
}

/** True when the point lies inside any lamplight pool. */
export function inLamplight(world, x, y) {
  for (const lamp of world.lamps) {
    const dx = x - lamp.x;
    const dy = y - lamp.y;
    if (dx * dx + dy * dy < lamp.r * lamp.r) return true;
  }
  return false;
}

/** True when the point is inside the exit gate. */
export function inGate(world, x, y) {
  const g = world.gate;
  return x > g.x && x < g.x + g.width && y > g.y && y < g.y + g.height;
}

/** Segment-vs-rectangle test for line of sight. */
function segmentHitsRect(x1, y1, x2, y2, r) {
  // Quick reject: both ends on the same outside side.
  if (x1 < r.x && x2 < r.x) return false;
  if (x1 > r.x + r.width && x2 > r.x + r.width) return false;
  if (y1 < r.y && y2 < r.y) return false;
  if (y1 > r.y + r.height && y2 > r.y + r.height) return false;
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  const edges = [
    [r.x, r.y, r.x + r.width, r.y],
    [r.x + r.width, r.y, r.x + r.width, r.y + r.height],
    [r.x + r.width, r.y + r.height, r.x, r.y + r.height],
    [r.x, r.y + r.height, r.x, r.y],
  ];
  for (const [ax, ay, bx, by] of edges) {
    if (segmentsCross(x1, y1, x2, y2, ax, ay, bx, by)) return true;
  }
  return false;
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
}

function segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = cross(x3, y3, x4, y4, x1, y1);
  const d2 = cross(x3, y3, x4, y4, x2, y2);
  const d3 = cross(x1, y1, x2, y2, x3, y3);
  const d4 = cross(x1, y1, x2, y2, x4, y4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function cross(x1, y1, x2, y2, x3, y3) {
  return (x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1);
}

/** True when nothing blocks the view between two points. */
export function hasLineOfSight(world, x1, y1, x2, y2) {
  for (const r of sightBlockers(world)) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return false;
  }
  return true;
}
