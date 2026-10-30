import { clamp } from './util.js';

export class InputController {
  constructor(canvas, { joystick, knob, onTiltChange } = {}) {
    this.canvas = canvas;
    this.joystickEl = joystick;
    this.knobEl = knob;
    this.onTiltChange = onTiltChange || (() => {});

    this.keys = new Set();
    this.pointerId = null;
    this.joy = { active: false, x: 0, y: 0, ox: 0, oy: 0, travel: 46 };

    this.tilt = {
      enabled: false,
      supported: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
      permission: 'unknown',
      x: 0,
      y: 0,
      base: null,
      samples: [],
      raw: null,
      lastEvent: 0
    };

    this.boundOrientation = this.handleOrientation.bind(this);
    this.boundOrientationReset = this.recalibrate.bind(this);

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onBlur = this.onBlur.bind(this);

    canvas.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('orientationchange', this.boundOrientationReset);
  }

  onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'].includes(key)) {
      event.preventDefault();
    }
    this.keys.add(key);
  }

  onKeyUp(event) {
    this.keys.delete(event.key.toLowerCase());
  }

  onBlur() {
    this.keys.clear();
    this.resetJoystick();
  }

  onPointerDown(event) {
    if (this.pointerId !== null) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    this.pointerId = event.pointerId;
    this.joy.active = true;
    this.joy.ox = event.clientX;
    this.joy.oy = event.clientY;
    this.joy.x = 0;
    this.joy.y = 0;
    if (this.joystickEl) {
      this.joystickEl.style.left = `${event.clientX}px`;
      this.joystickEl.style.top = `${event.clientY}px`;
      this.joystickEl.classList.remove('is-hidden');
    }
    if (this.knobEl) this.knobEl.style.transform = 'translate(0px, 0px)';
  }

  onPointerMove(event) {
    if (event.pointerId !== this.pointerId || !this.joy.active) return;
    event.preventDefault();
    let dx = event.clientX - this.joy.ox;
    let dy = event.clientY - this.joy.oy;
    const distance = Math.hypot(dx, dy);
    const max = this.joy.travel;
    if (distance > max) {
      dx = (dx / distance) * max;
      dy = (dy / distance) * max;
    }
    if (this.knobEl) this.knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
    const nx = dx / max;
    const ny = -dy / max;
    const magnitude = Math.hypot(nx, ny);
    if (magnitude < 0.12) {
      this.joy.x = 0;
      this.joy.y = 0;
    } else {
      const scaled = clamp((magnitude - 0.12) / 0.88, 0, 1);
      this.joy.x = (nx / magnitude) * scaled;
      this.joy.y = (ny / magnitude) * scaled;
    }
  }

  onPointerUp(event) {
    if (event.pointerId !== this.pointerId) return;
    this.resetJoystick();
  }

  resetJoystick() {
    this.pointerId = null;
    this.joy.active = false;
    this.joy.x = 0;
    this.joy.y = 0;
    if (this.joystickEl) this.joystickEl.classList.add('is-hidden');
    if (this.knobEl) this.knobEl.style.transform = 'translate(0px, 0px)';
  }

  async enableTilt() {
    if (!this.tilt.supported) {
      const error = new Error('This device has no motion sensor.');
      error.code = 'unsupported';
      throw error;
    }

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      let permission;
      try {
        permission = await DeviceOrientationEvent.requestPermission();
      } catch (cause) {
        const error = new Error('Motion access needs a direct tap.');
        error.code = 'gesture';
        error.cause = cause;
        throw error;
      }
      this.tilt.permission = permission;
      if (permission !== 'granted') {
        const error = new Error('Motion access was not granted.');
        error.code = 'denied';
        throw error;
      }
    }

    this.tilt.enabled = true;
    this.tilt.base = null;
    this.tilt.samples = [];
    this.tilt.x = 0;
    this.tilt.y = 0;
    window.addEventListener('deviceorientation', this.boundOrientation, true);
    this.onTiltChange(true);
    return true;
  }

  disableTilt() {
    this.tilt.enabled = false;
    this.tilt.x = 0;
    this.tilt.y = 0;
    this.tilt.base = null;
    this.tilt.samples = [];
    window.removeEventListener('deviceorientation', this.boundOrientation, true);
    this.onTiltChange(false);
  }

  recalibrate() {
    if (!this.tilt.enabled) return;
    this.tilt.base = null;
    this.tilt.samples = [];
    this.tilt.x = 0;
    this.tilt.y = 0;
  }

  handleOrientation(event) {
    if (!this.tilt.enabled) return;
    if (event.beta === null || event.gamma === null) return;
    this.tilt.lastEvent = performance.now();
    const sample = { beta: event.beta, gamma: event.gamma };

    if (!this.tilt.base) {
      this.tilt.samples.push(sample);
      if (this.tilt.samples.length >= 8) {
        const beta = this.tilt.samples.reduce((sum, s) => sum + s.beta, 0) / this.tilt.samples.length;
        const gamma = this.tilt.samples.reduce((sum, s) => sum + s.gamma, 0) / this.tilt.samples.length;
        this.tilt.base = { beta, gamma };
        this.tilt.samples = [];
      }
      return;
    }

    const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    const db = sample.beta - this.tilt.base.beta;
    const dg = sample.gamma - this.tilt.base.gamma;

    let x = 0;
    let y = 0;
    if (angle === 90) {
      x = db;
      y = -dg;
    } else if (angle === -90 || angle === 270) {
      x = -db;
      y = dg;
    } else {
      x = dg;
      y = db;
    }

    const dead = 2.5;
    const range = 17;
    const sx = Math.sign(x) * Math.max(0, Math.abs(x) - dead) / range;
    const sy = Math.sign(y) * Math.max(0, Math.abs(y) - dead) / range;
    this.tilt.x = clamp(sx, -1, 1);
    this.tilt.y = clamp(sy, -1, 1);
  }

  getMove() {
    if (this.joy.active && (Math.abs(this.joy.x) > 0.01 || Math.abs(this.joy.y) > 0.01)) {
      return { x: this.joy.x, y: this.joy.y, source: 'touch' };
    }

    if (this.tilt.enabled && (Math.abs(this.tilt.x) > 0.01 || Math.abs(this.tilt.y) > 0.01)) {
      return { x: this.tilt.x, y: this.tilt.y, source: 'tilt' };
    }

    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y += 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y -= 1;
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) {
      x /= magnitude;
      y /= magnitude;
    }
    return { x, y, source: magnitude > 0 ? 'keys' : 'none' };
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('orientationchange', this.boundOrientationReset);
    this.disableTilt();
  }
}
