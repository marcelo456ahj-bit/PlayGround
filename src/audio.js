const CHORDS = [
  [146.83, 220.0, 293.66, 369.99],
  [123.47, 185.0, 246.94, 293.66],
  [98.0, 146.83, 196.0, 246.94],
  [110.0, 164.81, 220.0, 293.66]
];

export class Soundscape {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.music = null;
    this.sfx = null;
    this.reverb = null;
    this.enabled = true;
    this.started = false;
    this.padVoices = [];
    this.chordIndex = 0;
    this.chordTimer = null;
    this.filter = null;
    this.wind = null;
  }

  get ready() {
    return Boolean(this.ctx && this.started);
  }

  async start() {
    if (this.started) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.enabled ? 0.9 : 0;
    master.connect(ctx.destination);
    this.master = master;

    const reverb = ctx.createConvolver();
    reverb.buffer = this.createImpulse(2.4, 2.8);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.55;
    reverb.connect(reverbGain);
    reverbGain.connect(master);
    this.reverb = reverb;

    const music = ctx.createGain();
    music.gain.value = 0.55;
    music.connect(master);
    music.connect(reverb);
    this.music = music;

    const sfx = ctx.createGain();
    sfx.gain.value = 0.8;
    sfx.connect(master);
    sfx.connect(reverb);
    this.sfx = sfx;

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 820;
    this.filter.Q.value = 0.4;
    this.filter.connect(music);

    const chord = CHORDS[0];
    for (let i = 0; i < chord.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = chord[i];
      osc.detune.value = (i - 1.5) * 4;
      const gain = ctx.createGain();
      gain.gain.value = 0.016 / (1 + i * 0.35);
      osc.connect(gain);
      gain.connect(this.filter);
      osc.start();
      this.padVoices.push({ osc, gain });
    }

    this.startWind();
    this.scheduleChords();

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return;
      }
    }
    this.started = true;
  }

  createImpulse(duration, decay) {
    const ctx = this.ctx;
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = ctx.createBuffer(2, length, rate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return impulse;
  }

  startWind() {
    const ctx = this.ctx;
    const length = Math.floor(ctx.sampleRate * 3);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.value = 0.045;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.music);
    source.start();
    lfo.start();
    this.wind = { source, gain };
  }

  scheduleChords() {
    if (!this.ctx) return;
    this.chordTimer = window.setTimeout(() => {
      this.chordIndex = (this.chordIndex + 1) % CHORDS.length;
      const chord = CHORDS[this.chordIndex];
      const now = this.ctx.currentTime;
      this.padVoices.forEach(({ osc }, i) => {
        osc.frequency.cancelScheduledValues(now);
        osc.frequency.setTargetAtTime(chord[i], now, 2.8);
      });
      this.scheduleChords();
    }, 17000);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(enabled ? 0.9 : 0, now, 0.08);
    if (enabled && this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, duration, { type = 'sine', gain = 0.06, attack = 0.008, delay = 0, slideTo = null, lowpass = 0 } = {}) {
    if (!this.ready || !this.enabled) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + duration);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    let node = env;
    if (lowpass) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      filter.Q.value = 0.7;
      env.connect(filter);
      node = filter;
    }
    osc.connect(env);
    node.connect(this.sfx);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  noiseBurst(duration = 0.3, gain = 0.04) {
    if (!this.ready || !this.enabled) return;
    const ctx = this.ctx;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.8;
    const env = ctx.createGain();
    env.gain.value = gain;
    source.connect(filter);
    filter.connect(env);
    env.connect(this.sfx);
    source.start();
  }

  ui() {
    this.tone(620, 0.08, { gain: 0.025, type: 'sine' });
  }

  pickup(index = 0) {
    const scale = [784, 880, 1046.5, 1174.7, 1318.5];
    const freq = scale[index % scale.length];
    this.tone(freq, 0.42, { gain: 0.045, type: 'sine', attack: 0.004 });
    this.tone(freq * 1.5, 0.5, { gain: 0.026, type: 'triangle', delay: 0.045 });
    this.tone(freq * 2, 0.6, { gain: 0.012, type: 'sine', delay: 0.09 });
  }

  hit() {
    this.tone(150, 0.5, { gain: 0.08, type: 'sawtooth', slideTo: 55, lowpass: 380 });
    this.noiseBurst(0.35, 0.03);
  }

  portal() {
    this.tone(196, 1.6, { gain: 0.05, type: 'sine', slideTo: 784, attack: 0.2 });
    this.tone(293.66, 1.9, { gain: 0.03, type: 'triangle', slideTo: 1174.7, attack: 0.3 });
    this.noiseBurst(1.2, 0.018);
  }

  complete() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      this.tone(freq, 0.9, { gain: 0.035, type: 'sine', delay: i * 0.12, attack: 0.02 });
      this.tone(freq * 0.5, 1.4, { gain: 0.018, type: 'triangle', delay: i * 0.12 + 0.02 });
    });
  }

  fail() {
    this.tone(220, 1.2, { gain: 0.05, type: 'triangle', slideTo: 110, attack: 0.02 });
    this.tone(164.81, 1.5, { gain: 0.03, type: 'sine', slideTo: 82.4, attack: 0.05 });
  }

  startJourney() {
    this.tone(293.66, 1.4, { gain: 0.035, type: 'sine', slideTo: 440, attack: 0.25 });
    this.tone(440, 1.6, { gain: 0.022, type: 'triangle', slideTo: 659.25, attack: 0.4 });
    this.noiseBurst(0.8, 0.012);
  }
}
