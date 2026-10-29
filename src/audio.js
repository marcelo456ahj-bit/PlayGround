import { COMMENTARY } from "./data.js";

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.crowdGain = null;
    this.commentaryGain = null;
    this.settings = { master: 0.65, music: 0.32, sfx: 0.8, crowd: 0.4, commentary: 0.75, voice: true };
    this.ambient = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.speechVoice = null;
    this.lastSpeech = 0;
    this.lastCommentary = "";
    if (typeof speechSynthesis !== "undefined") {
      const pick = () => {
        const voices = speechSynthesis.getVoices();
        this.speechVoice = voices.find((voice) => /pt[-_]BR/i.test(voice.lang)) || voices.find((voice) => /pt/i.test(voice.lang)) || null;
      };
      pick();
      speechSynthesis.onvoiceschanged = pick;
    }
  }

  ensure() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      this.crowdGain = this.ctx.createGain();
      this.crowdGain.connect(this.master);
      this.commentaryGain = this.ctx.createGain();
      this.commentaryGain.connect(this.master);
      this.applyVolumes();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.master, t, 0.04);
    this.musicGain.gain.setTargetAtTime(this.settings.music * 0.38, t, 0.04);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfx, t, 0.04);
    this.crowdGain.gain.setTargetAtTime(this.settings.crowd * 0.2, t, 0.06);
    this.commentaryGain.gain.setTargetAtTime(this.settings.commentary, t, 0.04);
  }

  setSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    this.applyVolumes();
    if (!this.settings.voice && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }

  tone(freq, duration, type, gain, slide, destination) {
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), ctx.currentTime + duration);
    amp.gain.setValueAtTime(0.0001, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain || 0.1), ctx.currentTime + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(amp);
    amp.connect(destination || this.sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.03);
  }

  noise(duration, gain, filterFreq, type, destination) {
    const ctx = this.ensure();
    if (!ctx) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type || "bandpass";
    filter.frequency.value = filterFreq || 1000;
    filter.Q.value = 0.8;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain || 0.1, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(destination || this.sfxGain);
    source.start();
  }

  click() {
    this.tone(620, 0.05, "square", 0.035, 390);
  }

  hover() {
    this.tone(880, 0.03, "sine", 0.014, 720);
  }

  back() {
    this.tone(390, 0.08, "triangle", 0.04, 260);
  }

  success() {
    this.tone(523, 0.12, "triangle", 0.06);
    setTimeout(() => this.tone(659, 0.12, "triangle", 0.06), 80);
    setTimeout(() => this.tone(784, 0.2, "triangle", 0.07), 160);
  }

  coin() {
    this.tone(1180, 0.06, "square", 0.04, 1500);
    setTimeout(() => this.tone(1560, 0.12, "square", 0.035, 1850), 55);
  }

  kick(power) {
    const value = Math.min(1, Math.max(0.2, power || 0.6));
    this.noise(0.09, 0.07 + value * 0.08, 170, "lowpass");
    this.tone(92, 0.09, "sine", 0.12 + value * 0.08, 55);
  }

  pass() {
    this.noise(0.055, 0.035, 320, "lowpass");
    this.tone(210, 0.04, "triangle", 0.03, 150);
  }

  tackle() {
    this.noise(0.16, 0.11, 620, "bandpass");
    this.tone(120, 0.14, "sawtooth", 0.03, 60);
  }

  whistle(long) {
    const ctx = this.ensure();
    if (!ctx) return;
    const duration = long ? 0.52 : 0.2;
    const osc = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const amp = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = long ? 2470 : 2280;
    mod.frequency.value = 31;
    modGain.gain.value = 38;
    mod.connect(modGain);
    modGain.connect(osc.frequency);
    amp.gain.setValueAtTime(0.0001, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 0.02);
    amp.gain.setValueAtTime(0.055, ctx.currentTime + duration - 0.06);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(amp);
    amp.connect(this.sfxGain);
    osc.start();
    mod.start();
    osc.stop(ctx.currentTime + duration + 0.02);
    mod.stop(ctx.currentTime + duration + 0.02);
  }

  save() {
    this.noise(0.12, 0.09, 780, "bandpass");
    this.tone(150, 0.12, "square", 0.04, 95);
  }

  post() {
    this.tone(620, 0.3, "triangle", 0.14, 300);
    this.tone(930, 0.26, "sine", 0.08, 560);
  }

  goal() {
    this.whistle(false);
    this.tone(196, 0.5, "sawtooth", 0.05, 392);
    this.noise(1.4, 0.12, 650, "bandpass", this.crowdGain);
    this.noise(1.8, 0.075, 1100, "bandpass", this.crowdGain);
    for (let i = 0; i < 5; i += 1) setTimeout(() => this.tone(392 + i * 55, 0.25, "triangle", 0.04), i * 95);
  }

  card() {
    this.tone(250, 0.06, "square", 0.05, 160);
    setTimeout(() => this.tone(180, 0.09, "square", 0.04, 120), 70);
  }

  crowdStart(intensity) {
    const ctx = this.ensure();
    if (!ctx || this.ambient) return;
    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.97 + white * 0.03;
      data[i] = last * 2.2 + white * 0.08;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.6;
    const amp = ctx.createGain();
    amp.gain.value = 0.16;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(amp.gain);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(this.crowdGain);
    source.start();
    lfo.start();
    this.ambient = { source, amp, lfo, filter };
    this.setCrowd(intensity || 0.7);
  }

  setCrowd(intensity) {
    if (!this.ambient || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.ambient.amp.gain.setTargetAtTime(0.06 + intensity * 0.14, t, 0.5);
    this.ambient.filter.frequency.setTargetAtTime(340 + intensity * 380, t, 0.5);
  }

  crowdStop() {
    if (!this.ambient) return;
    try {
      this.ambient.source.stop();
      this.ambient.lfo.stop();
    } catch (error) {
      void error;
    }
    this.ambient = null;
  }

  chant() {
    if (!this.ambient || !this.ctx) return;
    const base = [146.8, 174.6, 196, 174.6, 146.8, 130.8, 146.8, 196];
    base.forEach((note, index) => {
      setTimeout(() => {
        this.tone(note, 0.34, "sawtooth", 0.014, note * 0.98, this.crowdGain);
        this.tone(note * 2, 0.32, "triangle", 0.008, note * 1.02, this.crowdGain);
      }, index * 210);
    });
    this.noise(1.8, 0.035, 620, "bandpass", this.crowdGain);
  }

  musicStart() {
    if (this.musicTimer) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const progression = [
      [110, 146.8, 174.6, 220],
      [98, 130.8, 164.8, 196],
      [87.3, 130.8, 164.8, 220],
      [82.4, 123.5, 164.8, 207.7]
    ];
    this.musicStep = 0;
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.settings.music <= 0) return;
      const chord = progression[Math.floor(this.musicStep / 2) % progression.length];
      const note = chord[this.musicStep % chord.length];
      this.tone(note, 0.5, "triangle", 0.045, note, this.musicGain);
      if (this.musicStep % 4 === 0) {
        this.tone(55, 0.35, "sine", 0.1, 42, this.musicGain);
        this.noise(0.08, 0.025, 200, "lowpass", this.musicGain);
      }
      if (this.musicStep % 8 === 4) this.noise(0.16, 0.018, 4500, "highpass", this.musicGain);
      this.musicStep += 1;
    }, 440);
  }

  musicStop() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  say(type, custom) {
    if (!this.settings.voice || typeof speechSynthesis === "undefined") return;
    const now = Date.now();
    if (now - this.lastSpeech < 5200) return;
    let line = custom;
    if (!line) {
      const pool = COMMENTARY[type] || [];
      if (!pool.length) return;
      const available = pool.filter((item) => item !== this.lastCommentary);
      line = available[Math.floor(Math.random() * available.length)] || pool[0];
    }
    if (line === this.lastCommentary) return;
    this.lastCommentary = line;
    this.lastSpeech = now;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(line);
    utterance.lang = "pt-BR";
    utterance.rate = 1.12;
    utterance.pitch = 1.02;
    utterance.volume = Math.min(1, this.settings.commentary * 0.95);
    if (this.speechVoice) utterance.voice = this.speechVoice;
    speechSynthesis.speak(utterance);
  }

  stopSpeech() {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }
}
