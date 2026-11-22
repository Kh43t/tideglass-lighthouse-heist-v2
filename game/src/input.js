// Tideglass II — keyboard + mouse input. Click throws a pebble toward the
// cursor; Q also throws, E puffs smoke, R rings the bell.
export class Input {
  constructor(canvas) {
    this.up = false; this.down = false; this.left = false; this.right = false;
    this.sprint = false; this.sneak = false;
    this.throwPebble = false; this.throwX = 0; this.throwY = 0;
    this.useSmoke = false; this.ringBell = false;
    this.mouseX = 0; this.mouseY = 0;
    this.anyKey = false;
    this._keys = new Set();
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (e.repeat) return;
      this._keys.add(e.key.toLowerCase());
      this.anyKey = true;
      this.syncKeys();
      if (e.key.toLowerCase() === 'q') { this.throwPebble = true; this.throwX = this.mouseX; this.throwY = this.mouseY; }
      if (e.key.toLowerCase() === 'e') this.useSmoke = true;
      if (e.key.toLowerCase() === 'r') this.ringBell = true;
    });
    window.addEventListener('keyup', (e) => {
      this._keys.delete(e.key.toLowerCase());
      this.syncKeys();
    });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - r.left) / r.width) * 1280;
      this.mouseY = ((e.clientY - r.top) / r.height) * 800;
    });
    canvas.addEventListener('mousedown', (e) => {
      const r = canvas.getBoundingClientRect();
      this.throwX = ((e.clientX - r.left) / r.width) * 1280;
      this.throwY = ((e.clientY - r.top) / r.height) * 800;
      this.mouseX = this.throwX; this.mouseY = this.throwY;
      this.throwPebble = true;
      this.anyKey = true;
    });
    window.addEventListener('blur', () => { this._keys.clear(); this.syncKeys(); });
  }
  syncKeys() {
    const k = this._keys;
    this.up = k.has('w') || k.has('arrowup');
    this.down = k.has('s') || k.has('arrowdown');
    this.left = k.has('a') || k.has('arrowleft');
    this.right = k.has('d') || k.has('arrowright');
    this.sprint = k.has('shift');
    this.sneak = k.has('c') || k.has('control');
  }
}
