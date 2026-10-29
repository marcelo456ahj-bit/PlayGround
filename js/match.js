import {
  clamp, lerp, damp, dist, dist2, normalize, sign, RNG, TAU,
  pointSegDist, deepClone, clamp as cl, pick
} from './util.js';
import { FORMATIONS, POS_GROUP, getFormation, autoLineup, teamOverall } from './data.js';

export const FIELD = {
  w: 1600, h: 820,
  cx: 800, cy: 410,
  goalHalf: 138, goalHeight: 152,
  boxDepth: 285, boxHalf: 300,
  sixDepth: 100, sixHalf: 205,
  penSpot: 190,
  centerR: 102
};
const BALL_R = 11;
const GRAVITY = 880;
const DIFF = [
  null,
  { name: 'Amador', speed: .88, react: .34, error: .22, tackle: .48, save: .72, press: .82 },
  { name: 'Regular', speed: .97, react: .24, error: .13, tackle: .62, save: .82, press: 1 },
  { name: 'Profissional', speed: 1.04, react: .17, error: .075, tackle: .74, save: .9, press: 1.12 },
  { name: 'Lenda', speed: 1.12, react: .11, error: .035, tackle: .85, save: .97, press: 1.22 }
];
const STATE_ID = {};
['idle', 'run', 'sprint', 'kick', 'pass', 'slide', 'dive', 'header', 'down', 'celebrate', 'skill', 'gk', 'throw'].forEach((s, i) => STATE_ID[s] = i);

function sideOpp(s) { return s === 'home' ? 'away' : 'home'; }
function sideDir(match, s) { return s === 'home' ? match.homeDir : match.awayDir; }
function goalDefendedX(match, s) { return sideDir(match, s) > 0 ? 0 : FIELD.w; }
function goalAttackedX(match, s) { return sideDir(match, s) > 0 ? FIELD.w : 0; }
function attacksRight(match, s) { return sideDir(match, s) > 0; }

function ratingOf(p) {
  let r = 6.0;
  r += (p.stats.goals || 0) * 1.35;
  r += (p.stats.assists || 0) * .75;
  r += (p.stats.shotsOn || 0) * .1;
  r += (p.stats.saves || 0) * .32;
  r += (p.stats.tackles || 0) * .13;
  r += (p.stats.passesOk || 0) * .012;
  r -= (p.stats.fouls || 0) * .08;
  r -= (p.stats.yellow || 0) * .25;
  r -= (p.stats.red || 0) * .7;
  return clamp(Math.round(r * 10) / 10, 3, 10);
}

export class Match {
  constructor(homeTeam, awayTeam, options = {}) {
    this.home = deepClone(homeTeam);
    this.away = deepClone(awayTeam);
    if (!this.home.lineup?.length) autoLineup(this.home);
    if (!this.away.lineup?.length) autoLineup(this.away);
    this.home.id = homeTeam.id; this.away.id = awayTeam.id;
    this.home.name = homeTeam.name; this.away.name = awayTeam.name;
    this.options = options;
    this.userTeamId = options.userTeamId || null;
    this.userSide = this.userTeamId === this.home.id ? 'home' : this.userTeamId === this.away.id ? 'away' : null;
    this.userPlayerId = options.userPlayerId || null;
    this.p2Side = options.localMultiplayer ? (this.userSide === 'home' ? 'away' : 'home') : null;
    this.localMultiplayer = !!options.localMultiplayer;
    this.difficulty = options.difficulty || 2;
    this.rules = DIFF[this.difficulty] || DIFF[2];
    this.duration = options.duration || 360;
    this.weather = options.weather && options.weather !== 'auto' ? options.weather : this.pickWeather();
    this.stadium = options.stadium || homeTeam.stadium || { name: 'Estádio Nacional', capacity: 50000, theme: 'modern' };
    this.cameraMode = options.camera || 'dynamic';
    this.autoReplay = options.autoReplay !== false;
    this.training = !!options.training;
    this.drill = options.drill || null;
    this.neutral = !!options.neutral;
    this.rng = new RNG(`${homeTeam.id}:${awayTeam.id}:${Date.now()}`);
    this.input = options.input || null;
    this.audio = options.audio || null;
    this.onEvent = options.onEvent || null;
    this.onEnd = options.onEnd || null;
    this.homeDir = 1;
    this.awayDir = -1;
    this.score = { home: 0, away: 0 };
    this.elapsed = 0;
    this.half = 1;
    this.halfDone = false;
    this.phase = 'kickoff';
    this.phaseTimer = 1.0;
    this.paused = false;
    this.finished = false;
    this.kickoffSide = 'home';
    this.ball = { x: FIELD.cx, y: FIELD.cy, z: BALL_R, vx: 0, vy: 0, vz: 0, rot: 0, spin: 0, owner: null, lastTouch: null, lastTouchSide: null, noControlUntil: 0, passFrom: null, passTo: null, assistBy: null, assistTime: -99, shotBy: null, shotSide: null, shotPower: 0, shotAt: 0, trail: [] };
    this.players = [];
    this.byId = new Map();
    this.control = { home: null, away: null };
    this.controlHint = { home: null, away: null };
    this.charge = { home: 0, away: 0 };
    this.stats = { home: this.blankStats(), away: this.blankStats() };
    this.possession = { home: 0, away: 0 };
    this.buffer = [];
    this.bufferT = 0;
    this.replayFrames = null;
    this.replayTime = 0;
    this.replayFrame = null;
    this.replaySkip = false;
    this.goalFlash = 0;
    this.cameraShake = 0;
    this.pendingSetpiece = null;
    this.penalty = null;
    this.subCount = { home: 0, away: 0 };
    this.ai = { home: { decision: 0 }, away: { decision: 0 } };
    this.eventLog = [];
    this.started = false;
    this.acc = 0;
    this._actionStep = true;
    this.build();
    this.kickoff(this.kickoffSide, true);
    this.setCrowd(0.3);
    if (this.audio) {
      this.audio.whistle(false);
    }
    if (this.drill === 'penalty') {
      this.setupPenalty(this.userSide || 'home');
    }
  }

  blankStats() {
    return { shots: 0, onTarget: 0, corners: 0, fouls: 0, yellow: 0, red: 0, passes: 0, passesOk: 0, saves: 0, tackles: 0, possession: 0, xg: 0, offsides: 0 };
  }

  pickWeather() {
    const r = Math.random();
    if (r < .5) return Math.random() < .5 ? 'clear' : 'day';
    if (r < .7) return 'cloudy';
    if (r < .86) return 'rain';
    if (r < .94) return 'snow';
    return 'night';
  }

  build() {
    for (const side of ['home', 'away']) {
      const team = this[side];
      const dir = sideDir(this, side);
      const formation = getFormation(team.formation);
      const lineup = team.lineup.slice(0, 11);
      const squad = team.players || [];
      const starterSet = new Set(lineup);
      const ordered = [...lineup.map(id => squad.find(p => p.id === id)).filter(Boolean), ...squad.filter(p => !starterSet.has(p.id))];
      ordered.forEach((base, index) => {
        if (!base) return;
        const slot = index < 11 ? index : -1;
        const fs = slot >= 0 ? formation.slots[slot] : { pos: base.pos, x: .5, y: .5 };
        const active = slot >= 0;
        const p = {
          id: base.id, data: base, side, teamId: team.id, name: base.name, pos: base.pos, slot,
          attr: base.attrs, overall: base.overall, num: base.num,
          x: active ? (dir > 0 ? fs.x * FIELD.w : FIELD.w - fs.x * FIELD.w) : FIELD.cx,
          y: active ? fs.y * FIELD.h : FIELD.cy, z: 0,
          vx: 0, vy: 0, vz: 0, facing: dir, dir,
          baseX: fs.x, baseY: fs.y, role: POS_GROUP[base.pos] || 'MEI',
          isGK: base.pos === 'GOL', active, red: false, subbedOut: false, subbedIn: false,
          stamina: 100, state: 'idle', stateTime: 0, animPhase: Math.random() * TAU, lean: 0,
          tackleCd: 0, skillCd: 0, decision: Math.random() * .4, kickCd: 0, downTime: 0,
          charge: 0, stats: { goals: 0, assists: 0, shots: 0, shotsOn: 0, passes: 0, passesOk: 0, tackles: 0, saves: 0, fouls: 0, yellow: 0, red: 0, minutes: 0, rating: 0 },
          lastPassFrom: null, lastPassTime: -99, holding: 0
        };
        base.matchRef = p;
        this.players.push(p);
        this.byId.set(p.id, p);
      });
    }
    this.homeBench = this.home.players.filter(p => !this.home.lineup.includes(p.id));
    this.awayBench = this.away.players.filter(p => !this.away.lineup.includes(p.id));
  }

  getSide(side) { return side === 'home' ? this.home : this.away; }
  dir(side) { return sideDir(this, side); }
  attackX(side) { return goalAttackedX(this, side); }
  defendX(side) { return goalDefendedX(this, side); }
  activePlayers(side) { return this.players.filter(p => p.active && p.side === side); }

  emit(type, data = {}) {
    const ev = { type, ...data, time: this.elapsed };
    this.eventLog.push(ev);
    if (this.eventLog.length > 120) this.eventLog.shift();
    try { this.onEvent?.(ev); } catch { /* ignore */ }
  }

  line(type, extra = {}) {
    let text = '';
    if (this.audio) text = this.audio.comment(type, extra);
    this.emit('commentary', { text, kind: type });
    return text;
  }

  setCrowd(v, cheer = false) {
    if (this.audio) this.audio.setCrowdIntensity(v, cheer);
  }

  gameMinute() {
    if (this.training) return null;
    const raw = (this.elapsed / this.duration) * 90;
    return clamp(Math.floor(raw), 0, 90);
  }
  clockText() {
    if (this.training) return 'TREINO';
    const m = this.gameMinute();
    return `${String(m).padStart(2, '0')}:00`;
  }

  kickoff(side, initial = false) {
    this.kickoffSide = side;
    this.pendingSetpiece = null;
    this.penalty = null;
    const dirHome = this.homeDir, dirAway = this.awayDir;
    for (const p of this.players) {
      if (!p.active) continue;
      const dir = p.side === 'home' ? dirHome : dirAway;
      p.x = dir > 0 ? p.baseX * FIELD.w : FIELD.w - p.baseX * FIELD.w;
      p.y = p.baseY * FIELD.h;
      p.z = 0; p.vx = 0; p.vy = 0; p.vz = 0; p.state = 'idle'; p.stateTime = 0;
      p.facing = dir; p.dir = dir; p.tackleCd = 0; p.skillCd = 0; p.charge = 0;
      if (p.isGK) { p.x = dir > 0 ? 24 : FIELD.w - 24; p.y = FIELD.cy; }
    }
    const kicking = this.activePlayers(side).filter(p => !p.isGK);
    const kicker = kicking.sort((a, b) => (b.attr.pass + b.attr.shoot) - (a.attr.pass + a.attr.shoot))[0];
    if (kicker) {
      const dir = this.dir(side);
      kicker.x = FIELD.cx - dir * 22;
      kicker.y = FIELD.cy;
      kicker.facing = dir; kicker.dir = dir;
    }
    this.ball.x = FIELD.cx; this.ball.y = FIELD.cy; this.ball.z = BALL_R;
    this.ball.vx = 0; this.ball.vy = 0; this.ball.vz = 0; this.ball.rot = 0;
    this.ball.owner = kicker || null;
    this.ball.lastTouch = kicker || null; this.ball.lastTouchSide = side;
    this.ball.trail = []; this.ball.shotBy = null; this.ball.passFrom = null; this.ball.passTo = null;
    this.ball.noControlUntil = 0;
    this.phase = 'kickoff'; this.phaseTimer = initial ? 1.2 : 1.0;
    this.control.home = null; this.control.away = null;
    this.controlHint.home = null; this.controlHint.away = null;
    this.emit('kickoff', { side });
    if (!this.training) {
      if (this.half === 1 && !initial) this.line('kickoff');
      else if (this.half === 2 && !initial) this.line('kickoff');
    }
    this.setCrowd(.34);
  }

  startSecondHalf() {
    this.half = 2;
    this.halfDone = true;
    const tmp = this.homeDir; this.homeDir = this.awayDir; this.awayDir = tmp;
    this.kickoff(this.kickoffSide === 'home' ? 'away' : 'home');
    this.emit('secondhalf');
    this.line('secondhalf');
  }

  halftime() {
    this.phase = 'halftime'; this.phaseTimer = 3.4;
    this.emit('halftime');
    this.line('halftime');
    if (this.audio) this.audio.whistle(true);
    if (this.audio) this.audio.startMusic('menu');
    this.autoSubsAtHalf();
  }

  autoSubsAtHalf() {
    for (const side of ['home', 'away']) {
      if (this.userSide === side || this.p2Side === side) continue;
      const act = this.activePlayers(side).filter(p => !p.isGK);
      const bench = this.getBench(side).filter(p => !p.isGK);
      if (!bench.length) continue;
      const tired = act.sort((a, b) => a.stamina - b.stamina)[0];
      const outfield = act.sort((a, b) => (a.overall + a.data.form) - (b.overall + b.data.form))[0];
      const target = tired.stamina < 62 ? tired : (outfield.overall < (bench[0]?.overall || 0) - 2 ? outfield : null);
      if (target) {
        const best = bench.sort((a, b) => b.overall - a.overall)[0];
        if (best && best.overall >= target.overall - 1) this.substitute(side, target.id, best.id, true);
      }
    }
  }

  fulltime() {
    this.finished = true;
    this.phase = 'fulltime';
    this.phaseTimer = 99;
    for (const p of this.players) p.stats.rating = ratingOf(p);
    this.emit('fulltime', {
      score: { ...this.score },
      stats: this.getStats(),
      mvp: this.getMVP(),
      ratings: this.players.filter(p => p.active).map(p => ({ id: p.id, name: p.name, side: p.side, rating: p.stats.rating, goals: p.stats.goals, assists: p.stats.assists, pos: p.pos, overall: p.overall }))
    });
    this.line('fulltime');
    if (this.audio) this.audio.whistle(true);
    this.setCrowd(.8, true);
    this.onEnd?.({ score: { ...this.score }, stats: this.getStats(), mvp: this.getMVP() });
  }

  update(dt) {
    if (this.paused) return;
    dt = Math.min(dt, .06);
    this.acc += dt;
    const step = 1 / 60;
    let first = true;
    let guard = 0;
    while (this.acc >= step && guard++ < 8) {
      this._actionStep = first;
      this.step(step);
      this.acc -= step;
      first = false;
    }
    this._actionStep = false;
    if (this.goalFlash > 0) this.goalFlash = Math.max(0, this.goalFlash - dt * 1.6);
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 22);
  }

  step(dt) {
    if (this.phase === 'fulltime') return;
    if (this.phase === 'halftime') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) { this.phase = 'play'; this.startSecondHalf(); }
      return;
    }
    if (this.phase === 'kickoff') {
      this.phaseTimer -= dt;
      this.tickAnimations(dt);
      if (this.phaseTimer <= 0) {
        this.phase = 'play';
        if (this.audio) this.audio.whistle(false);
      }
      return;
    }
    if (this.phase === 'goal') {
      this.phaseTimer -= dt;
      this.tickAnimations(dt);
      if (this.phaseTimer <= 0) {
        if (this.autoReplay && this.replayFrames && this.replayFrames.length > 4) {
          this.phase = 'replay'; this.replayTime = 0; this.replaySkip = false;
        } else {
          this.kickoff(sideOpp(this.scoringSide || this.kickoffSide));
        }
      }
      return;
    }
    if (this.phase === 'replay') {
      this.replayTime += dt;
      const total = 3.4;
      const idx = clamp(Math.floor((this.replayTime / total) * this.replayFrames.length), 0, this.replayFrames.length - 1);
      this.replayFrame = this.replayFrames[idx];
      if (this.replayTime >= total || this.replaySkip) {
        this.replayFrame = null;
        this.kickoff(sideOpp(this.scoringSide || this.kickoffSide));
      }
      return;
    }
    if (this.phase === 'setpiece') {
      this.phaseTimer -= dt;
      this.tickAnimations(dt);
      this.updateControl(dt, true);
      if (this.phaseTimer <= 0) this.resumeSetpiece();
      return;
    }
    if (this.phase === 'penalty') {
      this.stepPenalty(dt);
      return;
    }
    if (this.phase !== 'play') return;

    if (!this.training) {
      this.elapsed += dt;
      if (this.elapsed >= this.duration) { this.fulltime(); return; }
      if (this.half === 1 && !this.halfDone && this.elapsed >= this.duration / 2) { this.halftime(); return; }
    }

    this.updateControl(dt, false);
    this.updatePlayers(dt);
    this.updateBall(dt);
    this.updateStats(dt);
    this.tickAnimations(dt);
    this.captureBuffer(dt);

    if (this.ball.owner) {
      this.setCrowd(clamp(.30 + Math.abs(this.ball.x - FIELD.cx) / FIELD.w * .5, .25, .8));
    } else {
      this.setCrowd(.32);
    }
    if (Math.random() < .004) this.emit('crowd', {});
  }

  tickAnimations(dt) {
    for (const p of this.players) {
      if (!p.active) continue;
      p.stateTime += dt;
      p.animPhase += dt * (p.state === 'sprint' ? 13 : p.state === 'run' ? 9.2 : 2.2);
      if (p.state === 'kick' || p.state === 'pass' || p.state === 'header') {
        if (p.stateTime > .28) { p.state = 'idle'; p.stateTime = 0; }
      } else if (p.state === 'slide') {
        if (p.stateTime > .5) { p.state = 'idle'; p.stateTime = 0; }
      } else if (p.state === 'dive') {
        if (p.stateTime > .7) { p.state = 'gk'; p.stateTime = 0; }
      } else if (p.state === 'down') {
        if (p.stateTime > 1.1) { p.state = 'idle'; p.stateTime = 0; }
      } else if (p.state === 'celebrate') {
        if (p.stateTime > 3) { p.state = 'idle'; }
      } else if (p.state === 'skill') {
        if (p.stateTime > .4) { p.state = 'idle'; }
      }
      if (p.isGK && p.state === 'idle') p.state = 'gk';
      p.lean = damp(p.lean, p.state === 'slide' ? -1.1 : p.state === 'dive' ? -1.3 : (p.vx * .012), 8, dt);
    }
    if (!this.ball.owner && this.ball.trail.length) {
      this.ball.trail = this.ball.trail.filter(t => { t.life -= dt; return t.life > 0; });
    }
  }

  updateControl(dt, frozen) {
    for (const side of ['home', 'away']) {
      const pid = side === 'home' ? 1 : 2;
      if (side === this.userSide) {
        if (frozen) continue;
        if (this.penalty && this.penalty.side === side && this.phase === 'penalty') continue;
        const hint = this.controlHint[side];
        let target = null;
        if (this.userPlayerId) {
          const fixed = this.byId.get(this.userPlayerId);
          if (fixed && fixed.active && fixed.side === side) target = fixed;
        }
        if (!target && hint && hint.until > this.elapsed) {
          const hp = this.byId.get(hint.id);
          if (hp && hp.active) target = hp;
        }
        if (!target) {
          if (this.ball.owner && this.ball.owner.side === side) target = this.ball.owner;
          else {
            const nearest = this.activePlayers(side).filter(p => !p.isGK).sort((a, b) => dist2(a.x, a.y, this.ball.x, this.ball.y) - dist2(b.x, b.y, this.ball.x, this.ball.y))[0]
              || this.activePlayers(side).find(p => p.isGK);
            const cur = this.control[side];
            if (cur && cur.active && nearest) {
              const dc = dist2(cur.x, cur.y, this.ball.x, this.ball.y);
              const dn = dist2(nearest.x, nearest.y, this.ball.x, this.ball.y);
              if (cur !== this.ball.owner && dc < dn + 900) target = cur;
              else target = nearest;
            } else target = nearest;
          }
        }
        if (target && this.control[side] !== target) {
          this.control[side] = target;
        }
        if (this.control[side] && !this.control[side].active) this.control[side] = null;
      } else {
        const nearest = this.activePlayers(side).filter(p => !p.isGK).sort((a, b) => dist2(a.x, a.y, this.ball.x, this.ball.y) - dist2(b.x, b.y, this.ball.x, this.ball.y))[0];
        this.control[side] = this.ball.owner?.side === side ? this.ball.owner : nearest;
      }
      this.handleInput(side, side === this.userSide ? pid : (side === this.p2Side ? 2 : null));
    }
    this.controlHint.home = this.controlHint.home && this.controlHint.home.until > this.elapsed ? this.controlHint.home : null;
    this.controlHint.away = this.controlHint.away && this.controlHint.away.until > this.elapsed ? this.controlHint.away : null;
  }

  handleInput(side, pid) {
    if (!pid || !this.input) return;
    const p = this.control[side];
    if (!p || !p.active) return;
    if (this.phase !== 'play' && this.phase !== 'penalty') return;
    const move = this.input.move(pid);
    if (move.mag > .08) {
      p.moveX = move.x; p.moveY = move.y; p.moveMag = move.mag;
    } else { p.moveX = 0; p.moveY = 0; p.moveMag = 0; }
    const sprint = this.input.isDown(pid, 'sprint') || (move.mag > .84);
    p.userSprint = sprint;
    const isUser = side === this.userSide;
    if (this._actionStep) {
      if (this.input.just(pid, 'pass')) this.userPass(p, move);
      if (this.input.just(pid, 'dribble')) this.userSkill(p, move);
      if (this.input.just(pid, 'tackle')) this.userTackle(p, move);
      if (this.input.isDown(pid, 'shoot') && p.chargeT == null) p.chargeT = 0;
    }
    if (p.chargeT != null) {
      if (this.input.isDown(pid, 'shoot')) {
        p.chargeT = Math.min(1.2, p.chargeT + 1 / 60);
        if (isUser) this.charge[side] = clamp(p.chargeT / .85, 0, 1);
      } else {
        const power = clamp(p.chargeT / .85, .12, 1);
        const tiltX = this.input.tilt?.enabled ? this.input.tilt.x : 0;
        const aim = clamp(move.y * 1.1 + tiltX * .8, -1, 1);
        if (this.phase === 'penalty' && this.penalty?.side === side) this.takePenalty(power, aim);
        else this.userShoot(p, power, aim);
        p.chargeT = null;
        if (isUser) this.charge[side] = 0;
      }
    }
  }

  movePlayer(p, mx, my, sprint, dt, isUser = false) {
    if (p.state === 'down' || p.state === 'slide' || p.state === 'celebrate') return;
    if (p.state === 'dive') return;
    let speed = (116 + (p.attr.pace || 60) * .96) * (isUser ? 1.03 : this.rules.speed);
    if (p.isGK) speed *= .93;
    const st = p.stamina / 100;
    speed *= .78 + st * .28;
    if (sprint && p.stamina > 4) { speed *= 1.34; p.stamina = clamp(p.stamina - dt * 4.6, 0, 100); }
    else p.stamina = clamp(p.stamina + dt * 2.3, 0, 100);
    const tx = mx * speed, ty = my * speed;
    const accel = isUser ? 13 : 9.5;
    p.vx = damp(p.vx, tx, accel, dt);
    p.vy = damp(p.vy, ty, accel, dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > 28) p.facing = p.vx > 8 ? 1 : p.vx < -8 ? -1 : p.facing;
    if (p.state !== 'kick' && p.state !== 'pass' && p.state !== 'header' && p.state !== 'skill') {
      p.state = sp > 195 ? 'sprint' : sp > 42 ? 'run' : (p.isGK ? 'gk' : 'idle');
      if (p.state !== 'idle') p.stateTime = 0;
    }
    p.x = clamp(p.x, -28, FIELD.w + 28);
    p.y = clamp(p.y, -18, FIELD.h + 18);
    if (p.x < -10 || p.x > FIELD.w + 10) p.y = clamp(p.y, 12, FIELD.h - 12);
  }

  userPass(p, move) {
    if (this.phase !== 'play') return;
    const dir = this.inputDir(p, move);
    if (this.ball.owner === p) this.pass(p, dir.x, dir.y, false);
    else if (dist2(p.x, p.y, this.ball.x, this.ball.y) < 60 * 60) this.pass(p, dir.x, dir.y, false);
  }
  userShoot(p, power, aim) {
    if (this.phase !== 'play') return;
    if (this.ball.owner === p || dist2(p.x, p.y, this.ball.x, this.ball.y) < 40 * 40) this.shoot(p, power, aim);
  }
  userSkill(p, move) {
    if (this.phase !== 'play' || p.skillCd > 0) return;
    const dir = this.inputDir(p, move);
    p.skillCd = .95;
    p.state = 'skill'; p.stateTime = 0;
    const side = { x: -dir.y * .85, y: dir.x * .85 };
    p.vx += side.x * 230 + dir.x * 80;
    p.vy += side.y * 230 + dir.y * 80;
    if (this.ball.owner === p) {
      this.ball.vx = p.vx * .55; this.ball.vy = p.vy * .55;
      this.ball.owner = null; this.ball.lastTouch = p; this.ball.lastTouchSide = p.side;
      this.ball.noControlUntil = this.elapsed + .15;
    }
    if (this.audio) this.audio.pass(.4);
  }
  userTackle(p, move) {
    if (this.phase !== 'play' || p.tackleCd > 0) return;
    const dir = this.inputDir(p, move);
    this.slideTackle(p, dir);
  }

  inputDir(p, move) {
    if (move && move.mag > .15) return normalize(move.x, move.y);
    return { x: p.facing, y: 0, len: 1 };
  }

  slideTackle(p, dir) {
    p.tackleCd = .9;
    p.state = 'slide'; p.stateTime = 0;
    const d = normalize(dir.x || p.facing, dir.y || 0);
    p.vx = d.x * 330; p.vy = d.y * 330;
    p.stamina = clamp(p.stamina - 3, 0, 100);
    p.sliding = true; p.slideHit = false;
    if (this.audio) this.audio.tackle();
    this.cameraShake = Math.max(this.cameraShake, 2);
    if (this.input) this.input.vibrate?.(8);
  }

  checkSlide(dt) {
    for (const p of this.players) {
      if (!p.active || p.state !== 'slide') continue;
      if (this.ball.owner === p) continue;
      if (!p.slideHit && !this.ball.owner) {
        if (dist2(p.x, p.y, this.ball.x, this.ball.y) < 34 * 34 && this.ball.z < 45) {
          p.slideHit = true;
          this.giveBall(p, true);
          p.stats.tackles++;
          this.stats[p.side].tackles = (this.stats[p.side].tackles || 0) + 1;
          if (this.audio) this.audio.tackle();
        }
      }
      for (const o of this.players) {
        if (!o.active || o.side === p.side || o.state === 'down') continue;
        if (dist2(p.x, p.y, o.x, o.y) < 31 * 31) {
          if (this.ball.owner === o || o === this.ball.lastTouch) {
            if (!p.slideHit && !p.foulDone) {
              p.foulDone = true;
              const sev = this.rng.chance(.24) ? 2 : 1;
              this.awardFoul(p, o, sev);
            }
          }
        }
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx = damp(p.vx, 0, 2.6, dt); p.vy = damp(p.vy, 0, 2.6, dt);
      p.x = clamp(p.x, -20, FIELD.w + 20); p.y = clamp(p.y, -12, FIELD.h + 12);
    }
  }

  updatePlayers(dt) {
    for (const p of this.players) {
      if (!p.active) continue;
      p.tackleCd = Math.max(0, p.tackleCd - dt);
      p.skillCd = Math.max(0, p.skillCd - dt);
      p.kickCd = Math.max(0, p.kickCd - dt);
      p.stateTime += 0;
      if (p.isGK) { this.gkAI(p, dt); continue; }
      const isUserSide = p.side === this.userSide;
      const isP2Side = p.side === this.p2Side;
      const controlled = (isUserSide && this.control[p.side] === p) || (isP2Side && this.control[p.side] === p);
      if (controlled && (p.userActive !== false)) {
        this.movePlayer(p, p.moveX || 0, p.moveY || 0, !!p.userSprint, dt, true);
        continue;
      }
      this.aiPlayer(p, dt);
    }
    this.separatePlayers(dt);
    this.checkSlide(dt);
  }

  separatePlayers(dt) {
    const active = this.players.filter(p => p.active && p.state !== 'slide' && p.state !== 'down');
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i], b = active[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        const min = a.state === 'slide' ? 16 : 24;
        if (d2 < min * min && d2 > .01) {
          const d = Math.sqrt(d2);
          const push = (min - d) * .5;
          const nx = dx / d, ny = dy / d;
          a.x -= nx * push * .5; a.y -= ny * push * .5;
          b.x += nx * push * .5; b.y += ny * push * .5;
        }
      }
    }
  }

  chaserFor(side) {
    const list = this.activePlayers(side).filter(p => !p.isGK);
    if (!list.length) return null;
    return list.sort((a, b) => {
      const da = dist2(a.x, a.y, this.ball.x, this.ball.y);
      const db = dist2(b.x, b.y, this.ball.x, this.ball.y);
      return da - db;
    })[0];
  }

  aiPlayer(p, dt) {
    p.decision -= dt;
    const chaser = this.chaserFor(p.side);
    const isChaser = chaser === p;
    const owner = this.ball.owner;
    if (owner === p) this.aiWithBall(p, dt);
    else if (isChaser) this.aiChase(p, dt, owner);
    else this.aiPosition(p, dt, chaser);
  }

  aiChase(p, dt, owner) {
    const ball = this.ball;
    const myGoal = this.defendX(p.side);
    let tx = ball.x + ball.vx * .18;
    let ty = ball.y + ball.vy * .18;
    if (owner && owner.side !== p.side) {
      const toGoal = normalize(myGoal - owner.x, FIELD.cy - owner.y);
      tx = owner.x + toGoal.x * 18;
      ty = owner.y + toGoal.y * 18;
    }
    if (ball.z > 90) { tx = ball.x; ty = ball.y; }
    const dx = tx - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy);
    const close = owner && owner.side !== p.side && dist2(p.x, p.y, owner.x, owner.y) < 46 * 46;
    if (close && p.tackleCd <= 0 && this.rng.chance((.42 + this.rules.tackle * .45) * dt * 2.4)) {
      this.slideTackle(p, { x: dx / (d || 1), y: dy / (d || 1) });
      return;
    }
    const speed = d > 5 ? 1 : 0;
    this.movePlayer(p, speed * dx / (d || 1), speed * dy / (d || 1), d > 110 && p.stamina > 25, dt);
    p.userSprint = false;
  }

  aiWithBall(p, dt) {
    const dir = this.dir(p.side);
    const goalX = this.attackX(p.side);
    const goalY = FIELD.cy;
    const dx = goalX - p.x, dy = goalY - p.y;
    const dGoal = Math.hypot(dx, dy);
    const opponents = this.activePlayers(sideOpp(p.side));
    const nearest = opponents.sort((a, b) => dist2(a.x, a.y, p.x, p.y) - dist2(b.x, b.y, p.x, p.y))[0];
    const pressure = nearest ? dist(p.x, p.y, nearest.x, nearest.y) : 999;
    const toGoal = normalize(dx, dy);
    p.decisionTimer = (p.decisionTimer || 0) - dt;
    if (p.decisionTimer <= 0) {
      p.decisionTimer = this.rules.react * (0.6 + this.rng.f() * .9) + .12;
      const shootRange = p.isGK ? 0 : 260 + p.attr.shoot * 3.4;
      const inRange = dGoal < shootRange && Math.abs(p.y - FIELD.cy) < 330;
      const angleGood = dGoal < 160 || Math.abs(p.y - FIELD.cy) < 260;
      if (p.isGK) {
        this.gkDistribute(p);
        return;
      }
      if (inRange && angleGood && this.rng.chance(.32 + p.attr.shoot / 260 - pressure / 600)) {
        this.shoot(p, .55 + this.rng.range(0, .45), this.rng.range(-.85, .85));
        return;
      }
      const target = this.findPassTarget(p, toGoal, true);
      if (pressure < 70 && target && this.rng.chance(.55)) {
        this.pass(p, toGoal.x, toGoal.y, false, target);
        return;
      }
      if (this.rng.chance(.13) && target) {
        this.pass(p, toGoal.x, toGoal.y, this.rng.chance(.35), target);
        return;
      }
      if (dGoal < 420 && this.rng.chance(.06)) {
        this.shoot(p, .45 + this.rng.range(0, .4), this.rng.range(-.9, .9));
        return;
      }
      p.aiSkill = this.rng.chance(.12) && p.skillCd <= 0 && pressure < 55;
    }
    let mx = toGoal.x, my = toGoal.y;
    if (nearest) {
      const away = normalize(p.x - nearest.x, p.y - nearest.y);
      if (pressure < 62) { mx += away.x * .7; my += away.y * .7; }
    }
    my += Math.sin(this.elapsed * 1.4 + p.animPhase) * .28;
    const n = normalize(mx, my);
    this.movePlayer(p, n.x, n.y, dGoal > 240 && p.stamina > 35, dt);
    p.userSprint = false;
    if (p.aiSkill) { p.aiSkill = false; this.userSkill(p, { x: n.x, y: n.y, mag: 1 }); }
  }

  aiPosition(p, dt, chaser) {
    const dir = this.dir(p.side);
    const owner = this.ball.owner;
    const hasPoss = owner?.side === p.side;
    const tactics = this.getSide(p.side).tactics || { mentality: 2, pressing: 2, width: 2 };
    let baseX = dir > 0 ? p.baseX * FIELD.w : FIELD.w - p.baseX * FIELD.w;
    let baseY = p.baseY * FIELD.h;
    const advance = (hasPoss ? 1 : -1) * (60 + (tactics.mentality || 2) * 16) + (this.ball.x - FIELD.cx) * .24;
    let tx = baseX + advance * dir;
    let ty = baseY + (this.ball.y - FIELD.cy) * .34;
    const widthF = .82 + (tactics.width || 2) * .11;
    ty = FIELD.cy + (ty - FIELD.cy) * widthF;
    if (p.role === 'DEF') {
      const opps = this.activePlayers(sideOpp(p.side)).filter(o => !o.isGK);
      let mark = null, best = 1e9;
      for (const o of opps) {
        if (Math.abs(o.y - p.y) > 170 && Math.abs(o.x - p.x) > 220) continue;
        const score = dist2(o.x, o.y, p.x, p.y) - (o.x - this.defendX(p.side)) * dir * .06;
        if (score < best) { best = score; mark = o; }
      }
      if (mark && !hasPoss) {
        const gx = this.defendX(p.side);
        const inter = normalize(gx - mark.x, FIELD.cy - mark.y);
        tx = lerp(mark.x, tx, .3) + inter.x * 22;
        ty = lerp(mark.y, ty, .35) + inter.y * 22;
      }
    }
    if (p.role === 'ATA' && hasPoss) { tx += dir * 40; }
    const dx = tx - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 8) {
      const maxSp = d > 250 ? 1 : d > 80 ? .82 : .5;
      this.movePlayer(p, maxSp * dx / d, maxSp * dy / d, d > 200 && p.stamina > 40 && hasPoss, dt);
    } else {
      this.movePlayer(p, 0, 0, false, dt);
    }
  }

  gkAI(p, dt) {
    if (this.phase !== 'play' && this.phase !== 'penalty') { this.movePlayer(p, 0, 0, false, dt); return; }
    if (p.state === 'down') return;
    const gx = this.defendX(p.side);
    const dir = this.dir(p.side);
    const ball = this.ball;
    if (ball.owner === p) {
      p.holding += dt;
      this.movePlayer(p, 0, 0, false, dt);
      if (p.holding > .9) { p.holding = 0; this.gkDistribute(p); }
      return;
    }
    const targetY = clamp(ball.y + ball.vy * .22, FIELD.cy - 150, FIELD.cy + 150);
    let targetX = gx + dir * 26;
    const ballDist = dist(p.x, p.y, ball.x, ball.y);
    if (ballDist < 230 && ball.z < 180) targetX = gx + dir * 56;
    const dx = targetX - p.x, dy = targetY - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 2) this.movePlayer(p, dx / d, dy / d, ballDist < 220, dt);
    else this.movePlayer(p, 0, 0, false, dt);
    p.facing = dir;
    if (p.state === 'idle') p.state = 'gk';
    const shotComing = !ball.owner && ball.shotBy && ball.shotSide !== p.side;
    if (shotComing && p.state !== 'dive') {
      const toGoal = normalize(gx - ball.x, FIELD.cy - ball.y);
      const toward = ball.vx * toGoal.x + ball.vy * toGoal.y;
      if (toward > 150 && ballDist < 340) {
        const guess = ball.y + ball.vy * clamp((gx - ball.x) / Math.max(1, Math.abs(ball.vx)), 0, .8);
        p.diveDir = clamp((guess - p.y) / 80, -1, 1);
        p.state = 'dive'; p.stateTime = 0;
        p.vx = p.diveDir * 250; p.vy = 0;
        if (this.audio) this.audio.save();
      }
    }
  }

  gkDistribute(p) {
    const dir = this.dir(p.side);
    const mates = this.activePlayers(p.side).filter(o => o !== p);
    const target = mates.sort((a, b) => (b.x - p.x) * dir - dist2(a.x, a.y, p.x, p.y) * .0005 - dist2(b.x, b.y, p.x, p.y) * .0005)[0] || mates[0];
    if (target) {
      this.pass(p, dir, 0, false, target);
    } else {
      this.ball.vx = dir * 620; this.ball.vy = this.rng.range(-80, 80); this.ball.vz = 240; this.ball.owner = null;
      this.ball.lastTouch = p; this.ball.lastTouchSide = p.side; this.ball.noControlUntil = this.elapsed + .5;
    }
  }

  findPassTarget(p, dir, forwardBias = false) {
    const mates = this.activePlayers(p.side).filter(o => o !== p && !o.isGK);
    let best = null, bestScore = -1e9;
    const opps = this.activePlayers(sideOpp(p.side));
    for (const o of mates) {
      const dx = o.x - p.x, dy = o.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 28) continue;
      const nx = dx / d, ny = dy / d;
      const align = nx * dir.x + ny * dir.y;
      if (align < -.1 && d > 160) continue;
      let score = align * 2.4 - d / 900;
      if (forwardBias) score += ((o.x - p.x) * this.dir(p.side)) / 520;
      if (o.isGK) score -= 3;
      const pressure = opps.reduce((mn, op) => Math.min(mn, dist(o.x, o.y, op.x, op.y)), 999);
      score += clamp(pressure / 160, 0, 1.1);
      if (d > 620) score -= 1.2;
      if (score > bestScore) { bestScore = score; best = o; }
    }
    return best;
  }

  pass(p, dx, dy, lofted = false, forcedTarget = null) {
    if (this.phase !== 'play' && !(this.phase === 'setpiece')) return;
    if (this.ball.owner !== p && dist2(p.x, p.y, this.ball.x, this.ball.y) > 45 * 45) return;
    const n = normalize(dx, dy);
    if (!n.len) { n.x = p.facing; n.y = 0; }
    const target = forcedTarget || this.findPassTarget(p, n, false);
    this.ball.owner = null;
    this.ball.lastTouch = p; this.ball.lastTouchSide = p.side;
    this.ball.passFrom = p; this.ball.passTo = target || null;
    this.ball.shotBy = null; this.ball.shotSide = null;
    this.ball.noControlUntil = this.elapsed + .16;
    const d = target ? dist(p.x, p.y, target.x, target.y) : 320;
    let speed = clamp(250 + d * .85, 280, 690);
    speed *= .9 + (p.attr.pass / 100) * .25;
    const err = (100 - p.attr.pass) / 100 * this.rules.error * 2.4;
    const ang = this.rng.range(-err, err);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    let vx = (n.x * ca - n.y * sa) * speed;
    let vy = (n.x * sa + n.y * ca) * speed;
    if (target) {
      const lead = clamp(d / speed, 0, .9);
      let tx = target.x + target.vx * lead * .5;
      let ty = target.y + target.vy * lead * .5;
      const to = normalize(tx - p.x, ty - p.y);
      vx = to.x * speed; vy = to.y * speed;
      this.controlHint[p.side] = { id: target.id, until: this.elapsed + 1.36 };
    }
    let vz = 0;
    if (lofted || d > 500) vz = clamp(d * .49, 120, 340);
    else if (this.blocked(p, target)) vz = 150;
    this.ball.x = p.x + n.x * 20; this.ball.y = p.y + n.y * 20; this.ball.z = 10;
    this.ball.vx = vx; this.ball.vy = vy; this.ball.vz = vz;
    this.ball.spin = this.rng.range(-5, 5);
    p.stats.passes++; this.stats[p.side].passes++;
    p.state = 'pass'; p.stateTime = 0;
    p.kickCd = .22;
    if (this.audio) this.audio.pass(clamp(speed / 700, .2, 1));
  }

  blocked(p, target) {
    if (!target) return false;
    const opps = this.activePlayers(sideOpp(p.side));
    return opps.some(o => pointSegDist(o.x, o.y, p.x, p.y, target.x, target.y) < 25);
  }

  shoot(p, power, aim = 0, penalty = false) {
    if (this.phase !== 'play' && !penalty) return;
    const dir = this.dir(p.side);
    const goalX = this.attackX(p.side);
    const mouth = FIELD.goalHalf - 14;
    let ty = FIELD.cy + clamp(aim, -1.15, 1.15) * mouth;
    const accuracy = p.attr.shoot / 100;
    const err = (1 - accuracy) * (this.rules.error + .06) * 230 * (penalty ? .35 : 1);
    ty += this.rng.gauss(0, err * .55);
    ty = clamp(ty, FIELD.cy - mouth, FIELD.cy + mouth);
    const tz = penalty ? 22 + power * 88 : 20 + power * 72;
    const d = Math.abs(goalX - this.ball.x);
    let speed = (680 + power * 430) * (.86 + accuracy * .22);
    if (penalty) speed = 760 + power * 260;
    if (d < 60) speed = Math.max(520, speed * .7);
    const t = clamp(d / speed, .08, 1.4);
    let vz = (tz - this.ball.z + .5 * GRAVITY * t * t) / t;
    vz = clamp(vz, 0, 520);
    const dx = goalX - this.ball.x;
    const dy = ty - this.ball.y;
    const distH = Math.hypot(dx, dy);
    this.ball.owner = null;
    this.ball.lastTouch = p; this.ball.lastTouchSide = p.side;
    this.ball.shotBy = p; this.ball.shotSide = p.side; this.ball.shotPower = power; this.ball.shotAt = this.elapsed;
    this.ball.assistBy = p.lastPassFrom && this.elapsed - p.lastPassTime < 6 ? p.lastPassFrom : null;
    this.ball.noControlUntil = this.elapsed + .3;
    this.ball.vx = (dx / distH) * speed * (dy === 0 ? 1 : 1);
    this.ball.vy = (dy / distH) * speed;
    this.ball.vz = vz;
    this.ball.spin = this.rng.range(-8, 8);
    this.ball.x = p.x + dir * 16; this.ball.y = p.y;
    p.stats.shots++; this.stats[p.side].shots++;
    const xg = clamp(1 - d / 620, .03, .62) * (1 - Math.abs(p.y - FIELD.cy) / 700) + power * .03;
    this.stats[p.side].xg += xg;
    p.state = 'kick'; p.stateTime = 0; p.kickCd = .3;
    this.cameraShake = Math.max(this.cameraShake, 1.3 + power * 2);
    if (this.audio) this.audio.kick(power);
    if (!penalty) {
      const line = this.line('shot', { cooldown: 5200 });
      if (line) this.emit('shot', { side: p.side, player: p.name });
    }
    if (this.input) this.input.vibrate?.(10);
  }

  giveBall(p, tackle = false) {
    const prev = this.ball.owner;
    if (prev && prev.side === p.side && prev !== p) {
      // teammate receives a pass
      if (this.ball.passFrom && this.ball.passFrom.side === p.side) {
        p.lastPassFrom = this.ball.passFrom; p.lastPassTime = this.elapsed;
        p.stats.passesOk = (p.stats.passesOk || 0) + 1;
        this.stats[p.side].passesOk++;
      }
    }
    this.ball.owner = p;
    this.ball.lastTouch = p; this.ball.lastTouchSide = p.side;
    this.ball.shotBy = null; this.ball.shotSide = null;
    this.ball.vx = 0; this.ball.vy = 0; this.ball.vz = 0;
    this.ball.x = p.x + p.facing * 17; this.ball.y = p.y; this.ball.z = 8;
    this.ball.passFrom = this.ball.passFrom === p ? null : this.ball.passFrom;
    if (tackle) {
      p.stats.tackles++;
      if (this.audio) this.audio.tackle();
    }
  }

  updateBall(dt) {
    const b = this.ball;
    if (b.owner) {
      const p = b.owner;
      if (!p.active || p.state === 'down') { b.owner = null; }
      else {
        const speed = Math.hypot(p.vx, p.vy);
        const ahead = p.state === 'slide' ? 10 : speed > 185 ? 27 : 18;
        b.x = p.x + p.facing * ahead;
        b.y = p.y + clamp(p.vy * .03, -8, 8);
        b.z = 8 + Math.sin(p.animPhase) * 2;
        b.vx = p.vx; b.vy = p.vy; b.vz = 0;
        b.rot += (p.vx / 120) * dt * 6;
        if (p.x < -5 || p.x > FIELD.w + 5) b.x = clamp(p.x, 4, FIELD.w - 4);
        if (b.y < 2 || b.y > FIELD.h - 2) b.y = clamp(b.y, 4, FIELD.h - 4);
        if (this.rng.chance(dt * 1.6)) {
          const close = this.activePlayers(sideOpp(p.side)).filter(o => dist2(o.x, o.y, p.x, p.y) < 32 * 32);
          for (const o of close) {
            const steal = .16 + (o.attr.defense || 60) / 900 - (p.attr.dribble || 60) / 900;
            if (this.rng.chance(clamp(steal, .04, .35))) {
              this.giveBall(o, true);
              break;
            }
          }
        }
        return;
      }
    }
    const px = b.x, py = b.y, pz = b.z;
    if (this.weather === 'rain') { b.vx *= 1 - .06 * dt; b.vy *= 1 - .06 * dt; b.vx += 10 * dt * .2; }
    if (this.weather === 'snow') { b.vx *= 1 - .12 * dt; b.vy *= 1 - .12 * dt; }
    b.vz -= GRAVITY * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    b.rot += (Math.hypot(b.vx, b.vy) / 110) * dt * 2.2;
    if (b.z < BALL_R) {
      b.z = BALL_R;
      if (Math.abs(b.vz) > 40) {
        b.vz = -b.vz * .54;
        if (this.audio && Math.abs(b.vz) > 70) this.audio.tone({ freq: 120, dur: .05, gain: .04, type: 'sine' });
      } else b.vz = 0;
      const fr = this.weather === 'rain' ? 3.1 : this.weather === 'snow' ? 4.4 : 2.35;
      b.vx = damp(b.vx, 0, fr, dt);
      b.vy = damp(b.vy, 0, fr, dt);
    } else {
      b.vx = damp(b.vx, 0, .12, dt);
      b.vy = damp(b.vy, 0, .12, dt);
    }
    if (b.vx || b.vy) {
      b.trail.push({ x: b.x, y: b.y, z: b.z, life: .22 });
      if (b.trail.length > 16) b.trail.shift();
    }
    if (b.y < -30 || b.y > FIELD.h + 30 || b.x < -60 || b.x > FIELD.w + 60) {
      this.outOfBounds(b.x, b.y, true);
      return;
    }
    this.checkBallCollisions();
    if (this.phase !== 'play' && this.phase !== 'penalty') return;
    this.checkGoal(px, py, pz);
    if (this.phase !== 'play') return;
    if (b.y < 0 || b.y > FIELD.h) this.outOfBounds(b.x, b.y, false);
    else if (b.x < 0 || b.x > FIELD.w) this.outOfBounds(b.x, b.y, false);
  }

  checkBallCollisions() {
    const b = this.ball;
    if (b.owner) return;
    if (this.elapsed < b.noControlUntil) return;
    const reach = b.z < 46 ? 25 : b.z < 118 ? 20 : 0;
    for (const p of this.players) {
      if (!p.active || p.state === 'down') continue;
      if (p.isGK && p.state === 'dive') {
        const d = dist(p.x, p.y, b.x, b.y);
        if (d < 66 && b.z < 175) { this.keeperSave(p); return; }
      }
      if (p.isGK && dist2(p.x, p.y, b.x, b.y) < 30 * 30 && b.z < 180) {
        if (this.rng.chance(.85)) { this.giveBall(p); return; }
      }
      const d2 = dist2(p.x, p.y, b.x, b.y);
      if (b.z >= 46 && b.z < 160 && d2 < 30 * 30) {
        const dir = this.dir(p.side);
        const goalX = this.attackX(p.side);
        const toward = normalize(goalX - p.x, FIELD.cy - p.y);
        if (p.isGK) {
          this.ball.owner = p; this.ball.lastTouch = p; this.ball.lastTouchSide = p.side;
          this.ball.vx = 0; this.ball.vy = 0; this.ball.vz = 0;
          return;
        }
        b.vx = toward.x * (300 + p.attr.physical * 2.2);
        b.vy = toward.y * (240 + p.attr.physical * 1.8);
        b.vz = 180;
        b.lastTouch = p; b.lastTouchSide = p.side;
        p.state = 'header'; p.stateTime = 0;
        p.stats.shots++; this.stats[p.side].shots++;
        if (this.audio) this.audio.kick(.7);
        return;
      }
      if (b.z < 46 && d2 < reach * reach) {
        const speed = Math.hypot(b.vx, b.vy);
        if (speed < 250 || this.rng.chance(.55 + (p.attr.dribble || 60) / 300)) {
          this.giveBall(p);
          return;
        }
      }
      if (b.z < 60 && d2 < 20 * 20) {
        const nx = normalize(b.x - p.x, b.y - p.y);
        b.vx = nx.x * Math.max(120, Math.abs(b.vx) * .45);
        b.vy = nx.y * Math.max(120, Math.abs(b.vy) * .45);
        b.lastTouch = p; b.lastTouchSide = p.side;
      }
    }
  }

  keeperSave(gk) {
    const b = this.ball;
    gk.stats.saves++;
    this.stats[gk.side].saves++;
    if (b.shotBy && b.shotBy.side !== gk.side) this.stats[b.shotBy.side].onTarget++;
    const gkSkill = gk.attr.gk || 60;
    const power = b.shotPower || .7;
    const saveChance = clamp(this.rules.save * (gkSkill / 82) - power * .22, .18, .92);
    if (this.rng.chance(saveChance)) {
      if (this.rng.chance(.32)) {
        this.giveBall(gk);
      } else {
        const out = normalize(gk.x + this.dir(gk.side) * 60 - b.x, this.rng.range(-90, 90));
        b.vx = out.x * 340; b.vy = out.y * 340; b.vz = 110;
        b.lastTouch = gk; b.lastTouchSide = gk.side;
        b.noControlUntil = this.elapsed + .18;
        b.shotBy = null;
      }
      if (this.audio) { this.audio.save(); this.audio.cheer(.55); }
      this.emit('save', { side: gk.side, player: gk.name });
      this.line('save', { cooldown: 5000 });
    } else {
      b.vx *= .6; b.vy = this.rng.range(-120, 120);
      gk.state = 'dive'; gk.stateTime = 0;
    }
  }

  checkGoal(px, py, pz) {
    const b = this.ball;
    if (b.owner) return;
    const mouthTop = FIELD.cy - FIELD.goalHalf, mouthBot = FIELD.cy + FIELD.goalHalf;
    const inMouthY = b.y > mouthTop + 2 && b.y < mouthBot - 2;
    const underBar = b.z < FIELD.goalHeight - 2;
    if (px > 0 && b.x <= 0) {
      if (inMouthY && underBar) { this.goal(this.homeDir > 0 ? 'away' : 'home'); return; }
      if (Math.abs(b.y - mouthTop) < 14 || Math.abs(b.y - mouthBot) < 14 || Math.abs(b.z - FIELD.goalHeight) < 12) {
        b.x = 2; b.vx = Math.abs(b.vx) * .55; if (Math.abs(b.y - mouthTop) < 14 || Math.abs(b.y - mouthBot) < 14) b.vy = -b.vy * .5;
        if (this.audio) this.audio.post(); this.emit('post', {}); this.line('post', { cooldown: 5000 });
        return;
      }
      this.outOfBounds(0, b.y, false);
    } else if (px < FIELD.w && b.x >= FIELD.w) {
      if (inMouthY && underBar) { this.goal(this.homeDir > 0 ? 'home' : 'away'); return; }
      if (Math.abs(b.y - mouthTop) < 14 || Math.abs(b.y - mouthBot) < 14 || Math.abs(b.z - FIELD.goalHeight) < 12) {
        b.x = FIELD.w - 2; b.vx = -Math.abs(b.vx) * .55;
        if (this.audio) this.audio.post(); this.emit('post', {}); this.line('post', { cooldown: 5000 });
        return;
      }
      this.outOfBounds(FIELD.w, b.y, false);
    }
  }

  outOfBounds(x, y, far) {
    if (this.phase !== 'play') return;
    if (this.training) { this.trainingReset(); return; }
    const b = this.ball;
    const lastSide = b.lastTouchSide || sideOpp(this.userSide || 'home');
    if (y < 0 || y > FIELD.h) {
      const awarded = sideOpp(lastSide);
      const xx = clamp(x, 40, FIELD.w - 40);
      const yy = y < 0 ? 6 : FIELD.h - 6;
      this.setPiece('throwin', awarded, xx, yy);
      return;
    }
    // goal line
    const crossingLeft = x <= 0;
    const defSide = crossingLeft ? (this.homeDir > 0 ? 'home' : 'away') : (this.homeDir > 0 ? 'away' : 'home');
    const attSide = sideOpp(defSide);
    if (lastSide === attSide) {
      this.setPiece('goalkick', defSide, crossingLeft ? 58 : FIELD.w - 58, FIELD.cy);
    } else {
      const cornerY = y < FIELD.cy ? 8 : FIELD.h - 8;
      this.setPiece('corner', attSide, crossingLeft ? 8 : FIELD.w - 8, cornerY);
    }
  }

  trainingReset() {
    this.ball.owner = null; this.ball.x = FIELD.cx; this.ball.y = FIELD.cy; this.ball.z = 30;
    this.ball.vx = 0; this.ball.vy = 0; this.ball.vz = 0; this.ball.lastTouch = null; this.ball.lastTouchSide = null;
    this.emit('training-reset', {});
  }

  setPiece(type, side, x, y, extra = {}) {
    const b = this.ball;
    b.owner = null; b.vx = 0; b.vy = 0; b.vz = 0; b.shotBy = null;
    b.x = clamp(x, 8, FIELD.w - 8); b.y = clamp(y, 8, FIELD.h - 8); b.z = BALL_R;
    b.lastTouchSide = sideOpp(side);
    const mates = this.activePlayers(side).filter(p => type === 'goalkick' ? p.isGK : !p.isGK);
    let taker = type === 'goalkick' ? this.activePlayers(side).find(p => p.isGK) : null;
    if (!taker) {
      taker = mates.sort((a, c) => dist2(a.x, a.y, b.x, b.y) - dist2(c.x, c.y, b.x, b.y))[0];
    }
    if (!taker) { b.owner = null; this.phase = 'play'; return; }
    const dir = this.dir(side);
    if (type === 'throwin') {
      taker.x = b.x; taker.y = b.y + (b.y < FIELD.h / 2 ? 22 : -22);
    } else if (type === 'corner') {
      taker.x = b.x + dir * 24; taker.y = b.y + (b.y < FIELD.h / 2 ? 22 : -22);
      taker.facing = dir;
    } else if (type === 'goalkick') {
      taker.x = b.x + dir * 10; taker.y = FIELD.cy;
    } else {
      taker.x = b.x - dir * 26; taker.y = b.y;
    }
    taker.facing = dir; taker.dir = dir;
    for (const p of this.players) {
      if (!p.active) continue;
      p.vx = 0; p.vy = 0; p.state = 'idle';
      if (p !== taker && dist2(p.x, p.y, b.x, b.y) < 60 * 60) {
        const away = normalize(p.x - b.x, p.y - b.y);
        p.x = b.x + away.x * 64; p.y = clamp(b.y + away.y * 64, 12, FIELD.h - 12);
      }
    }
    this.pendingSetpiece = { type, side, taker: taker.id, x: b.x, y: b.y };
    this.phase = 'setpiece'; this.phaseTimer = .85;
    this.controlHint[side] = { id: taker.id, until: this.elapsed + 2 };
    const names = { throwin: 'throwin', corner: 'corner', goalkick: 'goalkick', freekick: 'freekick' };
    this.line(names[type] || 'freekick', { cooldown: 6000 });
    this.emit('setpiece', { ...this.pendingSetpiece });
    if (type === 'corner') this.stats[side].corners++;
    if (this.audio) this.audio.whistle(false);
  }

  resumeSetpiece() {
    const sp = this.pendingSetpiece;
    if (!sp) { this.phase = 'play'; return; }
    const taker = this.byId.get(sp.taker);
    this.pendingSetpiece = null;
    this.phase = 'play';
    if (taker && taker.active) {
      this.ball.x = taker.x + taker.facing * 6; this.ball.y = taker.y; this.ball.z = 10;
      this.ball.owner = taker;
      this.ball.lastTouch = taker; this.ball.lastTouchSide = taker.side;
      if (sp.type === 'corner' || sp.type === 'throwin') {
        taker.aiSetpiece = true;
      }
      this.control[taker.side] = taker;
    }
  }

  awardFoul(offender, victim, severity = 1) {
    if (this.training) return;
    const st = this.stats[offender.side];
    st.fouls++;
    offender.stats.fouls++;
    offender.state = 'down'; offender.stateTime = 0;
    victim.state = 'down'; victim.stateTime = 0;
    this.cameraShake = Math.max(this.cameraShake, 4);
    if (this.audio) { this.audio.tackle(); this.audio.boo(); }
    this.line('foul', { cooldown: 4500 });
    this.emit('foul', { offender: offender.name, victim: victim.name });
    let card = null;
    if (severity >= 2 || this.rng.chance(.17)) {
      if (this.rng.chance(.08 + (severity >= 2 ? .06 : 0))) card = 'red';
      else card = 'yellow';
    }
    if (card) this.applyCard(offender, card);
    const defGoalX = this.defendX(offender.side);
    const inBoxX = Math.abs(victim.x - defGoalX) < FIELD.boxDepth;
    const inBoxY = Math.abs(victim.y - FIELD.cy) < FIELD.boxHalf;
    if (inBoxX && inBoxY) {
      this.emit('penalty', { side: victim.side });
      this.line('penalty', { force: true });
      this.setupPenalty(victim.side);
    } else {
      this.setPiece('freekick', victim.side, victim.x, victim.y);
    }
  }

  applyCard(p, kind) {
    if (!p.active) return;
    if (kind === 'yellow') {
      if (p.stats.yellow >= 1) { kind = 'red'; }
      else { p.stats.yellow++; this.stats[p.side].yellow++; }
    }
    if (kind === 'red') {
      p.stats.red++; this.stats[p.side].red++;
      p.red = true;
      this.emit('card', { kind: 'red', player: p.name, side: p.side });
      this.line('red', { force: true });
      this.removePlayer(p);
    } else {
      this.emit('card', { kind: 'yellow', player: p.name, side: p.side });
      this.line('yellow', { cooldown: 3000 });
    }
    if (this.audio) this.audio.card(kind);
  }

  removePlayer(p) {
    p.active = false; p.red = true;
    const gk = this.activePlayers(p.side).find(o => o.isGK);
    if (!gk) {
      const alt = this.activePlayers(p.side).sort((a, b) => (b.overall + b.data.attrs.defense * .4) - (a.overall + a.data.attrs.defense * .4))[0];
      if (alt) { alt.isGK = true; alt.pos = 'GOL'; alt.role = 'GOL'; alt.data.pos = 'GOL'; }
    }
    if (this.control[p.side] === p) this.control[p.side] = null;
    this.emit('sentoff', { player: p.name, side: p.side });
  }

  setupPenalty(side) {
    const b = this.ball;
    const dir = this.dir(side);
    const goalX = this.attackX(side);
    const spotX = goalX - dir * FIELD.penSpot;
    const defSide = sideOpp(side);
    const gk = this.activePlayers(defSide).find(p => p.isGK);
    const taker = this.activePlayers(side).filter(p => !p.isGK && p !== this.control[side]).sort((a, c) => c.attr.shoot - a.attr.shoot)[0]
      || this.activePlayers(side).find(p => !p.isGK);
    for (const p of this.players) {
      if (!p.active) continue;
      p.vx = 0; p.vy = 0; p.state = 'idle'; p.z = 0;
      if (p.isGK) {
        p.x = goalX - dir * 8; p.y = FIELD.cy; p.facing = -dir;
      } else if (p === taker) {
        p.x = spotX - dir * 30; p.y = FIELD.cy; p.facing = dir;
      } else {
        const off = 120 + Math.abs(p.y - FIELD.cy) * 2;
        p.x = goalX - dir * (FIELD.boxDepth + off * .4 + 40 + Math.random() * 60);
        p.y = clamp(FIELD.cy + (Math.random() - .5) * 430, 40, FIELD.h - 40);
      }
    }
    b.x = spotX; b.y = FIELD.cy; b.z = BALL_R; b.vx = 0; b.vy = 0; b.vz = 0;
    b.owner = null; b.lastTouchSide = sideOpp(side);
    this.penalty = { side, defSide, taker: taker?.id || null, gk: gk?.id || null, timer: 0, state: 'ready', result: null, aim: 0, power: 0, done: false };
    this.phase = 'penalty';
    this.phaseTimer = 99;
    this.control[side] = taker || null;
    this.controlHint[side] = taker ? { id: taker.id, until: this.elapsed + 8 } : null;
    this.emit('penalty-setup', { side, taker: taker?.name });
    this.setCrowd(.55);
    if (this.audio) this.audio.whistle(false);
  }

  stepPenalty(dt) {
    const pen = this.penalty;
    if (!pen) { this.phase = 'play'; return; }
    pen.timer += dt;
    this.updateControl(dt, true);
    const taker = this.byId.get(pen.taker);
    const gk = this.byId.get(pen.gk);
    const side = pen.side;
    if (pen.state === 'ready') {
      const isUser = side === this.userSide;
      if (isUser && this.input) {
        const mv = this.input.move(1);
        pen.aim = clamp(mv.y, -1, 1);
        if (this.input.isDown(1, 'shoot')) {
          pen.charge = Math.min(1, (pen.charge || 0) + dt / .85);
          this.charge[side] = pen.charge;
        } else if (pen.charge > 0 || this.input.released(1, 'shoot')) {
          this.takePenalty(clamp(pen.charge || .55, .2, 1), pen.aim);
          pen.charge = 0; this.charge[side] = 0;
        }
      } else if (pen.timer > (isUser ? 8 : 1.2)) {
        pen.aim = this.rng.range(-.9, .9);
        this.takePenalty(.65, pen.aim);
      }
    } else if (pen.state === 'shot') {
      this.updateBall(dt);
      if (this.phase !== 'penalty') return;
      const keeper = this.byId.get(pen.gk);
      if (keeper && keeper.state === 'dive' && keeper.diveTargetY != null) {
        keeper.y = damp(keeper.y, keeper.diveTargetY, 9, dt);
      }
      if (pen.result === null) {
        if (this.score.home !== pen.prevHome || this.score.away !== pen.prevAway) pen.result = 'gol';
        else if (pen.timer > 3.6) { pen.result = 'fora'; this.finishPenalty(); }
      }
      if (pen.result !== null) {
        pen.doneTimer = (pen.doneTimer || 0) + dt;
        if (pen.doneTimer > 2.2) this.finishPenaltySequence();
      }
    }
    if (this.phase === 'penalty') this.tickAnimations(dt);
  }

  takePenalty(power, aim) {
    const pen = this.penalty;
    if (!pen || pen.state !== 'ready') return;
    const taker = this.byId.get(pen.taker);
    if (!taker) return;
    pen.state = 'shot'; pen.timer = 0; pen.power = power; pen.aim = aim;
    pen.prevHome = this.score.home; pen.prevAway = this.score.away;
    this.ball.x = FIELD.w / 2 * 0 + (this.attackX(pen.side) - this.dir(pen.side) * FIELD.penSpot);
    this.ball.y = FIELD.cy; this.ball.z = BALL_R;
    this.shoot(taker, power, aim, true);
    // keeper dives toward a guessed side
    const gk = this.byId.get(pen.gk);
    if (gk) {
      const guess = this.rng.chance(.42) ? clamp(aim + this.rng.range(-.35, .35), -1, 1) : this.rng.range(-1, 1);
      gk.diveDir = guess; gk.state = 'dive'; gk.stateTime = 0;
      gk.diveTargetY = FIELD.cy + guess * 95;
    }
    if (this.audio) this.audio.kick(power);
    this.emit('penalty-taken', { side: pen.side, power, aim });
  }

  finishPenalty() {
    const pen = this.penalty;
    if (!pen) return;
    pen.state = 'done';
    this.phase = 'penalty';
    this.emit('penalty-result', { result: pen.result, side: pen.side });
  }

  finishPenaltySequence() {
    const pen = this.penalty;
    if (!pen) return;
    const goal = this.score.home !== pen.prevHome || this.score.away !== pen.prevAway;
    this.penalty = null;
    if (this.drill === 'penalty') {
      this.setupPenalty(this.userSide || 'home');
      return;
    }
    if (goal) {
      this.kickoff(sideOpp(pen.side));
    } else {
      this.phase = 'play';
      this.setPiece('goalkick', pen.defSide, this.defendX(pen.defSide) + this.dir(pen.defSide) * 58, FIELD.cy);
    }
  }

  goal(side) {
    const b = this.ball;
    if (this.phase !== 'play' && this.phase !== 'penalty') return;
    this.scoringSide = side;
    this.score[side]++;
    this.stats[side].onTarget++;
    if (b.shotSide === side) this.stats[side].onTarget = this.stats[side].onTarget;
    let scorer = null;
    if (b.shotBy && b.shotBy.side === side) scorer = b.shotBy;
    else if (b.lastTouch && b.lastTouch.side === side) scorer = b.lastTouch;
    let own = false;
    if (!scorer && b.lastTouch && b.lastTouch.side !== side) { scorer = b.lastTouch; own = true; }
    if (scorer) {
      if (own) { scorer.stats.ownGoals = (scorer.stats.ownGoals || 0) + 1; }
      else {
        scorer.stats.goals++;
        if (b.shotBy === scorer) scorer.stats.shotsOn = (scorer.stats.shotsOn || 0) + 1;
        if (b.assistBy && b.assistBy.side === side) { b.assistBy.stats.assists++; }
      }
    }
    if (this.penalty) { this.penalty.result = 'gol'; this.phase = 'penalty'; this.tickAnimations(.016); }
    this.emit('goal', { side, scorer: scorer?.name || 'Gol', own, assist: b.assistBy?.name || null, score: { ...this.score } });
    this.line('goal', { force: true });
    this.goalFlash = 1;
    this.cameraShake = 8;
    this.setCrowd(1, true);
    if (this.audio) this.audio.goal();
    if (scorer) { scorer.state = 'celebrate'; scorer.stateTime = 0; }
    for (const p of this.activePlayers(side)) {
      if (p !== scorer && this.rng.chance(.55)) { p.state = 'celebrate'; p.stateTime = 0; }
    }
    this.replayFrames = this.buffer.slice(-52);
    if (!this.autoReplay) { this.replayFrames = null; }
    this.control[side] = null; this.control[sideOpp(side)] = null;
    if (this.penalty) { this.phase = 'penalty'; this.penalty.result = 'gol'; }
    else { this.phase = 'goal'; this.phaseTimer = 1.7; }
    if (this.input) this.input.vibrate?.([30, 40, 60]);
  }

  captureBuffer(dt) {
    this.bufferT += dt;
    if (this.bufferT < .085) return;
    this.bufferT = 0;
    const snap = {
      ball: { x: this.ball.x, y: this.ball.y, z: this.ball.z, rot: this.ball.rot, vx: this.ball.vx, vy: this.ball.vy },
      players: this.players.map(p => p.active ? { x: p.x, y: p.y, z: p.z, facing: p.facing, state: p.state, phase: p.animPhase, lean: p.lean, active: true } : { active: false })
    };
    this.buffer.push(snap);
    if (this.buffer.length > 130) this.buffer.shift();
  }

  updateStats(dt) {
    if (this.ball.owner) {
      this.possession[this.ball.owner.side] += dt;
      this.stats[this.ball.owner.side].possession += dt;
    }
    const total = this.possession.home + this.possession.away || 1;
    this.stats.home.possessionPct = Math.round(this.possession.home / total * 100);
    this.stats.away.possessionPct = 100 - this.stats.home.possessionPct;
    for (const p of this.players) if (p.active) p.stats.minutes += dt / 60;
  }

  getStats() {
    const total = this.possession.home + this.possession.away || 1;
    const hp = Math.round(this.possession.home / total * 100);
    return {
      home: { ...this.stats.home, possessionPct: hp, xg: Math.round(this.stats.home.xg * 10) / 10 },
      away: { ...this.stats.away, possessionPct: 100 - hp, xg: Math.round(this.stats.away.xg * 10) / 10 }
    };
  }

  getMVP() {
    const list = this.players.filter(p => p.active);
    if (!list.length) return null;
    const mvp = list.sort((a, b) => ratingOf(b) - ratingOf(a))[0];
    return { id: mvp.id, name: mvp.name, side: mvp.side, rating: ratingOf(mvp), goals: mvp.stats.goals, assists: mvp.stats.assists, pos: mvp.pos };
  }

  getBench(side) {
    return this.players.filter(p => p.side === side && !p.active && !p.red && !p.subbedOut);
  }

  getSquad(side) {
    return this.players.filter(p => p.side === side);
  }

  substitute(side, outId, inId, silent = false, red = false) {
    const out = this.byId.get(outId), inn = this.byId.get(inId);
    if (!out || !inn || !out.active || inn.active) return false;
    if (this.subCount[side] >= 5 && !silent) return false;
    if (inn.isGK && !out.isGK) return false;
    if (out.isGK && !inn.isGK) {
      const alt = this.activePlayers(side).find(p => p.isGK && p !== out);
      if (!alt) return false;
    }
    out.active = false; out.subbedOut = true; out.state = 'idle';
    inn.active = true; inn.subbedIn = true;
    inn.x = out.x; inn.y = out.y; inn.facing = out.facing; inn.dir = out.dir;
    inn.baseX = out.baseX; inn.baseY = out.baseY; inn.slot = out.slot; inn.role = out.role;
    inn.state = 'idle'; inn.stamina = 100;
    this.subCount[side]++;
    if (this.control[side] === out) this.control[side] = inn;
    if (this.ball.owner === out) { this.ball.owner = inn; }
    if (!silent) {
      this.emit('substitution', { side, out: out.name, in: inn.name });
      this.line('sub', { cooldown: 2000 });
    }
    return true;
  }

  setTactics(side, tactics) {
    const team = this.getSide(side);
    team.tactics = { ...team.tactics, ...tactics };
    this.emit('tactics', { side, tactics: team.tactics });
  }

  setFormation(side, formation) {
    const team = this.getSide(side);
    if (!FORMATIONNames().includes(formation)) return;
    team.formation = formation;
    const slots = getFormation(formation).slots;
    const active = this.activePlayers(side).slice().sort((a, b) => a.slot - b.slot);
    active.forEach((p, i) => {
      const s = slots[i] || slots[slots.length - 1];
      p.baseX = s.x; p.baseY = s.y; p.pos = s.pos; p.role = POS_GROUP[s.pos] || 'MEI';
    });
    this.emit('formation', { side, formation });
  }

  setPaused(v) {
    this.paused = !!v;
    if (v && this.audio) this.audio.stopMusic();
    this.emit('paused', { paused: this.paused });
  }

  skipReplay() {
    if (this.phase === 'replay') this.replaySkip = true;
  }

  quit() {
    this.paused = true;
    this.finished = true;
    this.phase = 'fulltime';
  }
}

function FORMATIONNames() { return Object.keys(FORMATIONS); }
