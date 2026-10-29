/* Áudio procedural: trilha, torcida, cantos, efeitos e narração pt-BR.
   Tudo sintetizado no navegador — nenhum arquivo externo é necessário. */

const COMMENTARY = {
  kickoff: [
    'A bola rola no gramado! Começa a partida!',
    'Apita o árbitro e o espetáculo está começando!',
    'Tudo pronto! Bola em jogo para o primeiro tempo!'
  ],
  goal: [
    'GOOOOL! Que golaço! A torcida vai à loucura!',
    'É gol! É gol! O estádio inteiro está de pé!',
    'GOOOL! Que pintura, meus amigos! Simplesmente genial!',
    'Entrou! A rede balança e a festa começa nas arquibancadas!'
  ],
  save: [
    'Que defesa espetacular do goleiro!',
    'O arqueiro voou e salvou o time!',
    'Grande intervenção! Ele evitou o gol!'
  ],
  post: [
    'Na trave! Faltou um centímetro!',
    'A bola beijou a trave! Que azar!',
    'No ferro! O estádio inteiro prendeu a respiração!'
  ],
  foul: [
    'Falta! O árbitro não teve dúvidas.',
    'Entrada dura e o juiz apita a infração.',
    'Falta clara! O jogo fica quente.'
  ],
  card: [
    'Cartão amarelo! O jogador precisa ter cuidado.',
    'O árbitro mostra o cartão. Advertência registrada.',
    'Cartão vermelho! Ele está expulso!'
  ],
  half: [
    'Fim do primeiro tempo! Hora de ajustar as equipes.',
    'O árbitro encerra a primeira etapa.',
    'Primeiro tempo encerrado. Vamos para o vestiário.'
  ],
  full: [
    'Fim de jogo! Que partida, meus amigos!',
    'Apita o árbitro e termina o espetáculo!',
    'Chega ao fim! O placar está definido.'
  ],
  chance: [
    'Perigo! A defesa precisa se recompor!',
    'Ele está livre! Pode ser o gol!',
    'Grande jogada pela ponta! Atenção na área!'
  ],
  shoot: [
    'Ele arriscou de longe!',
    'Chutou! A bola vai com endereço!',
    'Finalização! O goleiro se prepara!'
  ],
  tackle: [
    'Desarme limpo! Recuperou a posse!',
    'Que carrinho! Tirou a bola com precisão!',
    'Marcação firme no meio-campo!'
  ],
  outro: [
    'A torcida empurra o time!',
    'Que atmosfera no estádio!',
    'O jogo segue pegado no meio-campo.',
    'Boa troca de passes!'
  ],
  penalty: [
    'Pênalti! A chance mais clara do jogo!',
    'O árbitro aponta para a marca!',
    'Pênalti marcado! O estádio prende a respiração!'
  ]
};

const CHANT_SYLLABLES = ['ôôô', 'olê olê', 'vamo vamo', 'uh uh', 'é campeão', 'gol gol gol'];

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.crowdGain = null;
    this.noiseBuffer = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.intensity = 0.3;
    this.currentMusic = null;
    this.lastCommentary = 0;
    this.voices = [];
    this.settings = { master: .8, music: .55, sfx: .8, crowd: .7, commentary: true };
    this.chantTimer = null;
    this.enabled = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.settings.master;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.settings.music * .32;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.settings.sfx;
    this.sfxGain.connect(this.master);
    this.crowdGain = this.ctx.createGain();
    this.crowdGain.gain.value = 0;
    this.crowdGain.connect(this.master);
    this.noiseBuffer = this.makeNoise(2.5);
    this.voices = window.speechSynthesis?.getVoices?.() || [];
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = () => { this.voices = window.speechSynthesis.getVoices(); };
    this.enabled = true;
    this.startCrowd();
    this.startChants();
  }

  makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + .02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    return buf;
  }

  setSettings(s) {
    Object.assign(this.settings, s);
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(this.settings.master, this.ctx.currentTime, .05);
    this.musicGain.gain.setTargetAtTime(this.settings.music * .32, this.ctx.currentTime, .05);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfx, this.ctx.currentTime, .05);
    this.crowdGain.gain.setTargetAtTime(this.currentMusic === 'match' ? (.16 + this.intensity * .3) * this.settings.crowd : 0, this.ctx.currentTime, .2);
  }

  startCrowd() {
    if (!this.ctx || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 620;
    filter.Q.value = .5;
    const filter2 = this.ctx.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.value = 2400;
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = .07;
    lfoGain.gain.value = 280;
    lfo.connect(lfoGain).connect(filter.frequency);
    src.connect(filter).connect(filter2).connect(this.crowdGain);
    src.start();
    lfo.start();
    this.crowdSource = src;
  }

  startChants() {
    if (this.chantTimer) clearInterval(this.chantTimer);
    this.chantTimer = setInterval(() => {
      if (!this.ctx || this.currentMusic !== 'match' || this.settings.crowd < .05) return;
      if (Math.random() < .38) this.chant();
    }, 7000);
  }

  chant() {
    if (!this.ctx || !this.settings.commentary) return;
    const phrase = CHANT_SYLLABLES[Math.floor(Math.random() * CHANT_SYLLABLES.length)];
    if (this.voices.length && this.settings.commentary !== false && Math.random() < .4) return;
    const base = 130 + Math.random() * 45;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 700; filter.Q.value = 1.2;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(.035 * this.settings.crowd, now + .12);
    g.gain.exponentialRampToValueAtTime(.001, now + 1.9);
    osc.connect(filter).connect(g).connect(this.master);
    osc.start(now); osc.stop(now + 2);
    if (phrase) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1000;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(.02 * this.settings.crowd, now);
      ng.gain.exponentialRampToValueAtTime(.001, now + .9);
      src.connect(f).connect(ng).connect(this.master);
      src.start(now); src.stop(now + .95);
    }
  }

  playMusic(track = 'menu') {
    this.init();
    if (!this.ctx) return;
    if (this.currentMusic === track) return;
    this.currentMusic = track;
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicStep = 0;
    const bpm = track === 'match' ? 116 : track === 'career' ? 82 : 92;
    const stepTime = 60 / bpm / 2;
    this.musicTimer = setInterval(() => this.musicTick(), stepTime * 1000);
    this.setSettings(this.settings);
  }

  musicTick() {
    if (!this.ctx) return;
    const step = this.musicStep++;
    const prog = this.currentMusic === 'match'
      ? [[0, 3, 7], [-3, 0, 5], [-5, -1, 2], [-7, -3, 0]]
      : [[0, 3, 7], [-4, 0, 3], [-5, -1, 2], [-7, -3, 0]];
    const chord = prog[Math.floor(step / 8) % prog.length];
    const root = 110;
    const t = this.ctx.currentTime;
    if (step % 8 === 0) {
      for (const semi of chord) this.padNote(root * Math.pow(2, semi / 12), .9, this.currentMusic === 'match' ? .05 : .035);
    }
    if (this.currentMusic === 'match') {
      if (step % 2 === 0) this.kickDrum(t, .1);
      if (step % 4 === 2) this.snare(t, .05);
      const notes = chord.map(s => root * 2 * Math.pow(2, s / 12));
      const n = notes[step % 3];
      this.pluck(n, .10, .08);
    } else {
      if (step % 4 === 0) this.pluck(root * 2 * Math.pow(2, chord[step % 3] / 12), .16, .06);
      if (step % 8 === 4) this.pluck(root * 3 * Math.pow(2, chord[(step + 1) % 3] / 12), .12, .04);
    }
  }

  padNote(freq, dur, vol) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 900;
    osc.type = 'triangle'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + .4);
    gain.gain.exponentialRampToValueAtTime(.0001, t + dur * 2.2);
    osc.connect(filter).connect(gain).connect(this.musicGain);
    osc.start(t); osc.stop(t + dur * 2.3);
  }

  pluck(freq, dur, vol) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(.0001, t + dur);
    osc.connect(gain).connect(this.musicGain);
    osc.start(t); osc.stop(t + dur + .02);
  }

  kickDrum(t, vol) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + .1);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(.001, t + .16);
    osc.connect(gain).connect(this.musicGain);
    osc.start(t); osc.stop(t + .18);
  }

  snare(t, vol) {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 1400;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.001, t + .12);
    src.connect(f).connect(g).connect(this.musicGain);
    src.start(t); src.stop(t + .14);
  }

  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(1, v));
    if (this.ctx && this.currentMusic === 'match') {
      this.crowdGain.gain.setTargetAtTime((.16 + this.intensity * .3) * this.settings.crowd, this.ctx.currentTime, .3);
    }
  }

  sfx(name, opts = {}) {
    if (!this.enabled) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const t = this.ctx.currentTime;
    if (name === 'click') return this.tone(680, .035, .025, 'square', t);
    if (name === 'navigate') return this.tone(440, .05, .025, 'triangle', t);
    if (name === 'error') return this.tone(150, .16, .06, 'sawtooth', t);
    if (name === 'kick') return this.thump(t, .11, 170, .12);
    if (name === 'pass') return this.thump(t, .06, 260, .06);
    if (name === 'shot') return this.thump(t, .15, 120, .17);
    if (name === 'post') return this.tone(1250, .5, .1, 'triangle', t, 480);
    if (name === 'save') return this.noiseBurst(t, .22, 900, .1);
    if (name === 'tackle') return this.noiseBurst(t, .14, 380, .12);
    if (name === 'whistle') return this.whistle(t, opts.long ? 1 : .45);
    if (name === 'goal') return this.goalHorn(t);
    if (name === 'card') return this.tone(240, .12, .07, 'square', t);
    if (name === 'trophy') return this.fanfare(t);
    if (name === 'crowdCheer') return this.crowdCheer(t, opts.power ?? .6);
    if (name === 'boo') return this.boo(t);
    if (name === 'unlock') return this.fanfare(t, true);
    if (name === 'tick') return this.tone(900, .03, .02, 'sine', t);
  }

  tone(freq, dur, vol, type = 'sine', t = this.ctx.currentTime, endFreq = null) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t); osc.stop(t + dur + .02);
  }

  thump(t, dur, freq, vol) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * .35), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t); osc.stop(t + dur + .02);
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const nf = this.ctx.createBiquadFilter();
    nf.type = 'lowpass'; nf.frequency.value = freq * 8;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(vol * .45, t);
    ng.gain.exponentialRampToValueAtTime(.0001, t + dur * .6);
    noise.connect(nf).connect(ng).connect(this.sfxGain);
    noise.start(t); noise.stop(t + dur);
  }

  noiseBurst(t, dur, freq, vol) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = .7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t); src.stop(t + dur + .02);
  }

  whistle(t, dur) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const mod = this.ctx.createOscillator();
    const mg = this.ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 2450;
    mod.frequency.value = 28; mg.gain.value = 130;
    mod.connect(mg).connect(osc.frequency);
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(.075, t + .02);
    g.gain.setValueAtTime(.075, t + dur * .75);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t); mod.start(t); osc.stop(t + dur + .02); mod.stop(t + dur + .02);
  }

  goalHorn(t) {
    const notes = [196, 247, 294, 392];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = freq;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
      g.gain.setValueAtTime(0, t + i * .09);
      g.gain.linearRampToValueAtTime(.09, t + i * .09 + .02);
      g.gain.exponentialRampToValueAtTime(.0001, t + i * .09 + .9);
      osc.connect(f).connect(g).connect(this.sfxGain);
      osc.start(t + i * .09); osc.stop(t + i * .09 + 1);
    });
    this.crowdCheer(t, 1);
  }

  fanfare(t, bright = false) {
    const notes = bright ? [523, 659, 784, 1047] : [392, 523, 659, 784];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t + i * .12);
      g.gain.linearRampToValueAtTime(.07, t + i * .12 + .03);
      g.gain.exponentialRampToValueAtTime(.0001, t + i * .12 + .8);
      osc.connect(g).connect(this.sfxGain);
      osc.start(t + i * .12); osc.stop(t + i * .12 + .85);
    });
  }

  crowdCheer(t, power = .6) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 850; f.Q.value = .4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(.13 * power * this.settings.crowd, t + .3);
    g.gain.exponentialRampToValueAtTime(.0001, t + 3.8);
    src.connect(f).connect(g).connect(this.master);
    src.start(t); src.stop(t + 4);
  }

  boo(t) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(96, t);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(.05 * this.settings.crowd, t + .2);
    g.gain.exponentialRampToValueAtTime(.0001, t + 1.6);
    osc.connect(f).connect(g).connect(this.master);
    osc.start(t); osc.stop(t + 1.7);
  }

  speak(text, priority = false) {
    if (!this.settings.commentary || !window.speechSynthesis) return;
    if (!priority && Date.now() - this.lastCommentary < 4200) return;
    this.lastCommentary = Date.now();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    u.rate = 1.08; u.pitch = .92; u.volume = Math.min(1, this.settings.master * 1.1);
    const voice = this.voices.find(v => /pt[-_]BR/i.test(v.lang)) || this.voices.find(v => /pt/i.test(v.lang));
    if (voice) u.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  comment(type) {
    const lines = COMMENTARY[type];
    if (!lines) return;
    this.speak(lines[Math.floor(Math.random() * lines.length)], type === 'goal');
  }

  stopCommentary() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.currentMusic = null;
  }
}

export const Audio = new AudioManager();
