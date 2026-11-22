// Tideglass II — shared constants: arena size, speeds, detection tuning, scoring.
export const ARENA_W = 1280;
export const ARENA_H = 800;
export const PLAYER_RADIUS = 13;
export const GUARD_RADIUS = 14;
export const WALK_SPEED = 150;
export const SPRINT_SPEED = 235;
export const SNEAK_SPEED = 95;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 168;
export const GUARD_SEARCH_SPEED = 95;
export const STAMINA_MAX = 100;
export const STAMINA_DRAIN_SPRINT = 26;
export const STAMINA_DRAIN_SNEAK = 0;
export const STAMINA_REGEN = 16;
export const NOISE_WALK_RADIUS = 55;
export const NOISE_SPRINT_RADIUS = 170;
export const NOISE_PEBBLE_RADIUS = 260;
export const NOISE_BELL_RADIUS = 520;
export const DETECT_FILL_BASE = 1.15;
export const DETECT_DECAY = 0.55;
export const GRASS_HIDE_RADIUS = 46;
export const SHADOW_FACTOR = 0.5;
export const LAMP_FACTOR = 1.7;
export const BEAM_ALERT_TIME = 1.6;
export const SMOKE_DURATION = 4.5;
export const SMOKE_RADIUS = 85;
export const SCORE_TREASURE = 50;
export const SCORE_RELIC = 500;
export const SCORE_GHOST = 300;
export const FLOOR_PAR_SECONDS = [75, 90, 100, 110, 120];
export const TIME_BONUS_PER_SECOND = 10;
export const COLORS = {
  floor: '#1d2f45',
  floorAlt: '#1a2b40',
  wall: '#0d1622',
  wallTop: '#2c4a68',
  crate: '#6b4a2a',
  crateTop: '#8a6136',
  grass: '#1f5c33',
  grassEdge: '#2f8a4c',
  shadow: '#0e1e33',
  lamp: '#ffd27a',
  lampGlow: 'rgba(255, 210, 122, 0.20)',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneSuspicious: 'rgba(255, 150, 40, 0.30)',
  coneAlert: 'rgba(255, 60, 50, 0.34)',
  beam: 'rgba(255, 244, 180, 0.16)',
  player: '#e8f4ff',
  playerCloak: '#2e6f8e',
  guard: '#d8b25a',
  guardAlert: '#e5484d',
  treasure: '#ffd94a',
  relic: '#7df9d8',
  exitLocked: '#e5484d',
  exitOpen: '#4ade80',
  smoke: 'rgba(200, 210, 220, 0.55)',
  hud: '#eaf6ff',
};
