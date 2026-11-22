// Tideglass II — vision: line of sight through walls and crates, vision-cone
// polygons cut by the same solids, and the detection test a guard runs each tick.
import { pointInRect } from './levels.js';

export function segmentHitsRect(x0, y0, x1, y1, r) {
  // Slab test: does the segment enter the rect?
  const dx = x1 - x0, dy = y1 - y0;
  let tmin = 0, tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x0 < r.x || x0 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x0) / dx, t2 = (r.x + r.w - x0) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y0 < r.y || y0 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y0) / dy, t2 = (r.y + r.h - y0) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

export function losClear(x0, y0, x1, y1, solids) {
  for (const s of solids) {
    if (pointInRect(x1, y1, s)) return false;
    if (segmentHitsRect(x0, y0, x1, y1, s)) return false;
  }
  return true;
}

// March a ray until a solid or max distance; returns the hit point.
export function raycast(x, y, angle, maxDist, solids) {
  const step = 7;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  for (let d = step; d <= maxDist; d += step) {
    const px = x + dx * d, py = y + dy * d;
    for (const s of solids) {
      if (pointInRect(px, py, s)) return { x: px - dx * step, y: py - dy * step, dist: d - step };
    }
  }
  return { x: x + dx * maxDist, y: y + dy * maxDist, dist: maxDist };
}

// Vision cone polygon for drawing: rays fanned across the guard's field of view,
// each cut short by walls and crates.
export function conePolygon(gx, gy, facing, fov, range, solids, rays = 26) {
  const points = [{ x: gx, y: gy }];
  for (let i = 0; i <= rays; i++) {
    const a = facing - fov / 2 + (fov * i) / rays;
    const hit = raycast(gx, gy, a, range, solids);
    points.push({ x: hit.x, y: hit.y });
  }
  return points;
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Full visibility test: range, angle, line of sight, and whether a smoke cloud
// sits between guard and player. Returns { seen, dist, coverFactor }.
export function canSee(guard, px, py, solids, coverFactor, smokeClouds) {
  const dx = px - guard.x, dy = py - guard.y;
  const dist = Math.hypot(dx, dy);
  const range = guard.range * (coverFactor === 0 ? 0.18 : 1);
  if (dist > range) return { seen: false, dist, coverFactor };
  const angle = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(angle, guard.facing)) > guard.fov / 2) return { seen: false, dist, coverFactor };
  if (!losClear(guard.x, guard.y, px, py, solids)) return { seen: false, dist, coverFactor };
  for (const c of smokeClouds) {
    const mx = (guard.x + px) / 2, my = (guard.y + py) / 2;
    if (Math.hypot(mx - c.x, my - c.y) < c.r) return { seen: false, dist, coverFactor };
  }
  return { seen: true, dist, coverFactor };
}

// Is the player inside the rotating lighthouse beam (wedge from beam origin)?
export function inBeam(beam, px, py, solids) {
  if (!beam) return false;
  const dx = px - beam.x, dy = py - beam.y;
  const dist = Math.hypot(dx, dy);
  if (dist > beam.length) return false;
  const angle = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(angle, beam.angle)) > beam.halfAngle) return false;
  return losClear(beam.x, beam.y, px, py, solids);
}
