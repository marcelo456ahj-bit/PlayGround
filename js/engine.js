/* Núcleo de simulação da partida: física, IA, regras, táticas e estado. */

import { TEAMS, FORMATIONS, DIFFICULTIES, CAMERAS, WEATHERS, defaultLineup, benchFor } from './data.js';
import { Audio } from './audio.js';
import { MatchRenderer } from './renderer.js';
import { MatchHud } from './hud.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const rand = (a = 1, b = 0) => b + Math.random() * (a - b);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const FIELD = { x0: 80, x1: 1520, z0: 38, z1: 632, cx: 800, cz: 335 };
export const GOAL = { z0: 267, z1: 403, height: 154, depth: 82 };
const TAU = Math.PI * 2;

export class MatchEngine {
  constructor(opts) {
    this.opts = opts;
    this.canvas = opts.canvas || document.getElementById('match-canvas');
    this.uiRoot = opts.uiRoot || document.getElementById('match-ui');
    this.userSide = opts.userSide || 'home';
    this.twoPlayer = !!opts.twoPlayer;
    this.cpuVsCpu = opts.userSide === 'cpu' || !!opts.cpuVsCpu;
    this.training = opts.mode === 'training';
    this.penaltyPractice = opts.mode === 'penalty';
    this.practice = { taken: 0, scored: 0 };
    this.practiceSide = this.userSide === 'away' ? 'away' : 'home';
    this.drill = opts.drill || 'freestyle';
    this.difficulty = DIFFICULTIES.find(d => d.id === opts.difficulty) || DIFFICULTIES[1];
    this.weather = WEATHERS.find(w => w.id === opts.weather) || WEATHERS[0];
    this.cameraMode = CAMERAS.find(c => c.id === opts.camera)?.id || 'transmissao';
    this.halfLength = opts.halfLength || 4;
    this.requireWinner = !!opts.requireWinner;
    this.autoReplay = opts.replay !== false;
    this.hudControls = opts.showControls !== false;
    this.tiltEnabled = !!opts.tilt;
    this.quality = opts.quality || 'alta';

    this.homeTeam = TEAMS[opts.homeId] || Object.values(TEAMS)[0];
    this.awayTeam = TEAMS[opts.awayId] || Object.values(TEAMS)[1];
    this.homeLineupIds = (opts.homeLineup && opts.homeLineup.length ? opts.homeLineup : defaultLineup(this.homeTeam)).slice(0, 11);
    this.awayLineupIds = (opts.awayLineup && opts.awayLineup.length ? opts.awayLineup : defaultLineup(this.awayTeam)).slice(0, 11);
    this.homeBenchIds = (opts.homeBench && opts.homeBench.length ? opts.homeBench : benchFor(this.homeTeam, this.homeLineupIds)).slice(0, 9);
    this.awayBenchIds = (opts.awayBench && opts.awayBench.length ? opts.awayBench : benchFor(this.awayTeam, this.awayLineupIds)).slice(0, 9);
    this.homeFormation = opts.homeFormation || this.homeTeam.formation || '4-3-3';
    this.awayFormation = opts.awayFormation || this.awayTeam.formation || '4-3-3';
    this.homeMentality = opts.homeMentality || this.homeTeam.mentality || 'equilibrada';
    this.awayMentality = opts.awayMentality || this.awayTeam.mentality || 'equilibrada';
    this.stadium = opts.stadium || this.homeTeam.stadium;
    this.kitStyle = opts.kitStyle || {};

    this.score = { home: 0, away: 0 };
    this.half = 1;
    this.minute = 0;
    this.state = 'intro';
    this.stateTimer = 1.8;
    this.paused = false;
    this.finished = false;
    this.shake = 0;
    this.elapsed = 0;
    this.raf = 0;
    this.lastTime = 0;
    this.goalScorers = [];
    this.substitutions = { home: 0, away: 0 };
    this.maxSubs = 5;
    this.controlled = { home: null, away: null };
    this.replayFrames = [];
    this.replayState = null;
    this.possessionTime = { home: 0, away: 0 };
    this.stats = this.blankStats();
    this.ball = this.freshBall(FIELD.cx, FIELD.cz);
    this.action = { shoot: false, sprint: false, charge: 0, chargeHeld: false, shootCooldown: 0, dribbleCooldown: 0, switchCooldown: 0, passCooldown: 0 };
    this.action2 = { shoot: false, sprint: false, charge: 0, chargeHeld: false, shootCooldown: 0, dribbleCooldown: 0, switchCooldown: 0, passCooldown: 0 };
    this.keys = new Set();
    this.joystick = { active: false, id: null, x: 0, z: 0 };
    this.p2Input = { x: 0, z: 0 };
    this.tilt = { x: 0, z: 0, enabled: this.tiltEnabled };
    this.events = [];
    this.celebration = 0;
    this.shootout = null;
    this.matchEnded = false;
    this.scorerBanner = null;
    this.cardBanner = null;
    this.pendingPass = null;
    this.subState = { side: 'home', out: null, in: null, tab: 'home' };
    this.buildTeams();
    this.renderer = new MatchRenderer(this.canvas, this);
    this.hud = new MatchHud(this.uiRoot, this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onOrientation = this.onOrientation.bind(this);
    this.loop = this.loop.bind(this);
  }

  blankStats() {
    return {
      home: { possession: 0, shots: 0, onTarget: 0, passes: 0, passesOk: 0, tackles: 0, fouls: 0, corners: 0, offsides: 0, saves: 0, cards: 0, yellow: 0, red: 0 },
      away: { possession: 0, shots: 0, onTarget: 0, passes: 0, passesOk: 0, tackles: 0, fouls: 0, corners: 0, offsides: 0, saves: 0, cards: 0, yellow: 0, red: 0 }
    };
  }

  freshBall(x, z) {
    return { x, z, y: 0, vx: 0, vz: 0, vy: 0, owner: null, lastTouch: null, lastTouchSide: null, shotBy: null, spin: 0, trail: [] };
  }

  buildTeams() {
    this.players = [];
    this.sides = {};
    for (const side of ['home', 'away']) {
      const team = side === 'home' ? this.homeTeam : this.awayTeam;
      const ids = side === 'home' ? this.homeLineupIds : this.awayLineupIds;
      const formationId = side === 'home' ? this.homeFormation : this.awayFormation;
      const formation = FORMATIONS[formationId] || FORMATIONS['4-3-3'];
      const lineup = [];
      ids.forEach((id, i) => {
        const data = team.squad.find(p => p.id === id) || team.squad[i];
        if (!data) return;
        const slot = formation.slots[i] || formation.slots[formation.slots.length - 1];
        const p = this.makeRuntimePlayer(side, data, slot, i);
        lineup.push(p);
        this.players.push(p);
      });
      this.sides[side] = {
        side, team, lineup, formationId,
        mentality: side === 'home' ? this.homeMentality : this.awayMentality,
        bench: (side === 'home' ? this.homeBenchIds : this.awayBenchIds).map(id => team.squad.find(p => p.id === id)).filter(Boolean),
        dir: side === 'home' ? 1 : -1, score: 0, subs: 0, sentOff: 0
      };
    }
    this.resetPositions('home');
    this.controlled.home = this.nearestToBall('home')?.id || this.sides.home.lineup[0]?.id || null;
    this.controlled.away = this.nearestToBall('away')?.id || this.sides.away.lineup[0]?.id || null;
    this.updateControlledFlags();
  }

  makeRuntimePlayer(side, data, slot, index) {
    const dir = side === 'home' ? 1 : -1;
    const base = this.formationPosition(slot, dir, 0);
    return {
      id: data.id, data, side, slot, slotIndex: index, pos: data.pos, num: data.num,
      x: base.x, z: base.z, baseX: base.x, baseZ: base.z,
      vx: 0, vz: 0, speed: 0, facing: dir, stamina: 100,
      anim: Math.random() * TAU, animSpeed: 1, kick: 0, tackle: 0, dive: 0, header: 0,
      state: 'idle', think: Math.random() * .3, targetX: base.x, targetZ: base.z,
      hasBall: false, controlled: false, card: 0, sentOff: false, rating: 6.4, touches: 0, goals: 0,
      lastAction: '', slideDir: { x: 0, z: 0 }, celebration: 0, skillFlash: 0
    };
  }

  formationPosition(slot, dir, shift) {
    const [role, nx, nz] = slot || ['MEI', .5, .5];
    const marginX = 70, marginZ = 52;
    const x = dir === 1
      ? FIELD.x0 + marginX + nx * (FIELD.x1 - FIELD.x0 - marginX * 2)
      : FIELD.x1 - marginX - nx * (FIELD.x1 - FIELD.x0 - marginX * 2);
    const z = FIELD.z0 + marginZ + nz * (FIELD.z1 - FIELD.z0 - marginZ * 2);
    return { x: x + dir * shift, z };
  }

  resetPositions(kickoffSide = 'home') {
    for (const p of this.players) {
      p.x = p.baseX; p.z = p.baseZ;
      p.targetX = p.baseX; p.targetZ = p.baseZ;
      p.vx = 0; p.vz = 0; p.anim = Math.random() * TAU;
      p.kick = 0; p.tackle = 0; p.dive = 0; p.hasBall = false; p.celebration = 0;
      p.stamina = Math.max(p.stamina, 78);
      this.repositionForFormation(p);
    }
    this.kickoffSide = kickoffSide;
    this.ball = this.freshBall(FIELD.cx, FIELD.cz);
    this.pendingPass = null;
  }

  repositionForFormation(p) {
    const cfg = this.sides[p.side];
    const formation = FORMATIONS[cfg.formationId] || FORMATIONS['4-3-3'];
    const slot = formation.slots[p.slotIndex] || formation.slots[formation.slots.length - 1];
    const base = this.formationPosition(slot, cfg.dir, 0);
    p.slot = slot;
    p.baseX = base.x; p.baseZ = base.z;
    p.x = base.x; p.z = base.z;
  }

  start() {
    document.getElementById('match-root').hidden = false;
    document.body.classList.add('match-active');
    this.renderer.resize();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onOrientation);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('deviceorientation', this.onOrientation);
    this.hud.mount();
    this.hud.showIntro();
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    Audio.playMusic('match');
    Audio.setIntensity(.35);
    if (this.tiltEnabled) this.requestTilt();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onOrientation);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('deviceorientation', this.onOrientation);
    Audio.stopCommentary();
    document.body.classList.remove('match-active');
    document.getElementById('match-root').hidden = true;
    this.uiRoot.innerHTML = '';
    this.finished = true;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  onResize() { this.renderer.resize(); }
  onOrientation(e) {
    if (!this.tiltEnabled || !e.gamma && !e.beta) return;
    this.tilt.x = clamp((e.gamma || 0) / 30, -1, 1);
    this.tilt.z = clamp(((e.beta || 0) - 40) / 30, -1, 1);
  }

  requestTilt() {
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === 'function') {
      D.requestPermission().then(r => { if (r !== 'granted') this.tilt.enabled = false; }).catch(() => { this.tilt.enabled = false; });
    }
  }

  onKeyDown(e) {
    const k = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(k)) e.preventDefault();
    if (this.keys.has(k)) return;
    this.keys.add(k);
    if (k === 'Escape' || k === 'KeyP') { this.togglePause(); return; }
    if (this.paused || this.state === 'halftime' || this.state === 'finished') return;
    if (k === 'Space') this.doPass(this.userSide);
    if (k === 'KeyJ' || k === 'KeyZ') this.shootStart(this.userSide);
    if (k === 'KeyK' || k === 'KeyX') this.doTackleOrDribble(this.userSide);
    if (k === 'KeyC' || k === 'Tab') this.switchPlayer(this.userSide);
    if (this.twoPlayer) {
      if (k === 'KeyN') this.doPass('away');
      if (k === 'KeyM') this.shootStart('away');
      if (k === 'KeyB') this.doTackleOrDribble('away');
      if (k === 'KeyV') this.switchPlayer('away');
    }
  }

  onKeyUp(e) {
    const k = e.code;
    this.keys.delete(k);
    if (k === 'KeyJ' || k === 'KeyZ') this.shootRelease(this.userSide);
    if (k === 'KeyM' && this.twoPlayer) this.shootRelease('away');
  }

  joystickInput(side = this.userSide) {
    if (side === 'away' && this.twoPlayer) {
      let x = 0, z = 0;
      if (this.keys.has('KeyJ')) x -= 1;
      if (this.keys.has('KeyL')) x += 1;
      if (this.keys.has('KeyI')) z -= 1;
      if (this.keys.has('KeyK')) z += 1;
      return this.normalizeInput(x, z);
    }
    let x = this.joystick.active ? this.joystick.x : 0;
    let z = this.joystick.active ? this.joystick.z : 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) x -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) x += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) z -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) z += 1;
    if (this.tilt.enabled && !this.joystick.active) { x += this.tilt.x; z += this.tilt.z; }
    return this.normalizeInput(x, z);
  }

  normalizeInput(x, z) {
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    return { x, z, len: Math.min(1, len), active: len > .12 };
  }

  cycleCamera() {
    const ids = CAMERAS.map(c => c.id);
    const i = ids.indexOf(this.cameraMode);
    this.cameraMode = ids[(i + 1) % ids.length];
    Audio.sfx('click');
    this.hud.toast(`Câmera: ${CAMERAS.find(c => c.id === this.cameraMode).name}`, 'i');
  }

  setCamera(id) { if (CAMERAS.some(c => c.id === id)) this.cameraMode = id; }

  getControlled(side) {
    if (side === 'cpu') return null;
    const id = this.controlled[side];
    return this.players.find(p => p.id === id && !p.sentOff) || this.sides[side].lineup.find(p => !p.sentOff) || null;
  }

  updateControlledFlags() {
    for (const p of this.players) p.controlled = (p.side === 'home' && p.id === this.controlled.home) || (p.side === 'away' && p.id === this.controlled.away);
  }

  setControlled(side, p) {
    if (!p || p.sentOff) return;
    this.controlled[side] = p.id;
    this.updateControlledFlags();
  }

  nearestToBall(side, includeKeeper = false) {
    let best = null, bd = 1e9;
    for (const p of this.players) {
      if (p.side !== side || p.sentOff) continue;
      if (!includeKeeper && p.pos === 'GOL') continue;
      const d = dist(p.x, p.z, this.ball.x, this.ball.z);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  canPlay(side) {
    if (this.paused || this.finished) return false;
    if (side === 'cpu') return false;
    if (this.state !== 'play' && this.state !== 'penalty' && this.state !== 'kickoff') return false;
    return !!this.getControlled(side);
  }

  doPass(side) {
    if (!this.canPlay(side)) return;
    const p = this.getControlled(side);
    if (!p) return;
    if (this.ball.owner === p) return this.passFrom(p, side, false);
    if (this.ball.owner && this.ball.owner.side === side) return this.passFrom(this.ball.owner, side, true);
    this.doTackleOrDribble(side);
  }

  passFrom(p, side, oneTouch = false) {
    if (!p || p.sentOff) return;
    if (this.action.passCooldown > 0) return;
    this.action.passCooldown = .16;
    const input = this.joystickInput(side);
    const mates = this.players.filter(q => q.side === side && q !== p && !q.sentOff && q.pos !== 'GOL');
    if (!mates.length) return;
    const dir = this.sides[side].dir;
    let best = null, bestScore = -1e9;
    for (const q of mates) {
      const dx = q.x - p.x, dz = q.z - p.z;
      const d = Math.hypot(dx, dz) || 1;
      const forward = (dx * dir) * .42;
      const aim = input.active ? (dx / d * input.x + dz / d * input.z) * 175 : 0;
      const open = this.players.filter(o => o.side !== side && !o.sentOff).reduce((m, o) => Math.min(m, dist(q.x, q.z, o.x, o.z)), 320);
      const score = aim + forward - d * .18 + open * .5 - (q.pos === 'ZAG' ? 10 : 0) + Math.random() * 9;
      if (score > bestScore) { bestScore = score; best = q; }
    }
    if (!best) return;
    const d = dist(p.x, p.z, best.x, best.z);
    const accuracy = clamp((p.data.pass - 52) / 48, .15, 1);
    const spread = (1 - accuracy) * (18 + d * .1) + (this.weather.id === 'chuva' ? 8 : 0);
    const tx = best.x + best.vx * .11 + rand(spread, -spread);
    const tz = best.z + best.vz * .11 + rand(spread, -spread);
    const speed = clamp(330 + d * 1.12, 320, 830) * (oneTouch ? .9 : 1);
    const ang = Math.atan2(tz - p.z, tx - p.x);
    this.detachBall();
    this.ball.vx = Math.cos(ang) * speed;
    this.ball.vz = Math.sin(ang) * speed;
    this.ball.vy = d > 280 ? Math.min(190, d * .25) : d > 150 ? 40 : 0;
    this.ball.y = Math.max(0, this.ball.y);
    this.ball.lastTouch = p;
    this.ball.lastTouchSide = side;
    this.ball.shotBy = null;
    this.stats[side].passes++;
    p.touches++;
    p.kick = .16;
    p.lastAction = 'pass';
    this.pendingPass = { from: p, to: best, side };
    Audio.sfx('pass');
    this.maybeComment('outro', .25);
  }

  shootStart(side) {
    if (!this.canPlay(side) || side === 'cpu') return;
    const st = side === 'home' ? this.action : this.action2;
    if (st.shootCooldown > 0) return;
    const p = this.getControlled(side);
    if (!p) return;
    if (this.state === 'penalty') {
      const pe = this.penalty;
      if (pe && pe.side === side && pe.phase === 'runup') { st.chargeHeld = true; st.charge = 0; }
      return;
    }
    if (this.ball.owner !== p) {
      if (this.ball.owner && this.ball.owner.side === side) this.shootFrom(this.ball.owner, side, .72);
      else this.doTackleOrDribble(side);
      return;
    }
    st.chargeHeld = true;
    st.charge = 0;
  }

  shootRelease(side) {
    if (side === 'cpu') return;
    const st = side === 'home' ? this.action : this.action2;
    if (!st.chargeHeld) return;
    if (this.state === 'penalty') {
      const pe = this.penalty;
      if (pe && pe.side === side && pe.phase === 'runup') { this.takePenalty(side, clamp(st.charge, .25, 1)); st.chargeHeld = false; st.charge = 0; return; }
    }
    st.chargeHeld = false;
    const p = this.getControlled(side);
    if (p && this.ball.owner === p) this.shootFrom(p, side, clamp(st.charge, .18, 1));
    st.charge = 0;
  }

  shootFrom(p, side, power) {
    if (!p || p.sentOff) return;
    const goalX = side === 'home' ? FIELD.x1 : FIELD.x0;
    const dir = this.sides[side].dir;
    const d = Math.abs(goalX - p.x);
    const input = this.joystickInput(side);
    let aimZ = 335 + (Math.abs(input.z) > .2 ? input.z * 90 : 0);
    const jitter = (1 - clamp((p.data.shoot - 50) / 50, .2, 1)) * (55 + Math.max(0, 620 - d) * .1);
    aimZ += rand(jitter, -jitter);
    aimZ = clamp(aimZ, 286, 384);
    const inBox = d < 235;
    const accuracy = clamp((p.data.shoot - 55) / 45, .25, 1) + (inBox ? .1 : -.08) + (p.stamina > 40 ? 0 : -.14);
    const spread = (1 - clamp(accuracy, .1, 1)) * 75;
    const finalZ = aimZ + rand(spread, -spread);
    const speed = 520 + power * 640 + p.data.shoot * 1.5;
    const angleFactor = .45 + .55 * Math.min(1, 180 / Math.max(70, d));
    const ang = Math.atan2(finalZ - p.z, dir) * angleFactor;
    this.detachBall();
    this.ball.x = p.x + dir * 18;
    this.ball.z = p.z;
    this.ball.y = Math.max(8, this.ball.y);
    this.ball.vx = dir * Math.cos(ang) * speed;
    this.ball.vz = Math.sin(ang) * speed;
    this.ball.vy = 55 + power * 175 + Math.max(0, 230 - d) * .16;
    this.ball.lastTouch = p;
    this.ball.lastTouchSide = side;
    this.ball.shotBy = p;
    this.stats[side].shots++;
    this.stats[side].onTarget += Math.random() < clamp(.2 + accuracy * .72, .15, .95) ? 1 : 0;
    p.kick = .28;
    p.state = 'kick';
    p.facing = dir;
    const st = side === 'home' ? this.action : this.action2;
    st.shootCooldown = .42;
    this.shake = Math.max(this.shake, power * 3);
    Audio.sfx(power > .72 ? 'shot' : 'kick');
    this.maybeComment(Math.random() < .32 ? 'chance' : 'shoot', .5);
  }

  doTackleOrDribble(side) {
    if (!this.canPlay(side)) return;
    const p = this.getControlled(side);
    if (!p) return;
    const st = side === 'home' ? this.action : this.action2;
    if (st.dribbleCooldown > 0) return;
    st.dribbleCooldown = .45;
    if (this.ball.owner === p) {
      const input = this.joystickInput(side);
      const dir = this.sides[side].dir;
      const ix = Math.abs(input.x) > .1 ? input.x : dir;
      const iz = Math.abs(input.z) > .1 ? input.z : (Math.random() < .5 ? .7 : -.7);
      p.vx = ix * 315;
      p.vz = iz * 260;
      p.kick = .12;
      p.animSpeed = 2.1;
      p.skillFlash = .3;
      p.rating += .015;
      this.ball.x = p.x + dir * 22;
      Audio.sfx('tick');
      return;
    }
    const victim = this.ball.owner;
    const d = victim ? dist(p.x, p.z, victim.x, victim.z) : dist(p.x, p.z, this.ball.x, this.ball.z);
    if (!victim || victim.side === side || d > 64) {
      const ang = Math.atan2(this.ball.z - p.z, this.ball.x - p.x);
      p.slideDir = { x: Math.cos(ang), z: Math.sin(ang) };
      p.tackle = .38;
      p.vx = p.slideDir.x * 340;
      p.vz = p.slideDir.z * 340;
      p.state = 'tackle';
      Audio.sfx('tackle');
      if (victim && victim.side !== side && d < 48) this.resolveTackle(p, victim);
      return;
    }
    const ang = Math.atan2(victim.z - p.z, victim.x - p.x);
    p.slideDir = { x: Math.cos(ang), z: Math.sin(ang) };
    p.tackle = .4;
    p.vx = p.slideDir.x * 360;
    p.vz = p.slideDir.z * 360;
    p.state = 'tackle';
    p.facing = victim.x >= p.x ? 1 : -1;
    Audio.sfx('tackle');
    this.stats[side].tackles++;
    const def = (p.data.defense + p.data.physical + p.stamina * .3) / 2;
    const atk = (victim.data.dribble + victim.data.physical + victim.stamina * .2) / 2;
    const chance = clamp(.4 + (def - atk) / 150, .18, .82);
    if (Math.random() < chance) this.resolveTackle(p, victim);
    else if (Math.random() < clamp(.16 + (atk - def) / 380, .06, .42)) this.commitFoul(p, victim, true);
  }

  resolveTackle(p, victim) {
    this.detachBall();
    this.ball.lastTouch = p;
    this.ball.lastTouchSide = p.side;
    victim.kick = .2;
    p.touches++;
    p.rating += .1;
    victim.rating -= .04;
    this.ball.vx = rand(120, -120);
    this.ball.vz = rand(120, -120);
    this.ball.vy = 30;
    Audio.sfx('tackle');
    this.maybeComment('tackle', .35);
    if (!this.cpuVsCpu) this.setControlled(p.side, p);
  }

  switchPlayer(side) {
    if (!this.canPlay(side) || side === 'cpu') return;
    const current = this.getControlled(side);
    const candidates = this.players.filter(p => p.side === side && !p.sentOff && p !== current && p.pos !== 'GOL');
    if (!candidates.length) return;
    candidates.sort((a, b) => dist(a.x, a.z, this.ball.x, this.ball.z) - dist(b.x, b.z, this.ball.x, this.ball.z));
    this.setControlled(side, candidates[0]);
    Audio.sfx('navigate');
  }

  detachBall() {
    if (this.ball.owner) this.ball.owner.hasBall = false;
    this.ball.owner = null;
  }

  loop(now) {
    if (this.finished) return;
    const dt = Math.min(.05, (now - this.lastTime) / 1000 || .016);
    this.lastTime = now;
    if (!this.paused) this.update(dt);
    this.renderer.render(dt);
    this.hud.update(dt);
    this.raf = requestAnimationFrame(this.loop);
  }

  update(dt) {
    this.elapsed += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 10);
    if (this.action.chargeHeld) this.action.charge = clamp(this.action.charge + dt * 1.1, 0, 1);
    if (this.action2.chargeHeld) this.action2.charge = clamp(this.action2.charge + dt * 1.1, 0, 1);
    for (const st of [this.action, this.action2]) {
      st.shootCooldown = Math.max(0, st.shootCooldown - dt);
      st.dribbleCooldown = Math.max(0, st.dribbleCooldown - dt);
      st.switchCooldown = Math.max(0, st.switchCooldown - dt);
      st.passCooldown = Math.max(0, st.passCooldown - dt);
    }
    if (this.scorerBanner) { this.scorerBanner.life -= dt; if (this.scorerBanner.life <= 0) this.scorerBanner = null; }
    if (this.cardBanner) { this.cardBanner.life -= dt; if (this.cardBanner.life <= 0) this.cardBanner = null; }

    if (this.state === 'intro') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) this.beginPlay('home');
      return;
    }
    if (this.state === 'goal') {
      this.stateTimer -= dt;
      this.celebration = Math.max(0, this.celebration - dt);
      if (this.stateTimer <= 0) this.afterGoal();
      return;
    }
    if (this.state === 'halftime' || this.state === 'finished' || this.state === 'shootout') return;
    if (this.state === 'penaltywait') {
      this.stateTimer -= dt;
      this.updateCommon(dt);
      this.updatePlayerMovement(dt);
      if (this.stateTimer <= 0 && !this.finished) this.setupPenalty(this.practiceSide);
      return;
    }
    if (this.state === 'restart' || this.state === 'kickoff') {
      this.stateTimer -= dt;
      this.updateCommon(dt);
      if (this.state === 'restart' && this.stateTimer <= 0) this.completeRestart();
      if (this.state === 'kickoff' && this.stateTimer <= 0) {
        this.state = 'play';
        const taker = this.nearestToBall(this.kickoffSide) || this.sides[this.kickoffSide].lineup[0];
        if (taker) this.giveBall(taker);
      }
      return;
    }
    if (this.state === 'penalty') {
      this.updatePenalty(dt);
      this.updateCommon(dt);
      this.updatePlayerMovement(dt);
      return;
    }
    if (this.state !== 'play') return;

    if (!this.training) {
      const inc = dt * (45 / (this.halfLength * 60));
      this.minute += inc;
      if (this.half === 1 && this.minute >= 45) { this.minute = 45; this.triggerHalftime(); return; }
      if (this.half === 2 && this.minute >= 90) { this.minute = 90; this.triggerFulltime(); return; }
    } else {
      this.minute += dt * 3;
      if (this.minute > 90) this.minute = 0;
    }

    this.updateCommon(dt);
    this.updateBall(dt);
    this.updateControlledLogic(dt);
    this.updateAI(dt);
    this.updatePlayerMovement(dt);
    this.updatePossession(dt);
    this.recordReplay(dt);
    this.sporadicEvents(dt);
  }

  beginPlay(kickoffSide = 'home') {
    if (this.penaltyPractice) {
      this.resetPositions(this.practiceSide);
      this.setupPenalty(this.practiceSide);
      Audio.sfx('whistle');
      return;
    }
    this.state = 'kickoff';
    this.stateTimer = 1.1;
    this.kickoffSide = kickoffSide;
    this.resetPositions(kickoffSide);
    Audio.sfx('whistle');
    Audio.comment('kickoff');
  }

  updateCommon(dt) {
    for (const p of this.players) {
      if (p.sentOff) continue;
      p.kick = Math.max(0, p.kick - dt);
      p.tackle = Math.max(0, p.tackle - dt);
      p.dive = Math.max(0, p.dive - dt);
      p.header = Math.max(0, p.header - dt);
      p.celebration = Math.max(0, p.celebration - dt);
      p.skillFlash = Math.max(0, p.skillFlash - dt);
      p.animSpeed = lerp(p.animSpeed, 1, dt * 3);
      p.anim += dt * (4 + p.speed * .032) * (p.kick > 0 ? .32 : 1);
      if (p.celebration > 0) p.state = 'celebrate';
      else if (p.tackle > 0) p.state = 'tackle';
      else if (p.dive > 0) p.state = 'dive';
      else if (p.kick > 0) p.state = 'kick';
      else if (p.speed > 30) p.state = 'run';
      else p.state = 'idle';
      const sprinting = (p.controlled && ((p.side === 'home' && this.action.sprint) || (p.side === 'away' && this.action2.sprint))) || p.data.forcedSprint;
      if (p.hasBall) p.stamina = Math.max(0, p.stamina - dt * (sprinting ? 3.7 : 1.05));
      else if (p.speed > 125) p.stamina = Math.max(0, p.stamina - dt * 1.2);
      else p.stamina = Math.min(100, p.stamina + dt * (p.state === 'idle' ? 4.4 : 1.6));
    }
    this.ball.trail = this.ball.trail.filter(t => this.elapsed - t.t < .5);
  }

  updateControlledLogic(dt) {
    if (this.cpuVsCpu) return;
    const sides = this.twoPlayer ? ['home', 'away'] : [this.userSide];
    for (const side of sides) {
      if (side === 'cpu') continue;
      const p = this.getControlled(side);
      if (!p) continue;
      const st = side === 'home' ? this.action : this.action2;
      const inp = this.joystickInput(side);
      const sprint = st.sprint || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      if (inp.active) {
        const speed = this.playerSpeed(p) * (sprint && p.stamina > 4 ? 1.3 : 1) * (p.hasBall ? .95 : 1);
        p.vx = lerp(p.vx, inp.x * speed, dt * 9);
        p.vz = lerp(p.vz, inp.z * speed, dt * 9);
        if (Math.abs(inp.x) > .1) p.facing = Math.sign(inp.x);
      } else {
        p.vx = lerp(p.vx, 0, dt * 8);
        p.vz = lerp(p.vz, 0, dt * 8);
      }
      if (p.hasBall && !inp.active) p.facing = this.sides[side].dir;
    }
  }

  updateAI(dt) {
    for (const p of this.players) {
      if (p.sentOff) continue;
      if (!this.cpuVsCpu && p.controlled) continue;
      p.think -= dt;
      if (p.pos === 'GOL') { this.updateKeeper(p, dt); continue; }
      if (p.think > 0) continue;
      p.think = .08 + Math.random() * .09;
      const cfg = this.sides[p.side];
      const possession = (this.ball.owner ? this.ball.owner.side : this.ball.lastTouchSide) === p.side;
      const nearest = this.nearestToBall(p.side);
      const isNearest = nearest && nearest.id === p.id;
      const ballD = dist(p.x, p.z, this.ball.x, this.ball.z);
      if (p.hasBall) { this.aiWithBall(p, dt); continue; }
      if (possession) {
        const base = this.formationPosition(p.slot, cfg.dir, 0);
        const push = 65 + (p.pos === 'ATA' ? 45 : p.pos === 'PON' ? 30 : 0);
        let tx = base.x + cfg.dir * push + (this.ball.x - FIELD.cx) * .12;
        let tz = base.z + (this.ball.z - FIELD.cz) * .17;
        if (p.pos === 'ZAG') { tz = base.z + (this.ball.z - FIELD.cz) * .05; tx = base.x + cfg.dir * 18; }
        if (p.pos === 'LAT') tx = base.x + cfg.dir * (28 + (this.ball.x - FIELD.cx) * .05);
        p.targetX = clamp(tx, FIELD.x0 + 25, FIELD.x1 - 25);
        p.targetZ = clamp(tz, FIELD.z0 + 25, FIELD.z1 - 25);
        this.moveTo(p, p.targetX, p.targetZ, .94, dt);
      } else {
        if (isNearest) {
          const speed = 1.02 + (this.difficulty.ai - 1) * .28;
          p.targetX = this.ball.x;
          p.targetZ = this.ball.z;
          this.moveTo(p, p.targetX, p.targetZ, speed, dt);
          if (this.ball.owner && this.ball.owner.side !== p.side && ballD < 36) {
            const chance = clamp((p.data.defense - 54) / 300 + .14, .07, .4) * this.difficulty.ai;
            if (Math.random() < chance * dt * 8) this.aiTackle(p);
          }
        } else {
          const base = this.formationPosition(p.slot, cfg.dir, 0);
          let tx = base.x - cfg.dir * 18;
          let tz = base.z + (this.ball.z - FIELD.cz) * .32;
          const mark = this.findMarkTarget(p);
          if (mark) { tx = lerp(tx, mark.x - cfg.dir * 26, .42); tz = lerp(tz, mark.z, .42); }
          p.targetX = clamp(tx, FIELD.x0 + 22, FIELD.x1 - 22);
          p.targetZ = clamp(tz, FIELD.z0 + 20, FIELD.z1 - 20);
          this.moveTo(p, p.targetX, p.targetZ, .86, dt);
        }
      }
      if (!this.ball.owner && ballD < 34 && this.ball.y < 34 && this.ball.lastTouchSide !== p.side) {
        const chance = clamp((p.data.defense + p.data.physical) / 300, .2, .6);
        if (Math.random() < chance * dt * 12) this.giveBall(p);
      }
    }
  }

  findMarkTarget(p) {
    let best = null, bd = 1e9;
    for (const q of this.players) {
      if (q.side === p.side || q.sentOff) continue;
      const d = dist(p.x, p.z, q.x, q.z);
      if (d < bd) { bd = d; best = q; }
    }
    return bd < 240 ? best : null;
  }

  aiTackle(p) {
    const victim = this.ball.owner;
    if (!victim) return;
    const def = (p.data.defense + p.data.physical) / 2;
    const atk = (victim.data.dribble + victim.data.physical) / 2;
    if (Math.random() < clamp(.34 + (def - atk) / 160, .12, .78)) this.resolveTackle(p, victim);
    else if (Math.random() < .18) this.commitFoul(p, victim, false);
  }

  aiWithBall(p, dt) {
    const cfg = this.sides[p.side];
    const dir = cfg.dir;
    const goalX = p.side === 'home' ? FIELD.x1 : FIELD.x0;
    const goalD = Math.abs(goalX - p.x);
    const pressure = this.players.filter(q => q.side !== p.side && !q.sentOff && dist(q.x, q.z, p.x, p.z) < 72).length;
    const skill = this.difficulty.ai;
    if (goalD < 285 + p.data.shoot * 1.4 && Math.random() < .02 * skill * (pressure ? 1.8 : 1)) {
      this.shootFrom(p, p.side, clamp(.5 + Math.random() * .5, .45, 1));
      return;
    }
    if ((pressure > 0 && Math.random() < .05 * skill) || Math.random() < .005) {
      this.passFrom(p, p.side, false);
      return;
    }
    const targetZ = clamp(335 + Math.sin(this.elapsed * .7 + p.slotIndex) * 105 + rand(35, -35), FIELD.z0 + 30, FIELD.z1 - 30);
    const ang = Math.atan2(targetZ - p.z, dir);
    const speed = this.playerSpeed(p) * (pressure ? 1.02 : .92) * (p.stamina > 25 ? 1 : .76);
    p.vx = lerp(p.vx, Math.cos(ang) * speed, dt * 4);
    p.vz = lerp(p.vz, Math.sin(ang) * speed, dt * 4);
    p.facing = dir;
    if (pressure && Math.random() < .015 * skill) { p.vx += rand(150, -150); p.vz += rand(150, -150); p.kick = .1; }
  }

  updateKeeper(p, dt) {
    const ownX = p.side === 'home' ? FIELD.x0 : FIELD.x1;
    const dir = this.sides[p.side].dir;
    let tx = ownX + dir * 40;
    let tz = clamp(this.ball.z, 295, 375);
    if (this.ball.owner && this.ball.owner.side !== p.side && Math.abs(this.ball.x - ownX) < 340) tz = clamp(this.ball.z, 268, 402);
    const rush = this.ball.owner && this.ball.owner.side !== p.side && Math.abs(this.ball.x - ownX) < 135 && Math.abs(this.ball.z - 335) < 105;
    if (rush) tx = ownX + dir * 65;
    p.targetX = tx; p.targetZ = tz;
    if (dist(p.x, p.z, tx, tz) > 8) this.moveTo(p, tx, tz, .96 + this.difficulty.ai * .1, dt);
    else { p.vx *= .8; p.vz *= .8; }
    if (!this.ball.owner && this.ball.y < 150 && this.ball.lastTouchSide !== p.side) {
      const lineDist = Math.abs(this.ball.x - ownX);
      if (lineDist < 30 && Math.abs(this.ball.z - 335) < 112 && this.ball.y < 148) this.attemptSave(p);
      else if (lineDist < 165 && this.ball.vx * dir < 0 && Math.abs(this.ball.z - p.z) < 125 && Math.random() < .08 * dt * 60) this.attemptSave(p);
    }
    if (!this.ball.owner && dist(p.x, p.z, this.ball.x, this.ball.z) < 38 && this.ball.y < 52 && Math.abs(this.ball.x - ownX) < 225) {
      if (Math.random() < .8) this.giveBall(p);
    }
  }

  attemptSave(p) {
    if (p.dive > 0) return;
    const zTarget = clamp(this.ball.z + this.ball.vz * .08, 262, 408);
    const diveDist = Math.abs(zTarget - p.z);
    const saveChance = clamp(.16 + (p.data.defense + p.data.physical) / 260 - diveDist / 420, .07, .7);
    p.facing = this.sides[p.side].dir;
    if (Math.random() < saveChance) {
      p.dive = .6;
      this.ball.owner = null;
      this.ball.lastTouch = p;
      this.ball.lastTouchSide = p.side;
      this.ball.vx = -this.ball.vx * .32 + rand(60, -60);
      this.ball.vz = rand(150, -150);
      this.ball.vy = 35 + Math.random() * 55;
      this.stats[p.side].saves++;
      p.rating += .2;
      Audio.sfx('save');
      Audio.comment('save');
    } else {
      p.dive = .5;
    }
  }

  playerSpeed(p) {
    return (155 + p.data.pace * .85) * (.72 + (p.stamina / 100) * .34);
  }

  moveTo(p, tx, tz, factor, dt) {
    const dx = tx - p.x, dz = tz - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 4) { p.vx = lerp(p.vx, 0, dt * 6); p.vz = lerp(p.vz, 0, dt * 6); return; }
    const speed = this.playerSpeed(p) * factor;
    p.vx = lerp(p.vx, dx / d * speed, dt * 6.5);
    p.vz = lerp(p.vz, dz / d * speed, dt * 6.5);
    if (Math.abs(p.vx) > 15) p.facing = Math.sign(p.vx);
  }

  updatePlayerMovement(dt) {
    for (const p of this.players) {
      if (p.sentOff) continue;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.speed = Math.hypot(p.vx, p.vz);
      p.x = clamp(p.x, FIELD.x0 - 22, FIELD.x1 + 22);
      p.z = clamp(p.z, FIELD.z0 - 12, FIELD.z1 + 12);
    }
    for (let i = 0; i < this.players.length; i++) {
      const a = this.players[i];
      if (a.sentOff) continue;
      for (let j = i + 1; j < this.players.length; j++) {
        const b = this.players[j];
        if (b.sentOff) continue;
        const dx = b.x - a.x, dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        const min = 23;
        if (d > 0 && d < min) {
          const push = (min - d) / 2;
          a.x -= (dx / d) * push; a.z -= (dz / d) * push;
          b.x += (dx / d) * push; b.z += (dz / d) * push;
        }
      }
    }
    if (this.ball.owner) {
      if (this.ball.owner.sentOff) this.detachBall();
      else this.attachBall(this.ball.owner);
    }
  }

  attachBall(p) {
    const dir = this.sides[p.side].dir;
    const facing = Math.abs(p.vx) > 10 ? Math.sign(p.vx) : (p.facing || dir);
    this.ball.x = p.x + facing * (16 + Math.min(18, p.speed * .04));
    this.ball.z = p.z + Math.sin(p.anim * .8) * 2.4;
    this.ball.y = 0;
    this.ball.vx = p.vx; this.ball.vz = p.vz; this.ball.vy = 0;
    this.ball.spin += p.speed * .001;
  }

  giveBall(p) {
    if (!p || p.sentOff) return;
    this.detachBall();
    this.ball.owner = p;
    p.hasBall = true;
    p.touches++;
    this.ball.lastTouch = p;
    this.ball.lastTouchSide = p.side;
    this.ball.shotBy = null;
    if (!this.cpuVsCpu && (p.side === this.userSide || this.twoPlayer)) {
      if (this.controlled[p.side] !== p.id) this.setControlled(p.side, p);
    } else if (!this.cpuVsCpu && p.side !== this.userSide) {
      const near = this.nearestToBall(opponent(p.side));
      if (near) this.setControlled(near.side, near);
    }
    this.pendingPass = null;
  }

  updateBall(dt) {
    if (this.ball.owner) return;
    const b = this.ball;
    b.trail.push({ x: b.x, z: b.z, y: b.y, t: this.elapsed });
    if (b.trail.length > 20) b.trail.shift();
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    b.y += b.vy * dt;
    b.vy -= 520 * dt;
    if (b.y <= 0) {
      b.y = 0;
      if (Math.abs(b.vy) > 42) { b.vy = -b.vy * .33; Audio.sfx('kick'); }
      else b.vy = 0;
      const f = this.weather.friction;
      const damp = Math.pow(.16, dt);
      b.vx = b.vx * damp * (f * .6 + .4);
      b.vz = b.vz * damp * (f * .6 + .4);
    } else {
      b.vx *= (1 - dt * .11);
      b.vz *= (1 - dt * .11);
      b.vx += this.weather.wind * 10 * dt;
    }
    b.spin += Math.hypot(b.vx, b.vz) * dt * .013;
    if (Math.hypot(b.vx, b.vz) < 8) { b.vx = 0; b.vz = 0; }
    for (const gx of [FIELD.x0, FIELD.x1]) {
      for (const gz of [GOAL.z0, GOAL.z1]) {
        if (b.y < GOAL.height && Math.abs(b.x - gx) < 8 && Math.abs(b.z - gz) < 10 && Math.hypot(b.vx, b.vz) > 60) {
          if (Math.abs(b.x - gx) < 6) b.vx = -b.vx * .55; else b.vz = -b.vz * .55;
          b.vx *= .7; b.vz *= .7;
          Audio.sfx('post'); this.maybeComment('post', 1); this.shake = 6;
        }
      }
      if (Math.abs(b.x - gx) < 8 && b.y > GOAL.height - 8 && b.y < GOAL.height + 12 && b.z > GOAL.z0 && b.z < GOAL.z1) {
        b.vy = -Math.abs(b.vy) * .5; b.vx = -b.vx * .4;
        Audio.sfx('post'); this.maybeComment('post', 1); this.shake = 7;
      }
    }
    if (b.y < 38) {
      let best = null, bd = 31;
      for (const p of this.players) {
        if (p.sentOff) continue;
        const d = dist(p.x, p.z, b.x, b.z);
        if (d < bd) { bd = d; best = p; }
      }
      if (best) {
        const speed = Math.hypot(b.vx, b.vz);
        const controlChance = clamp((best.data.dribble + best.data.physical) / 230 - speed / 1700 + .26, .16, .92);
        if (this.pendingPass && this.pendingPass.to === best) {
          this.stats[this.pendingPass.side].passesOk++;
          this.pendingPass = null;
          this.giveBall(best);
        } else if (Math.random() < controlChance * dt * 23) this.giveBall(best);
      }
    }
    if (b.x < FIELD.x0 || b.x > FIELD.x1) {
      if (b.z > GOAL.z0 && b.z < GOAL.z1 && b.y < GOAL.height) {
        const scoringSide = b.x > FIELD.x1 ? 'home' : 'away';
        this.scoreGoal(scoringSide);
        return;
      }
      this.handleGoalLine(b.x < FIELD.x0 ? 'left' : 'right');
      return;
    }
    if (b.z < FIELD.z0 || b.z > FIELD.z1) this.handleThrowIn();
  }

  handleThrowIn() {
    const side = this.ball.lastTouchSide === 'home' ? 'away' : 'home';
    const z = this.ball.z < FIELD.z0 ? FIELD.z0 + 3 : FIELD.z1 - 3;
    const x = clamp(this.ball.x, FIELD.x0 + 40, FIELD.x1 - 40);
    this.setupRestart('throw', side, x, z);
  }

  handleGoalLine(which) {
    const attackingSide = which === 'left' ? 'away' : 'home';
    const defendingSide = which === 'left' ? 'home' : 'away';
    if (this.ball.lastTouchSide === defendingSide) {
      const z = this.ball.z < 335 ? FIELD.z0 + 6 : FIELD.z1 - 6;
      const x = which === 'left' ? FIELD.x0 + 6 : FIELD.x1 - 6;
      this.stats[attackingSide].corners++;
      this.setupRestart('corner', attackingSide, x, z);
    } else {
      this.setupRestart('goalkick', defendingSide, which === 'left' ? FIELD.x0 + 58 : FIELD.x1 - 58, 335);
    }
  }

  setupRestart(type, side, x, z) {
    this.detachBall();
    this.ball.x = x; this.ball.z = z; this.ball.y = 0;
    this.ball.vx = 0; this.ball.vz = 0; this.ball.vy = 0;
    this.ball.lastTouch = null; this.ball.lastTouchSide = side;
    this.state = 'restart';
    this.stateTimer = type === 'corner' ? 1.4 : 1;
    let taker = null;
    if (type === 'goalkick') {
      taker = this.sides[side].lineup.find(p => p.pos === 'GOL' && !p.sentOff);
      if (taker) { taker.x = x; taker.z = z; taker.targetX = x; taker.targetZ = z; taker.vx = 0; taker.vz = 0; }
    } else {
      const candidates = this.players.filter(p => p.side === side && !p.sentOff && p.pos !== 'GOL');
      candidates.sort((a, b) => dist(a.x, a.z, x, z) - dist(b.x, b.z, x, z));
      taker = candidates[0];
      if (taker) {
        const nx = type === 'corner' ? (x < FIELD.cx ? x + 20 : x - 20) : x;
        const nz = type === 'corner' ? z : (z < FIELD.cz ? z + 18 : z - 18);
        taker.x = nx; taker.z = nz; taker.targetX = nx; taker.targetZ = nz; taker.vx = 0; taker.vz = 0;
      }
    }
    this.restartData = { type, side, x, z, taker };
    if (taker && side === this.userSide) this.setControlled(side, taker);
    if (type === 'corner') this.maybeComment('chance', 1);
  }

  completeRestart() {
    const rd = this.restartData;
    if (!rd) { this.state = 'play'; return; }
    this.state = 'play';
    if (rd.type === 'goalkick') {
      const keeper = this.sides[rd.side].lineup.find(p => p.pos === 'GOL' && !p.sentOff);
      if (keeper) {
        this.giveBall(keeper);
        setTimeout(() => {
          if (!this.finished && this.state === 'play' && this.ball.owner === keeper) this.passFrom(keeper, rd.side, false);
        }, 550);
      }
    } else if (rd.type === 'corner') {
      const taker = rd.taker;
      if (!taker) return;
      this.giveBall(taker);
      setTimeout(() => {
        if (this.finished || this.state !== 'play' || this.ball.owner !== taker) return;
        const tx = rd.side === 'home' ? FIELD.x1 - 105 : FIELD.x0 + 105;
        const tz = 335 + rand(55, -55);
        const ang = Math.atan2(tz - taker.z, tx - taker.x);
        this.detachBall();
        this.ball.vx = Math.cos(ang) * 610;
        this.ball.vz = Math.sin(ang) * 610;
        this.ball.vy = 250;
        this.ball.y = 8;
        this.ball.lastTouch = taker; this.ball.lastTouchSide = rd.side;
        this.stats[rd.side].passes++;
        Audio.sfx('pass');
      }, 520);
    } else if (rd.taker) {
      this.giveBall(rd.taker);
      if (rd.type === 'throw') this.restartThrow = rd;
    }
  }

  scoreGoal(side) {
    if (this.state === 'goal') return;
    const cfg = this.sides[side];
    cfg.score++;
    this.score[side]++;
    const scorer = this.ball.shotBy || this.ball.lastTouch;
    const ownGoal = !!scorer && scorer.side !== side;
    this.state = 'goal';
    this.stateTimer = 4.5;
    this.celebration = 4.5;
    this.shake = 10;
    this.ball.vx = 0; this.ball.vz = 0; this.ball.vy = 0;
    this.ball.x = clamp(this.ball.x, FIELD.x0 - 45, FIELD.x1 + 45);
    for (const p of this.players) {
      if (p.side === side) { p.celebration = 3; p.stamina = Math.min(100, p.stamina + 8); }
      else p.rating -= .035;
    }
    if (scorer) {
      scorer.rating = Math.min(10, scorer.rating + (ownGoal ? -.3 : 1.15));
      if (ownGoal) scorer.rating = Math.max(3, scorer.rating - .4);
      else { scorer.goals = (scorer.goals || 0) + 1; this.goalScorers.push({ side, player: scorer, minute: Math.round(this.minute), own: false }); }
      if (ownGoal) this.goalScorers.push({ side, player: scorer, minute: Math.round(this.minute), own: true });
      this.scorerBanner = { name: scorer.data.name, team: cfg.team.name, side, own: ownGoal, life: 4.4 };
    }
    Audio.sfx('goal');
    Audio.comment('goal');
    Audio.setIntensity(.95);
    this.hud.showGoal(cfg.team, scorer, ownGoal);
    this.replayState = { frames: this.replayFrames.slice(-46), started: this.elapsed, duration: 3.4 };
  }

  afterGoal() {
    this.hud.hideGoal();
    this.celebration = 0;
    if (this.training) {
      Audio.setIntensity(.3);
      this.state = 'play';
      this.minute = 0;
      this.resetPositions('home');
      return;
    }
    const conceding = this.score.home > this.score.away ? 'away' : 'home';
    this.resetPositions(conceding);
    this.kickoffSide = conceding;
    this.state = 'kickoff';
    this.stateTimer = 1.05;
    Audio.setIntensity(.45);
    this.replayState = null;
  }

  commitFoul(offender, victim, slide) {
    if (this.state !== 'play' || !offender || !victim) return;
    this.stats[offender.side].fouls++;
    Audio.sfx('whistle');
    Audio.comment('foul');
    this.shake = 3;
    offender.rating = Math.max(3, offender.rating - .16);
    victim.rating = Math.min(10, victim.rating + .05);
    const roll = Math.random();
    let card = null;
    if (roll < (slide ? .24 : .12)) card = 'yellow';
    if (roll < (slide ? .034 : .01)) card = 'red';
    const attacking = victim.side;
    const dir = this.sides[attacking].dir;
    const inBox = dir === 1
      ? (victim.x > FIELD.x1 - 238 && victim.z > 226 && victim.z < 444)
      : (victim.x < FIELD.x0 + 238 && victim.z > 226 && victim.z < 444);
    if (card) this.applyCard(offender, card);
    if (inBox) { this.setupPenalty(attacking); Audio.comment('penalty'); }
    else this.setupRestart('freekick', attacking, clamp(victim.x, FIELD.x0 + 30, FIELD.x1 - 30), clamp(victim.z, FIELD.z0 + 20, FIELD.z1 - 20));
  }

  applyCard(p, card) {
    p.card++;
    if (card === 'yellow') {
      this.stats[p.side].yellow++;
      this.stats[p.side].cards++;
      if (p.card >= 2) this.sendOff(p);
    } else {
      this.sendOff(p);
    }
    p.rating = Math.max(3, p.rating - .2);
    Audio.sfx('card');
    Audio.comment('card');
    this.cardBanner = { name: p.data.name, card, life: 2.4 };
    this.hud.showCard(p, card);
  }

  sendOff(p) {
    if (p.sentOff) return;
    p.sentOff = true;
    p.hasBall = false;
    this.sides[p.side].sentOff++;
    this.stats[p.side].red++;
    if (this.ball.owner === p) this.detachBall();
    if (this.controlled[p.side] === p.id) {
      const near = this.sides[p.side].lineup.find(q => !q.sentOff);
      if (near) this.setControlled(p.side, near);
    }
  }

  setupPenalty(side) {
    this.detachBall();
    this.state = 'penalty';
    this.stateTimer = 0;
    this.penalty = { side, phase: 'runup', timer: this.penaltyPractice ? 8 : 2.2, taker: null, keeper: null, taken: false, saved: false };
    const dir = this.sides[side].dir;
    const goalX = dir === 1 ? FIELD.x1 : FIELD.x0;
    const spotX = goalX - dir * 172;
    const taker = this.players.filter(p => p.side === side && !p.sentOff && p.pos !== 'GOL').sort((a, b) => b.data.shoot - a.data.shoot)[0];
    const keeper = this.players.filter(p => p.side !== side && !p.sentOff).find(p => p.pos === 'GOL');
    if (!taker) { this.state = 'play'; return; }
    this.penalty.taker = taker;
    this.penalty.keeper = keeper;
    this.penalty.spotX = spotX;
    this.ball = this.freshBall(spotX, 335);
    this.ball.lastTouch = taker;
    this.ball.lastTouchSide = side;
    for (const p of this.players) {
      if (p.sentOff) continue;
      p.vx = 0; p.vz = 0; p.hasBall = false;
      if (p === taker) { p.x = spotX - dir * 42; p.z = 335; p.facing = dir; }
      else if (p === keeper) { p.x = goalX - dir * 12; p.z = 335; p.facing = -dir; }
      else if (p.side === side) { p.x = spotX - dir * (75 + Math.random() * 90); p.z = 190 + Math.random() * 290; }
      else { p.x = goalX - dir * (105 + Math.random() * 70); p.z = 170 + Math.random() * 330; }
    }
    if (side === this.userSide || this.twoPlayer) this.setControlled(side, taker);
    this.hud.showPenaltyHint(side);
    this.maybeComment('penalty', 1);
  }

  updatePenalty(dt) {
    const pe = this.penalty;
    if (!pe) { this.state = 'play'; return; }
    pe.timer -= dt;
    if (!pe.taker || pe.taker.sentOff) { this.state = 'play'; this.penalty = null; return; }
    if (pe.phase === 'runup') {
      if (pe.side !== this.userSide && !this.twoPlayer) {
        this.action.charge = .8;
        if (pe.timer <= 0) this.takePenalty(pe.side, .8);
      } else if (pe.timer <= 0) {
        this.takePenalty(pe.side, .68);
      }
    } else if (pe.phase === 'flight') {
      this.updateBall(dt);
      if (pe.timer <= 0) this.finishPenalty();
    }
  }

  takePenalty(side, power) {
    const pe = this.penalty;
    if (!pe || pe.taken) return;
    pe.taken = true;
    const taker = pe.taker;
    const dir = this.sides[side].dir;
    const goalX = dir === 1 ? FIELD.x1 : FIELD.x0;
    const input = this.joystickInput(side);
    let targetZ = 335 + (input.active ? input.z * 105 : rand(70, -70));
    targetZ = clamp(targetZ, 280, 390);
    const accuracy = clamp((taker.data.shoot - 55) / 55, .2, 1);
    targetZ += rand((1 - accuracy) * 42, -(1 - accuracy) * 42);
    const speed = 710 + power * 280;
    const d = Math.abs(goalX - this.ball.x);
    this.detachBall();
    this.ball.x = pe.spotX;
    this.ball.z = 335;
    this.ball.y = 8;
    this.ball.vx = dir * speed;
    this.ball.vz = (targetZ - 335) * speed / d;
    this.ball.vy = 45 + power * 65;
    this.ball.lastTouch = taker;
    this.ball.lastTouchSide = side;
    this.ball.shotBy = taker;
    this.stats[side].shots++;
    this.stats[side].onTarget++;
    Audio.sfx('shot');
    this.shake = 4;
    if (pe.keeper && !pe.keeper.sentOff) {
      const guess = 335 + rand(145, -145);
      const dive = Math.abs(guess - targetZ) < 66;
      const saveChance = dive ? clamp(.55 + pe.keeper.data.defense / 400, .3, .84) : .03;
      pe.keeper.facing = dir;
      if (Math.random() < saveChance) {
        pe.keeper.dive = .7;
        this.ball.vx *= .35; this.ball.vz *= .3; this.ball.vy = 20;
        Audio.sfx('save');
        Audio.comment('save');
        pe.saved = true;
      } else pe.keeper.dive = .65;
    }
    pe.phase = 'flight';
    pe.timer = 1.2;
    this.action.chargeHeld = false;
    this.action2.chargeHeld = false;
  }

  finishPenalty() {
    const pe = this.penalty;
    if (!pe) return;
    const dir = this.sides[pe.side].dir;
    const b = this.ball;
    const scored = (dir === 1 ? b.x > FIELD.x1 : b.x < FIELD.x0) && b.y < GOAL.height && b.z > GOAL.z0 && b.z < GOAL.z1;
    const side = pe.side;
    this.penalty = null;
    if (this.penaltyPractice) {
      this.practice.taken++;
      if (scored) this.practice.scored++;
      this.hud.toast(scored ? `GOL! ${this.practice.scored}/${this.practice.taken} cobranças convertidas` : `Defendeu! ${this.practice.scored}/${this.practice.taken}`, scored ? '⚽' : '◎');
      Audio.sfx(scored ? 'goal' : 'save');
      this.practiceSide = side;
      this.state = 'penaltywait';
      this.stateTimer = 1.4;
      return;
    }
    if (scored) { this.state = 'play'; this.scoreGoal(side); return; }
    this.state = 'play';
    this.setupRestart('goalkick', side === 'home' ? 'away' : 'home', side === 'home' ? FIELD.x1 - 58 : FIELD.x0 + 58, 335);
  }

  triggerHalftime() {
    this.state = 'halftime';
    Audio.sfx('whistle', { long: true });
    Audio.comment('half');
    Audio.setIntensity(.25);
    this.action.chargeHeld = false;
    this.action.charge = 0;
    this.hud.showHalftime();
  }

  startSecondHalf() {
    this.hud.hideHalftime();
    this.half = 2;
    this.minute = 45;
    this.paused = false;
    this.resetPositions('away');
    this.state = 'kickoff';
    this.stateTimer = 1.15;
    this.kickoffSide = 'away';
    Audio.sfx('whistle');
    Audio.setIntensity(.5);
  }

  triggerFulltime() {
    if (this.matchEnded) return;
    if (this.requireWinner && this.score.home === this.score.away) {
      this.shootout = this.simulateShootout();
      this.state = 'shootout';
      this.hud.showShootout(this.shootout);
      Audio.sfx('whistle', { long: true });
      return;
    }
    this.endMatch();
  }

  simulateShootout() {
    const homeKickers = this.players.filter(p => p.side === 'home' && !p.sentOff && p.pos !== 'GOL').sort((a, b) => b.data.shoot - a.data.shoot);
    const awayKickers = this.players.filter(p => p.side === 'away' && !p.sentOff && p.pos !== 'GOL').sort((a, b) => b.data.shoot - a.data.shoot);
    const home = [], away = [];
    let hs = 0, as = 0;
    for (let i = 0; i < 5; i++) {
      const h = homeKickers[i % homeKickers.length];
      const a = awayKickers[i % awayKickers.length];
      const hg = Math.random() < clamp(.58 + (h?.data.shoot || 75) / 300, .5, .9);
      const ag = Math.random() < clamp(.58 + (a?.data.shoot || 75) / 300, .5, .9);
      if (hg) hs++; if (ag) as++;
      home.push({ scored: hg, player: h?.data.name || 'Jogador' });
      away.push({ scored: ag, player: a?.data.name || 'Jogador' });
      if (hs > as + (5 - i - 1) || as > hs + (5 - i - 1)) break;
    }
    while (hs === as) {
      const hg = Math.random() < .68, ag = Math.random() < .68;
      home.push({ scored: hg, player: homeKickers[home.length % homeKickers.length]?.data.name || 'Jogador' });
      away.push({ scored: ag, player: awayKickers[away.length % awayKickers.length]?.data.name || 'Jogador' });
      if (hg) hs++; if (ag) as++;
      if (home.length > 15) break;
    }
    return { home: hs, away: as, homeKicks: home, awayKicks: away };
  }

  finishShootout() {
    this.endMatch();
  }

  endMatch() {
    if (this.matchEnded) return;
    this.matchEnded = true;
    this.state = 'finished';
    this.paused = false;
    this.hud.hideAll();
    Audio.sfx('whistle', { long: true });
    Audio.comment('full');
    Audio.setIntensity(.25);
    const result = this.buildResult();
    setTimeout(() => {
      if (this.finished) return;
      this.opts.onFinish?.(result);
    }, 900);
  }

  buildResult() {
    const goals = this.goalScorers.slice();
    const homePlayers = this.players.filter(p => p.side === 'home' && !p.sentOff);
    const awayPlayers = this.players.filter(p => p.side === 'away' && !p.sentOff);
    const best = [...this.players].filter(p => !p.sentOff).sort((a, b) => (b.rating + (b.goals || 0) * .8) - (a.rating + (a.goals || 0) * .8))[0];
    const userWin = this.userSide === 'home' ? this.score.home > this.score.away : this.score.away > this.score.home;
    const draw = this.score.home === this.score.away;
    const poss = this.possessionPct();
    return {
      mode: this.training ? 'training' : 'match',
      homeId: this.homeTeam.id, awayId: this.awayTeam.id,
      homeName: this.homeTeam.name, awayName: this.awayTeam.name,
      homeTeam: this.homeTeam, awayTeam: this.awayTeam,
      score: { ...this.score }, shootout: this.shootout,
      stats: JSON.parse(JSON.stringify(this.stats)),
      possession: poss,
      goals,
      mvp: best ? { name: best.data.name, side: best.side, team: this.sides[best.side].team.name, rating: Math.min(10, best.rating), goals: best.goals || 0 } : null,
      userSide: this.userSide,
      userWin, draw,
      difficulty: this.difficulty.id, minute: Math.round(this.minute),
      competitionName: this.opts.competitionName || 'Amistoso',
      lineupHome: this.sides.home.lineup.map(p => p.id),
      lineupAway: this.sides.away.lineup.map(p => p.id),
      benchHome: this.sides.home.bench.map(p => p.id),
      benchAway: this.sides.away.bench.map(p => p.id),
      events: this.goalScorers.map(g => ({ minute: g.minute, side: g.side, type: 'goal', player: g.player.data.name }))
    };
  }

  updatePossession(dt) {
    if (this.ball.owner) this.possessionTime[this.ball.owner.side] += dt;
    else if (this.ball.lastTouchSide) this.possessionTime[this.ball.lastTouchSide] += dt * .65;
  }

  possessionPct() {
    const total = this.possessionTime.home + this.possessionTime.away || 1;
    return { home: this.possessionTime.home / total * 100, away: this.possessionTime.away / total * 100 };
  }

  recordReplay(dt) {
    if (this.training) return;
    const every = .09;
    if (!this._replayClock) this._replayClock = 0;
    this._replayClock += dt;
    if (this._replayClock < every) return;
    this._replayClock = 0;
    this.replayFrames.push({
      ball: { x: this.ball.x, z: this.ball.z, y: this.ball.y, owner: this.ball.owner?.id || null },
      players: this.players.filter(p => !p.sentOff).map(p => ({ id: p.id, side: p.side, x: p.x, z: p.z, facing: p.facing, state: p.state, anim: p.anim, num: p.num, pos: p.pos, color: this.sides[p.side].team.colors.primary })),
      t: this.elapsed
    });
    if (this.replayFrames.length > 70) this.replayFrames.shift();
  }

  sporadicEvents(dt) {
    if (this.training) return;
    if (!this._commentClock) this._commentClock = 0;
    this._commentClock += dt;
    if (this._commentClock > 15 && Math.random() < dt * .5) {
      this._commentClock = 0;
      this.maybeComment('outro', 1);
    }
    // Ambient intensity scales with danger.
    const danger = Math.abs(this.ball.x - FIELD.cx) / ((FIELD.x1 - FIELD.x0) / 2);
    Audio.setIntensity(clamp(.25 + danger * .5, .2, .85));
  }

  maybeComment(type, chance = 1) {
    if (Math.random() > chance) return;
    Audio.comment(type);
  }

  togglePause() {
    if (this.finished || this.state === 'halftime' || this.state === 'shootout') return;
    if (this.paused) this.resume();
    else { this.paused = true; this.hud.showPause(); }
  }

  resume() {
    this.paused = false;
    this.hud.hidePause();
    this.lastTime = performance.now();
  }

  openSubs() {
    this.subState.out = null;
    this.subState.in = null;
    this.hud.showSubs(this.subState.tab || 'home');
  }

  selectSubTab(side) { this.subState.tab = side; this.hud.showSubs(side); }

  chooseSub(kind, id) {
    if (kind === 'out') this.subState.out = id;
    else this.subState.in = id;
    this.hud.showSubs(this.subState.tab || 'home');
  }

  confirmSub() {
    const { out, in: inn, tab } = this.subState;
    if (!out || !inn) { this.hud.toast('Escolha quem sai e quem entra.', '!'); return; }
    const side = tab || 'home';
    if (this.substitutions[side] >= this.maxSubs) { this.hud.toast('Limite de substituições atingido.', '!'); return; }
    const cfg = this.sides[side];
    const onIdx = cfg.lineup.findIndex(p => p.id === out);
    if (onIdx < 0) return;
    const benchIdx = cfg.bench.findIndex(p => p.id === inn);
    if (benchIdx < 0) return;
    const offP = cfg.lineup[onIdx];
    const onData = cfg.bench[benchIdx];
    const slot = offP.slot, slotIndex = offP.slotIndex;
    const newP = this.makeRuntimePlayer(side, onData, slot, slotIndex);
    newP.x = offP.x; newP.z = offP.z; newP.stamina = 100;
    cfg.lineup[onIdx] = newP;
    cfg.bench[benchIdx] = offP.data;
    const globalIdx = this.players.findIndex(p => p.id === offP.id);
    if (globalIdx >= 0) this.players[globalIdx] = newP;
    this.substitutions[side]++;
    if (this.controlled[side] === offP.id) this.setControlled(side, newP);
    this.subState.out = null;
    this.subState.in = null;
    Audio.sfx('unlock');
    this.hud.toast(`Entrou ${onData.name} · Saiu ${offP.data.name}`);
    this.hud.showSubs(side);
  }

  openTactics() {
    this.hud.showTactics();
  }

  setFormation(side, formationId) {
    if (!FORMATIONS[formationId]) return;
    const cfg = this.sides[side];
    cfg.formationId = formationId;
    for (const p of cfg.lineup) {
      if (p.sentOff) continue;
      const formation = FORMATIONS[formationId];
      const slot = formation.slots[p.slotIndex] || formation.slots[formation.slots.length - 1];
      p.slot = slot;
      const base = this.formationPosition(slot, cfg.dir, 0);
      p.baseX = base.x; p.baseZ = base.z;
      if (!p.hasBall) { p.targetX = base.x; p.targetZ = base.z; }
    }
    Audio.sfx('click');
    this.hud.showTactics();
  }

  setMentality(side, mentality) {
    if (!['defensiva', 'equilibrada', 'ofensiva'].includes(mentality)) return;
    this.sides[side].mentality = mentality;
    Audio.sfx('click');
    this.hud.showTactics();
  }

  playReplay() {
    if (this.paused) this.resume();
    const frames = this.replayFrames.slice(-45);
    if (frames.length < 4) { this.hud.toast('Sem jogadas recentes para o replay.', 'i'); return; }
    this.replayState = { frames, started: this.elapsed, duration: 3.4, manual: true };
    this.hud.showReplayTag();
  }

  exitMatch() {
    this.destroy();
    this.opts.onExit?.();
  }
}

function opponent(side) { return side === 'home' ? 'away' : 'home'; }
