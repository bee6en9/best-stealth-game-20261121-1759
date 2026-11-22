// The thief: a hooded figure who walks, sneaks, and gets caught. Movement is
// keyboard only (WASD / arrows, Shift to sneak). Three lives; a catch costs one
// and sends the thief back to the garden door.

import { LIVES, PLAYER } from './config.js';
import { PLAYER_START, inGate, moveCircle } from './world.js';

export function makePlayer() {
  return {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    /** The shared detection meter, 0..1 — guards fill it, hiding drains it. */
    meter: 0,
    lives: LIVES,
    sneaking: false,
    moving: false,
    /** Time since the last footstep sound, so steps tick at a steady pace. */
    stepTimer: 0,
    /** Which way the thief faces, for the cloak and scarf. */
    faceX: 1,
    faceY: 0,
  };
}

export function resetPlayer(player) {
  player.x = PLAYER_START.x;
  player.y = PLAYER_START.y;
  player.meter = 0;
  player.sneaking = false;
  player.moving = false;
  player.stepTimer = 0;
  player.faceX = 1;
  player.faceY = 0;
}

/**
 * Move the thief for one step. Returns 'step' when a footstep should sound,
 * 'gate' when the thief reaches the exit, otherwise null.
 */
export function stepPlayer(world, player, dir, sneak, dt) {
  player.sneaking = sneak;
  player.moving = dir.x !== 0 || dir.y !== 0;
  if (player.moving) {
    player.faceX = dir.x;
    player.faceY = dir.y;
    const speed = sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    moveCircle(world, player, PLAYER.radius, dir.x * speed * dt, dir.y * speed * dt);
    player.stepTimer -= dt;
    const interval = sneak ? 0.55 : 0.34;
    if (player.stepTimer <= 0) {
      player.stepTimer = interval;
      return 'step';
    }
  } else {
    player.stepTimer = 0;
  }
  if (inGate(world, player.x, player.y)) return 'gate';
  return null;
}
