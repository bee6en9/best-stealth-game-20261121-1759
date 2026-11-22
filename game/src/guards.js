// Guards: patrol routes you can learn, vision cones you can read, and a detection
// meter that gives you a chance to recover. States: patrol -> suspicious (a glimpse:
// "?", walks over to look) -> alerted (clearly seen: "!", chases) -> give up after
// losing you for a few seconds (returns to patrol).

import { GUARD, PLAYER } from './config.js';
import { hasLineOfSight, inLamplight, inShadow, moveCircle } from './world.js';

export const STATE_PATROL = 'patrol';
export const STATE_SUSPICIOUS = 'suspicious';
export const STATE_ALERTED = 'alerted';

/** One guard, built from a level's waypoint list. */
export function makeGuard(def, speed) {
  const [x, y] = def.waypoints[0];
  return {
    waypoints: def.waypoints,
    waypointIndex: 1 % def.waypoints.length,
    x,
    y,
    /** Facing angle, radians. */
    facing: 0,
    speed,
    state: STATE_PATROL,
    /** Last place the guard thought it saw the thief. */
    lastSeen: null,
    /** Seconds since the guard last saw the thief. */
    unseenFor: 0,
    /** Pause at each waypoint, so patrols read as a walk, not a slide. */
    waitAtWaypoint: 0,
  };
}

/** Cone range right now: further in lamplight, shorter into shadow. */
export function coneRangeFor(world, px, py) {
  if (inLamplight(world, px, py)) return GUARD.coneRangeLit;
  if (inShadow(world, px, py)) return GUARD.coneRangeShadow;
  return GUARD.coneRange;
}

/** True when the guard can see the player: inside the cone, in range, line of sight. */
export function guardSeesPlayer(world, guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  const range = coneRangeFor(world, player.x, player.y);
  if (dist > range) return false;
  let angle = Math.atan2(dy, dx) - guard.facing;
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  if (Math.abs(angle) > GUARD.coneHalfAngle) return false;
  return hasLineOfSight(world, guard.x, guard.y, player.x, player.y);
}

/** Turn `facing` toward `target` by at most `maxTurn` radians. */
function turnToward(guard, target, maxTurn) {
  let diff = target - guard.facing;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) <= maxTurn) guard.facing = target;
  else guard.facing += Math.sign(diff) * maxTurn;
}

/** Walk toward a point at `speed`, facing the way it moves. Returns true on arrival. */
function walkTo(world, guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  const step = Math.min(dist, speed * dt);
  const nx = (dx / dist) * step;
  const ny = (dy / dist) * step;
  turnToward(guard, Math.atan2(dy, dx), 6 * dt);
  moveCircle(world, guard, GUARD.radius, nx, ny);
  return false;
}

/**
 * Advance one guard one step. Returns 'caught' when an alerted guard touches the
 * player, otherwise null. `events` collects what happened for sound and scoring:
 * 'spotted' (first clear sighting), 'suspicious', 'lost' (gave up the chase).
 */
export function stepGuard(world, guard, player, dt, events) {
  const sees = guardSeesPlayer(world, guard, player);
  const sneaking = player.sneaking;
  const lit = inLamplight(world, player.x, player.y);
  const shadow = inShadow(world, player.x, player.y);

  if (sees) {
    let rate = GUARD.detectRate;
    if (lit) rate = GUARD.detectRateLit;
    if (shadow) rate = GUARD.detectRateShadow;
    if (sneaking) rate *= GUARD.detectRateSneak;
    player.meter = Math.min(1, player.meter + rate * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.unseenFor = 0;
    if (player.meter >= 1 && guard.state !== STATE_ALERTED) {
      guard.state = STATE_ALERTED;
      events.push('spotted');
    } else if (player.meter >= GUARD.suspiciousAt && guard.state === STATE_PATROL) {
      guard.state = STATE_SUSPICIOUS;
      events.push('suspicious');
    }
  } else {
    player.meter = Math.max(0, player.meter - GUARD.detectDrain * dt);
    guard.unseenFor += dt;
    // Loud footsteps give you away even unseen: running near a guard raises suspicion.
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    const hear = sneaking ? PLAYER.hearSneakRadius : PLAYER.hearRadius;
    if (!sneaking && player.moving && dist < hear) {
      player.meter = Math.min(1, player.meter + 0.25 * dt);
      if (player.meter >= GUARD.suspiciousAt && guard.state === STATE_PATROL) {
        guard.state = STATE_SUSPICIOUS;
        guard.lastSeen = { x: player.x, y: player.y };
        events.push('suspicious');
      }
    }
    if (guard.state === STATE_ALERTED && guard.unseenFor > GUARD.giveUpAfter) {
      guard.state = STATE_PATROL;
      guard.lastSeen = null;
      events.push('lost');
    }
  }

  if (guard.state === STATE_ALERTED) {
    const arrived = walkTo(world, guard, player.x, player.y, GUARD.chaseSpeed, dt);
    if (!arrived && Math.hypot(player.x - guard.x, player.y - guard.y) < GUARD.catchRadius) {
      return 'caught';
    }
    return null;
  }
  if (guard.state === STATE_SUSPICIOUS && guard.lastSeen) {
    const arrived = walkTo(world, guard, guard.lastSeen.x, guard.lastSeen.y, GUARD.investigateSpeed, dt);
    if (arrived) {
      guard.state = STATE_PATROL;
      guard.lastSeen = null;
    }
    return null;
  }

  // Patrol: walk the waypoints, pausing briefly at each one.
  if (guard.waitAtWaypoint > 0) {
    guard.waitAtWaypoint -= dt;
    return null;
  }
  const target = guard.waypoints[guard.waypointIndex];
  const arrived = walkTo(world, guard, target[0], target[1], guard.speed, dt);
  if (arrived) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    guard.waitAtWaypoint = 0.6;
  }
  return null;
}
