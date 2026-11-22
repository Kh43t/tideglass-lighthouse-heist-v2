// Tideglass II — entry point: game loop, screens, HUD wiring, sound triggers,
// screenshot staging (?shot=start|play|chase|end&floor=N&freeze=1).
import { createGame, updateGame, nextFloor, totalFloors } from './engine.js';
import { FLOORS } from './levels.js';
import { Input } from './input.js';
import { SoundFX } from './audio.js';
import {
  drawWorld, drawHUD, drawTitle, drawCaught, drawFloorClear, drawWin, drawFloorIntro,
} from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const input = new Input(canvas);
const sfx = new SoundFX();

let screen = 'title'; // title | play | caught | floorClear | won
let game = createGame(0);
let introTimer = 0;
let lastStepSound = 0;
let prevTreasures = 0;
let prevRelic = false;
let prevAlert = false;
let prevStatus = 'playing';
let freeze = params.get('freeze') === '1';

// Screenshot staging: ?shot=play&floor=1 renders a composed scene.
const shot = params.get('shot');
if (shot) {
  const floorIdx = Math.max(0, Math.min(totalFloors() - 1, Number(params.get('floor') ?? 0)));
  game = stageShot(shot, floorIdx);
  screen = 'play';
  introTimer = 0;
  if (shot === 'end') screen = 'play';
}

function setStatus(text) { statusEl.textContent = text; }

function startFloor(index) {
  game = createGame(index);
  screen = 'play';
  introTimer = 2.6;
  prevTreasures = 0; prevRelic = false; prevAlert = false; prevStatus = 'playing';
  setStatus(`${game.floor.name}. Steal the ${game.floor.relic.name}, then reach the exit.`);
}

function onKeyAdvance() {
  sfx.ensure();
  if (screen === 'title') { startFloor(0); }
  else if (screen === 'caught') { startFloor(game.floorIndex); }
  else if (screen === 'floorClear') {
    const next = game.floorIndex + 1;
    if (next < totalFloors()) startFloor(next);
  } else if (screen === 'won') { startFloor(0); }
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (screen !== 'play') {
    if (k === 'r' && screen === 'caught') { startFloor(game.floorIndex); return; }
    if (k === 'enter' && screen === 'won') { startFloor(0); return; }
    if (screen !== 'play') { onKeyAdvance(); return; }
  }
  if (k === 'm') { sfx.muted = !sfx.muted; }
});
canvas.addEventListener('mousedown', () => { if (screen !== 'play') onKeyAdvance(); });

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (screen === 'play' && !freeze) {
    if (introTimer > 0) introTimer -= dt;
    const before = { treasures: game.treasuresTaken, relic: game.relicTaken, alert: game.alertRaised };
    updateGame(game, dt, input);
    // Sound triggers on state changes.
    if (game.treasuresTaken > before.treasures) sfx.pickup('coin');
    if (game.relicTaken && !before.relic) sfx.relic();
    if (game.alertRaised && !before.alert) sfx.alarm();
    if (game.status === 'caught' && prevStatus === 'playing') { sfx.caught(); screen = 'caught'; }
    if (game.status === 'floorClear') { sfx.floorClear(); screen = 'floorClear'; }
    if (game.status === 'won') { sfx.win(); screen = 'won'; }
    prevStatus = game.status;
    // Footsteps: the thief's and the nearest guard's, panned by x.
    if (game.player.moving && now - lastStepSound > (game.player.sprinting ? 220 : 380)) {
      lastStepSound = now;
      sfx.footstep(game.player.x, game.player.sprinting);
    }
  }
  // --- Draw.
  ctx.clearRect(0, 0, 1280, 800);
  if (screen === 'title') {
    drawWorld(ctx, game);
    drawTitle(ctx);
  } else {
    drawWorld(ctx, game);
    drawHUD(ctx, game, game.score);
    if (screen === 'play' && introTimer > 0) drawFloorIntro(ctx, game);
    if (screen === 'caught') drawCaught(ctx, game);
    if (screen === 'floorClear') {
      const nextName = game.floorIndex + 1 < totalFloors() ? FLOORS[game.floorIndex + 1].name : 'The Beacon Crown';
      drawFloorClear(ctx, game, nextName);
    }
    if (screen === 'won') drawWin(ctx, game);
  }
  if (!freeze) requestAnimationFrame(frame);
}

// First frame immediately so ?freeze=1 screenshots still render.
requestAnimationFrame(frame);
window.__tideglass = { get game() { return game; }, get screen() { return screen; }, startFloor };
