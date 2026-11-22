// Tideglass II — guard AI: patrol (pausing at waypoints) -> suspicious ->
// investigate -> alert/chase -> search -> return to patrol. Caught on touch only.
import {
  GUARD_PATROL_SPEED, GUARD_CHASE_SPEED, GUARD_SEARCH_SPEED,
  DETECT_FILL_BASE, DETECT_DECAY, NOISE_SPRINT_RADIUS,
} from './config.js';
import { canSee, angleDiff } from './vision.js';
import { collideCircleRect, coverAt } from './levels.js';
import { GRASS_HIDE_RADIUS, SHADOW_FACTOR, LAMP_FACTOR, GUARD_RADIUS } from './config.js';

export function makeGuard(def) {
  return {
    x: def.x, y: def.y,
    waypoints: def.waypoints.map(([x, y]) => ({ x, y })),
    wpIndex: 0, pause: def.pause ?? 2.2, pauseTimer: 0,
    range: def.range, fov: def.fov,
    facing: Math.PI / 2,
    state: 'patrol', // patrol | investigate | chase | search | return
    suspicion: 0, // 0..1 detection meter
    target: null, // {x,y} to investigate
    searchTimer: 0, searchTurns: 0,
    lastSeen: null,
    alertedAt: -1,
  };
}

function moveToward(g, tx, ty, speed, dt, solids) {
  const dx = tx - g.x, dy = ty - g.y;
  const d = Math.hypot(dx, dy);
  if (d < 2) return true;
  const step = Math.min(d, speed * dt);
  g.facing = Math.atan2(dy, dx);
  let nx = g.x + (dx / d) * step;
  let ny = g.y + (dy / d) * step;
  for (const s of solids) {
    const hit = collideCircleRect(nx, ny, GUARD_RADIUS, s);
    if (hit) { nx = hit.x; ny = hit.y; }
  }
  g.x = nx; g.y = ny;
  return d <= speed * dt + 2;
}

export function updateGuard(g, dt, ctx) {
  const { player, solids, floor, smokeClouds, noiseEvents, time } = ctx;
  // --- Vision: fill the suspicion meter when the player is seen.
  const cover = coverAt(floor, player.x, player.y);
  let coverFactor = 1;
  if (cover === 'grass') coverFactor = 0;
  else if (cover === 'shadow') coverFactor = SHADOW_FACTOR;
  else if (cover === 'lamp') coverFactor = LAMP_FACTOR;
  const distToPlayer = Math.hypot(player.x - g.x, player.y - g.y);
  let seen = false;
  if (!(cover === 'grass' && distToPlayer > GRASS_HIDE_RADIUS)) {
    const vis = canSee(g, player.x, player.y, solids, coverFactor, smokeClouds);
    seen = vis.seen;
  }
  if (seen) {
    const closeness = 1 - distToPlayer / (g.range + 1);
    const rate = DETECT_FILL_BASE * (0.45 + closeness) * (cover === 'lamp' ? LAMP_FACTOR : cover === 'shadow' ? SHADOW_FACTOR : 1);
    g.suspicion = Math.min(1, g.suspicion + rate * dt);
    g.lastSeen = { x: player.x, y: player.y };
    if (g.suspicion >= 1 && g.state !== 'chase') {
      g.state = 'chase';
      g.alertedAt = time;
      ctx.onAlert?.(g);
    }
  } else {
    g.suspicion = Math.max(0, g.suspicion - DETECT_DECAY * dt);
  }
  // Half-suspicion: go look where the glimpse was.
  if (g.state === 'patrol' && g.suspicion >= 0.5 && g.lastSeen) {
    g.state = 'investigate';
    g.target = { ...g.lastSeen };
  }
  // --- Noise: a loud step, a pebble, a bell pulls a guard to investigate.
  for (const n of noiseEvents) {
    const d = Math.hypot(n.x - g.x, n.y - g.y);
    if (d < n.radius && g.state !== 'chase') {
      g.state = 'investigate';
      g.target = { x: n.x, y: n.y };
      if (n.strong) g.suspicion = Math.max(g.suspicion, 0.6);
    }
  }
  // --- State machine movement.
  if (g.state === 'patrol') {
    if (g.pauseTimer > 0) {
      g.pauseTimer -= dt;
    } else {
      const wp = g.waypoints[g.wpIndex];
      if (moveToward(g, wp.x, wp.y, GUARD_PATROL_SPEED, dt, solids)) {
        g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
        g.pauseTimer = g.pause;
      }
    }
  } else if (g.state === 'investigate' && g.target) {
    if (moveToward(g, g.target.x, g.target.y, GUARD_PATROL_SPEED * 1.5, dt, solids)) {
      g.state = 'search';
      g.searchTimer = 3.5;
      g.searchTurns = 0;
    }
  } else if (g.state === 'chase' && g.lastSeen) {
    moveToward(g, g.lastSeen.x, g.lastSeen.y, GUARD_CHASE_SPEED, dt, solids);
    if (!seen && g.suspicion < 0.25) {
      g.state = 'search';
      g.searchTimer = 4;
      g.searchTurns = 0;
    }
  } else if (g.state === 'search') {
    g.searchTimer -= dt;
    // Look around: sweep the facing angle while searching.
    g.facing += dt * 1.4 * (g.searchTurns % 2 === 0 ? 1 : -1);
    if (g.searchTimer <= 0) {
      g.searchTurns += 1;
      if (g.searchTurns >= 2) {
        g.state = 'return';
        g.target = null;
      } else {
        g.searchTimer = 2.5;
      }
    }
  } else if (g.state === 'return') {
    // Walk back to the nearest waypoint, then resume the patrol.
    let best = g.waypoints[0], bestD = Infinity;
    for (const wp of g.waypoints) {
      const d = Math.hypot(wp.x - g.x, wp.y - g.y);
      if (d < bestD) { bestD = d; best = wp; }
    }
    if (moveToward(g, best.x, best.y, GUARD_SEARCH_SPEED, dt, solids)) {
      g.wpIndex = g.waypoints.indexOf(best);
      g.state = 'patrol';
      g.suspicion = 0;
    }
  }
  // Sprinting nearby is loud even without a direct sighting.
  if (ctx.playerSprinting) {
    const d = Math.hypot(player.x - g.x, player.y - g.y);
    if (d < NOISE_SPRINT_RADIUS && g.state === 'patrol' && !seen) {
      g.suspicion = Math.min(1, g.suspicion + 0.25 * dt);
    }
  }
  return seen;
}

export function guardCaughtPlayer(g, player) {
  return Math.hypot(g.x - player.x, g.y - player.y) < GUARD_RADIUS + 12;
}
