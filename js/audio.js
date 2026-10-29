(function () {
  'use strict';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const A = {
    ctx: null, master: null, musicBus: null, sfxBus: null, crowdBus: null,
    noiseBuffer: null, musicTimer: null, musicKind: null, musicStep: 0, nextNoteTime: 0,
    crowdSource: null, crowdGain: null, crowdLevel: .2, started: false,
    settings: { music: true, sfx: true, narration: true, volume: .75, musicVolume: .3 },
    voices: [], voice: null, lastNarrate: 0,

    init() {
      if (this.ctx) { this.resume(); return; }
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      try { this.ctx = new Ctor(); } catch (e) { return; }
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = this.settings.volume;
      this.master.connect(c.destination);
      this.musicBus = c.createGain();
      this.musicBus.gain.value = this.settings.musicVolume;
      this.musicBus.connect(this.master);
      this.sfxBus = c.createGain();
      this.sfxBus.gain.value = .8;
      this.sfxBus.connect(this.master);
      this.crowdBus = c.createGain();
      this.crowdBus.gain.value = 0;
      this.crowdBus.connect(this.master);
      this.noiseBuffer = this.makeNoise();
      this.makeCrowdLoop();
      this.started = true;
      if (window.speechSynthesis) {
        const load = () => {
          this.voices = window.speechSynthesis.getVoices();
          this.voice = this.voices.find(v => /pt[-_]BR/i.test(v.lang)) || this.voices.find(v => /^pt/i.test(v.lang)) || null;
        };
        load();
        window.speechSynthesis.onvoiceschanged = load;
      }
    },

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    makeNoise() {
      const c = this.ctx;
      const len = c.sampleRate * 2;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = last * .72 + white * .28;
        data[i] = last;
      }
      return buf;
    },

    makeCrowdLoop() {
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noiseBuffer; src.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = 'bandpass'; filter.frequency.value = 420; filter.Q.value = .45;
      const gain = c.createGain(); gain.gain.value = .55;
      const lfo = c.createOscillator(); lfo.frequency.value = .17;
      const lfoGain = c.createGain(); lfoGain.gain.value = .22;
      lfo.connect(lfoGain); lfoGain.connect(gain.gain);
      src.connect(filter); filter.connect(gain); gain.connect(this.crowdBus);
      src.start(); lfo.start();
      this.crowdSource = src;
      this.crowdGain = gain;
    },

    setSettings(s) {
      Object.assign(this.settings, s || {});
      if (!this.ctx) return;
      this.master.gain.setTargetAtTime(this.settings.volume, this.ctx.currentTime, .05);
      this.musicBus.gain.setTargetAtTime(this.settings.music ? this.settings.musicVolume : 0, this.ctx.currentTime, .08);
      if (!this.settings.music) this.stopMusic();
      this.updateCrowdGain();
    },

    updateCrowdGain() {
      if (!this.ctx) return;
      this.crowdBus.gain.setTargetAtTime(this.settings.sfx ? this.crowdLevel : 0, this.ctx.currentTime, .15);
    },

    setCrowdLevel(level) {
      this.crowdLevel = clamp(level, 0, 1) * .5;
      this.updateCrowdGain();
    },

    tone(freq, dur, type = 'sine', gain = .2, slide = 0, bus = null) {
      if (!this.ctx || !this.settings.sfx) return;
      const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + .008);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(bus || this.sfxBus);
      o.start(t); o.stop(t + dur + .02);
    },

    noise(dur, freq, gain = .2, type = 'lowpass', q = 1) {
      if (!this.ctx || !this.settings.sfx) return;
      const c = this.ctx, t = c.currentTime;
      const src = c.createBufferSource(); src.buffer = this.noiseBuffer;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(this.sfxBus);
      src.start(t); src.stop(t + dur + .02);
    },

    ui() { this.tone(720, .045, 'square', .035, 980); },
    uiBack() { this.tone(420, .055, 'square', .03, 300); },
    coin() { this.tone(880, .07, 'triangle', .12); setTimeout(() => this.tone(1320, .12, 'triangle', .1), 55); },
    kick(power = .7) {
      this.tone(140, .11, 'sine', .38 * power, 48);
      this.noise(.055, 2600, .13 * power, 'highpass');
    },
    pass() { this.sep(320, .05, 'triangle', .1, 180); },
    sep(f, d, t, g, s) { this.tone(f, d, t, g, s); },
    tackle() { this.noise(.14, 900, .22); this.tone(90, .16, 'sine', .2, 45); },
    whistle(long) {
      const n = long ? 2 : 1;
      for (let i = 0; i < n; i++) {
        setTimeout(() => {
          this.tone(2280, .13, 'square', .055, 2520);
          this.tone(2290, .13, 'triangle', .04, 2500);
        }, i * 190);
      }
    },
    card() { this.tone(300, .1, 'sawtooth', .07, 180); },
    post() { this.tone(1800, .18, 'square', .14, 900); this.noise(.08, 4000, .1, 'highpass'); },
    save() { this.noise(.09, 1300, .18); this.tone(220, .1, 'sine', .1, 140); },
    goal() {
      this.noise(1.5, 600, .32, 'bandpass', .6);
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, .5, 'triangle', .08), i * 75));
      this.chant();
    },
    crowdOoh() { this.noise(.7, 520, .16, 'bandpass', .8); },
    crowdBoo() { this.noise(1.1, 220, .15, 'lowpass'); },
    chant() {
      if (!this.ctx || !this.settings.sfx) return;
      const notes = [392, 440, 523, 440, 392, 330, 392, 523];
      notes.forEach((f, i) => setTimeout(() => this.tone(f, .28, 'triangle', .055), i * 230));
    },
    horn() { this.tone(233, .7, 'sawtooth', .06, 220); setTimeout(() => this.tone(311, .7, 'sawtooth', .045, 300), 130); },
    buzzer() { this.tone(180, .45, 'square', .09, 120); },

    speak(text, force) {
      if (!this.settings.narration || !text || !window.speechSynthesis) return;
      const now = Date.now();
      if (!force && now - this.lastNarrate < 5000) return;
      this.lastNarrate = now;
      try {
        if (force) window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'pt-BR';
        if (this.voice) u.voice = this.voice;
        u.rate = 1.14; u.pitch = .92; u.volume = clamp(this.settings.volume * .9, 0, 1);
        window.speechSynthesis.speak(u);
      } catch (e) {}
    },

    startMusic(kind) {
      if (!this.ctx || !this.settings.music) return;
      if (this.musicKind === kind && this.musicTimer) return;
      this.stopMusic();
      this.musicKind = kind;
      this.musicStep = 0;
      this.nextNoteTime = this.ctx.currentTime + .1;
      const bpm = kind === 'match' ? 112 : kind === 'menu' ? 92 : 84;
      this.stepDur = 60 / bpm / 2;
      this.musicTimer = setInterval(() => this.scheduleMusic(), 90);
      this.scheduleMusic();
    },

    stopMusic() {
      if (this.musicTimer) clearInterval(this.musicTimer);
      this.musicTimer = null; this.musicKind = null;
    },

    scheduleMusic() {
      if (!this.ctx || !this.musicTimer) return;
      const ahead = .35;
      while (this.nextNoteTime < this.ctx.currentTime + ahead) {
        this.playMusicStep(this.musicStep, this.nextNoteTime, this.musicKind);
        this.nextNoteTime += this.stepDur;
        this.musicStep++;
      }
    },

    playMusicStep(step, time, kind) {
      const c = this.ctx;
      const s = step % 32;
      const bar = Math.floor(s / 8);
      const menuChords = [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66], [164.81, 196, 246.94]];
      const matchChords = [[110, 164.81, 220], [130.81, 196, 261.63], [98, 146.83, 196], [123.47, 185, 246.94]];
      const chords = kind === 'match' ? matchChords : menuChords;
      const chord = chords[bar % chords.length];
      const osc = (freq, dur, type, gain, dest) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(gain, time + .02);
        g.gain.exponentialRampToValueAtTime(.0001, time + dur);
        o.connect(g); g.connect(dest || this.musicBus);
        o.start(time); o.stop(time + dur + .02);
      };
      if (s % 8 === 0) chord.forEach((f, i) => osc(f / 2, 1.2, 'sine', .08));
      const arp = [0, 1, 2, 1, 0, 2, 1, 2][s % 8];
      if (s % 2 === 0) osc(chord[arp] * 2, .22, 'triangle', .035);
      if (kind === 'match') {
        if (s % 4 === 0) osc(55, .18, 'sine', .1);
        if (s % 4 === 2) {
          const src = c.createBufferSource(); src.buffer = this.noiseBuffer;
          const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
          const g = c.createGain(); g.gain.setValueAtTime(.025, time); g.gain.exponentialRampToValueAtTime(.0001, time + .05);
          src.connect(f); f.connect(g); g.connect(this.musicBus); src.start(time); src.stop(time + .06);
        }
      } else {
        if (s % 8 === 4) osc(chord[2] * 3, .18, 'sine', .022);
      }
    }
  };

  window.PESAudio = A;
})();
