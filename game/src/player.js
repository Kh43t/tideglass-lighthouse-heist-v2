// Tideglass II — the thief: WASD/arrows movement, sprint drains stamina,
// sneak is slow and quiet, gadgets are counted per floor.
import {
  PLAYER_RADIUS, WALK_SPEED, SPRINT_SPEED, SNEAK_SPEED,
  STAMINA_MAX, STAMINA_DRAIN_SPRINT, STAMINA_REGEN,
} from './config.js';
import { collideCircleRect, solidsOf } from './levels.js';

export function makePlayer(start) {
  return {
    x: start.x, y: start.y,
    facing: -Math.PI / 2,
    stamina: STAMINA_MAX,
    sprinting: false, sneaking: false, moving: false,
    speed: 0,
    gadgets: { pebbles: 5, smoke: 2, bells: 1 },
    noiseRadius: 0,
  };
}

export function updatePlayer(p, dt, input, floor) {
  let mx = 0, my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  const solids = solidsOf(floor);
  p.moving = mx !== 0 || my !== 0;
  p.sneaking = !!input.sneak && p.moving;
  p.sprinting = !!input.sprint && p.moving && !p.sneaking && p.stamina > 1;
  let speed = WALK_SPEED;
  if (p.sprinting) speed = SPRINT_SPEED;
  else if (p.sneaking) speed = SNEAK_SPEED;
  p.speed = p.moving ? speed : 0;
  if (p.sprinting) p.stamina = Math.max(0, p.stamina - STAMINA_DRAIN_SPRINT * dt);
  else p.stamina = Math.min(STAMINA_MAX, p.stamina + STAMINA_REGEN * dt);
  if (p.moving) {
    const len = Math.hypot(mx, my);
    const nx = p.x + (mx / len) * speed * dt;
    const ny = p.y + (my / len) * speed * dt;
    p.facing = Math.atan2(my, mx);
    let fx = nx, fy = ny;
    for (const s of solids) {
      const hit = collideCircleRect(fx, fy, PLAYER_RADIUS, s);
      if (hit) { fx = hit.x; fy = hit.y; }
    }
    p.x = fx; p.y = fy;
  }
  p.noiseRadius = !p.moving ? 0 : p.sprinting ? 170 : p.sneaking ? 18 : 55;
  return p;
}
