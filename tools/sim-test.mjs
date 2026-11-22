// Tideglass II — deterministic Node simulation: a bot plays every floor with
// BFS pathfinding (40px grid over the arena, solids blocked), sneaks near
// guards, hides in sea-grass when suspicion rises, and must reach the relic
// then the exit on all five floors without being caught. Run: node tools/sim-test.mjs
import { createGame, updateGame } from '../game/src/engine.js';
import { FLOORS, pointInAnyRect, solidsOf } from '../game/src/levels.js';
import { losClear, angleDiff, inBeam } from '../game/src/vision.js';

const CELL = 40;
const COLS = Math.ceil(1280 / CELL);
const ROWS = Math.ceil(800 / CELL);

function gridBlocked(floor) {
  const solids = solidsOf(floor);
  const blocked = new Array(COLS * ROWS).fill(false);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * CELL + CELL / 2, y = r * CELL + CELL / 2;
      if (pointInAnyRect(x, y, solids)) blocked[r * COLS + c] = true;
    }
  }
  return blocked;
}

function bfsPath(floor, sx, sy, tx, ty, avoid = []) {
  const blocked = gridBlocked(floor);
  // Optional detour blockers: keep a berth around each guard's current spot.
  for (const a of avoid) {
    const c0 = Math.floor((a.x - 70) / CELL), c1 = Math.floor((a.x + 70) / CELL);
    const r0 = Math.floor((a.y - 70) / CELL), r1 = Math.floor((a.y + 70) / CELL);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (c >= 0 && r >= 0 && c < COLS && r < ROWS) blocked[r * COLS + c] = true;
      }
    }
  }
  const sc = Math.floor(sx / CELL), sr = Math.floor(sy / CELL);
  const tc = Math.floor(tx / CELL), tr = Math.floor(ty / CELL);
  const key = (c, r) => r * COLS + c;
  const prev = new Map();
  const queue = [[sc, sr]];
  prev.set(key(sc, sr), null);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (queue.length) {
    const [c, r] = queue.shift();
    if (c === tc && r === tr) break;
    for (const [dc, dr] of dirs) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      if (blocked[key(nc, nr)] || prev.has(key(nc, nr))) continue;
      // No corner cutting: a diagonal step needs both orthogonal neighbours free.
      if (dc !== 0 && dr !== 0 && (blocked[key(c + dc, r)] || blocked[key(c, r + dr)])) continue;
      prev.set(key(nc, nr), [c, r]);
      queue.push([nc, nr]);
    }
  }
  if (!prev.has(key(tc, tr))) return null;
  const path = [];
  let cur = [tc, tr];
  while (cur) {
    path.unshift({ x: cur[0] * CELL + CELL / 2, y: cur[1] * CELL + CELL / 2 });
    cur = prev.get(key(cur[0], cur[1]));
  }
  return path;
}

function nearestGrass(floor, x, y) {
  let best = null, bestD = Infinity;
  for (const g of floor.grass) {
    const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
    const d = Math.hypot(cx - x, cy - y);
    if (d < bestD) { bestD = d; best = { x: cx, y: cy }; }
  }
  return best;
}

function steer(input, player, dest) {
  const dx = dest.x - player.x, dy = dest.y - player.y;
  input.right = dx > 6; input.left = dx < -6;
  input.down = dy > 6; input.up = dy < -6;
}

// Is stepping onto (x, y) safe right now: outside every guard's live cone,
// clear of the lighthouse beam, and not next to a warden?
function stepSafe(g, x, y) {
  const floor = g.floor;
  if (floor.grass.some((gr) => pointInAnyRect(x, y, [gr]))) return true;
  if (floor.beam && inBeam(floor.beam, x, y, g.solids)) return false;
  for (const gd of g.guards) {
    const dx = x - gd.x, dy = y - gd.y;
    const d = Math.hypot(dx, dy);
    if (d < 90) return false;
    if (d < gd.range && Math.abs(angleDiff(Math.atan2(dy, dx), gd.facing)) < gd.fov / 2) {
      if (losClear(gd.x, gd.y, x, y, g.solids)) return false;
    }
  }
  return true;
}

function playFloor(index) {
  const g = createGame(index);
  const dt = 1 / 30;
  let path = null;
  let pathTarget = '';
  let ticks = 0;
  let maxSuspicion = 0;
  let lastCheckX = -1, lastCheckY = -1, lastCheckTick = 0;
  let fleeTicks = 0;
  let waitTicks = 0;
  let smokedThisChase = false;
  const maxTicks = 30 * 240; // 4 minutes of sim time per floor
  while (g.status === 'playing' && ticks < maxTicks) {
    ticks += 1;
    const target = g.relicTaken ? g.floor.exit : g.floor.relic;
    const targetKind = g.relicTaken ? 'exit' : 'relic';
    const maxSusp = Math.max(...g.guards.map((gd) => gd.suspicion));
    maxSuspicion = Math.max(maxSuspicion, maxSusp);
    const nearestGuardD = Math.min(...g.guards.map((gd) => Math.hypot(gd.x - g.player.x, gd.y - g.player.y)));
    // Hide when actually hunted or half-seen (or the beam is cooking us).
    const chased = g.guards.some((gd) => gd.state === 'chase');
    let dest = target;
    let hide = false;
    if (maxSusp > 0.4 || g.beamExposure > 0.35 || chased) {
      const grass = nearestGrass(g.floor, g.player.x, g.player.y);
      if (grass && Math.hypot(grass.x - g.player.x, grass.y - g.player.y) > 20) {
        dest = grass; hide = true;
      } else if (maxSusp > 0.4 || chased) {
        dest = { x: g.player.x, y: g.player.y }; // hold still in the grass
        hide = true;
      }
    }
    const destKey = `${dest.x},${dest.y}`;
    if (pathTarget !== destKey || !path) {
      path = bfsPath(g.floor, g.player.x, g.player.y, dest.x, dest.y);
      pathTarget = destKey;
    }
    const input = { up: false, down: false, left: false, right: false, sprint: false, sneak: false };
    const inGrass = g.floor.grass.some((gr) => pointInAnyRect(g.player.x, g.player.y, [gr]));
    // Smoke the chase: one puff breaks line of sight while we run for cover.
    if (chased && !inGrass && g.player.gadgets.smoke > 0 && !smokedThisChase) {
      input.useSmoke = true;
      smokedThisChase = true;
    }
    if (!chased) smokedThisChase = false;
    if (chased && inGrass) {
      // hold still: sea-grass hides us unless a warden is within 46px
    } else if (path && path.length >= 1) {
      // Cone-aware stepping: only step where no live cone or beam reaches.
      const wp = path.length > 1 ? path[1] : dest;
      const wpD = Math.hypot(wp.x - g.player.x, wp.y - g.player.y);
      if (path.length > 1 && wpD < 14) { path.shift(); }
      else if (nearestGuardD < 70) {
        // Emergency: a warden is on top of us — break away fast.
        let ng = g.guards[0];
        for (const gd of g.guards) {
          if (Math.hypot(gd.x - g.player.x, gd.y - g.player.y) < Math.hypot(ng.x - g.player.x, ng.y - g.player.y)) ng = gd;
        }
        steer(input, g.player, { x: g.player.x + (g.player.x - ng.x), y: g.player.y + (g.player.y - ng.y) });
        input.sprint = true;
        waitTicks = 0;
      } else if (!stepSafe(g, wp.x, wp.y) && nearestGuardD > 150) {
        // Wait for the patrol / beam to pass — unless a warden is closing in,
        // in which case standing still is worse than moving.
        waitTicks += 1;
        if (waitTicks > 300) {
          const detour = bfsPath(g.floor, g.player.x, g.player.y, dest.x, dest.y, g.guards);
          if (detour) { path = detour; pathTarget = destKey; }
          waitTicks = 0;
        }
      } else {
        waitTicks = 0;
        steer(input, g.player, wp);
        input.sneak = !chased && (nearestGuardD < 220 || hide);
        input.sprint = chased;
      }
    }
    updateGame(g, dt, input);
    // Stall detection: wedged on a wall corner — skip the current waypoint.
    if (ticks - lastCheckTick >= 30) {
      const moved = Math.hypot(g.player.x - lastCheckX, g.player.y - lastCheckY);
      const trying = input.up || input.down || input.left || input.right;
      if (trying && moved < 3 && path && path.length > 1) path.shift();
      lastCheckX = g.player.x; lastCheckY = g.player.y; lastCheckTick = ticks;
    }
    if (process.env.SIM_DEBUG && ticks % 600 === 0) {
      console.log(`  dbg t=${(ticks / 30).toFixed(0)}s pos=(${Math.round(g.player.x)},${Math.round(g.player.y)}) dest=(${Math.round(dest.x)},${Math.round(dest.y)}) pathLen=${path ? path.length : 'null'} guardD=${Math.round(nearestGuardD)} susp=${maxSusp.toFixed(2)} status=${g.status}`);
    }
    if (process.env.SIM_DEBUG2 && ticks % 15 === 0) {
      console.log(`  t=${(ticks / 30).toFixed(1)} pos=(${Math.round(g.player.x)},${Math.round(g.player.y)}) beam=${g.beamExposure.toFixed(2)} ` + g.guards.map((gd, i) => `g${i}:${gd.state.slice(0, 4)} s=${gd.suspicion.toFixed(2)} d=${Math.round(Math.hypot(gd.x - g.player.x, gd.y - g.player.y))}`).join(' '));
    }
  }
  return {
    floor: FLOORS[index].name,
    status: g.status,
    time: +g.time.toFixed(1),
    score: g.score,
    treasures: g.treasuresTaken,
    alerts: g.alertRaised,
    maxSuspicion: +maxSuspicion.toFixed(2),
    ticks,
  };
}

let failures = 0;
for (let i = 0; i < FLOORS.length; i++) {
  const r = playFloor(i);
  const ok = r.status === 'floorClear' || r.status === 'won';
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.floor} — status=${r.status} time=${r.time}s score=${r.score} treasures=${r.treasures} alerts=${r.alerts} maxSuspicion=${r.maxSuspicion} ticks=${r.ticks}`);
}
console.log(failures === 0
  ? 'SIM GREEN: win path reachable on all 5 floors.'
  : `SIM RED: ${failures} floor(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
