// Tideglass II — the five heists. Each floor is pure data: walls and crates block
// movement and sight, sea-grass hides, shadow pools halve detection, lamplight
// raises it, guards patrol waypoints, treasures are optional, the exit stays
// locked until the relic is taken. Guards: 2+3+3+4+5 = 17. Treasures: 32.
import { ARENA_W, ARENA_H } from './config.js';

export function rect(x, y, w, h) { return { x, y, w, h }; }
export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
export function pointInAnyRect(px, py, list) {
  for (const r of list) if (pointInRect(px, py, r)) return true;
  return false;
}
// Circle vs rect: push the circle out and report whether it hit.
export function collideCircleRect(px, py, radius, r) {
  const cx = Math.max(r.x, Math.min(px, r.x + r.w));
  const cy = Math.max(r.y, Math.min(py, r.y + r.h));
  const dx = px - cx, dy = py - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= radius * radius) return null;
  const d = Math.sqrt(d2) || 0.001;
  const push = radius - d;
  return { x: px + (dx / d) * push, y: py + (dy / d) * push };
}

const BORDER = [
  rect(0, 0, ARENA_W, 26), rect(0, ARENA_H - 26, ARENA_W, 26),
  rect(0, 0, 26, ARENA_H), rect(ARENA_W - 26, 0, 26, ARENA_H),
];

function guard(x, y, waypoints, pause = 2.2) {
  return { x, y, waypoints, pause, range: 250, fov: Math.PI * 0.62 };
}
function treasure(x, y, kind = 'coin') { return { x, y, kind, taken: false }; }

export const FLOORS = [
  {
    name: 'Heist 1 — The Boathouse',
    sub: 'Slip past the dock wardens. The Brass Compass waits in the dry dock.',
    relic: { x: 1150, y: 130, name: 'Brass Compass', taken: false },
    relicRoom: 'Dry Dock',
    exit: { x: 1150, y: 690 },
    start: { x: 90, y: 690 },
    beam: null,
    walls: [...BORDER,
      rect(300, 26, 24, 300), rect(300, 470, 24, 304),
      rect(640, 200, 24, 420), rect(920, 26, 24, 260), rect(920, 430, 24, 344)],
    crates: [rect(420, 120, 70, 70), rect(760, 620, 70, 70), rect(1020, 420, 70, 70),
      rect(180, 330, 70, 70), rect(520, 330, 60, 60)],
    grass: [rect(60, 90, 190, 120), rect(350, 600, 210, 140), rect(980, 220, 180, 120)],
    shadows: [rect(360, 60, 240, 120), rect(700, 380, 200, 140), rect(60, 420, 170, 120)],
    lamps: [{ x: 480, y: 260, r: 130 }, { x: 830, y: 120, r: 120 }, { x: 1080, y: 560, r: 130 }],
    guards: [
      guard(480, 430, [[480, 430], [480, 150], [820, 150], [820, 430]]),
      guard(1010, 300, [[1010, 300], [1010, 620], [760, 620]]),
    ],
    treasures: [treasure(150, 150), treasure(560, 90), treasure(760, 300, 'pearl'),
      treasure(430, 700), treasure(880, 700), treasure(1180, 330, 'pearl')],
  },
  {
    name: 'Heist 2 — The Lamp Gallery',
    sub: 'The lighthouse beam sweeps the gallery now. Mind the light.',
    relic: { x: 640, y: 100, name: 'First Lens', taken: false },
    relicRoom: 'Lens Alcove',
    exit: { x: 90, y: 690 },
    start: { x: 1150, y: 690 },
    beam: { x: 640, y: 400, length: 560, halfAngle: 0.16, speed: 0.55, angle: 0 },
    walls: [...BORDER,
      rect(220, 200, 300, 24), rect(760, 200, 300, 24),
      rect(220, 560, 300, 24), rect(760, 560, 300, 24),
      rect(520, 320, 240, 24), rect(520, 470, 240, 24)],
    crates: [rect(150, 90, 70, 70), rect(1060, 90, 70, 70), rect(150, 640, 70, 70),
      rect(1060, 640, 70, 70), rect(600, 620, 80, 60)],
    grass: [rect(60, 300, 130, 180), rect(1090, 300, 130, 180), rect(560, 60, 160, 90)],
    shadows: [rect(260, 260, 200, 120), rect(820, 420, 200, 120), rect(560, 690, 160, 70)],
    lamps: [{ x: 370, y: 400, r: 120 }, { x: 910, y: 400, r: 120 }, { x: 640, y: 230, r: 110 }],
    guards: [
      guard(370, 300, [[370, 300], [370, 500], [640, 500], [640, 300]]),
      guard(910, 500, [[910, 500], [910, 300], [640, 300]]),
      guard(640, 680, [[640, 680], [300, 680], [980, 680]]),
    ],
    treasures: [treasure(120, 400), treasure(1160, 400), treasure(640, 150, 'pearl'),
      treasure(280, 640), treasure(1000, 640), treasure(640, 560)],
  },
  {
    name: 'Heist 3 — The Lantern Room',
    sub: 'The great lantern turns above the stairwell. Take the Tideglass itself.',
    relic: { x: 640, y: 400, name: 'The Tideglass', taken: false },
    relicRoom: 'Lantern Core',
    exit: { x: 1150, y: 110 },
    start: { x: 90, y: 110 },
    beam: { x: 640, y: 400, length: 620, halfAngle: 0.13, speed: 0.7, angle: 1.2 },
    walls: [...BORDER,
      rect(300, 300, 24, 200), rect(956, 300, 24, 200),
      rect(440, 140, 24, 180), rect(816, 480, 24, 180),
      rect(440, 620, 400, 24)],
    crates: [rect(180, 620, 70, 70), rect(1030, 620, 70, 70), rect(500, 250, 70, 70),
      rect(710, 500, 70, 70), rect(900, 140, 70, 70)],
    grass: [rect(60, 300, 160, 200), rect(1060, 300, 160, 200), rect(560, 680, 160, 80)],
    shadows: [rect(340, 60, 220, 120), rect(720, 620, 220, 110), rect(60, 620, 150, 110)],
    lamps: [{ x: 640, y: 250, r: 130 }, { x: 300, y: 560, r: 120 }, { x: 980, y: 560, r: 120 }],
    guards: [
      guard(450, 200, [[450, 200], [830, 200], [830, 580], [450, 580]]),
      guard(200, 400, [[200, 400], [200, 130], [450, 130]]),
      guard(1080, 400, [[1080, 400], [1080, 660], [830, 660]]),
    ],
    treasures: [treasure(150, 150), treasure(1130, 150), treasure(640, 90, 'pearl'),
      treasure(150, 700), treasure(1130, 700), treasure(640, 720), treasure(950, 350, 'pearl')],
  },
  {
    name: 'Heist 4 — The Cistern Vault',
    sub: 'Below the lighthouse, a flooded vault. The beam cannot reach down here — the wardens can.',
    relic: { x: 1150, y: 400, name: 'Sunken Crown', taken: false },
    relicRoom: 'Flooded Vault',
    exit: { x: 90, y: 400 },
    start: { x: 90, y: 110 },
    beam: { x: 640, y: 400, length: 420, halfAngle: 0.2, speed: 0.45, angle: 2.4 },
    walls: [...BORDER,
      rect(260, 26, 24, 240), rect(260, 400, 24, 374),
      rect(620, 200, 24, 400), rect(980, 26, 24, 240), rect(980, 400, 24, 374),
      rect(420, 620, 340, 24)],
    crates: [rect(380, 120, 70, 70), rect(760, 120, 70, 70), rect(380, 480, 70, 70),
      rect(760, 480, 70, 70), rect(560, 330, 60, 60)],
    grass: [rect(60, 200, 170, 130), rect(1060, 200, 170, 130), rect(480, 60, 320, 90),
      rect(480, 690, 320, 80), rect(60, 290, 150, 130)],
    shadows: [rect(320, 300, 220, 140), rect(740, 300, 220, 140), rect(60, 560, 170, 140)],
    lamps: [{ x: 450, y: 220, r: 120 }, { x: 830, y: 560, r: 120 }, { x: 1080, y: 400, r: 130 }],
    guards: [
      guard(450, 350, [[450, 380], [450, 300], [830, 300], [830, 380]]),
      guard(830, 650, [[830, 650], [450, 650], [450, 430]]),
      guard(1080, 250, [[1080, 250], [1080, 560], [900, 560]]),
      guard(220, 620, [[220, 620], [220, 480], [430, 480]]),
    ],
    treasures: [treasure(150, 650), treasure(1130, 120), treasure(640, 90, 'pearl'),
      treasure(640, 690), treasure(350, 560), treasure(930, 230, 'pearl')],
  },
  {
    name: 'Heist 5 — The Beacon Crown',
    sub: 'The crown of the lighthouse. Five wardens, one last relic: the Beacon Heart.',
    relic: { x: 640, y: 130, name: 'Beacon Heart', taken: false },
    relicRoom: 'Crown Chamber',
    exit: { x: 640, y: 710 },
    start: { x: 90, y: 710 },
    beam: { x: 640, y: 400, length: 640, halfAngle: 0.12, speed: 0.85, angle: 0.6 },
    walls: [...BORDER,
      rect(200, 180, 24, 300), rect(1056, 180, 24, 300),
      rect(400, 300, 200, 24), rect(680, 470, 200, 24),
      rect(520, 560, 80, 24)],
    crates: [rect(120, 120, 70, 70), rect(1090, 120, 70, 70), rect(120, 610, 70, 70),
      rect(1090, 610, 70, 70), rect(700, 360, 80, 60)],
    grass: [rect(60, 260, 120, 260), rect(1100, 260, 120, 260), rect(560, 180, 160, 90),
      rect(560, 590, 160, 80), rect(460, 380, 170, 100), rect(600, 280, 130, 80)],
    shadows: [rect(260, 540, 220, 130), rect(800, 90, 220, 130), rect(560, 620, 160, 90)],
    lamps: [{ x: 640, y: 300, r: 140 }, { x: 320, y: 400, r: 120 }, { x: 960, y: 400, r: 120 }],
    guards: [
      guard(400, 250, [[400, 250], [520, 250], [520, 340], [400, 340]]),
      guard(250, 620, [[250, 620], [250, 350], [360, 350]]),
      guard(1030, 620, [[1030, 620], [1030, 350], [860, 350]]),
      guard(300, 520, [[300, 520], [300, 650], [540, 650]]),
      guard(640, 200, [[640, 200], [300, 200], [980, 200]]),
    ],
    treasures: [treasure(90, 400), treasure(1190, 400), treasure(640, 90, 'pearl'),
      treasure(300, 700), treasure(980, 700), treasure(450, 640), treasure(830, 640, 'pearl')],
  },
];

export function totalGuards() { return FLOORS.reduce((n, f) => n + f.guards.length, 0); }
export function totalTreasures() { return FLOORS.reduce((n, f) => n + f.treasures.length, 0); }
// Deep-clone a floor definition so a playthrough never mutates the table.
export function freshFloor(index) {
  return JSON.parse(JSON.stringify(FLOORS[index]));
}
// Where the player is standing: 'grass' | 'shadow' | 'lamp' | 'open'.
export function coverAt(floor, x, y) {
  if (pointInAnyRect(x, y, floor.grass)) return 'grass';
  if (pointInAnyRect(x, y, floor.shadows)) return 'shadow';
  for (const lamp of floor.lamps) {
    const dx = x - lamp.x, dy = y - lamp.y;
    if (dx * dx + dy * dy <= lamp.r * lamp.r) return 'lamp';
  }
  return 'open';
}
export function solidsOf(floor) { return [...floor.walls, ...floor.crates]; }
