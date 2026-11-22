// Tideglass II — staged scenes for screenshots (?shot=...&floor=N&freeze=1).
// Each scene places the thief, a guard and the exit in one readable frame.
import { createGame } from './engine.js';
import { coverAt } from './levels.js';

function placePlayer(g, x, y) {
  g.player.x = x; g.player.y = y;
  g.player.facing = Math.PI / 4;
}

export function stageShot(name, floorIndex) {
  const g = createGame(floorIndex);
  if (name === 'start') {
    // Title-adjacent opening frame: thief at the dock, guard cone ahead.
    placePlayer(g, 120, 700);
    g.guards[0].x = 480; g.guards[0].y = 430; g.guards[0].facing = Math.PI;
    g.message = '';
  } else if (name === 'play') {
    // The money shot: thief hidden in sea-grass, a vision cone sweeping past,
    // the locked exit and the relic all in frame.
    const floor = g.floor;
    const grass = floor.grass[0];
    placePlayer(g, grass.x + grass.w / 2, grass.y + grass.h / 2);
    g.guards[0].x = grass.x + grass.w + 90;
    g.guards[0].y = grass.y + grass.h / 2;
    g.guards[0].facing = Math.PI;
    g.guards[0].suspicion = 0.55;
    g.guards[0].state = 'investigate';
    g.guards[0].target = { x: g.player.x, y: g.player.y };
    if (g.guards[1]) {
      g.guards[1].x = floor.exit.x - 160;
      g.guards[1].y = floor.exit.y - 60;
      g.guards[1].facing = -Math.PI / 2;
    }
    if (floor.beam) floor.beam.angle = Math.atan2(g.player.y - floor.beam.y, g.player.x - floor.beam.x) + 0.5;
    g.message = 'Hidden in the sea-grass — the warden is suspicious, not sure.';
    g.messageTimer = 999;
  } else if (name === 'chase') {
    // Alarm moment: beam exposure high, a guard chasing, smoke deployed.
    placePlayer(g, 640, 500);
    g.player.gadgets.smoke = 1;
    g.smokeClouds.push({ x: 640, y: 500, r: 85, ttl: 4.5 });
    g.guards[0].x = 640; g.guards[0].y = 330;
    g.guards[0].facing = Math.PI / 2;
    g.guards[0].state = 'chase';
    g.guards[0].suspicion = 1;
    g.guards[0].lastSeen = { x: 640, y: 500 };
    if (g.floor.beam) { g.beamExposure = 0.8; g.floor.beam.angle = Math.PI / 2; }
    g.message = 'SPOTTED — smoke breaks the line of sight. Run!';
    g.messageTimer = 999;
  } else if (name === 'end') {
    // Victory frame on the final floor: relic taken, exit open, thief escaping.
    const last = createGame(4);
    last.relicTaken = true;
    last.exitOpen = true;
    last.treasuresTaken = 5;
    last.score = 2840;
    last.floorScore = 940;
    placePlayer(last, 640, 620);
    last.player.facing = Math.PI / 2;
    last.guards[0].x = 400; last.guards[0].y = 250; last.guards[0].facing = 0;
    last.guards[1].x = 1030; last.guards[1].y = 620; last.guards[1].facing = Math.PI;
    last.message = 'Beacon Heart stolen! The exit is open.';
    last.messageTimer = 999;
    return last;
  }
  return g;
}

export function shotCover(g) {
  return coverAt(g.floor, g.player.x, g.player.y);
}
