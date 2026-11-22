// Canvas drawing: the night garden, the guards' vision cones, the thief, the
// glowing gate, the HUD and the title / pause / win / game-over screens.
// Draw order matters: floor, light, cones, then the things that block sight
// (walls, hedges, crates) on top, so a cone reads as cut off by cover.

import { FIELD, FONT, GUARD, PALETTE, PLAYER, WALL } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

/** Stone paths winding through the lawn, drawn under everything else. */
const PATHS = [
  { x: 24, y: 600, width: 980, height: 60 },
  { x: 440, y: 200, width: 60, height: 460 },
  { x: 500, y: 80, width: 756, height: 60 },
  { x: 1000, y: 140, width: 60, height: 460 },
];

/** Fireflies: fixed positions from a tiny seeded generator, so every render matches. */
const FIREFLIES = (() => {
  let seed = 1234567;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const points = [];
  for (let i = 0; i < 40; i += 1) {
    points.push({ x: 40 + next() * 1200, y: 40 + next() * 640, r: 1 + next() * 1.6, phase: next() * 6.28 });
  }
  return points;
})();

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function drawFloor(ctx, world, time) {
  ctx.fillStyle = PALETTE.lawn;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Mown-lawn checker, subtle enough to stay in the background.
  ctx.fillStyle = PALETTE.lawnDark;
  const tile = 80;
  for (let y = 0; y < FIELD.height / tile; y += 1) {
    for (let x = 0; x < FIELD.width / tile; x += 1) {
      if ((x + y) % 2 === 0) ctx.fillRect(x * tile, y * tile, tile, tile);
    }
  }
  // Stone paths.
  for (const p of PATHS) {
    ctx.fillStyle = PALETTE.pathEdge;
    ctx.fillRect(p.x - 3, p.y - 3, p.width + 6, p.height + 6);
    ctx.fillStyle = PALETTE.path;
    ctx.fillRect(p.x, p.y, p.width, p.height);
  }
  // Shadow pools: dark ground where the thief is harder to see.
  for (const s of world.shadows) {
    const grad = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
    grad.addColorStop(0, 'rgba(3, 5, 10, 0.85)');
    grad.addColorStop(1, 'rgba(3, 5, 10, 0)');
    ctx.fillStyle = grad;
    circle(ctx, s.x, s.y, s.r);
  }
  // Lamplight pools: warm danger zones.
  for (const lamp of world.lamps) {
    const grad = ctx.createRadialGradient(lamp.x, lamp.y, 6, lamp.x, lamp.y, lamp.r);
    grad.addColorStop(0, 'rgba(247, 183, 51, 0.34)');
    grad.addColorStop(1, 'rgba(247, 183, 51, 0)');
    ctx.fillStyle = grad;
    circle(ctx, lamp.x, lamp.y, lamp.r);
  }
  // Fireflies drifting over the lawn.
  for (const f of FIREFLIES) {
    const twinkle = 0.35 + 0.35 * Math.sin(time * 1.4 + f.phase);
    ctx.fillStyle = `rgba(190, 255, 190, ${twinkle.toFixed(3)})`;
    circle(ctx, f.x, f.y, f.r);
  }
}

function drawGate(ctx, world, time) {
  const g = world.gate;
  const pulse = 0.55 + 0.25 * Math.sin(time * 2.2);
  const glow = ctx.createRadialGradient(
    g.x + g.width / 2, g.y + g.height / 2, 8,
    g.x + g.width / 2, g.y + g.height / 2, 130,
  );
  glow.addColorStop(0, `rgba(255, 215, 106, ${pulse.toFixed(3)})`);
  glow.addColorStop(1, 'rgba(255, 215, 106, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(g.x - 90, g.y - 90, g.width + 180, g.height + 180);
  // Golden gate: two posts and shining bars.
  ctx.fillStyle = PALETTE.gateDark;
  roundRect(ctx, g.x, g.y, g.width, g.height, 6);
  ctx.fillStyle = PALETTE.gate;
  for (let i = 0; i < 5; i += 1) {
    const bx = g.x + 14 + i * 19;
    ctx.fillRect(bx, g.y + 8, 7, g.height - 16);
  }
  ctx.fillRect(g.x + 6, g.y + 12, g.width - 12, 6);
  ctx.fillRect(g.x + 6, g.y + g.height - 18, g.width - 12, 6);
  ctx.fillStyle = PALETTE.lampCore;
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', g.x + g.width / 2, g.y + g.height / 2 + 5);
}

function drawCones(ctx, world, guards) {
  for (const guard of guards) {
    const range = 185;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, range, guard.facing - GUARD.coneHalfAngle, guard.facing + GUARD.coneHalfAngle);
    ctx.closePath();
    const grad = ctx.createRadialGradient(guard.x, guard.y, 8, guard.x, guard.y, range);
    const alpha = guard.state === 'alerted' ? 0.5 : 0.34;
    grad.addColorStop(0, `rgba(247, 201, 72, ${alpha})`);
    grad.addColorStop(1, 'rgba(247, 201, 72, 0.05)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }
}

function drawSolids(ctx, world) {
  // Outer wall.
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, FIELD.width, WALL);
  ctx.fillRect(0, FIELD.height - WALL, FIELD.width, WALL);
  ctx.fillRect(0, 0, WALL, FIELD.height);
  ctx.fillRect(FIELD.width - WALL, 0, WALL, FIELD.height);
  ctx.fillStyle = PALETTE.wallTop;
  ctx.fillRect(0, 0, FIELD.width, 6);
  ctx.fillRect(0, FIELD.height - 6, FIELD.width, 6);
  // Interior walls.
  for (const w of world.walls) {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(w.x, w.y, w.width, w.height);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(w.x, w.y, w.width, 4);
  }
  // Hedges: teal, taller than the thief, with a lighter clipped top.
  for (const h of world.hedges) {
    ctx.fillStyle = PALETTE.hedgeDark;
    roundRect(ctx, h.x, h.y, h.width, h.height, 12);
    ctx.fillStyle = PALETTE.hedge;
    roundRect(ctx, h.x + 3, h.y + 3, h.width - 6, h.height - 8, 10);
    ctx.fillStyle = PALETTE.hedgeLight;
    for (let x = h.x + 10; x < h.x + h.width - 8; x += 26) {
      circle(ctx, x, h.y + 9, 4);
    }
  }
  // Crates: wooden squares with a cross brace.
  for (const c of world.crates) {
    ctx.fillStyle = PALETTE.crateDark;
    ctx.fillRect(c.x, c.y, c.width, c.height);
    ctx.fillStyle = PALETTE.crate;
    ctx.fillRect(c.x + 3, c.y + 3, c.width - 6, c.height - 6);
    ctx.strokeStyle = PALETTE.crateDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(c.x + 4, c.y + 4);
    ctx.lineTo(c.x + c.width - 4, c.y + c.height - 4);
    ctx.moveTo(c.x + c.width - 4, c.y + 4);
    ctx.lineTo(c.x + 4, c.y + c.height - 4);
    ctx.stroke();
  }
  // Lamp posts: a dark post with a warm glowing head.
  for (const lamp of world.lamps) {
    ctx.fillStyle = '#10131c';
    ctx.fillRect(lamp.x - 3, lamp.y - 4, 6, 14);
    ctx.fillStyle = PALETTE.lampCore;
    circle(ctx, lamp.x, lamp.y - 8, 7);
    ctx.fillStyle = PALETTE.lampGlow;
    circle(ctx, lamp.x, lamp.y - 8, 4);
  }
}

function drawGuards(ctx, guards) {
  for (const guard of guards) {
    // Direction the guard faces.
    const fx = Math.cos(guard.facing);
    const fy = Math.sin(guard.facing);
    ctx.fillStyle = PALETTE.guardDark;
    circle(ctx, guard.x, guard.y, GUARD.radius + 2);
    ctx.fillStyle = PALETTE.guard;
    circle(ctx, guard.x, guard.y, GUARD.radius);
    // Lantern the guard carries: a pale dot ahead of them.
    ctx.fillStyle = PALETTE.lampCore;
    circle(ctx, guard.x + fx * (GUARD.radius - 2), guard.y + fy * (GUARD.radius - 2), 4);
    // Helmet brim.
    ctx.strokeStyle = PALETTE.guardDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius - 5, guard.facing - 1.1, guard.facing + 1.1);
    ctx.stroke();
    // "?" when suspicious, "!" when alerted.
    if (guard.state !== 'patrol') {
      ctx.fillStyle = guard.state === 'alerted' ? PALETTE.danger : PALETTE.gate;
      ctx.font = `bold 26px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(guard.state === 'alerted' ? '!' : '?', guard.x, guard.y - GUARD.radius - 8);
    }
  }
}

function drawPlayer(ctx, player, world) {
  const hidden = world.shadows.some((s) => {
    const dx = player.x - s.x;
    const dy = player.y - s.y;
    return dx * dx + dy * dy < s.r * s.r;
  });
  ctx.save();
  if (hidden) ctx.globalAlpha = 0.75;
  // Hooded cloak: dark circle with a pale scarf trailing behind the facing.
  ctx.fillStyle = PALETTE.player;
  circle(ctx, player.x, player.y, PLAYER.radius);
  ctx.fillStyle = '#161a28';
  circle(ctx, player.x, player.y, PLAYER.radius - 4);
  // Face: a pale sliver under the hood, looking where the thief moves.
  ctx.fillStyle = PALETTE.scarf;
  circle(ctx, player.x + player.faceX * 5, player.y + player.faceY * 5, 4);
  // Scarf tail behind.
  ctx.strokeStyle = PALETTE.scarf;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(player.x - player.faceX * 8, player.y - player.faceY * 8);
  ctx.lineTo(player.x - player.faceX * 16, player.y - player.faceY * 16 + 3);
  ctx.stroke();
  ctx.restore();
  if (player.sneaking) {
    ctx.strokeStyle = 'rgba(238, 241, 245, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawHud(ctx, view) {
  const { player, detections, elapsed } = view;
  ctx.fillStyle = 'rgba(11, 14, 26, 0.72)';
  roundRect(ctx, 12, 12, 440, 64, 10);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 17px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`${view.world.level.name}  ·  Night ${view.world.levelIndex + 1}/3`, 26, 36);
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60);
  ctx.fillText(`Time ${minutes}:${String(seconds).padStart(2, '0')}   Spotted ${detections}×`, 26, 60);
  // Lives: hearts.
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < player.lives ? '#e5534b' : 'rgba(238, 241, 245, 0.2)';
    ctx.font = '18px sans-serif';
    ctx.fillText('♥', 356 + i * 24, 36);
  }
  // Detection meter, top centre: fills while a guard sees you.
  const meterW = 260;
  const meterX = FIELD.width / 2 - meterW / 2;
  ctx.fillStyle = 'rgba(11, 14, 26, 0.72)';
  roundRect(ctx, meterX - 10, 12, meterW + 20, 40, 10);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('DETECTION', FIELD.width / 2, 28);
  ctx.fillStyle = '#232838';
  roundRect(ctx, meterX, 34, meterW, 10, 5);
  const meter = Math.max(0, Math.min(1, player.meter));
  ctx.fillStyle = meter < 0.35 ? PALETTE.gate : meter < 1 ? PALETTE.lampGlow : PALETTE.danger;
  if (meter > 0.01) roundRect(ctx, meterX, 34, meterW * meter, 10, 5);
  // Mute state, top right.
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(view.muted ? 'M — muted' : 'M — sound on', FIELD.width - 20, 32);
  // Controls, bottom.
  ctx.fillStyle = 'rgba(11, 14, 26, 0.6)';
  roundRect(ctx, 12, FIELD.height - 36, 560, 24, 8);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('WASD / arrows — move    Shift — sneak    P — pause    R — restart    M — mute', 22, FIELD.height - 19);
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5, 7, 13, 0.78)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent ?? PALETTE.gate;
  ctx.font = `bold 64px ${FONT}`;
  ctx.fillText(title, FIELD.width / 2, 250);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `20px ${FONT}`;
  lines.forEach((line, i) => {
    ctx.fillText(line, FIELD.width / 2, 310 + i * 34);
  });
}

function drawTitle(ctx, view) {
  overlay(ctx, 'LAMPLIGHT', [
    'A hooded thief. A lamplit manor garden. Three patrolling guards.',
    'Sneak past their cones, hide in the shadows, reach the glowing gate unseen.',
    '',
    'WASD / arrows — move      Shift — sneak      P — pause      R — restart      M — mute',
    '',
    'Press Enter to begin',
  ]);
}

/** Draw one frame. `view` holds the world, player, guards and screen state. */
export function draw(ctx, view) {
  const { world, player, guards } = view;
  drawFloor(ctx, world, view.elapsed);
  drawGate(ctx, world, view.elapsed);
  drawCones(ctx, world, guards);
  drawSolids(ctx, world);
  drawGuards(ctx, guards);
  drawPlayer(ctx, player, world);
  if (view.screen === SCREEN_PLAY || view.screen === SCREEN_PAUSE) {
    drawHud(ctx, view);
  }
  if (view.screen === SCREEN_TITLE) drawTitle(ctx, view);
  if (view.screen === SCREEN_PAUSE) {
    overlay(ctx, 'PAUSED', ['Take a breath. The guards keep their routes.', '', 'P — resume      R — restart the night']);
  }
  if (view.screen === SCREEN_WIN) {
    overlay(ctx, 'THE GATE IS OPEN', [
      `Three nights, unseen. Time ${view.finalTime} — spotted ${view.detections}×.`,
      '',
      'Press Enter to play again',
    ], PALETTE.gate);
  }
  if (view.screen === SCREEN_OVER) {
    overlay(ctx, 'CAUGHT', [
      'The lanterns found you. The garden keeps its secrets.',
      '',
      'Press Enter to try again',
    ], PALETTE.danger);
  }
}
