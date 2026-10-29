import { clamp } from './util.js';

const P1_KEYS = {
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  KeyJ: 'pass', KeyK: 'shoot', KeyL: 'dribble', KeyH: 'tackle',
  ShiftLeft: 'sprint', ShiftRight: 'sprint'
};
const P2_KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  Digit1: 'pass', Digit2: 'shoot', Digit3: 'dribble', Digit4: 'tackle', Digit5: 'sprint'
};
const PAUSE_KEYS = new Set(['Escape', 'KeyP']);

function blankPlayer() {
  return { move: { x: 0, y: 0 }, mag: 0, down: new Set(), just: new Set(), released: new Set(), downAt: {}, releaseAt: {} };
}

export class Input {
  constructor(opts = {}) {
    this.p1 = blankPlayer();
    this.p2 = blankPlayer();
    this.onPause = opts.onPause || null;
    this.keys = new Set();
    this.pointerActions = new Map();
    this.stickPointer = null;
    this.touchVisible = false;
    this.enabled = true;
    this.p2Enabled = false;
    this.tilt = { x: 0, y: 0, enabled: false, raw: 0, neutral: 0, neutralBeta: 0, permission: 'default' };
    this._stickZone = null;
    this._knob = null;
    this._buttons = [];
    this._bound = false;
    this._tiltHandler = null;
    this.bind();
  }

  bind() {
    if (this._bound) return;
    this._bound = true;
    this._stickZone = document.getElementById('stick-zone');
    this._knob = document.getElementById('stick-knob');
    this._buttons = Array.from(document.querySelectorAll('.action'));
    this.bindStick();
    this.bindButtons();
    window.addEventListener('keydown', e => {
      if (PAUSE_KEYS.has(e.code)) {
        if (!e.repeat) this.onPause?.();
        e.preventDefault();
        return;
      }
      const a1 = P1_KEYS[e.code], a2 = P2_KEYS[e.code];
      if (a1) {
        e.preventDefault();
        if (!e.repeat) this.keyDown(this.p1, a1);
        this.keys.add(e.code);
      }
      if (a2 && this.p2Enabled) {
        e.preventDefault();
        if (!e.repeat) this.keyDown(this.p2, a2);
        this.keys.add(e.code);
      }
    }, { passive: false });
    window.addEventListener('keyup', e => {
      const a1 = P1_KEYS[e.code], a2 = P2_KEYS[e.code];
      if (a1) { this.keyUp(this.p1, a1); this.keys.delete(e.code); }
      if (a2 && this.p2Enabled) { this.keyUp(this.p2, a2); this.keys.delete(e.code); }
    });
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('gesturestart', e => e.preventDefault());
  }

  keyDown(p, action) {
    if (action === 'up' || action === 'down' || action === 'left' || action === 'right') return;
    if (p.down.has(action)) return;
    p.down.add(action);
    p.just.add(action);
    p.downAt[action] = performance.now();
  }
  keyUp(p, action) {
    if (action === 'up' || action === 'down' || action === 'left' || action === 'right') return;
    if (!p.down.has(action)) return;
    p.down.delete(action);
    p.released.add(action);
    p.releaseAt[action] = performance.now();
  }

  bindStick() {
    const zone = this._stickZone;
    if (!zone) return;
    const update = (clientX, clientY) => {
      const r = zone.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const maxR = r.width * 0.36;
      let dx = clientX - cx, dy = clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > maxR) { dx = dx / len * maxR; dy = dy / len * maxR; }
      const nx = dx / maxR, ny = dy / maxR;
      this.p1.move.x = nx; this.p1.move.y = ny;
      this.p1.mag = clamp(Math.hypot(nx, ny), 0, 1);
      const knob = this._knob;
      if (knob) knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    const end = e => {
      if (this.stickPointer !== e.pointerId) return;
      this.stickPointer = null;
      this.p1.move.x = 0; this.p1.move.y = 0; this.p1.mag = 0;
      const knob = this._knob;
      if (knob) knob.style.transform = 'translate(-50%, -50%)';
    };
    zone.addEventListener('pointerdown', e => {
      if (this.stickPointer !== null) return;
      this.stickPointer = e.pointerId;
      zone.setPointerCapture?.(e.pointerId);
      update(e.clientX, e.clientY);
      e.preventDefault();
    }, { passive: false });
    zone.addEventListener('pointermove', e => {
      if (this.stickPointer !== e.pointerId) return;
      update(e.clientX, e.clientY);
      e.preventDefault();
    }, { passive: false });
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    zone.addEventListener('lostpointercapture', end);
  }

  bindButtons() {
    for (const btn of this._buttons) {
      const action = btn.dataset.action;
      const down = e => {
        e.preventDefault();
        if (this.pointerActions.has(e.pointerId)) return;
        this.pointerActions.set(e.pointerId, action);
        btn.setPointerCapture?.(e.pointerId);
        if (!this.p1.down.has(action)) {
          this.p1.down.add(action);
          this.p1.just.add(action);
          this.p1.downAt[action] = performance.now();
        }
        btn.classList.add('down');
      };
      const up = e => {
        const a = this.pointerActions.get(e.pointerId);
        if (!a) return;
        this.pointerActions.delete(e.pointerId);
        this.p1.down.delete(a);
        this.p1.released.add(a);
        this.p1.releaseAt[a] = performance.now();
        btn.classList.remove('down');
      };
      btn.addEventListener('pointerdown', down, { passive: false });
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('lostpointercapture', up);
    }
  }

  readMove(p) {
    if (p === this.p1 && this.stickPointer !== null) return p.move;
    if (p === this.p2) {
      let x = 0, y = 0;
      if (this.keys.has('ArrowLeft')) x--;
      if (this.keys.has('ArrowRight')) x++;
      if (this.keys.has('ArrowUp')) y--;
      if (this.keys.has('ArrowDown')) y++;
      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      return { x, y };
    }
    let x = 0, y = 0;
    if (this.keys.has('KeyA')) x--;
    if (this.keys.has('KeyD')) x++;
    if (this.keys.has('KeyW')) y--;
    if (this.keys.has('KeyS')) y++;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }

  move(pid = 1) {
    const p = pid === 2 ? this.p2 : this.p1;
    const m = this.readMove(p);
    const mag = clamp(Math.hypot(m.x, m.y), 0, 1);
    return { x: m.x, y: m.y, mag };
  }

  isDown(pid, action) {
    const p = pid === 2 ? this.p2 : this.p1;
    if (action === 'sprint' && pid === 1 && this.stickPointer !== null && this.p1.mag > 0.84) return true;
    return p.down.has(action);
  }

  just(pid, action) {
    const p = pid === 2 ? this.p2 : this.p1;
    return p.just.has(action);
  }

  released(pid, action) {
    const p = pid === 2 ? this.p2 : this.p1;
    return p.released.has(action);
  }

  holdTime(pid, action) {
    const p = pid === 2 ? this.p2 : this.p1;
    return p.down.has(action) ? (performance.now() - (p.downAt[action] || performance.now())) / 1000 : 0;
  }

  endFrame() {
    this.p1.just.clear(); this.p1.released.clear();
    this.p2.just.clear(); this.p2.released.clear();
  }

  releaseAll() {
    for (const a of this.p1.down) { this.p1.released.add(a); this.p1.releaseAt[a] = performance.now(); }
    this.p1.down.clear();
    this.p1.move.x = 0; this.p1.move.y = 0; this.p1.mag = 0;
    this.p2.down.clear();
    this.keys.clear();
    this.pointerActions.clear();
    if (this._knob) this._knob.style.transform = 'translate(-50%, -50%)';
    this._buttons.forEach(b => b.classList.remove('down'));
  }

  setTouchVisible(v) {
    this.touchVisible = v;
    const el = document.getElementById('touch-controls');
    el?.classList.toggle('hidden', !v);
    if (!v) this.releaseAll();
  }
  setP2Enabled(v) { this.p2Enabled = !!v; if (!v) this.p2.down.clear(); }

  resetFrameInputs() {
    this.p1.just.clear(); this.p1.released.clear();
    this.p2.just.clear(); this.p2.released.clear();
  }

  async requestTilt() {
    if (!window.DeviceOrientationEvent) return false;
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const res = await DeviceOrientationEvent.requestPermission();
        this.tilt.permission = res;
        if (res !== 'granted') return false;
      }
      if (!this._tiltHandler) {
        this._tiltHandler = e => {
          if (e.gamma == null && e.beta == null) return;
          const g = e.gamma || 0, b = e.beta || 0;
          this.tilt.raw = g;
          if (!this.tilt.enabled) {
            this.tilt.neutral = g; this.tilt.neutralBeta = b;
            this.tilt.enabled = true;
          }
          this.tilt.x = clamp((g - this.tilt.neutral) / 32, -1, 1);
          this.tilt.y = clamp((b - this.tilt.neutralBeta) / 32, -1, 1);
        };
        window.addEventListener('deviceorientation', this._tiltHandler);
      }
      this.tilt.enabled = true;
      return true;
    } catch { return false; }
  }
  disableTilt() {
    this.tilt.enabled = false;
    this.tilt.x = 0; this.tilt.y = 0;
    if (this._tiltHandler) window.removeEventListener('deviceorientation', this._tiltHandler);
    this._tiltHandler = null;
  }
  calibrateTilt() { this.tilt.enabled = false; }
}
