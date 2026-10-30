import { clamp, rand } from './util.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.started = false;
    this.noteTimer = null;
    this.drone = [];
    this.noise = null;
  }

  get ready() {
    return this.started && this.ctx && this.ctx.state === 'running';
  }

  async start() {
    if (this.started) {
      if (this.ctx?.state === 'suspended') await this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.72;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 22;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = 0.24;
    this.master.connect(comp).connect(ctx.destination);
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.52;
    this.musicGain.connect(this.master);
    this.noise = this.makeNoise(2.4);
    this.started = true;
    if (ctx.state === 'suspended') await ctx.resume();
    this.startDrone();
    this.scheduleNotes();
  }

  makeNoise(seconds) {
    const ctx = this.ctx;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.96 + white * 0.04;
      data[i] = white * 0.72 + last * 3.2;
    }
    return buffer;
  }

  setMuted(value) {
    this.muted = value;
    if (this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.72, t, 0.04);
    }
  }

  startDrone() {
    const ctx = this.ctx;
    const freqs = [55, 82.5, 110, 164.81];
    const gains = [0.09, 0.055, 0.035, 0.014];
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.7;
    filter.connect(this.musicGain);
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      osc.detune.value = i % 2 ? 5 : -6;
      gain.gain.value = gains[i];
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.035 + i * 0.017;
      lfoGain.gain.value = gains[i] * 0.35;
      lfo.connect(lfoGain).connect(gain.gain);
      osc.connect(gain).connect(filter);
      osc.start();
      lfo.start();
      this.drone.push({ osc, lfo, gain });
    });
    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 260;
    wf.Q.value = 0.5;
    const wg = ctx.createGain();
    wg.gain.value = 0.018;
    wind.connect(wf).connect(wg).connect(this.musicGain);
    wind.start();
    this.drone.push({ osc: wind, gain: wg });
  }

  scheduleNotes() {
    if (this.noteTimer) clearTimeout(this.noteTimer);
    const notes = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
    const tick = () => {
      if (!this.ready) { this.noteTimer = setTimeout(tick, 1500); return; }
      if (!this.muted && Math.random() < 0.82) {
        const note = notes[(Math.random() * notes.length) | 0];
        this.bell(note * (Math.random() < 0.2 ? 2 : 1), rand(0.12, 0.3));
      }
      this.noteTimer = setTimeout(tick, rand(2600, 6200));
    };
    this.noteTimer = setTimeout(tick, 1800);
  }

  bell(freq, gain = 0.2, duration = 3.4) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(gain * 0.09, t + 0.03);
    out.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    out.connect(this.musicGain);
    const partials = [1, 2.01, 2.99, 4.2];
    partials.forEach((p, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq * p;
      g.gain.value = 0.6 / (i + 1);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + duration);
    });
    const pan = ctx.createStereoPanner?.();
    if (pan) {
      pan.pan.value = rand(-0.6, 0.6);
      out.disconnect();
      out.connect(pan).connect(this.musicGain);
    }
  }

  noiseBurst({ dur = 0.2, gain = 0.2, type = 'bandpass', freq = 800, freqEnd = null, q = 1, delay = 0 }) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = rand(0.85, 1.2);
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (freqEnd !== null) filter.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  tone({ freq = 440, freqEnd = null, dur = 0.25, gain = 0.15, type = 'sine', delay = 0, attack = 0.005, pan = 0 }) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = ctx.createStereoPanner?.();
    if (p) { p.pan.value = pan; osc.connect(g).connect(p).connect(this.master); }
    else osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  slash() {
    this.noiseBurst({ dur: 0.16, gain: 0.16, type: 'highpass', freq: 1700, freqEnd: 520, q: 0.7 });
    this.tone({ freq: 660, freqEnd: 240, dur: 0.11, gain: 0.05, type: 'triangle' });
  }

  hit() {
    this.tone({ freq: 150, freqEnd: 52, dur: 0.18, gain: 0.28, type: 'sine' });
    this.noiseBurst({ dur: 0.12, gain: 0.2, type: 'lowpass', freq: 1700, freqEnd: 260, q: 0.9 });
    this.tone({ freq: 980, freqEnd: 660, dur: 0.07, gain: 0.04, type: 'square' });
  }

  parry() {
    this.tone({ freq: 1320, freqEnd: 880, dur: 0.16, gain: 0.07, type: 'triangle' });
    this.noiseBurst({ dur: 0.1, gain: 0.1, type: 'highpass', freq: 2400, freqEnd: 1200 });
  }

  hurt() {
    this.tone({ freq: 130, freqEnd: 38, dur: 0.42, gain: 0.3, type: 'sawtooth' });
    this.noiseBurst({ dur: 0.3, gain: 0.22, type: 'lowpass', freq: 1200, freqEnd: 180, q: 1.2 });
    this.tone({ freq: 52, freqEnd: 30, dur: 0.55, gain: 0.24, type: 'sine' });
  }

  jump() {
    this.noiseBurst({ dur: 0.15, gain: 0.075, type: 'bandpass', freq: 520, freqEnd: 950, q: 1.4 });
  }

  doubleJump() {
    this.noiseBurst({ dur: 0.24, gain: 0.09, type: 'bandpass', freq: 700, freqEnd: 1500, q: 1.1 });
    this.tone({ freq: 440, freqEnd: 720, dur: 0.22, gain: 0.035, type: 'sine' });
  }

  dash() {
    this.noiseBurst({ dur: 0.22, gain: 0.14, type: 'bandpass', freq: 320, freqEnd: 1500, q: 0.8 });
    this.tone({ freq: 120, freqEnd: 340, dur: 0.16, gain: 0.04, type: 'triangle' });
  }

  focus() {
    this.tone({ freq: 330, freqEnd: 880, dur: 0.55, gain: 0.075, type: 'sine' });
    this.tone({ freq: 495, freqEnd: 1320, dur: 0.55, gain: 0.035, type: 'triangle', delay: 0.05 });
    this.noiseBurst({ dur: 0.5, gain: 0.045, type: 'bandpass', freq: 1600, freqEnd: 3200, q: 2 });
  }

  heal() {
    [523.25, 659.25, 783.99].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.7, gain: 0.075, type: 'sine', delay: i * 0.08 });
    });
    this.noiseBurst({ dur: 0.5, gain: 0.05, type: 'highpass', freq: 2200, freqEnd: 4200, q: 0.8 });
  }

  roar() {
    this.tone({ freq: 92, freqEnd: 44, dur: 1.15, gain: 0.24, type: 'sawtooth' });
    this.tone({ freq: 138, freqEnd: 62, dur: 1.05, gain: 0.13, type: 'sawtooth', delay: 0.04 });
    this.noiseBurst({ dur: 1.1, gain: 0.14, type: 'lowpass', freq: 620, freqEnd: 120, q: 1.1 });
  }

  shoot() {
    this.tone({ freq: 320, freqEnd: 760, dur: 0.24, gain: 0.06, type: 'triangle' });
    this.noiseBurst({ dur: 0.2, gain: 0.07, type: 'bandpass', freq: 900, freqEnd: 1800, q: 2 });
  }

  slam() {
    this.tone({ freq: 82, freqEnd: 26, dur: 0.65, gain: 0.34, type: 'sine' });
    this.noiseBurst({ dur: 0.55, gain: 0.24, type: 'lowpass', freq: 900, freqEnd: 120, q: 0.8 });
  }

  spike() {
    this.noiseBurst({ dur: 0.2, gain: 0.12, type: 'highpass', freq: 800, freqEnd: 2600, q: 1 });
    this.tone({ freq: 180, freqEnd: 520, dur: 0.18, gain: 0.05, type: 'square' });
  }

  phase() {
    this.roar();
    this.tone({ freq: 55, freqEnd: 30, dur: 2.2, gain: 0.16, type: 'sine', delay: 0.1 });
    this.noiseBurst({ dur: 1.6, gain: 0.1, type: 'bandpass', freq: 300, freqEnd: 90, q: 0.6 });
  }

  death() {
    this.tone({ freq: 220, freqEnd: 55, dur: 1.8, gain: 0.18, type: 'sine' });
    this.tone({ freq: 164.81, freqEnd: 41, dur: 2.1, gain: 0.12, type: 'triangle', delay: 0.1 });
    this.noiseBurst({ dur: 1.4, gain: 0.1, type: 'lowpass', freq: 700, freqEnd: 90 });
  }

  victory() {
    const notes = [261.63, 329.63, 392, 523.25, 659.25, 783.99];
    notes.forEach((f, i) => this.tone({ freq: f, dur: 1.8, gain: 0.07, type: 'sine', delay: i * 0.16 }));
    this.noiseBurst({ dur: 1.2, gain: 0.05, type: 'highpass', freq: 1800, freqEnd: 3800, q: 0.7 });
  }

  stop() {
    if (this.noteTimer) clearTimeout(this.noteTimer);
    if (!this.ctx) return;
    this.ctx.close();
    this.started = false;
    this.ctx = null;
  }
}
