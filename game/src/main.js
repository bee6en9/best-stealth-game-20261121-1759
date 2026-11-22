// LAMPLIGHT: the game loop, screens and scoring. A fixed-step simulation (60
// updates a second) drives the world; the renderer draws it. Query params:
//   ?shot=start|play|near-exit&seed=1 — freeze a deterministic screenshot scene.
//   ?seed=N — the seed (the garden is fixed data, so any seed renders the same).

import { FIELD, LIVES, STEP } from './config.js';
import { buildWorld } from './world.js';
import { makeGuard, stepGuard } from './guards.js';
import { makePlayer, resetPlayer, stepPlayer } from './player.js';
import * as audio from './audio.js';
import { draw, SCREEN_OVER, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { endFrame, installInput, moveDirection, sneaking, wasPressed } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const ctx = canvas.getContext('2d');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? 1) || 1;
void seed; // The garden is fixed data; the seed is accepted so ?shot= URLs stay stable.

const game = {
  world: buildWorld(0),
  player: makePlayer(),
  guards: [],
  screen: SCREEN_TITLE,
  elapsed: 0,
  detections: 0,
  muted: false,
  finalTime: '',
};

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function loadLevel(index) {
  game.world = buildWorld(index);
  game.player = makePlayer();
  game.guards = game.world.level.guards.map((def) => makeGuard(def, game.world.level.guardSpeed));
  game.elapsed = 0;
  game.detections = 0;
}

/** Reset the current level after a catch, keeping the lives that are left. */
function resetLevel(index) {
  const lives = game.player.lives;
  loadLevel(index);
  game.player.lives = lives;
}

game.resetLevel = resetLevel;
game.loadLevel = loadLevel;

function setScreen(screen) {
  game.screen = screen;
  const labels = {
    [SCREEN_TITLE]: 'LAMPLIGHT — title screen. Press Enter to begin.',
    [SCREEN_PLAY]: `Playing ${game.world.level.name}. Reach the glowing gate unseen.`,
    [SCREEN_PAUSE]: 'Paused.',
    [SCREEN_WIN]: 'You slipped through all three nights unseen. You win.',
    [SCREEN_OVER]: 'Caught. Game over.',
  };
  statusLine.textContent = labels[screen] ?? '';
}

function startGame() {
  loadLevel(0);
  setScreen(SCREEN_PLAY);
}

function levelComplete() {
  audio.gateChime();
  if (game.world.levelIndex >= 2) {
    game.finalTime = formatTime(game.elapsed);
    setScreen(SCREEN_WIN);
    return;
  }
  loadLevel(game.world.levelIndex + 1);
  setScreen(SCREEN_PLAY);
}

function caught() {
  game.player.lives -= 1;
  if (game.player.lives <= 0) {
    setScreen(SCREEN_OVER);
    return;
  }
  resetLevel(game.world.levelIndex);
}

function step(dt) {
  if (game.screen !== SCREEN_PLAY) return;
  game.elapsed += dt;
  const dir = moveDirection();
  const sneak = sneaking();
  const events = [];
  const playerEvent = stepPlayer(game.world, game.player, dir, sneak, dt);
  if (playerEvent === 'step') audio.footstep(sneak);
  if (playerEvent === 'gate') {
    levelComplete();
    return;
  }
  for (const guard of game.guards) {
    const result = stepGuard(game.world, guard, game.player, dt, events);
    if (result === 'caught') {
      caught();
      return;
    }
  }
  for (const event of events) {
    if (event === 'spotted') {
      game.detections += 1;
      audio.alertSting();
    } else if (event === 'suspicious') {
      audio.suspiciousNote();
    }
  }
}

function frame(now) {
  const dt = Math.min(0.1, (now - frame.last) / 1000 || STEP);
  frame.last = now;
  if (wasPressed('Enter') || wasPressed('Space')) {
    audio.ensureAudio();
    if (game.screen === SCREEN_TITLE || game.screen === SCREEN_WIN || game.screen === SCREEN_OVER) {
      startGame();
    }
  }
  if (wasPressed('KeyP') && (game.screen === SCREEN_PLAY || game.screen === SCREEN_PAUSE)) {
    setScreen(game.screen === SCREEN_PLAY ? SCREEN_PAUSE : SCREEN_PLAY);
  }
  if (wasPressed('KeyR') && game.screen !== SCREEN_TITLE) {
    startGame();
  }
  if (wasPressed('KeyM')) {
    game.muted = audio.toggleMute();
  }
  // Fixed-step simulation: the same input always gives the same game.
  frame.accumulator += dt;
  let steps = 0;
  while (frame.accumulator >= STEP && steps < 5) {
    step(STEP);
    frame.accumulator -= STEP;
    steps += 1;
  }
  draw(ctx, game);
  endFrame();
  requestAnimationFrame(frame);
}
frame.last = 0;
frame.accumulator = 0;

function resize() {
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
  canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
}

installInput();
window.addEventListener('resize', resize);
resize();

if (shotName) {
  // A screenshot scene: pose the real game, draw one frame, stop. No loop, no
  // audio, no input — the frame is exactly what the game looks like.
  loadLevel(0);
  stageShot(shotName, game);
  setScreen(game.screen);
  draw(ctx, game);
} else {
  loadLevel(0);
  setScreen(SCREEN_TITLE);
  requestAnimationFrame(frame);
}

// Keep the module's live bindings visible for the screenshot scenes.
export { game, LIVES };
