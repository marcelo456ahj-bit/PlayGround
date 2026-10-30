import { clamp, store } from './utils.js';

const KEY_ACTIONS = new Map([
  ['ArrowLeft', 'left'],
  ['KeyA', 'left'],
  ['ArrowRight', 'right'],
  ['KeyD', 'right'],
  ['ArrowDown', 'down'],
  ['KeyS', 'down'],
  ['ArrowUp', 'up'],
  ['KeyW', 'up'],
  ['Space', 'jump'],
  ['KeyJ', 'attack'],
  ['KeyZ', 'attack'],
  ['KeyK', 'dash'],
  ['KeyX', 'dash'],
  ['KeyL', 'heal'],
  ['KeyC', 'heal'],
  ['Escape', 'pause'],
  ['KeyP', 'pause'],
  ['KeyM', 'mute'],
  ['KeyT', 'tilt'],
]);

const GAME_KEYS = new Set([
  ...KEY_ACTIONS.keys(),
  'Enter',
  'NumpadEnter',
]);

export class Input {
  constructor({ onKey = null } = {}) {
    this.state = new Map();
    this.pressed = new Set();
    this.joystickX = 0;
    this.joystickY = 0;
    this.joystickActive = false;
    this.tiltEnabled = false;
    this.tiltAxis = 0;
    this.tiltAvailable = false;
    this.tiltBaseline = null;
    this.tiltSamples = 0;
    this.motionPermission = 'unknown';
    this.onKey = onKey;
    this._pointerId = null;
    this._buttons = [];
    this._tiltHandler = null;
    this._orientationHandler = null;
    this._offsets = [];
  }

  get horizontal() {
    let value = 0;
    if (this.down('left')) value -= 1;
    if (this.down('right')) value += 1;
    if (this.joystickActive) value += this.joystickX;
    if (this.tiltEnabled && Math.abs(this.tiltAxis) > 0.075) value += this.tiltAxis;
    return clamp(value, -1, 1);
  }

  down(action) {
    return this.state.get(action) === true;
  }

  take(action) {
    if (!this.pressed.has(action)) return false;
    this.pressed.delete(action);
    return true;
  }

  press(action) {
    if (!this.state.get(action)) this.pressed.add(action);
    this.state.set(action, true);
  }

  release(action) {
    this.state.set(action, false);
  }

  endStep() {
    this.pressed.clear();
  }

  reset() {
    this.state.clear();
    this.pressed.clear();
    this.joystickX = 0;
    this.joystickY = 0;
    this.joystickActive = false;
    this._buttons.forEach(({ el }) => el.classList.remove('is-down'));
  }

  attachKeyboard() {
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Enter' || event.code === 'NumpadEnter') {
        this.onKey?.(event.code, event);
        return;
      }
      const action = KEY_ACTIONS.get(event.code);
      if (!action) return;
      if (GAME_KEYS.has(event.code)) event.preventDefault();
      if (!event.repeat) {
        this.press(action);
        this.onKey?.(event.code, event);
      }
    });

    window.addEventListener('keyup', (event) => {
      const action = KEY_ACTIONS.get(event.code);
      if (!action) return;
      if (GAME_KEYS.has(event.code)) event.preventDefault();
      this.release(action);
    });

    window.addEventListener('blur', () => this.reset());
  }

  attachTouch(stickZone, stickKnob, buttonElements) {
    const radius = () => stickZone.clientWidth * 0.36;
    const updateStick = (event) => {
      const rect = stickZone.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const r = radius();
      const len = Math.hypot(dx, dy);
      const nx = len > r ? dx / len : dx / r;
      const ny = len > r ? dy / len : dy / r;
      const dead = 0.11;
      const magnitude = Math.hypot(nx, ny);
      if (magnitude < dead) {
        this.joystickX = 0;
        this.joystickY = 0;
      } else {
        const scale = clamp((magnitude - dead) / (1 - dead), 0, 1) / magnitude;
        this.joystickX = nx * scale;
        this.joystickY = ny * scale;
      }
      const kx = clamp(nx, -1, 1) * r;
      const ky = clamp(ny, -1, 1) * r;
      stickKnob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
    };

    const endStick = (event) => {
      if (event.pointerId !== this._pointerId) return;
      this._pointerId = null;
      this.joystickActive = false;
      this.joystickX = 0;
      this.joystickY = 0;
      stickZone.classList.remove('active');
      stickKnob.style.transform = 'translate(-50%, -50%)';
    };

    stickZone.addEventListener('pointerdown', (event) => {
      if (this._pointerId !== null) return;
      event.preventDefault();
      this._pointerId = event.pointerId;
      this.joystickActive = true;
      stickZone.classList.add('active');
      stickZone.setPointerCapture?.(event.pointerId);
      updateStick(event);
    });
    stickZone.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this._pointerId) return;
      event.preventDefault();
      updateStick(event);
    });
    stickZone.addEventListener('pointerup', endStick);
    stickZone.addEventListener('pointercancel', endStick);
    stickZone.addEventListener('lostpointercapture', endStick);

    this._buttons = buttonElements.map((el) => {
      const action = el.dataset.action;
      const release = (event) => {
        if (event) event.preventDefault();
        this.release(action);
        el.classList.remove('is-down');
      };
      el.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        el.setPointerCapture?.(event.pointerId);
        this.press(action);
        el.classList.add('is-down');
      });
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('lostpointercapture', release);
      el.addEventListener('contextmenu', (event) => event.preventDefault());
      return { el, action };
    });
  }

  async enableTilt() {
    if (this.tiltEnabled) return { ok: true, reason: 'already' };
    if (typeof window.DeviceOrientationEvent === 'undefined') {
      this.motionPermission = 'unsupported';
      return { ok: false, reason: 'Tilt sensing is not available on this device.' };
    }

    try {
      if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
        const result = await window.DeviceOrientationEvent.requestPermission();
        this.motionPermission = result;
        if (result !== 'granted') {
          return {
            ok: false,
            reason:
              result === 'denied'
                ? 'Motion access was denied. You can allow it in Safari settings.'
                : 'Motion access was not granted.',
          };
        }
      } else {
        this.motionPermission = 'granted';
      }
    } catch (error) {
      this.motionPermission = 'denied';
      return { ok: false, reason: 'Motion access could not be requested on this device.' };
    }

    this._tiltHandler = (event) => this._handleOrientation(event);
    this._orientationHandler = () => {
      this.tiltBaseline = null;
      this.tiltSamples = 0;
    };
    window.addEventListener('deviceorientation', this._tiltHandler, true);
    window.screen?.orientation?.addEventListener?.('change', this._orientationHandler);
    window.addEventListener('orientationchange', this._orientationHandler);

    this.tiltEnabled = true;
    this.tiltBaseline = null;
    this.tiltSamples = 0;
    store.set('warden-tilt', true);
    return { ok: true, reason: 'Tilt controls on. Hold your device level to re-center.' };
  }

  _axisFromEvent(event) {
    const angle =
      (typeof window.screen?.orientation?.angle === 'number'
        ? window.screen.orientation.angle
        : typeof window.orientation === 'number'
          ? window.orientation
          : 0) % 360;
    if (angle === 90) return typeof event.beta === 'number' ? event.beta : 0;
    if (angle === 270 || angle === -90) return typeof event.beta === 'number' ? -event.beta : 0;
    return typeof event.gamma === 'number' ? event.gamma : 0;
  }

  _handleOrientation(event) {
    const axis = this._axisFromEvent(event);
    if (!Number.isFinite(axis)) return;
    if (this.tiltBaseline === null) {
      this.tiltSamples++;
      if (this.tiltSamples > 2) {
        this.tiltBaseline = axis;
        this.tiltAvailable = true;
      }
      return;
    }
    const delta = axis - this.tiltBaseline;
    if (Math.abs(delta) > 38) {
      this.tiltBaseline = axis - Math.sign(delta) * 38;
    }
    const value = clamp(delta / 19, -1, 1);
    const dead = 0.08;
    const shaped = Math.abs(value) < dead ? 0 : Math.sign(value) * ((Math.abs(value) - dead) / (1 - dead));
    this.tiltAxis = clamp(shaped, -1, 1);
    this.tiltAvailable = true;
  }

  disableTilt() {
    this.tiltEnabled = false;
    this.tiltAxis = 0;
    if (this._tiltHandler) window.removeEventListener('deviceorientation', this._tiltHandler, true);
    if (this._orientationHandler) {
      window.screen?.orientation?.removeEventListener?.('change', this._orientationHandler);
      window.removeEventListener('orientationchange', this._orientationHandler);
    }
    this._tiltHandler = null;
    this._orientationHandler = null;
    this.tiltBaseline = null;
    store.set('warden-tilt', false);
  }

  toggleTilt() {
    if (this.tiltEnabled) {
      this.disableTilt();
      return Promise.resolve({ ok: true, enabled: false, reason: 'Tilt controls off.' });
    }
    return this.enableTilt().then((result) => ({ ...result, enabled: this.tiltEnabled, reason: result.reason }));
  }
}
