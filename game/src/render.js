// Tideglass II — canvas rendering: floor, cover zones, walls, crates, beam,
// vision cones, guards, player, treasures, relic, exit, gadgets, HUD, screens.
import { ARENA_W, ARENA_H, COLORS } from './config.js';
import { conePolygon } from './vision.js';
import { totalGuards, totalTreasures } from './levels.js';

function drawRect(ctx, r, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.strokeRect(r.x, r.y, r.w, r.h); }
}

function drawCone(ctx, g, solids) {
  const poly = conePolygon(g.x, g.y, g.facing, g.fov, g.range, solids);
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fillStyle = g.state === 'chase' ? COLORS.coneAlert
    : g.suspicion >= 0.5 ? COLORS.coneSuspicious : COLORS.coneCalm;
  ctx.fill();
}

function drawGuard(ctx, g) {
  const alert = g.state === 'chase';
  ctx.beginPath();
  ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
  ctx.fillStyle = alert ? COLORS.guardAlert : COLORS.guard;
  ctx.fill();
  ctx.strokeStyle = '#1a1206'; ctx.lineWidth = 2; ctx.stroke();
  // Facing tick + lantern dot.
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(g.facing) * 20, g.y + Math.sin(g.facing) * 20);
  ctx.strokeStyle = '#fff2c0'; ctx.lineWidth = 3; ctx.stroke();
  // Suspicion meter above the head.
  if (g.suspicion > 0.05) {
    ctx.fillStyle = '#101418';
    ctx.fillRect(g.x - 16, g.y - 30, 32, 6);
    ctx.fillStyle = g.suspicion >= 1 ? '#ff3b30' : g.suspicion >= 0.5 ? '#ff9f0a' : '#ffd60a';
    ctx.fillRect(g.x - 16, g.y - 30, 32 * g.suspicion, 6);
  }
  if (g.state === 'chase') {
    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', g.x, g.y - 36);
  }
}

function drawPlayer(ctx, p) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.playerCloak;
  ctx.fill();
  ctx.strokeStyle = COLORS.player; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath();
  ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.player;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.facing) * 19, p.y + Math.sin(p.facing) * 19);
  ctx.strokeStyle = COLORS.player; ctx.lineWidth = 2; ctx.stroke();
}

export function drawWorld(ctx, g) {
  const floor = g.floor;
  // Floor: two-tone stone tiles.
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  ctx.fillStyle = COLORS.floorAlt;
  for (let y = 26; y < ARENA_H - 26; y += 80) {
    for (let x = 26 + ((y / 80) % 2) * 40; x < ARENA_W - 26; x += 80) {
      ctx.fillRect(x, y, 78, 78);
    }
  }
  // Shadow pools (half detection) and sea-grass (full hide).
  for (const s of floor.shadows) drawRect(ctx, s, COLORS.shadow, '#16283f');
  for (const gr of floor.grass) {
    drawRect(ctx, gr, COLORS.grass, COLORS.grassEdge);
    ctx.strokeStyle = COLORS.grassEdge; ctx.lineWidth = 2;
    for (let i = 0; i < gr.w / 22; i++) {
      for (let j = 0; j < gr.h / 22; j++) {
        const bx = gr.x + 12 + i * 22, by = gr.y + 12 + j * 22;
        ctx.beginPath();
        ctx.moveTo(bx, by); ctx.lineTo(bx - 3, by - 9); ctx.moveTo(bx, by); ctx.lineTo(bx + 3, by - 9);
        ctx.stroke();
      }
    }
  }
  // Lamplight pools (1.7x detection).
  for (const lamp of floor.lamps) {
    const grad = ctx.createRadialGradient(lamp.x, lamp.y, 6, lamp.x, lamp.y, lamp.r);
    grad.addColorStop(0, COLORS.lampGlow);
    grad.addColorStop(1, 'rgba(255, 210, 122, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y, lamp.r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.lamp; ctx.fill();
  }
  // Rotating lighthouse beam.
  const beam = floor.beam;
  if (beam) {
    ctx.save();
    ctx.translate(beam.x, beam.y);
    ctx.rotate(beam.angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, beam.length, -beam.halfAngle, beam.halfAngle);
    ctx.closePath();
    ctx.fillStyle = COLORS.beam;
    ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(beam.x, beam.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#fff7cc'; ctx.fill();
    ctx.strokeStyle = '#d8b25a'; ctx.lineWidth = 3; ctx.stroke();
  }
  // Walls and crates (crates cut sight lines too).
  for (const w of floor.walls) drawRect(ctx, w, COLORS.wall, COLORS.wallTop);
  for (const c of floor.crates) {
    drawRect(ctx, c, COLORS.crate, COLORS.crateTop);
    ctx.strokeStyle = COLORS.crateTop; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.w, c.y + c.h);
    ctx.moveTo(c.x + c.w, c.y); ctx.lineTo(c.x, c.y + c.h);
    ctx.stroke();
  }
  // Exit door: locked red until the relic is taken, then open green.
  const ex = floor.exit;
  ctx.fillStyle = g.exitOpen ? COLORS.exitOpen : COLORS.exitLocked;
  ctx.fillRect(ex.x - 26, ex.y - 26, 52, 52);
  ctx.fillStyle = '#0a1420';
  ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(g.exitOpen ? 'EXIT' : 'LOCKED', ex.x, ex.y + 4);
  ctx.strokeStyle = g.exitOpen ? '#1d7a3a' : '#7a1d1d'; ctx.lineWidth = 3;
  ctx.strokeRect(ex.x - 26, ex.y - 26, 52, 52);
  // Treasures.
  for (const t of floor.treasures) {
    if (t.taken) continue;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.kind === 'pearl' ? 10 : 7, 0, Math.PI * 2);
    ctx.fillStyle = t.kind === 'pearl' ? '#1a1a2e' : COLORS.treasure;
    ctx.fill();
    ctx.strokeStyle = t.kind === 'pearl' ? '#7df9d8' : '#a87f00';
    ctx.lineWidth = 2; ctx.stroke();
  }
  // Relic: glowing diamond.
  if (!g.relicTaken) {
    const r = floor.relic;
    const pulse = 10 + Math.sin(g.time * 3) * 3;
    ctx.beginPath();
    ctx.arc(r.x, r.y, pulse + 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(125, 249, 216, 0.18)'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r.x, r.y - pulse); ctx.lineTo(r.x + pulse, r.y);
    ctx.lineTo(r.x, r.y + pulse); ctx.lineTo(r.x - pulse, r.y);
    ctx.closePath();
    ctx.fillStyle = COLORS.relic; ctx.fill();
    ctx.strokeStyle = '#0a5c46'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#eaf6ff';
    ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(floor.relic.name, r.x, r.y - pulse - 14);
  }
  // Vision cones under the guards, then guards, then the player.
  for (const gd of g.guards) drawCone(ctx, gd, g.solids);
  for (const gd of g.guards) drawGuard(ctx, gd);
  drawPlayer(ctx, g.player);
  // Smoke clouds break line of sight.
  for (const c of g.smokeClouds) {
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.smoke; ctx.fill();
  }
  // Flying pebbles and bell rings.
  for (const p of g.pebbles) {
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#cfd8e3'; ctx.fill();
  }
  for (const b of g.bellRings) {
    ctx.beginPath(); ctx.arc(b.x, b.y, 30 + (1.2 - b.ttl) * 60, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 214, 90, ${b.ttl})`; ctx.lineWidth = 3; ctx.stroke();
  }
  // Beam exposure warning.
  if (g.beamExposure > 0.05) {
    ctx.fillStyle = '#101418';
    ctx.fillRect(ARENA_W / 2 - 110, 66, 220, 16);
    ctx.fillStyle = '#ffe27a';
    ctx.fillRect(ARENA_W / 2 - 110, 66, 220 * g.beamExposure, 16);
    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('BEAM EXPOSURE — GET OUT OF THE LIGHT', ARENA_W / 2, 58);
  }
}

export function drawHUD(ctx, g, totalScore) {
  ctx.fillStyle = 'rgba(8, 16, 26, 0.85)';
  ctx.fillRect(0, 0, ARENA_W, 40);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`${g.floor.name}  ·  Floor ${g.floorIndex + 1}/5`, 14, 26);
  const taken = g.floor.treasures.filter((t) => t.taken).length;
  ctx.fillText(`Relic: ${g.relicTaken ? 'STOLEN ✓' : g.floor.relic.name}   Treasures ${taken}/${g.floor.treasures.length}`, 430, 26);
  ctx.fillText(`Pebbles ${g.player.gadgets.pebbles} · Smoke ${g.player.gadgets.smoke} · Bell ${g.player.gadgets.bells}`, 800, 26);
  ctx.fillText(`Score ${totalScore}`, 1130, 26);
  // Stamina bar.
  ctx.fillStyle = '#101418';
  ctx.fillRect(14, ARENA_H - 26, 180, 12);
  ctx.fillStyle = g.player.stamina > 30 ? '#4ade80' : '#ff9f0a';
  ctx.fillRect(14, ARENA_H - 26, 180 * (g.player.stamina / 100), 12);
  ctx.fillStyle = COLORS.hud;
  ctx.font = '12px sans-serif';
  ctx.fillText('STAMINA (Shift = sprint, noisy)', 200, ARENA_H - 15);
  ctx.fillText('WASD move · Click/Q pebble · E smoke · R bell · C sneak', 560, ARENA_H - 15);
  if (g.messageTimer > 0 && g.message) {
    ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe27a';
    ctx.fillText(g.message, ARENA_W / 2, 66);
  }
  // Cover hint under the player.
  const anyAlert = g.guards.some((gd) => gd.state === 'chase');
  if (anyAlert) {
    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('⚠ SPOTTED — BREAK LINE OF SIGHT!', ARENA_W / 2, ARENA_H - 44);
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(6, 12, 20, 0.82)';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  ctx.fillStyle = accent || '#eaf6ff';
  ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(title, ARENA_W / 2, 280);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '18px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, ARENA_W / 2, 330 + i * 32));
}

export function drawTitle(ctx) {
  overlay(ctx, 'TIDEGLASS II', [
    '5 heists · 17 guards · 32 treasures · 3 gadgets',
    'Steal the relic on each floor, then reach the EXIT unseen.',
    'Sea-grass hides you. Shadow halves detection. Lamplight exposes you.',
    'Pebble lures · Smoke breaks sight · Bell draws guards away.',
    'The lighthouse beam sweeps floors 2–5: do not stand in it.',
    '',
    'WASD / arrows to move · Shift sprint (noisy) · C sneak',
    'Click or Q throw pebble · E smoke · R bell',
    '',
    'Press any key to begin the first heist.',
  ], '#7df9d8');
}

export function drawCaught(ctx, g) {
  overlay(ctx, 'CAUGHT!', [
    `A warden laid hands on you on ${g.floor.name}.`,
    `Score kept: ${g.score}  ·  Treasures this floor: ${g.treasuresTaken}`,
    '',
    'Press R to retry this floor, or Enter for the title screen.',
  ], '#ff6b61');
}

export function drawFloorClear(ctx, g, nextName) {
  overlay(ctx, 'HEIST COMPLETE', [
    `${g.floor.name} — relic stolen, exit reached unseen... or not quite.`,
    g.message,
    `Floor score: ${g.floorScore}  ·  Total score: ${g.score}`,
    '',
    `Next: ${nextName}`,
    'Press any key to continue.',
  ], '#4ade80');
}

export function drawWin(ctx, g) {
  overlay(ctx, 'THE BEACON IS YOURS', [
    'All five heists complete. The Tideglass, the Crown, the Heart —',
    'every relic of the lighthouse now hangs in your satchel.',
    '',
    `Final score: ${g.score}   ·   Treasures: ${g.treasuresTaken} / ${totalTreasures()}`,
    `Guards outwitted: ${totalGuards()}  ·  Gadgets mastered: pebble, smoke, bell`,
    '',
    'Press Enter to play again from the Boathouse.',
  ], '#ffd94a');
}

export function drawFloorIntro(ctx, g) {
  ctx.fillStyle = 'rgba(6, 12, 20, 0.55)';
  ctx.fillRect(0, 300, ARENA_W, 120);
  ctx.fillStyle = '#7df9d8';
  ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(g.floor.name, ARENA_W / 2, 345);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '17px sans-serif';
  ctx.fillText(g.floor.sub, ARENA_W / 2, 380);
  ctx.fillText(`Relic: ${g.floor.relic.name} — in the ${g.floor.relicRoom}`, ARENA_W / 2, 408);
}
