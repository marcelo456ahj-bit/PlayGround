import { clamp, lerp, smoothstep } from './util.js';

const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyJ', 'KeyK', 'KeyL', 'KeyZ', 'KeyX', 'KeyC', 'Escape', 'KeyP']);

export class Input {
  constructor({ onPause } = {}) {
    this.onPause = onPause;
    this.keys = new Set();
    this.edges = { jump: false, attack: false, dash: false };
    this.btn = { jump: false, attack: false, dash: false, focus: false };
    this.joy = { active: false, id: null, x: 0, y: 0, dx: 0, dy: 0, radius: 44 };
    this.joystickEl = null;
    this.stickEl = null;
    this.buttonEls = new Map();
    this.tilt = {
      supported: typeof window !== 'undefined' && ('DeviceMotionEvent' in window || 'DeviceOrientationEvent' in window),
      enabled: false,
      mode: null,
      smooth: 0,
      baseline: null,
      value: 0,
      events: 0,
      lastEvent: 0
    };
    this.bindKeyboard();
    this.bindMotion = this.handleMotion.bind(this);
    this.bindOrientation = this.handleOrientation.bind(this);
  }

  bindKeyboard() {
    window.addEventListener('keydown', (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (GAME_KEYS.has(event.code)) event.preventDefault();
      if (event.repeat) return;
      this.keys.add(event.code);
      if (event.code === 'Space' || event.code === 'KeyZ') this.edges.jump = true;
      if (event.code === 'KeyJ' || event.code === 'KeyX') this.edges.attack = true;
      if (event.code === 'KeyK' || event.code === 'KeyC') this.edges.dash = true;
      if (event.code === 'Escape' || event.code === 'KeyP') this.onPause?.();
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.releaseButtons();
      this.resetJoystick();
    });
  }

  attachTouch({ joystick, stick, buttons }) {
    this.joystickEl = joystick;
    this.stickEl = stick;
    if (joystick) {
      joystick.addEventListener('pointerdown', (event) => {
        if (this.joy.active) return;
        event.preventDefault();
        this.joy.active = true;
        this.joy.id = event.pointerId;
        joystick.setPointerCapture(event.pointerId);
        const rect = joystick.getBoundingClientRect();
        this.joy.cx = rect.left + rect.width / 2;
        this.joy.cy = rect.top + rect.height / 2;
        this.joy.radius = rect.width * 0.34;
        this.updateJoystick(event.clientX, event.clientY);
      });
      joystick.addEventListener('pointermove', (event) => {
        if (!this.joy.active || event.pointerId !== this.joy.id) return;
        event.preventDefault();
        this.updateJoystick(event.clientX, event.clientY);
      });
      const end = (event) => {
        if (event.pointerId !== this.joy.id) return;
        this.resetJoystick();
      };
      joystick.addEventListener('pointerup', end);
      joystick.addEventListener('pointercancel', end);
      joystick.addEventListener('lostpointercapture', end);
    }
    if (buttons) {
      for (const [name, element] of Object.entries(buttons)) {
        this.buttonEls.set(name, element);
        element.addEventListener('pointerdown', (event) => {
          event.preventDefault();
          element.setPointerCapture(event.pointerId);
          this.press(name, element);
        });
        const release = (event) => {
          event.preventDefault();
          this.release(name, element);
        };
        element.addEventListener('pointerup', release);
        element.addEventListener('pointercancel', release);
        element.addEventListener('lostpointercapture', () => this.release(name, element));
      }
    }
  }

  press(name, element) {
    this.btn[name] = true;
    if (name === 'jump') this.edges.jump = true;
    if (name === 'attack') this.edges.attack = true;
    if (name === 'dash') this.edges.dash = true;
    element?.classList.add('is-down');
  }

  release(name, element) {
    this.btn[name] = false;
    element?.classList.remove('is-down');
  }

  releaseButtons() {
    for (const [name, element] of this.buttonEls) {
      this.btn[name] = false;
      element.classList.remove('is-down');
    }
  }

  updateJoystick(clientX, clientY) {
    const dx = clientX - this.joy.cx;
    const dy = clientY - this.joy.cy;
    const len = Math.hypot(dx, dy);
    const radius = this.joy.radius;
    const scale = len > radius ? radius / len : 1;
    this.joy.dx = dx * scale;
    this.joy.dy = dy * scale;
    this.joy.x = clamp(dx / radius, -1, 1);
    this.joy.y = clamp(dy / radius, -1, 1);
    if (this.stickEl) {
      this.stickEl.style.transform = `translate(${this.joy.dx.toFixed(1)}px, ${this.joy.dy.toFixed(1)}px)`;
    }
  }

  resetJoystick() {
    this.joy.active = false;
    this.joy.id = null;
    this.joy.x = 0;
    this.joy.y = 0;
    this.joy.dx = 0;
    this.joy.dy = 0;
    if (this.stickEl) this.stickEl.style.transform = '';
  }

  get keyboardX() {
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
    return (right ? 1 : 0) - (left ? 1 : 0);
  }

  get keyboardY() {
    const up = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    const down = this.keys.has('KeyS') || this.keys.has('ArrowDown');
    return (down ? 1 : 0) - (up ? 1 : 0);
  }

  get moveX() {
    if (this.joy.active && Math.abs(this.joy.x) > 0.14) return this.joy.x;
    if (this.keyboardX !== 0) return this.keyboardX;
    if (this.tilt.enabled) return this.tilt.value;
    return 0;
  }

  get moveY() {
    if (this.joy.active && Math.abs(this.joy.y) > 0.22) return this.joy.y;
    return this.keyboardY;
  }

  get jumpHeld() { return this.btn.jump || this.keys.has('Space') || this.keys.has('KeyZ'); }
  get focusHeld() { return this.btn.focus || this.keys.has('KeyL'); }

  consumeJump() {
    const value = this.edges.jump;
    this.edges.jump = false;
    return value;
  }

  consumeAttack() {
    const value = this.edges.attack;
    this.edges.attack = false;
    return value;
  }

  consumeDash() {
    const value = this.edges.dash;
    this.edges.dash = false;
    return value;
  }

  endFrame() {
    this.edges.jump = false;
    this.edges.attack = false;
    this.edges.dash = false;
  }

  screenAngle() {
    if (screen.orientation && typeof screen.orientation.angle === 'number') return ((screen.orientation.angle % 360) + 360) % 360;
    if (typeof window.orientation === 'number') return ((window.orientation % 360) + 360) % 360;
    return 0;
  }

  async toggleTilt() {
    if (this.tilt.enabled) {
      this.disableTilt();
      return 'off';
    }
    return this.enableTilt();
  }

  async enableTilt() {
    if (!this.tilt.supported) return 'unsupported';
    const motionCtor = window.DeviceMotionEvent;
    const orientationCtor = window.DeviceOrientationEvent;
    const wantMotion = typeof motionCtor !== 'undefined';
    try {
      if (wantMotion && typeof motionCtor.requestPermission === 'function') {
        const result = await motionCtor.requestPermission();
        if (result !== 'granted') return 'denied';
      } else if (!wantMotion && orientationCtor && typeof orientationCtor.requestPermission === 'function') {
        const result = await orientationCtor.requestPermission();
        if (result !== 'granted') return 'denied';
      }
    } catch (error) {
      return 'denied';
    }
    this.tilt.mode = wantMotion ? 'motion' : 'orientation';
    if (wantMotion) window.addEventListener('devicemotion', this.bindMotion, { passive: true });
    else window.addEventListener('deviceorientation', this.bindOrientation, { passive: true });
    this.tilt.enabled = true;
    this.tilt.events = 0;
    this.tilt.baseline = null;
    this.tilt.smooth = 0;
    this.tilt.value = 0;
    this.tilt.lastEvent = performance.now();
    return 'on';
  }

  disableTilt() {
    this.tilt.enabled = false;
    this.tilt.value = 0;
    this.tilt.baseline = null;
    window.removeEventListener('devicemotion', this.bindMotion);
    window.removeEventListener('deviceorientation', this.bindOrientation);
  }

  recenterTilt() {
    this.tilt.baseline = this.tilt.smooth;
    this.tilt.value = 0;
  }

  tiltAxis() {
    const angle = this.screenAngle();
    return angle;
  }

  handleMotion(event) {
    if (!this.tilt.enabled) return;
    const a = event.accelerationIncludingGravity;
    if (!a || (a.x === null && a.y === null)) return;
    const angle = this.tiltAxis();
    let raw;
    if (angle === 90) raw = -(a.y ?? 0);
    else if (angle === 270) raw = (a.y ?? 0);
    else if (angle === 180) raw = -(a.x ?? 0);
    else raw = a.x ?? 0;
    this.applyTilt(raw);
  }

  handleOrientation(event) {
    if (!this.tilt.enabled) return;
    const angle = this.tiltAxis();
    let raw;
    if (angle === 90 || angle === 270) raw = (event.beta ?? 0) / 30;
    else raw = (event.gamma ?? 0) / 30;
    this.applyTilt(raw);
  }

  applyTilt(raw) {
    const now = performance.now();
    this.tilt.events++;
    this.tilt.lastEvent = now;
    if (this.tilt.events === 1) {
      this.tilt.smooth = raw;
      this.tilt.baseline = raw;
      return;
    }
    this.tilt.smooth = lerp(this.tilt.smooth, raw, 0.14);
    if (this.tilt.baseline === null) this.tilt.baseline = this.tilt.smooth;
    const delta = this.tilt.smooth - this.tilt.baseline;
    const dead = 0.14;
    const magnitude = Math.max(0, Math.abs(delta) - dead);
    const value = clamp(magnitude / 2.2, 0, 1);
    this.tilt.value = Math.sign(delta) * smoothstep(value);
  }
}
