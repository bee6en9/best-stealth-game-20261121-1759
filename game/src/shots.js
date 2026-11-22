// The screenshot scenes behind ?shot=start|play|near-exit. Each one poses the
// real game — the real garden, the real guards, the real renderer — at a fixed
// moment, so the same seed always gives the same frame:
//   start     — the title screen over the garden, guards on their routes.
//   play      — mid-level: the thief sneaks behind a hedge while a guard's cone
//               sweeps just past them, detection half full.
//   near-exit — the thief one step from the glowing gate, a guard's cone behind.

import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Place the thief and the guards for a named scene, on a fresh level 0. */
export function stageShot(name, game) {
  game.resetLevel(0);
  if (name === 'play') {
    // Crouched behind the long hedge, a guard's cone sweeping past.
    game.player.x = 330;
    game.player.y = 250;
    game.player.sneaking = true;
    game.player.faceX = 0;
    game.player.faceY = -1;
    game.player.meter = 0.45;
    const guard = game.guards[0];
    guard.x = 500;
    guard.y = 200;
    guard.facing = -2.8;
    game.elapsed = 47;
    game.detections = 1;
    game.screen = SCREEN_PLAY;
    return;
  }
  if (name === 'near-exit') {
    // One step from the glowing gate, a guard's cone behind.
    game.player.x = 1108;
    game.player.y = 75;
    game.player.sneaking = true;
    game.player.faceX = 1;
    game.player.faceY = 0;
    game.player.meter = 0.15;
    const guard = game.guards[2];
    guard.x = 1000;
    guard.y = 100;
    guard.facing = Math.PI;
    game.elapsed = 96;
    game.detections = 2;
    game.screen = SCREEN_PLAY;
    return;
  }
  // Anything else is the title screen.
  game.screen = SCREEN_TITLE;
  game.elapsed = 0;
}
