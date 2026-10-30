import { rand, store } from './utils.js';

const NOTE = {
  A1: 55,
  C2: 65.41,
  D2: 73.42,
  E2: 82.41,
  F2: 87.31,
  G2: 98,
  A2: 110,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  G3: 196,
  A3: 220,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392,
  A4: 440,
  C5: 523.25,
  E5: 659.25,
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.reverb = null;
    this.drone = [];
    this.muted = Boolean(store.get('warden-muted', false));
    this.started = false;
    this.intensity = 0;
    this.bellTimer = null;
    this.wind = null;
    this._lastSfx = 0;
  }

  get available() {
    return Boolean(this.ctx);
  }

  async init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {});
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.26;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.72;
    this.master.connect(compressor);
    compressor.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.64;
    this.musicBus.connect(this.master);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.85;
    this.sfxBus.connect(this.master);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(2.8, 2.3);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.3;
    this.reverb.connect(reverbGain);
    reverbGain.connect(this.master);

    this._buildAmbience();
    this._scheduleBells();
    this.started = true;
  }

  _impulse(seconds, decay) {
    const ctx = this.ctx;
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(2, length, rate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return buffer;
  }

  _noise(seconds = 2) {
    const ctx = this.ctx;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.93 + white * 0.07;
      data[i] = white * 0.7 + last * 0.6;
    }
    return buffer;
  }

  _buildAmbience() {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260;
    filter.Q.value = 0.8;
    const bus = ctx.createGain();
    bus.gain.value = 0.18;
    filter.connect(bus);
    bus.connect(this.musicBus);
    bus.connect(this.reverb);

    const voices = [
      { freq: NOTE.D2, type: 'sine', gain: 0.36, detune: -4 },
      { freq: NOTE.A2, type: 'sine', gain: 0.16, detune: 5 },
      { freq: NOTE.D3, type: 'triangle', gain: 0.07, detune: -8 },
      { freq: NOTE.A1, type: 'sine', gain: 0.22, detune: 2 },
    ];

    for (const voice of voices) {
      const osc = ctx.createOscillator();
      osc.type = voice.type;
      osc.frequency.value = voice.freq;
      osc.detune.value = voice.detune;
      const gain = ctx.createGain();
      gain.gain.value = voice.gain;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rand(0.035, 0.09);
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = voice.freq * 0.0035;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      lfo.start();
      this.drone.push({ osc, gain, voice });
    }

    const windSource = ctx.createBufferSource();
    windSource.buffer = this._noise(4);
    windSource.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 520;
    windFilter.Q.value = 0.45;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.055;
    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.06;
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.value = 180;
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.musicBus);
    windGain.connect(this.reverb);
    windSource.start();
    windLfo.start();
    this.wind = { gain: windGain, filter: windFilter };

    const air = ctx.createBufferSource();
    air.buffer = this._noise(2);
    air.loop = true;
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'highpass';
    airFilter.frequency.value = 2600;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.012;
    air.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(this.musicBus);
    air.start();
  }

  _scheduleBells() {
    clearTimeout(this.bellTimer);
    const tick = () => {
      if (!this.ctx) return;
      if (!this.muted && this.ctx.state === 'running') {
        const notes = [NOTE.D4, NOTE.E4, NOTE.G4, NOTE.A4, NOTE.C5, NOTE.D3, NOTE.A3];
        const freq = notes[Math.floor(Math.random() * notes.length)];
        this._bell(freq, rand(0.03, 0.075));
      }
      this.bellTimer = setTimeout(tick, rand(3200, 9000));
    };
    this.bellTimer = setTimeout(tick, 2600);
  }

  _bell(freq, gain = 0.05) {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc.type = 'sine';
    osc2.type = 'sine';
    osc.frequency.value = freq;
    osc2.frequency.value = freq * 2.01;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
    const g2 = ctx.createGain();
    g2.gain.value = 0.28;
    osc.connect(g);
    osc2.connect(g2);
    g2.connect(g);
    g.connect(this.reverb);
    g.connect(this.musicBus);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 3.4);
    osc2.stop(now + 3.4);
  }

  setMuted(muted) {
    this.muted = muted;
    store.set('warden-muted', muted);
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0 : 0.72, now, 0.05);
  }

  setIntensity(value) {
    if (!this.ctx) return;
    const target = Math.max(0, Math.min(1, value));
    this.intensity = target;
    const now = this.ctx.currentTime;
    this.drone.forEach(({ osc, voice }, index) => {
      const boost = 1 + target * (index === 0 ? 0.07 : 0.14);
      osc.frequency.setTargetAtTime(voice.freq * boost, now, 0.4);
    });
    if (this.wind) {
      this.wind.gain.gain.setTargetAtTime(0.055 + target * 0.08, now, 0.5);
      this.wind.filter.frequency.setTargetAtTime(520 + target * 420, now, 0.6);
    }
  }

  async suspend() {
    if (this.ctx && this.ctx.state === 'running') await this.ctx.suspend().catch(() => {});
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {});
  }

  _tone({ freq, type = 'sine', dur = 0.25, gain = 0.12, attack = 0.006, slideTo = null, reverb = 0.14, pan = 0, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(p);
    p.connect(this.sfxBus);
    if (reverb) {
      const rg = ctx.createGain();
      rg.gain.value = reverb;
      p.connect(rg);
      rg.connect(this.reverb);
    }
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  _noiseBurst({ dur = 0.2, gain = 0.18, type = 'highpass', freq = 1200, q = 0.8, slideTo = null, pan = 0, delay = 0, reverb = 0.08 }) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer || (this._noiseBuffer = this._noise(2));
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, now);
    filter.Q.value = q;
    if (slideTo) filter.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    src.connect(filter);
    filter.connect(g);
    g.connect(p);
    p.connect(this.sfxBus);
    if (reverb) {
      const rg = ctx.createGain();
      rg.gain.value = reverb;
      p.connect(rg);
      rg.connect(this.reverb);
    }
    src.start(now, Math.random() * 0.4);
    src.stop(now + dur + 0.05);
  }

  slash() {
    this._noiseBurst({ dur: 0.16, gain: 0.2, type: 'bandpass', freq: 2100, q: 1.1, slideTo: 480, pan: 0.1 });
    this._tone({ freq: 620, type: 'triangle', dur: 0.13, gain: 0.05, slideTo: 260, reverb: 0.1 });
  }

  hit() {
    this._noiseBurst({ dur: 0.12, gain: 0.24, type: 'lowpass', freq: 1600, slideTo: 240, pan: -0.1 });
    this._tone({ freq: 175, type: 'sine', dur: 0.22, gain: 0.2, slideTo: 62, reverb: 0.12 });
    this._tone({ freq: 920, type: 'triangle', dur: 0.07, gain: 0.035, slideTo: 480 });
  }

  heavyHit() {
    this._noiseBurst({ dur: 0.34, gain: 0.32, type: 'lowpass', freq: 1200, slideTo: 120, reverb: 0.25 });
    this._tone({ freq: 120, type: 'sine', dur: 0.45, gain: 0.3, slideTo: 38, reverb: 0.25 });
  }

  hurt() {
    this._noiseBurst({ dur: 0.3, gain: 0.26, type: 'lowpass', freq: 900, slideTo: 130, reverb: 0.18 });
    this._tone({ freq: 330, type: 'sawtooth', dur: 0.32, gain: 0.09, slideTo: 92, reverb: 0.2 });
    this._tone({ freq: 72, type: 'sine', dur: 0.4, gain: 0.22, slideTo: 42 });
  }

  dash() {
    this._noiseBurst({ dur: 0.24, gain: 0.19, type: 'bandpass', freq: 500, slideTo: 2600, q: 0.5, pan: -0.15, reverb: 0.12 });
    this._tone({ freq: 140, type: 'triangle', dur: 0.18, gain: 0.035, slideTo: 300 });
  }

  jump() {
    this._tone({ freq: 210, type: 'sine', dur: 0.18, gain: 0.055, slideTo: 360, reverb: 0.05 });
  }

  land() {
    this._noiseBurst({ dur: 0.1, gain: 0.08, type: 'lowpass', freq: 400, slideTo: 140, reverb: 0.03 });
  }

  focusStart() {
    this._tone({ freq: 196, type: 'sine', dur: 0.7, gain: 0.045, slideTo: 294, reverb: 0.25 });
    this._tone({ freq: 392, type: 'sine', dur: 0.7, gain: 0.025, slideTo: 587, reverb: 0.3 });
  }

  heal() {
    [NOTE.D4, NOTE.A4, NOTE.E5].forEach((freq, i) => {
      this._tone({ freq, type: 'sine', dur: 1.1, gain: 0.06, delay: i * 0.07, reverb: 0.55 });
    });
    this._noiseBurst({ dur: 0.5, gain: 0.04, type: 'highpass', freq: 2800, reverb: 0.4 });
  }

  bossRoar() {
    this._tone({ freq: 86, type: 'sawtooth', dur: 1.1, gain: 0.13, slideTo: 42, reverb: 0.4 });
    this._tone({ freq: 129, type: 'sawtooth', dur: 1.0, gain: 0.06, slideTo: 61, reverb: 0.4 });
    this._noiseBurst({ dur: 0.9, gain: 0.18, type: 'lowpass', freq: 600, slideTo: 120, reverb: 0.4 });
  }

  wave() {
    this._noiseBurst({ dur: 0.35, gain: 0.14, type: 'bandpass', freq: 420, slideTo: 160, q: 1.2, reverb: 0.2 });
    this._tone({ freq: 98, type: 'sine', dur: 0.36, gain: 0.1, slideTo: 48 });
  }

  orb() {
    this._tone({ freq: 740, type: 'sine', dur: 0.4, gain: 0.045, slideTo: 480, reverb: 0.35 });
    this._tone({ freq: 1110, type: 'sine', dur: 0.25, gain: 0.025, slideTo: 720, reverb: 0.3 });
  }

  spike() {
    this._noiseBurst({ dur: 0.22, gain: 0.2, type: 'bandpass', freq: 900, slideTo: 2400, q: 1.5, reverb: 0.15 });
    this._tone({ freq: 210, type: 'square', dur: 0.12, gain: 0.03, slideTo: 80 });
  }

  death() {
    this._tone({ freq: 220, type: 'sawtooth', dur: 2.4, gain: 0.1, slideTo: 44, reverb: 0.55 });
    this._tone({ freq: 110, type: 'sine', dur: 2.6, gain: 0.18, slideTo: 28, reverb: 0.5 });
    this._noiseBurst({ dur: 1.8, gain: 0.12, type: 'lowpass', freq: 800, slideTo: 70, reverb: 0.5 });
  }

  victory() {
    const chord = [NOTE.D3, NOTE.A3, NOTE.D4, NOTE.F2 * 2, NOTE.A4];
    chord.forEach((freq, i) => {
      this._tone({ freq, type: 'sine', dur: 3.6, gain: 0.045, delay: i * 0.16, reverb: 0.65 });
    });
    this._bell(NOTE.D4, 0.07);
    this._bell(NOTE.A4, 0.05);
  }

  ui() {
    this._tone({ freq: 520, type: 'sine', dur: 0.09, gain: 0.025, slideTo: 660, reverb: 0.15 });
  }

  deny() {
    this._tone({ freq: 130, type: 'triangle', dur: 0.12, gain: 0.035, slideTo: 110, reverb: 0.05 });
  }
}
