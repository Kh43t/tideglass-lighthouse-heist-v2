// Tideglass II — engine: the DOM-free core of a heist. createGame builds one
// floor, updateGame advances it one tick (player, guards, beam, gadgets,
// pickups, exit, scoring). The browser loop and the Node simulation share it.
import {
  ARENA_W, ARENA_H, SMOKE_DURATION, SMOKE_RADIUS, NOISE_PEBBLE_RADIUS,
  NOISE_BELL_RADIUS, BEAM_ALERT_TIME, SCORE_TREASURE, SCORE_RELIC,
  SCORE_GHOST, FLOOR_PAR_SECONDS, TIME_BONUS_PER_SECOND,
} from './config.js';
import { FLOORS, freshFloor, solidsOf, coverAt } from './levels.js';
import { makeGuard, updateGuard, guardCaughtPlayer } from './guard.js';
import { makePlayer, updatePlayer } from './player.js';
import { inBeam } from './vision.js';

export function createGame(floorIndex = 0) {
  const floor = freshFloor(floorIndex);
  const player = makePlayer(floor.start);
  return {
    floorIndex, floor,
    player,
    guards: floor.guards.map(makeGuard),
    solids: solidsOf(floor),
    smokeClouds: [], // {x, y, r, ttl}
    pebbles: [], // flying pebbles {x, y, tx, ty, speed}
    noiseEvents: [],
    bellRings: [], // {x, y, ttl} visual ring
    time: 0,
    score: 0,
    treasuresTaken: 0,
    relicTaken: false,
    exitOpen: false,
    status: 'playing', // playing | caught | floorClear | won
    caughtBy: null,
    alertRaised: false, // any guard reached full suspicion this floor
    beamExposure: 0,
    beamAlerted: false,
    message: '',
    messageTimer: 0,
    floorScore: 0,
  };
}

function addScore(g, points, label) {
  g.score += points;
  g.floorScore += points;
  g.message = label;
  g.messageTimer = 2.2;
}

export function throwPebble(g, tx, ty) {
  if (g.player.gadgets.pebbles <= 0) return false;
  g.player.gadgets.pebbles -= 1;
  const dx = tx - g.player.x, dy = ty - g.player.y;
  const d = Math.hypot(dx, dy) || 1;
  const land = Math.min(d, 320);
  g.pebbles.push({
    x: g.player.x, y: g.player.y,
    tx: g.player.x + (dx / d) * land, ty: g.player.y + (dy / d) * land,
    speed: 520,
  });
  return true;
}

export function useSmoke(g) {
  if (g.player.gadgets.smoke <= 0) return false;
  g.player.gadgets.smoke -= 1;
  g.smokeClouds.push({ x: g.player.x, y: g.player.y, r: SMOKE_RADIUS, ttl: SMOKE_DURATION });
  return true;
}

export function ringBell(g) {
  if (g.player.gadgets.bells <= 0) return false;
  g.player.gadgets.bells -= 1;
  // Ring at the far corner from the player: guards march away from the thief.
  const fx = g.player.x < ARENA_W / 2 ? ARENA_W - 120 : 120;
  const fy = g.player.y < ARENA_H / 2 ? ARENA_H - 120 : 120;
  g.noiseEvents.push({ x: fx, y: fy, radius: NOISE_BELL_RADIUS, strong: true });
  g.bellRings.push({ x: fx, y: fy, ttl: 1.2 });
  return true;
}

export function updateGame(g, dt, input) {
  if (g.status !== 'playing') return g;
  g.time += dt;
  g.noiseEvents = [];
  if (g.messageTimer > 0) g.messageTimer -= dt;

  // Player movement + stamina.
  updatePlayer(g.player, dt, input, g.floor);

  // Gadget triggers from input (edge-triggered by the caller via input flags).
  if (input.throwPebble) { throwPebble(g, input.throwX ?? g.player.x, input.throwY ?? g.player.y); input.throwPebble = false; }
  if (input.useSmoke) { useSmoke(g); input.useSmoke = false; }
  if (input.ringBell) { ringBell(g); input.ringBell = false; }

  // Flying pebbles land with a noise burst that lures guards.
  for (const p of g.pebbles) {
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= step) {
      p.x = p.tx; p.y = p.ty; p.landed = true;
      g.noiseEvents.push({ x: p.x, y: p.y, radius: NOISE_PEBBLE_RADIUS, strong: false });
    } else {
      p.x += (dx / d) * step; p.y += (dy / d) * step;
    }
  }
  g.pebbles = g.pebbles.filter((p) => !p.landed);
  for (const c of g.smokeClouds) c.ttl -= dt;
  g.smokeClouds = g.smokeClouds.filter((c) => c.ttl > 0);
  for (const b of g.bellRings) b.ttl -= dt;
  g.bellRings = g.bellRings.filter((b) => b.ttl > 0);

  // Rotating lighthouse beam: standing in it fills exposure; full exposure
  // alerts every guard at once.
  const beam = g.floor.beam;
  if (beam) {
    beam.angle += beam.speed * dt;
    const cover = coverAt(g.floor, g.player.x, g.player.y);
    if (cover !== 'grass' && inBeam(beam, g.player.x, g.player.y, g.solids)) {
      g.beamExposure = Math.min(1, g.beamExposure + dt / BEAM_ALERT_TIME);
      if (g.beamExposure >= 1 && !g.beamAlerted) {
        g.beamAlerted = true;
        g.alertRaised = true;
        for (const gd of g.guards) {
          gd.state = 'chase';
          gd.lastSeen = { x: g.player.x, y: g.player.y };
          gd.suspicion = 1;
        }
        g.message = 'The beam caught you — every warden is coming!';
        g.messageTimer = 3;
      }
    } else {
      g.beamExposure = Math.max(0, g.beamExposure - dt * 0.6);
    }
  }

  // Guards.
  const ctx = {
    player: g.player,
    solids: g.solids,
    floor: g.floor,
    smokeClouds: g.smokeClouds,
    noiseEvents: g.noiseEvents,
    playerSprinting: g.player.sprinting,
    time: g.time,
    onAlert: () => { g.alertRaised = true; },
  };
  for (const gd of g.guards) updateGuard(gd, dt, ctx);

  // Caught only on touch.
  for (const gd of g.guards) {
    if (guardCaughtPlayer(gd, g.player)) {
      g.status = 'caught';
      g.caughtBy = gd;
      return g;
    }
  }

  // Pickups: treasures and the relic.
  for (const t of g.floor.treasures) {
    if (!t.taken && Math.hypot(t.x - g.player.x, t.y - g.player.y) < 30) {
      t.taken = true;
      g.treasuresTaken += 1;
      addScore(g, SCORE_TREASURE, t.kind === 'pearl' ? 'Black pearl +50' : 'Coin +50');
    }
  }
  if (!g.relicTaken && Math.hypot(g.floor.relic.x - g.player.x, g.floor.relic.y - g.player.y) < 34) {
    g.relicTaken = true;
    g.exitOpen = true;
    addScore(g, SCORE_RELIC, `${g.floor.relic.name} stolen! The exit is open.`);
  }

  // Exit: only open once the relic is taken.
  if (g.exitOpen && Math.hypot(g.floor.exit.x - g.player.x, g.floor.exit.y - g.player.y) < 34) {
    const timeBonus = Math.max(0, Math.round((FLOOR_PAR_SECONDS[g.floorIndex] - g.time) * TIME_BONUS_PER_SECOND));
    const ghost = g.alertRaised ? 0 : SCORE_GHOST;
    g.score += timeBonus + ghost;
    g.floorScore += timeBonus + ghost;
    g.message = ghost > 0 ? `Ghost! +${SCORE_GHOST}  Time +${timeBonus}` : `Time bonus +${timeBonus}`;
    g.status = g.floorIndex >= FLOORS.length - 1 ? 'won' : 'floorClear';
  }
  return g;
}

export function nextFloor(g) {
  return createGame(g.floorIndex + 1);
}

export function totalFloors() { return FLOORS.length; }
