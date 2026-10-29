import { clamp, pick } from './util.js';

const COMMENTARY = {
  kickoff: ['A bola rola no gramado! Começa a partida!', 'Autoriza o árbitro e a bola está em jogo!', 'Começa o espetáculo! Bola rolando!'],
  goal: ['GOOOOL! Que golaço!', 'É gol! A torcida vai à loucura!', 'GOL! Que momento fantástico!', 'Entrou! O estádio explode!'],
  goalHome: ['Gol do time da casa! Que festa nas arquibancadas!', 'A casa treme! É gol!'],
  goalAway: ['Gol do visitante! Silêncio no estádio!', 'O time visitante marca e cala a torcida!'],
  shot: ['Chutou! Boa chance!', 'Arriscou de longe!', 'Finalização perigosa!'],
  save: ['Grande defesa do goleiro!', 'Que paredão! O goleiro salvou!', 'Defesa espetacular!'],
  miss: ['Passou perto! Quase o gol!', 'Por pouco! A bola saiu!', 'Que desperdício!'],
  foul: ['Falta marcada! O árbitro não perdoou.', 'Entrada dura! O juiz apita.', 'Falta! Jogo parado.'],
  yellow: ['Cartão amarelo! O jogador está advertido.', 'Amarelo para ele! Cuidado na próxima.'],
  red: ['Cartão vermelho! Ele está expulso!', 'Vermelho direto! O time fica com um a menos!'],
  corner: ['Escanteio! Boa oportunidade de cruzamento.', 'Cobrança de canto! Todos na área.'],
  throwin: ['Lateral para o time adversário.', 'Reposição de bola pela lateral.'],
  goalkick: ['Tiro de meta. O goleiro reinicia o jogo.', 'O goleiro repõe a bola.'],
  penalty: ['PÊNALTI! A chance mais clara do jogo!', 'O árbitro aponta a marca da cal!'],
  halftime: ['Fim do primeiro tempo.', 'Intervalo! Os times vão para o vestiário.'],
  secondhalf: ['Recomeça a partida para o segundo tempo!', 'Bola rolando na etapa final!'],
  fulltime: ['Fim de jogo! O árbitro encerra a partida!', 'Apita o árbitro! Fim de jogo!'],
  save2: ['O goleiro espalmou!', 'Que mão! O goleiro evita o gol!'],
  post: ['Na trave! O estádio inteiro levantou!', 'Bateu no poste! Que azar!'],
  crowd: ['A torcida empurra o time!', 'Que atmosfera no estádio!', 'O caldeirão está fervendo!'],
  tackle: ['Carrinho certeiro! Recuperou a bola!', 'Desarme limpo no meio-campo!'],
  sub: ['Substituição autorizada.', 'Troca no time. O técnico mexe.'],
  freekick: ['Cobrança de falta perigosa!', 'Falta na entrada da área!'],
  offside: ['Impedimento marcado!', 'Bandeira levantada! Impedimento.'],
  loose: ['A bola está viva na área!', 'Rebote perigoso!' ]
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.crowdGain = null;
    this.commentaryGainValue = 0.85;
    this.settings = { music: .45, sfx: .8, crowd: .65, commentary: .85, commentaryOn: true };
    this.started = false;
    this.crowdSource = null;
    this.crowdFilter = null;
    this.crowdIntensity = 0.25;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicOn = false;
    this.musicKind = 'menu';
    this.lastComment = 0;
    this.lastCommentText = '';
    this.voices = [];
    this.ttsVoice = null;
    this.epic = false;
    this.ready = false;
  }

  init() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.crowdGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.crowdGain.connect(this.master);
      this.applyVolumes();
      this.startCrowd();
      this.ready = true;
      this.loadVoices();
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    } catch (e) { console.warn('audio init failed', e); }
  }

  loadVoices() {
    if (!window.speechSynthesis) return;
    try {
      this.voices = window.speechSynthesis.getVoices() || [];
      const pt = this.voices.filter(v => /pt[-_]?br/i.test(v.lang) || /portugu/i.test(v.name));
      const ptbr = pt.find(v => /brazil|brasil/i.test(v.name)) || pt[0];
      this.ttsVoice = ptbr || this.voices.find(v => /^pt/i.test(v.lang)) || null;
    } catch { /* ignore */ }
  }

  applyVolumes() {
    if (!this.ctx) return;
    const s = this.settings;
    this.musicGain.gain.setTargetAtTime((s.music ?? .45) * .55, this.ctx.currentTime, .05);
    this.sfxGain.gain.setTargetAtTime((s.sfx ?? .8) * .9, this.ctx.currentTime, .05);
    this.crowdGain.gain.setTargetAtTime((s.crowd ?? .65) * .55, this.ctx.currentTime, .05);
    this.commentaryGainValue = s.commentary ?? .85;
  }

  setSettings(s) {
    this.settings = { ...this.settings, ...s };
    this.applyVolumes();
    if (!s.commentaryOn && window.speechSynthesis) window.speechSynthesis.cancel();
  }

  setEpic(on) { this.epic = !!on; }

  noiseBuffer(seconds = 2, type = 'pink') {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else data[i] = white;
    }
    return buf;
  }

  startCrowd() {
    if (!this.ctx || this.crowdSource) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(4, 'pink');
    src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = .4;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 180;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.22;
    src.connect(hp).connect(lp).connect(gain).connect(this.crowdGain);
    src.start();
    this.crowdSource = src;
    this.crowdFilter = lp;
    this.crowdBase = gain;
  }

  stopCrowd() {
    try { this.crowdSource?.stop(); } catch { /* ignore */ }
    this.crowdSource = null;
  }

  setCrowdIntensity(x, withCheer = false) {
    this.crowdIntensity = clamp(x, 0, 1);
    if (this.ctx && this.crowdBase) {
      const t = this.ctx.currentTime;
      this.crowdBase.gain.setTargetAtTime(0.10 + this.crowdIntensity * 0.35, t, .25);
      this.crowdFilter.frequency.setTargetAtTime(900 + this.crowdIntensity * 2600, t, .3);
    }
    if (withCheer) this.cheer(this.crowdIntensity);
  }

  tone({ freq = 440, dur = .15, type = 'sine', gain = .2, attack = .005, release = .12, detune = 0, slide = null, when = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
    o.connect(g).connect(this.sfxGain);
    o.start(t); o.stop(t + dur + release + .02);
  }

  noiseBurst({ dur = .2, gain = .3, freq = 1000, q = 1, type = 'bandpass', when = 0, sweep = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(Math.max(.1, dur + .1), 'white');
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, sweep), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t); src.stop(t + dur + .05);
  }

  click() { this.tone({ freq: 720, dur: .04, type: 'square', gain: .05, release: .03 }); }
  back() { this.tone({ freq: 380, dur: .06, type: 'square', gain: .05, slide: 260 }); }
  select() { this.tone({ freq: 520, dur: .05, type: 'triangle', gain: .06 }); this.tone({ freq: 780, dur: .07, type: 'triangle', gain: .05, when: .05 }); }
  kick(power = .7) {
    this.noiseBurst({ dur: .08, gain: .28 * power, freq: 1600, q: .7, sweep: 300 });
    this.tone({ freq: 150, dur: .12, gain: .22 * power, type: 'sine', slide: 60 });
  }
  pass(power = .5) {
    this.noiseBurst({ dur: .05, gain: .13 * power, freq: 2200, q: 1.2, sweep: 700 });
    this.tone({ freq: 260, dur: .06, gain: .07, type: 'sine', slide: 140 });
  }
  tackle() {
    this.noiseBurst({ dur: .18, gain: .26, freq: 500, q: .8, sweep: 120, type: 'lowpass' });
    this.tone({ freq: 95, dur: .18, gain: .18, type: 'sine', slide: 50 });
  }
  post() { this.tone({ freq: 1240, dur: .55, gain: .18, type: 'triangle', release: .5 }); this.tone({ freq: 1870, dur: .4, gain: .07, type: 'sine', release: .5 }); }
  save() { this.noiseBurst({ dur: .14, gain: .2, freq: 900, q: 1.4, sweep: 300 }); this.tone({ freq: 180, dur: .1, gain: .12, type: 'sine', slide: 90 }); }
  whistle(long = false) {
    const dur = long ? .55 : .22;
    this.tone({ freq: 2350, dur, gain: .13, type: 'sine', release: .1, detune: 8 });
    this.tone({ freq: 2390, dur, gain: .1, type: 'sine', release: .1, detune: -8 });
  }
  card(kind = 'yellow') {
    const f = kind === 'red' ? 300 : 420;
    this.tone({ freq: f, dur: .1, gain: .12, type: 'square', release: .1 });
    this.tone({ freq: f * 1.25, dur: .12, gain: .1, type: 'square', release: .1, when: .13 });
  }
  goal() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [392, 523, 659, 784].forEach((f, i) => {
      this.tone({ freq: f, dur: .45 + i * .05, gain: .11, type: 'sawtooth', release: .8, when: i * .09 });
    });
    this.tone({ freq: 98, dur: .6, gain: .2, type: 'sine', slide: 70 });
    this.cheer(1);
  }
  cheer(intensity = .8) {
    if (!this.ctx) return;
    this.noiseBurst({ dur: 1.6 + intensity * 1.4, gain: .16 * intensity + .06, freq: 1200, q: .3, type: 'bandpass', sweep: 2200 });
    this.noiseBurst({ dur: 1.2, gain: .1 * intensity, freq: 600, q: .4, type: 'lowpass' });
  }
  boo() {
    this.noiseBurst({ dur: 1.1, gain: .16, freq: 250, q: .5, type: 'lowpass', sweep: 120 });
  }
  drum() {
    this.tone({ freq: 90, dur: .18, gain: .14, type: 'sine', slide: 55 });
    this.noiseBurst({ dur: .07, gain: .08, freq: 900, q: .8 });
  }

  say(text, opts = {}) {
    if (!this.settings.commentaryOn || !window.speechSynthesis || !text) return;
    const now = performance.now();
    if (!opts.force && now - this.lastComment < (opts.cooldown || 4200)) return;
    if (!opts.force && text === this.lastCommentText) return;
    this.lastComment = now;
    this.lastCommentText = text;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'pt-BR';
      if (this.ttsVoice) u.voice = this.ttsVoice;
      u.volume = clamp(this.commentaryGainValue, 0, 1);
      u.rate = this.epic ? .97 : 1.05;
      u.pitch = this.epic ? .86 : 1.02;
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  }

  comment(type, extra = {}) {
    const arr = COMMENTARY[type] || [];
    if (!arr.length) return '';
    let text = pick(arr);
    if (extra.text) text = extra.text;
    if (extra.name) text = text.replace('ele', extra.name).replace('Ele', extra.name);
    this.say(text, { cooldown: extra.cooldown || 3800, force: extra.force });
    return text;
  }

  startMusic(kind = 'menu') {
    if (!this.ctx) return;
    this.musicKind = kind;
    if (this.musicOn) return;
    this.musicOn = true;
    this.musicStep = 0;
    const bpm = kind === 'match' ? 104 : 88;
    const stepMs = (60 / bpm / 2) * 1000;
    this.musicTimer = setInterval(() => this.musicTick(kind), stepMs);
    this.musicTick(kind);
  }

  stopMusic() {
    this.musicOn = false;
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  musicTick(kind) {
    if (!this.ctx || !this.musicOn) return;
    const t = this.ctx.currentTime;
    const step = this.musicStep++ % 64;
    const bar = Math.floor(step / 8) % 4;
    const menuChords = [
      [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66], [164.81, 207.65, 246.94]
    ];
    const matchChords = [
      [196, 246.94, 293.66], [220, 261.63, 329.63], [174.61, 220, 261.63], [233.08, 293.66, 349.23]
    ];
    const chord = (kind === 'match' ? matchChords : menuChords)[bar];
    const g = this.musicGain;
    const play = (freq, dur, type, gain, when = 0, slide = null) => {
      const o = this.ctx.createOscillator();
      const gg = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + when + dur);
      gg.gain.setValueAtTime(0, t + when);
      gg.gain.linearRampToValueAtTime(gain, t + when + .02);
      gg.gain.exponentialRampToValueAtTime(0.0001, t + when + dur);
      o.connect(gg).connect(g);
      o.start(t + when); o.stop(t + when + dur + .03);
    };
    if (step % 8 === 0) {
      play(chord[0] / 2, .55, 'sine', .08);
      play(chord[0] / 4, .8, 'triangle', .035);
      if (kind === 'match') { play(70, .12, 'sine', .1, 0, 40); }
    }
    if (kind === 'match' && step % 4 === 2) play(62, .08, 'sine', .06, 0, 38);
    if (step % 2 === 0) {
      const note = chord[(step / 2) % 3] * 2;
      play(note, .22, kind === 'match' ? 'square' : 'triangle', kind === 'match' ? .018 : .026);
    }
    if (step % 8 === 4) {
      play(chord[1], .35, 'sine', .03);
      play(chord[2], .35, 'sine', .025);
    }
    if (step % 16 === 14) play(chord[2] * 2, .5, 'triangle', .02);
  }

  vibrate(pattern = 10) {
    if (!this.settings.haptics) return;
    try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
  }
}

export { COMMENTARY };
