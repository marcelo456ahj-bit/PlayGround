(function () {
  'use strict';

  const { clamp, rnd, hash } = window.PES;
  const AU = window.PESAudio;
  const W = 1080, H = 700;
  const FIELD = { x: 34, y: 44, w: 1012, h: 612 };
  FIELD.r = FIELD.x + FIELD.w; FIELD.b = FIELD.y + FIELD.h;
  FIELD.cx = FIELD.x + FIELD.w / 2; FIELD.cy = FIELD.y + FIELD.h / 2;
  const GOAL = { top: FIELD.cy - 85, bottom: FIELD.cy + 85, depth: 34, height: 74 };
  const PEN = { depth: 158, top: FIELD.cy - 190, bottom: FIELD.cy + 190 };
  const SIX = { depth: 60, top: FIELD.cy - 100, bottom: FIELD.cy + 100 };
  const CENTER = { x: FIELD.cx, y: FIELD.cy };
  const TWO_PI = Math.PI * 2;
  const GRAV = 520;

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const lerp = (a, b, t) => a + (b - a) * t;
  const angDiff = (a, b) => {
    let d = (b - a + Math.PI) % TWO_PI;
    if (d < 0) d += TWO_PI;
    return d - Math.PI;
  };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  function emptyStats() {
    return { possession: 0, shots: 0, onTarget: 0, passes: 0, passCompleted: 0, fouls: 0, corners: 0, saves: 0, tackles: 0, cards: 0, offsides: 0 };
  }
  function emptyInput() {
    return { x: 0, y: 0, sprint: false, passHeld: false, shootHeld: false, tackle: false, skill: false };
  }
  function emptyCharge() { return { pass: 0, shoot: 0 }; }

  function kitColors(entity) {
    const c = entity.team.colors;
    let jersey = c.primary, shorts = c.shorts || c.secondary, socks = c.socks || c.primary;
    if (entity.isGK) { jersey = c.accent; shorts = '#111820'; socks = c.accent; }
    return { jersey, shorts, socks };
  }

  const SKIN = ['#f1c7a5', '#d9a273', '#b97c4f', '#8a5535', '#613a23', '#f4d3b7'];
  const HAIR = ['#161210', '#281a12', '#4b2e1a', '#7a512c', '#c89452', '#d8d2c8', '#101820'];

  class Match {
    constructor(opts) {
      this.opts = opts || {};
      this.config = Object.assign({
        duration: 4, difficulty: 'profissional', weather: 'limpo', timeOfDay: 'noite',
        camera: 'dynamic', replayAuto: true, humans: ['home'], legendPlayerId: null, training: null
      }, this.opts.config || {});
      this.homeTeam = this.opts.homeTeam;
      this.awayTeam = this.opts.awayTeam;
      this.homeSquad = this.opts.homeSquad || window.PES.getSquad(this.homeTeam.id);
      this.awaySquad = this.opts.awaySquad || window.PES.getSquad(this.awayTeam.id);
      this.onHud = this.opts.onHud || (() => {});
      this.onEvent = this.opts.onEvent || (() => {});
      this.onEnd = this.opts.onEnd || (() => {});
      this.onState = this.opts.onState || (() => {});
      this.training = this.config.training;
      this.diff = window.PES.DIFFICULTIES.find(d => d.id === this.config.difficulty) || window.PES.DIFFICULTIES[1];
      this.humans = this.config.humans || ['home'];
      this.inputs = { home: emptyInput(), away: emptyInput() };
      this.prevInputs = { home: emptyInput(), away: emptyInput() };
      this.charges = { home: emptyCharge(), away: emptyCharge() };
      this.control = { home: null, away: null };
      this.state = 'kickoff';
      this.stateT = 0;
      this.clock = 0;
      this.half = 1;
      this.halftimeDone = false;
      this.firstAdded = 30 + Math.random() * 75;
      this.secondAdded = 45 + Math.random() * 130;
      this.ended = false;
      this.paused = false;
      this.cameraMode = this.config.camera;
      this.cam = { x: FIELD.cx, y: FIELD.cy, scale: .7 };
      this.camInit = false;
      this.ball = { x: CENTER.x, y: CENTER.y, z: 0, vx: 0, vy: 0, vz: 0, rot: 0, owner: null, lastTouch: null, shot: false, onTarget: false, saved: false, touchLock: 0, noTouch: null, noTouchT: 0, passSide: null, passTo: null, lastPasser: null };
      this.possession = null;
      this.kickoffTeam = Math.random() < .5 ? 'home' : 'away';
      this.firstKickoff = this.kickoffTeam;
      this.hudTimer = 0;
      this.animTime = 0;
      this.recordTimer = 0;
      this.frames = [];
      this.replay = null;
      this.replayT = 0;
      this.particles = [];
      this.rain = [];
      this.crowdDots = [];
      this.shake = 0;
      this.crowdJump = 0;
      this.events = [];
      this.buildSides();
      this.buildCrowd();
      this.buildWeather();
      this.resetPositions(this.kickoffTeam);
      this.setupTraining();
      this.last = now();
      this._loop = this.loop.bind(this);
    }

    makeSide(side, team, squad) {
      const auto = window.PES.autoLineup(team, squad);
      let lineup = auto.lineup.slice(0, 11);
      if (lineup.length < 11) {
        const fill = squad.filter(p => !lineup.find(l => l.id === p.id)).slice(0, 11 - lineup.length).map((p, i) => ({ ...p, slot: p.pos, x: .25 + i * .05, y: .25 + i * .07 }));
        lineup = lineup.concat(fill);
      }
      const legendId = this.config.legendPlayerId;
      if (legendId && lineup.length) {
        const lp = squad.find(p => p.id === legendId);
        if (lp && !lineup.some(p => p.id === legendId)) {
          let idx = 0;
          if (lp.pos !== 'GK') {
            idx = 1;
            for (let i = 1; i < lineup.length; i++) {
              if (lineup[i].isGK) continue;
              if ((lineup[i].ovr || 0) < (lineup[idx].ovr || 0)) idx = i;
            }
          }
          const base = lineup[idx] || lineup[lineup.length - 1];
          lineup[idx] = { ...lp, slot: base.slot || lp.pos, x: base.x, y: base.y };
        }
      }
      const players = lineup.map((p, i) => this.makeEntity(p, side, team, i === 0, i));
      const benchIds = new Set(players.map(p => p.id));
      const bench = squad.filter(p => !benchIds.has(p.id)).slice(0, 9);
      return { side, team, players, bench, score: 0, stats: emptyStats(), formation: team.formation, human: this.humans.includes(side), direction: side === 'home' ? 1 : -1, substitutions: 0, legendId: lineup.some(p => p.id === this.config.legendPlayerId) ? this.config.legendPlayerId : null };
    }

    makeEntity(p, side, team, isGK, index) {
      const slot = p.slot || (isGK ? 'GK' : ['CB', 'CB', 'LB', 'RB', 'DM', 'CM', 'CM', 'AM', 'LW', 'RW', 'ST'][index] || 'CM');
      const nx = p.x != null ? p.x : (isGK ? .045 : .2 + (index % 5) * .08);
      const ny = p.y != null ? p.y : (isGK ? .5 : .15 + (index % 6) * .13);
      const baseX = side === 'home' ? FIELD.x + nx * FIELD.w : FIELD.x + FIELD.w - nx * FIELD.w;
      const baseY = FIELD.y + ny * FIELD.h;
      const h = hash(p.id);
      return {
        ...p, side, team, teamId: team.id, isGK, slot, baseX, baseY,
        x: baseX, y: baseY, vx: 0, vy: 0, dir: side === 'home' ? 0 : Math.PI,
        state: 'idle', stateT: 0, anim: h % 100 / 16, stamina: p.sta || 80,
        kickCd: 0, tackleCd: 0, think: Math.random() * .3, yellow: 0, red: false, sentOff: false,
        goals: 0, assists: 0, passesOk: 0, tacklesOk: 0, rating: 6.2, distance: 0,
        skin: SKIN[h % SKIN.length], hair: HAIR[(h >> 3) % HAIR.length], number: p.number,
        aiTarget: { x: baseX, y: baseY }, aiSprint: false, moveX: 0, moveY: 0, sprint: false,
        diveDir: 0, diveT: 0, lastPass: null, lastPassT: -99, shotT: 0, isHuman: false
      };
    }

    buildSides() {
      this.home = this.makeSide('home', this.homeTeam, this.homeSquad);
      this.away = this.makeSide('away', this.awayTeam, this.awaySquad);
      if (this.training) {
        const mode = this.training;
        if (mode === 'chute' || mode === 'penalti') {
          const gk = this.away.players.find(p => p.isGK) || this.away.players[0];
          if (gk) { gk.baseX = FIELD.r - 22; gk.x = gk.baseX; gk.y = FIELD.cy; }
          this.away.players = gk ? [gk] : [];
        } else {
          this.away.players = [];
        }
      }
      if (this.config.legendPlayerId) {
        this.home.players.forEach(p => { p.isLegend = p.id === this.config.legendPlayerId; });
      }
    }

    setupTraining() {
      if (!this.training) return;
      this.trainingStats = { goals: 0, shots: 0, passes: 0, saves: 0, distance: 0 };
      this.state = 'live';
      this.trainingReset(true);
    }

    trainingReset(first) {
      if (!this.training) return;
      this.possession = null;
      this.ball.owner = null; this.ball.lastTouch = null;
      this.ball.vx = this.ball.vy = this.ball.vz = 0; this.ball.z = 0;
      const mode = this.training;
      let spot = { x: FIELD.cx, y: FIELD.cy };
      if (mode === 'chute') spot = { x: 840, y: FIELD.cy + 35 };
      if (mode === 'penalti') spot = { x: FIELD.r - 108, y: FIELD.cy };
      this.ball.x = spot.x; this.ball.y = spot.y;
      const shooter = this.home.players.find(p => !p.isGK && !p.sentOff) || this.home.players[0];
      if (shooter) {
        shooter.x = clamp(spot.x - 20, FIELD.x + 20, FIELD.r - 20);
        shooter.y = spot.y; shooter.kickCd = 0;
        this.possession = shooter;
        this.ball.x = shooter.x + 12;
      }
      this.state = 'live';
      if (mode === 'penalti' && first) { this.startPenalty('home'); return; }
      if (!first) this.pushEvent({ type: 'trainingReset', text: 'Bola reposicionada. Vamos de novo!' });
    }

    start(canvas, minimap) {
      this.canvas = canvas;
      this.minimap = minimap;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.resize();
      this._onResize = () => this.resize();
      window.addEventListener('resize', this._onResize);
      this.buildPitchTexture();
      this.last = now();
      if (AU) {
        AU.init(); AU.startMusic('match');
        AU.setCrowdLevel(.45 + Math.min(.4, (this.homeTeam.rating + this.awayTeam.rating) / 400));
      }
      this.emit('kickoff');
      this.raf = requestAnimationFrame(this._loop);
      if (!this.training) this.pushEvent({ type: 'commentary', text: `A bola rola em ${this.config.stadium || this.homeTeam.stadium}! ${this.homeTeam.name} recebe ${this.awayTeam.name}.`, narrate: true });
    }

    stop() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
      if (this._onResize) window.removeEventListener('resize', this._onResize);
      if (AU) { AU.setCrowdLevel(0); AU.stopMusic(); }
    }

    resize() {
      if (!this.canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = this.canvas.clientWidth || window.innerWidth;
      const h = this.canvas.clientHeight || window.innerHeight;
      this.cw = w; this.ch = h; this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }

    loop() {
      const t = now();
      let dt = (t - this.last) / 1000;
      this.last = t;
      dt = clamp(dt, 0, .05);
      if (!this.paused && !this.ended) {
        try { this.update(dt); } catch (e) { console.error(e); }
      }
      try { this.render(dt); } catch (e) { console.error(e); }
      this.raf = requestAnimationFrame(this._loop);
    }

    update(dt) {
      this.animTime += dt;
      if (this.state === 'replay') {
        this.replayT += dt;
        if (this.replayT > 3.1) this.finishReplay();
        this.updateParticles(dt);
        return;
      }
      this.stateT += dt;
      if (this.state === 'goal') {
        if (this.stateT > 2.2 && !this.replayStarted) {
          this.replayStarted = true;
          if (this.config.replayAuto && this.frames.length > 12) this.startReplay();
          else this.beginKickoff();
        }
        if (this.stateT > 9) this.beginKickoff();
        this.updateParticles(dt);
        return;
      }
      if (this.state === 'halftime' || this.state === 'fulltime') { this.updateParticles(dt); return; }
      if (this.state === 'kickoff') {
        if (this.stateT > 1.15) {
          this.state = 'live'; this.stateT = 0;
          const taker = this.kickoffTaker && !this.kickoffTaker.sentOff ? this.kickoffTaker : this.findPlayer(this.kickoffTeam, p => !p.isGK);
          if (taker) {
            this.possession = taker;
            this.ball.x = taker.x + (taker.side === 'home' ? 12 : -12); this.ball.y = taker.y;
          }
          this.pushEvent({ type: 'commentary', text: this.half === 2 && Math.abs(this.clock - 2700) < 3 ? 'Começa o segundo tempo!' : 'Recomeça a partida!', narrate: false });
        }
        this.updateMovement(dt, true);
        this.updateParticles(dt);
        this.emitHud();
        return;
      }
      if (this.state === 'restart') {
        this.restartT = (this.restartT || 0) + dt;
        this.updateMovement(dt, true);
        if (this.restartT >= 1.05) this.completeRestart();
        this.updateParticles(dt);
        this.emitHud();
        return;
      }
      if (this.state !== 'live' && this.state !== 'penalty') { this.updateParticles(dt); return; }

      if (!this.training && this.state === 'live') {
        const factor = 5400 / (this.config.duration * 60);
        this.clock += dt * factor;
        this.checkHalf();
      }
      if (this.state === 'penalty') {
        this.updatePenalty(dt);
        this.updateMovement(dt, false);
        this.updateBall(dt, dt);
        this.updateParticles(dt);
        this.updateCamera(dt);
        this.record(dt);
        this.emitHud();
        return;
      }

      this.updateControl(dt);
      this.updateAI(dt);
      this.updateMovement(dt, false);
      this.updateBall(dt);
      this.updateCollisions(dt);
      this.checkBoundaries();
      this.updateParticles(dt);
      this.updateCamera(dt);
      this.record(dt);
      this.updateStamina(dt);
      this.hudTimer += dt;
      if (this.hudTimer > .14) { this.hudTimer = 0; this.emitHud(); }
      if (this.state === 'live') {
        const possSide = this.possession ? this.possession.side : null;
        if (possSide === 'home') this.home.stats.possession += dt;
        else if (possSide === 'away') this.away.stats.possession += dt;
      }
    }

    updateStamina(dt) {
      this.allPlayers().forEach(p => {
        if (p.sentOff) return;
        if (p.sprint && (Math.abs(p.vx) + Math.abs(p.vy)) > 30) p.stamina = clamp(p.stamina - dt * 4.2, 0, 100);
        else p.stamina = clamp(p.stamina + dt * 1.35, 0, 100);
        if (p.kickCd > 0) p.kickCd -= dt;
        if (p.tackleCd > 0) p.tackleCd -= dt;
      });
      this.ball.touchLock = Math.max(0, this.ball.touchLock - dt);
      this.ball.noTouchT = Math.max(0, this.ball.noTouchT - dt);
    }

    allPlayers() {
      return this.home.players.concat(this.away.players).filter(p => p && !p.sentOff);
    }

    findPlayer(side, fn) {
      return this[side].players.find(p => !p.sentOff && fn(p));
    }

    checkHalf() {
      if (!this.halftimeDone && this.clock >= 2700 + this.firstAdded) {
        this.halftimeDone = true;
        this.state = 'halftime';
        this.stateT = 0;
        this.possession = null;
        this.ball.vx = this.ball.vy = this.ball.vz = 0;
        this.emit('halftime');
        this.pushEvent({ type: 'halftime', text: `Fim do primeiro tempo: ${this.home.score} a ${this.away.score}.` });
        if (AU) AU.whistle(true);
      } else if (this.halftimeDone && this.clock >= 5400 + this.secondAdded) {
        this.finishMatch();
      }
    }

    resumeSecondHalf() {
      if (this.state !== 'halftime') return;
      this.half = 2;
      this.kickoffTeam = this.firstKickoff === 'home' ? 'away' : 'home';
      this.beginKickoff();
      if (AU) AU.whistle();
    }

    finishMatch() {
      if (this.ended) return;
      this.ended = true;
      this.state = 'fulltime';
      this.clock = 5400;
      this.possession = null;
      this.emit('fulltime');
      if (AU) { AU.whistle(true); AU.stopMusic(); AU.setCrowdLevel(.15); }
      this.pushEvent({ type: 'fulltime', text: `Fim de jogo! ${this.homeTeam.name} ${this.home.score} x ${this.away.score} ${this.awayTeam.name}.` });
      this.onEnd(this.buildResult());
    }

    endTraining() {
      if (this.ended) return;
      this.ended = true;
      this.state = 'fulltime';
      this.onEnd({
        training: true, homeTeam: this.homeTeam, awayTeam: this.awayTeam,
        homeScore: 0, awayScore: 0, stats: { home: this.home.stats, away: this.away.stats },
        trainingStats: this.trainingStats, clock: 0, mvp: null
      });
    }

    buildResult() {
      const all = this.allPlayers().slice().sort((a, b) => (b.rating + b.goals * .8 + b.assists * .5) - (a.rating + a.goals * .8 + a.assists * .5));
      const hPoss = this.home.stats.possession + this.away.stats.possession;
      const stats = {
        home: { ...this.home.stats, possession: hPoss ? Math.round(this.home.stats.possession / hPoss * 100) : 50 },
        away: { ...this.away.stats, possession: hPoss ? Math.round(this.away.stats.possession / hPoss * 100) : 50 }
      };
      return {
        homeTeam: this.homeTeam, awayTeam: this.awayTeam,
        homeScore: this.home.score, awayScore: this.away.score,
        stats, mvp: all[0] || null, clock: Math.floor(this.clock / 60),
        scorers: all.filter(p => p.goals > 0).map(p => ({ name: p.name, team: p.side, goals: p.goals })),
        players: all
      };
    }

    getControlled(side) {
      const team = this[side];
      if (!team.human) return null;
      if (team.legendId) {
        const lp = team.players.find(p => p.id === team.legendId && !p.sentOff);
        if (lp) return lp;
      }
      if (this.possession && this.possession.side === side && !this.possession.sentOff) return this.possession;
      let best = null, bd = 1e9;
      team.players.forEach(p => {
        if (p.sentOff) return;
        const d = dist(p, this.ball) + (p.isGK ? 55 : 0);
        if (d < bd) { bd = d; best = p; }
      });
      return best;
    }

    updateControl(dt) {
      ['home', 'away'].forEach(side => {
        const team = this[side];
        if (!team.human) { this.control[side] = null; return; }
        const ctrl = this.getControlled(side);
        this.control[side] = ctrl;
        const inp = this.inputs[side], prev = this.prevInputs[side];
        const charge = this.charges[side];
        if (!ctrl) return;
        if (inp.passHeld) charge.pass = Math.min(1, charge.pass + dt * 1.9);
        if (inp.shootHeld) charge.shoot = Math.min(1, charge.shoot + dt * 1.65);
        if (!inp.passHeld && prev.passHeld) {
          if (this.possession === ctrl) this.doPass(ctrl, charge.pass, charge.pass > .62, inp);
          charge.pass = 0;
        }
        if (!inp.shootHeld && prev.shootHeld) {
          if (this.possession === ctrl) this.doShot(ctrl, charge.shoot, inp, false);
          charge.shoot = 0;
        }
        if (inp.tackle && !prev.tackle) this.startSlide(ctrl);
        if (inp.skill && !prev.skill) this.doSkill(ctrl);
      });
      this.prevInputs.home = { ...this.inputs.home };
      this.prevInputs.away = { ...this.inputs.away };
    }

    /* ---- AI ---- */
    updateAI(dt) {
      ['home', 'away'].forEach(side => {
        const team = this[side];
        team.players.forEach(p => {
          if (p.sentOff) return;
          if (p === this.control[side] && team.human) return;
          p.think -= dt;
          if (p.isGK) { this.aiGK(p, dt); return; }
          if (p.state === 'slide' || p.state === 'down') return;
          if (this.possession === p) this.aiCarrier(p, dt);
          else this.aiOffBall(p, dt);
        });
      });
    }

    aiGK(p, dt) {
      const ownGoalX = p.side === 'home' ? FIELD.x : FIELD.r;
      const ball = this.ball;
      const defending = !this.possession || this.possession.side !== p.side;
      let targetX = ownGoalX + (p.side === 'home' ? 25 : -25);
      let targetY = clamp(ball.y, GOAL.top + 14, GOAL.bottom - 14);
      const ballInBox = (p.side === 'home' ? ball.x < FIELD.x + PEN.depth : ball.x > FIELD.r - PEN.depth);
      if (defending && ballInBox && ball.z < 30 && (!this.possession || this.possession.side !== p.side)) {
        targetX = p.side === 'home' ? Math.min(ball.x + 10, FIELD.x + PEN.depth - 8) : Math.max(ball.x - 10, FIELD.r - PEN.depth + 8);
        targetY = ball.y;
      } else if (ball.x < FIELD.cx - 100 || ball.x > FIELD.cx + 100) {
        targetY = clamp(FIELD.cy + (ball.y - FIELD.cy) * .55, GOAL.top + 12, GOAL.bottom - 12);
      } else {
        targetY = clamp(ball.y * .35 + FIELD.cy * .65, GOAL.top + 14, GOAL.bottom - 14);
      }
      p.aiTarget = { x: targetX, y: targetY };
      p.aiSprint = defending && ballInBox && dist(p, ball) < 160;
      if (p.diveT > 0) {
        p.diveT -= dt;
        p.x += p.diveDir * 620 * dt;
        p.y = clamp(p.y + (p.diveDirY || 0) * 420 * dt, GOAL.top - 4, GOAL.bottom + 4);
        p.x = clamp(p.x, p.side === 'home' ? FIELD.x - 6 : FIELD.r - 60, p.side === 'home' ? FIELD.x + 70 : FIELD.r + 6);
      }
    }

    aiCarrier(p, dt) {
      const goalX = p.side === 'home' ? FIELD.r : FIELD.x;
      const goalY = FIELD.cy;
      const dGoal = dist2(p.x, p.y, goalX, goalY);
      const nearest = this.nearestOpponent(p, 300);
      const pressure = nearest ? dist(p, nearest) : 999;
      const shootRange = 210 + p.sho * 1.55;
      if (p.think <= 0) {
        p.think = this.diff.react * (.7 + Math.random() * .5);
        if (p.isGK) { this.gkDistribute(p); return; }
        if (dGoal < shootRange && Math.abs(p.y - goalY) < 260 && Math.random() < .55 + p.sho / 280) {
          this.doShot(p, .55 + Math.random() * .4, null, true);
          return;
        }
        if (pressure < 58 || Math.random() < .16) {
          const mate = this.findPassOption(p, pressure < 34 ? 1 : 0);
          if (mate) { this.doPass(p, .35 + Math.random() * .4, Math.random() < .16, null, mate); return; }
        }
        if (pressure < 30 && dGoal > 300 && Math.random() < .3) { this.doClear(p); return; }
      }
      let tx = goalX, ty = goalY;
      if (nearest) {
        const d = dist(p, nearest);
        if (d < 150) {
          const perp = { x: -(nearest.y - p.y), y: nearest.x - p.x };
          const len = Math.hypot(perp.x, perp.y) || 1;
          const sideSign = ((p.id.charCodeAt(p.id.length - 1) % 2) ? 1 : -1);
          tx += perp.x / len * 90 * sideSign;
          ty += perp.y / len * 90 * sideSign;
        }
      }
      tx = clamp(tx, p.side === 'home' ? FIELD.cx - 150 : FIELD.x + 40, p.side === 'home' ? FIELD.r - 30 : FIELD.cx + 150);
      ty = clamp(ty, FIELD.y + 35, FIELD.b - 35);
      p.aiTarget = { x: tx, y: ty };
      p.aiSprint = p.stamina > 35 && (pressure < 70 || dGoal < 420);
    }

    gkDistribute(p) {
      if (Math.random() < .45) {
        const mate = this.findPassOption(p, 0);
        if (mate) { this.doPass(p, .65, true, null, mate); return; }
      }
      this.doClear(p);
    }

    aiOffBall(p, dt) {
      const hasBall = this.possession && this.possession.side === p.side;
      const ball = this.ball;
      const nearest = this.nearestOpponent(p, 230);
      let tx = p.baseX, ty = p.baseY;
      const ballShift = (ball.x - FIELD.cx) * .36;
      const yShift = (ball.y - FIELD.cy) * .18;
      if (hasBall) {
        const attackDir = p.side === 'home' ? 1 : -1;
        const advance = ['ST', 'LW', 'RW', 'AM'].includes(p.slot) ? 120 : ['CM', 'LM', 'RM', 'DM'].includes(p.slot) ? 48 : -12;
        tx = p.baseX + ballShift + attackDir * advance;
        ty = p.baseY + yShift;
        if (['ST', 'LW', 'RW', 'AM'].includes(p.slot)) {
          tx += attackDir * 45;
          ty += Math.sin(this.animTime * 1.3 + p.baseY) * 22;
        }
        if (p.think <= 0) p.think = .5 + Math.random() * .4;
      } else {
        const closestTwo = this.closestToBall(p.side, 2);
        if (closestTwo.includes(p) && this.state === 'live') {
          const intercept = this.predictBall(p, .28);
          tx = intercept.x; ty = intercept.y;
          p.aiSprint = p.stamina > 20;
        } else {
          tx = p.baseX + ballShift * .62;
          ty = p.baseY + yShift * .62;
        }
        if (nearest && ['CB', 'LB', 'RB', 'DM', 'CM'].includes(p.slot)) {
          const d = dist(p, nearest);
          if (d < 190 && !closestTwo.includes(p)) {
            const ownGoalX = p.side === 'home' ? FIELD.x : FIELD.r;
            tx = lerp(nearest.x, ownGoalX, .12);
            ty = lerp(nearest.y, FIELD.cy, .12);
          }
        }
      }
      if (!this.possession) {
        const closestTwo = this.closestToBall(p.side, 2);
        if (closestTwo.includes(p)) {
          const intercept = this.predictBall(p, .25);
          tx = intercept.x; ty = intercept.y;
          p.aiSprint = p.stamina > 15;
        }
      }
      p.aiTarget = {
        x: clamp(tx, FIELD.x + 14, FIELD.r - 14),
        y: clamp(ty, FIELD.y + 14, FIELD.b - 14)
      };
    }

    predictBall(p, t) {
      return { x: clamp(this.ball.x + this.ball.vx * t, FIELD.x - 20, FIELD.r + 20), y: clamp(this.ball.y + this.ball.vy * t, FIELD.y - 20, FIELD.b + 20) };
    }

    closestToBall(side, n) {
      return this[side].players.filter(p => !p.sentOff && !(p.isGK && Math.abs(this.ball.x - (side === 'home' ? FIELD.x : FIELD.r)) < 80))
        .slice().sort((a, b) => dist(a, this.ball) - dist(b, this.ball)).slice(0, n);
    }

    nearestOpponent(p, maxD) {
      const opp = this[p.side === 'home' ? 'away' : 'home'].players;
      let best = null, bd = maxD || 1e9;
      opp.forEach(o => {
        if (o.sentOff) return;
        const d = dist(p, o);
        if (d < bd) { bd = d; best = o; }
      });
      return best;
    }

    findPassOption(p, urgency) {
      const mates = this[p.side].players.filter(m => m !== p && !m.sentOff);
      if (!mates.length) return null;
      const attackDir = p.side === 'home' ? 1 : -1;
      let best = null, bestScore = -1e9;
      mates.forEach(m => {
        const d = dist(p, m);
        if (d < 32 || d > 520) return;
        const opp = this.nearestOpponent(m, 190);
        const open = opp ? Math.min(1, dist(m, opp) / 140) : 1;
        const forward = (m.x - p.x) * attackDir;
        let score = forward * .9 + open * 130 - d * .32;
        if (m.isGK) score -= 90;
        if (opp && dist(m, opp) < 26) score -= 100;
        if (m.isLegend) score += 25;
        if (this.passLaneBlocked(p, m)) score -= 110;
        if (score > bestScore) { bestScore = score; best = m; }
      });
      if (bestScore < -300) return null;
      return best;
    }

    passLaneBlocked(a, b) {
      const opp = this[a.side === 'home' ? 'away' : 'home'].players;
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const nx = dx / len, ny = dy / len;
      for (const o of opp) {
        if (o.sentOff || o.isGK) continue;
        const px = o.x - a.x, py = o.y - a.y;
        const along = px * nx + py * ny;
        if (along < 18 || along > len - 18) continue;
        const perp = Math.abs(px * ny - py * nx);
        if (perp < 20) return true;
      }
      return false;
    }

    /* ---- Actions ---- */
    doPass(p, power, lob, inp, explicitMate) {
      if (!p || p.sentOff || p.kickCd > 0) return;
      let mate = explicitMate;
      if (!mate) {
        if (inp && (Math.abs(inp.x) + Math.abs(inp.y)) > .2) {
          const aim = Math.atan2(inp.y, inp.x);
          const mates = this[p.side].players.filter(m => m !== p && !m.sentOff);
          let best = null, bestScore = -1e9;
          mates.forEach(m => {
            const a = Math.atan2(m.y - p.y, m.x - p.x);
            const diff = Math.abs(angDiff(aim, a));
            const d = dist(p, m);
            let score = (1 - diff / Math.PI) * 180 - d * .18 + (m.isGK ? -80 : 0);
            if (diff > 1.15) score -= 260;
            if (score > bestScore) { bestScore = score; best = m; }
          });
          if (bestScore > -40) mate = best;
        } else {
          mate = this.findPassOption(p, .4);
        }
        if (!mate) {
          const aim = inp && (Math.abs(inp.x) + Math.abs(inp.y)) > .2 ? Math.atan2(inp.y, inp.x) : p.dir;
          this.kickBall(p, aim, 440 + power * 220, lob ? 34 : 0, lob ? 90 + power * 70 : 0, .2);
          this.pushEvent({ type: 'commentary', text: `${p.name} afasta o perigo.` });
          return;
        }
      }
      const d = dist(p, mate);
      const aim = Math.atan2(mate.y + mate.vy * .18 - p.y, mate.x + mate.vx * .18 - p.x);
      const speed = clamp(240 + d * 1.15 + power * 150, 260, 860);
      const zz = lob ? 24 + power * 32 : 0;
      const vz = lob ? 100 + power * 90 : 0;
      this.kickBall(p, aim, speed, zz, vz, .22);
      this.ball.passSide = p.side;
      this.ball.passTo = mate.id;
      this.ball.noTouch = p.id;
      this.ball.noTouchT = .3;
      p.lastPass = mate.id;
      p.lastPassT = this.animTime;
      this[p.side].stats.passes++;
      this.ball.lastPasser = p;
      this.pushEvent({ type: 'pass', player: p, mate });
      if (AU) AU.pass();
    }

    doShot(p, power, inp, ai) {
      if (!p || p.sentOff || p.kickCd > 0) return;
      const goalX = p.side === 'home' ? FIELD.r : FIELD.x;
      const goalY = FIELD.cy;
      const d = dist2(p.x, p.y, goalX, goalY);
      const aimJitter = (100 - p.sho) / 100 * (ai ? 70 : 46);
      let aimY = goalY + (Math.random() - .5) * aimJitter;
      if (!ai && inp && Math.abs(inp.y) > .2) aimY = clamp(goalY + inp.y * 105, GOAL.top + 12, GOAL.bottom - 12);
      if (d > 360) aimY = goalY + (Math.random() - .5) * 120;
      const stats = this[p.side].stats;
      stats.shots++;
      if (this.training) this.trainingStats.shots++;
      const inRange = Math.abs(aimY - goalY) < 100;
      if (inRange) stats.onTarget++;
      const flight = Math.max(.35, d / (540 + p.sho * 2.2 + power * 260));
      const vx = (goalX - this.ball.x) / flight;
      const vy = (aimY - this.ball.y) / flight;
      const z = 8 + power * 18 + (d > 280 ? 18 : 0);
      const vz = 34 + power * 46 + (d > 280 ? 32 : 0);
      this.kickBall(p, Math.atan2(vy, vx), Math.hypot(vx, vy), z, vz, .28);
      this.ball.shot = true; this.ball.saved = false;
      this.ball.onTarget = inRange;
      this.ball.shotSide = p.side;
      this.ball.noTouch = p.id; this.ball.noTouchT = .32;
      this.ball.lastTouch = p;
      this.ball.lastShot = { player: p, power, aimY, time: this.animTime };
      p.shotT = .4;
      this.pushEvent({ type: 'shot', player: p, onTarget: inRange, text: this.shotLine(p, inRange) });
      if (AU) AU.kick(clamp(power + .35, .4, 1));
    }

    shotLine(p) {
      const lines = [
        `${p.name} arrisca de longe!`,
        `${p.name} finaliza com força!`,
        `Chutou! A bola sai dos pés de ${p.name}!`,
        `${p.name} pega de primeira e chuta!`
      ];
      return lines[Math.floor(Math.random() * lines.length)];
    }

    doClear(p) {
      if (!p || p.kickCd > 0) return;
      const dir = p.side === 'home' ? 0 : Math.PI;
      const aim = dir + (Math.random() - .5) * .9;
      this.kickBall(p, aim, 760, 30, 120, .28);
      this.ball.noTouch = p.id; this.ball.noTouchT = .35;
      p.kickCd = .5;
      if (AU) AU.kick(.65);
    }

    kickBall(p, angle, speed, z, vz, lock) {
      const ball = this.ball;
      ball.x = p.x + Math.cos(angle) * 12;
      ball.y = p.y + Math.sin(angle) * 12;
      ball.z = z || 0;
      ball.vx = Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
      ball.vz = vz || 0;
      ball.owner = null;
      ball.touchLock = lock || .16;
      ball.lastTouch = p;
      ball.passSide = null; ball.passTo = null;
      ball.shot = false; ball.saved = false;
      this.possession = null;
      p.kickCd = .38;
    }

    startSlide(p) {
      if (!p || p.sentOff || p.tackleCd > 0 || p.state === 'slide' || this.possession === p) return;
      if (p.isGK) return;
      p.state = 'slide'; p.stateT = .44; p.tackleCd = 1.0;
      p.vx = Math.cos(p.dir) * 420; p.vy = Math.sin(p.dir) * 420;
      p.slideHit = false;
      if (AU) AU.tackle();
      const carrier = this.possession;
      if (carrier && carrier.side !== p.side && dist(p, carrier) < 38) this.resolveTackle(p, carrier);
    }

    resolveTackle(defender, carrier) {
      if (defender.slideHit) return;
      defender.slideHit = true;
      if (dist(defender, carrier) > 44) return;
      const behind = Math.abs(angDiff(defender.dir, Math.atan2(carrier.y - defender.y, carrier.x - defender.x))) > 1.9;
      const chance = clamp(.38 + (defender.def - carrier.dri) / 190 + (behind ? .1 : -.05), .12, .86);
      if (Math.random() < chance) {
        defender.tacklesOk++; this[defender.side].stats.tackles++;
        defender.rating += .12;
        const angle = Math.atan2(carrier.y - defender.y, carrier.x - defender.x) + (Math.random() - .5);
        this.possession = null;
        carrier.stamina = clamp(carrier.stamina - 4, 0, 100);
        this.ball.x = carrier.x; this.ball.y = carrier.y; this.ball.z = 0;
        this.ball.vx = Math.cos(angle) * 260; this.ball.vy = Math.sin(angle) * 260;
        this.ball.lastTouch = defender;
        this.ball.touchLock = .14;
        this.ball.noTouch = carrier.id; this.ball.noTouchT = .3;
        carrier.state = 'down'; carrier.stateT = .55;
        this.pushEvent({ type: 'commentary', text: `Que desarme de ${defender.name}!` });
      } else {
        const foulChance = behind ? .72 : .34;
        if (Math.random() < foulChance) this.commitFoul(defender, carrier);
        else {
          carrier.state = 'down'; carrier.stateT = .3;
          defender.state = 'down'; defender.stateT = .35;
          this.pushEvent({ type: 'commentary', text: `${defender.name} chega forte, mas a bola fica com ${carrier.name}.` });
        }
      }
    }

    commitFoul(defender, victim) {
      this[defender.side].stats.fouls++;
      const inBox = (defender.side === 'home' && this.ball.x < FIELD.x + PEN.depth && this.ball.y > PEN.top && this.ball.y < PEN.bottom) ||
        (defender.side === 'away' && this.ball.x > FIELD.r - PEN.depth && this.ball.y > PEN.top && this.ball.y < PEN.bottom);
      const cardRoll = Math.random();
      let card = null;
      if (cardRoll < .17) card = 'red';
      else if (cardRoll < .52) card = 'yellow';
      if (card) this.bookPlayer(defender, card);
      defender.state = 'down'; defender.stateT = .55;
      victim.state = 'down'; victim.stateT = .5;
      this.possession = null;
      this.ball.vx = this.ball.vy = this.ball.vz = 0; this.ball.z = 0;
      const attacking = defender.side === 'home' ? 'away' : 'home';
      if (AU) AU.whistle();
      this.pushEvent({
        type: 'foul', player: defender, victim, card, text:
          card ? `Falta de ${defender.name}. Cartão ${card === 'red' ? 'vermelho' : 'amarelo'}!` : `Falta de ${defender.name} em ${victim.name}.`
      });
      if (inBox) {
        this.pushEvent({ type: 'commentary', text: 'Pênalti! A torcida prende a respiração.', narrate: true });
        setTimeout(() => { if (!this.ended && this.state === 'live') this.startPenalty(attacking); }, 380);
        return;
      }
      this.restart('foul', attacking, clamp(victim.x, FIELD.x + 30, FIELD.r - 30), clamp(victim.y, FIELD.y + 30, FIELD.b - 30));
    }

    bookPlayer(p, card) {
      if (card === 'yellow') {
        p.yellow++;
        p.rating -= .3;
        this[p.side].stats.cards++;
        if (p.yellow >= 2) { this.sendOff(p); this.pushEvent({ type: 'card', player: p, card: 'yellow', second: true, text: `${p.name} recebe o segundo amarelo e está expulso!` }); }
        else this.pushEvent({ type: 'card', player: p, card: 'yellow', text: `Cartão amarelo para ${p.name}.` });
      } else {
        p.rating -= .8;
        this[p.side].stats.cards++;
        this.sendOff(p);
        this.pushEvent({ type: 'card', player: p, card: 'red', text: `Cartão vermelho! ${p.name} está fora da partida.` });
      }
      if (AU) AU.card();
    }

    sendOff(p) {
      p.sentOff = true; p.red = true;
      if (this.possession === p) this.possession = null;
      if (this.control.home === p) this.control.home = null;
      if (this.control.away === p) this.control.away = null;
    }

    doSkill(p) {
      if (!p || p.kickCd > 0 || p.state === 'slide' || this.possession !== p) return;
      p.skillT = .5; p.skillCd = 1.1;
      const dir = p.dir + (Math.random() < .5 ? 1 : -1) * 1.1;
      p.vx = Math.cos(dir) * 380; p.vy = Math.sin(dir) * 380;
      this.ball.x = p.x + Math.cos(p.dir) * 14; this.ball.y = p.y + Math.sin(p.dir) * 14;
      this.pushEvent({ type: 'commentary', text: `${p.name} deixa o marcador para trás com um drible!` });
    }

    /* ---- Movement ---- */
    updateMovement(dt, frozen) {
      const all = this.allPlayers();
      all.forEach(p => {
        if (p.sentOff) return;
        if (p.stateT > 0) p.stateT = Math.max(0, p.stateT - dt);
        if (p.state === 'slide') {
          if (p.stateT <= 0) { p.state = 'down'; p.stateT = .32; p.vx *= .35; p.vy *= .35; }
          else {
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.vx *= Math.pow(.12, dt); p.vy *= Math.pow(.12, dt);
            const carrier = this.possession;
            if (carrier && carrier.side !== p.side && !p.slideHit && dist(p, carrier) < 36) this.resolveTackle(p, carrier);
            if (Math.random() < .25) this.addGrass(p.x, p.y);
            this.clampPlayer(p);
            return;
          }
        }
        if (p.state === 'down') {
          if (p.stateT <= 0) p.state = 'idle';
          p.vx *= Math.pow(.02, dt); p.vy *= Math.pow(.02, dt);
          p.x += p.vx * dt; p.y += p.vy * dt; this.clampPlayer(p);
          if (Math.random() < .18) this.addGrass(p.x, p.y);
          return;
        }
        let dx = 0, dy = 0, sprint = false;
        const humanSide = this[p.side].human;
        const isCtl = this.control[p.side] === p && humanSide;
        if (!frozen) {
          if (isCtl) {
            const inp = this.inputs[p.side];
            dx = inp.x; dy = inp.y; sprint = inp.sprint;
          } else {
            dx = p.aiTarget.x - p.x; dy = p.aiTarget.y - p.y;
            const d = Math.hypot(dx, dy);
            if (d < 8) { dx = 0; dy = 0; } else { dx /= d; dy /= d; }
            sprint = p.aiSprint;
          }
        }
        p.moveX = dx; p.moveY = dy; p.sprint = sprint;
        const base = (74 + p.pac * .56 + p.ovr * .14) * (p.isGK ? .88 : 1);
        const staminaF = p.stamina > 15 ? 1 : .82;
        const speed = base * (sprint ? 1.3 : 1) * staminaF * (this.possession === p ? .95 : 1) * (p.side !== 'home' && !humanSide ? this.diff.aiSpeed : 1);
        const accel = p.isGK ? 620 : 760;
        const k = 1 - Math.exp(-accel / 100 * dt);
        p.vx += (dx * speed - p.vx) * k;
        p.vy += (dy * speed - p.vy) * k;
        if (!dx && !dy) { p.vx *= Math.pow(.0009, dt); p.vy *= Math.pow(.0009, dt); }
        p.x += p.vx * dt; p.y += p.vy * dt;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 9) p.dir = Math.atan2(p.vy, p.vx);
        p.anim += dt * (2.5 + sp * .07);
        p.distance += sp * dt;
        this.clampPlayer(p);
      });
      all.forEach(p => {
        if (!p.isGK || p.sentOff) return;
        if (!this.possession || this.possession.side !== p.side) {
          p.x = p.side === 'home' ? clamp(p.x, FIELD.x - 8, FIELD.x + 95) : clamp(p.x, FIELD.r - 95, FIELD.r + 8);
          p.y = clamp(p.y, GOAL.top - 12, GOAL.bottom + 12);
        }
      });
    }

    clampPlayer(p) {
      p.x = clamp(p.x, FIELD.x - 26, FIELD.r + 26);
      p.y = clamp(p.y, FIELD.y - 20, FIELD.b + 20);
    }

    updateCollisions(dt) {
      const all = this.allPlayers();
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i], b = all[j];
          if (a.sentOff || b.sentOff) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          const min = (a.isGK || b.isGK ? 16 : 15);
          if (d > 0 && d < min) {
            const push = (min - d) * .5;
            a.x -= dx / d * push; a.y -= dy / d * push;
            b.x += dx / d * push; b.y += dy / d * push;
            this.clampPlayer(a); this.clampPlayer(b);
          }
        }
      }
    }

    /* ---- Ball ---- */
    updateBall(dt) {
      const ball = this.ball;
      if (this.possession && !this.possession.sentOff) {
        const p = this.possession;
        const ahead = 13;
        ball.x = p.x + Math.cos(p.dir) * ahead;
        ball.y = p.y + Math.sin(p.dir) * ahead;
        ball.z = 0; ball.vx = 0; ball.vy = 0; ball.vz = 0;
        ball.owner = p;
        ball.lastTouch = p;
        return;
      }
      ball.owner = null;
      if (this.state === 'restart') { ball.vx = ball.vy = ball.vz = 0; ball.z = 0; return; }
      if (Math.abs(ball.vx) < .5) ball.vx = 0;
      if (Math.abs(ball.vy) < .5) ball.vy = 0;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.rot += Math.hypot(ball.vx, ball.vy) * dt * .035;
      if (ball.z > 0 || ball.vz > 0) {
        ball.z += ball.vz * dt;
        ball.vz -= GRAV * dt;
        if (ball.z <= 0) {
          ball.z = 0;
          if (Math.abs(ball.vz) > 40) { ball.vz = -ball.vz * .42; if (AU) AU.tone(160, .06, 'sine', .03, 100); }
          else ball.vz = 0;
        }
      }
      const friction = this.config.weather === 'chuva' ? .74 : this.config.weather === 'neve' ? .68 : .84;
      ball.vx *= Math.pow(friction, dt);
      ball.vy *= Math.pow(friction, dt);
      if (ball.z === 0 && Math.hypot(ball.vx, ball.vy) < 4) { ball.vx = 0; ball.vy = 0; }

      if (this.checkGoal()) return;

      if (ball.shot && !ball.saved && ball.z < 78) {
        const gk = this[ball.shotSide === 'home' ? 'away' : 'home'].players.find(p => p.isGK && !p.sentOff);
        if (gk && dist(gk, ball) < (gk.diveT > 0 ? 58 : 42)) {
          const d = dist(gk, ball);
          const saveChance = clamp(.32 + gk.def / 230 + (1 - Math.min(1, Math.hypot(ball.vx, ball.vy) / 1100)) * .3 - (d < 26 ? 0 : .18), .18, .9);
          ball.saved = true;
          if (Math.random() < saveChance) {
            this[gk.side].stats.saves++;
            if (this.training) this.trainingStats.saves++;
            gk.rating += .25;
            this.possession = gk;
            ball.vx = ball.vy = ball.vz = 0; ball.z = 0;
            ball.shot = false;
            this.pushEvent({ type: 'save', player: gk, text: `Defesaça de ${gk.name}!` });
            if (AU) { AU.save(); AU.crowdOoh(); }
            return;
          } else {
            const ang = Math.atan2(ball.y - gk.y, ball.x - gk.x) + (Math.random() - .5) * .8;
            ball.vx = Math.cos(ang) * 250; ball.vy = Math.sin(ang) * 250; ball.vz = 70;
            ball.shot = false;
            gk.diveT = .4; gk.diveDir = Math.sign(ball.y - gk.y) || 1; gk.diveDirY = Math.sign(ball.y - gk.y) || 1;
            this.pushEvent({ type: 'commentary', text: `${gk.name} espalma, mas a bola continua viva na área!` });
            if (AU) AU.save();
          }
        }
      }

      if (ball.z < 17 && ball.touchLock <= 0) {
        let best = null, bd = 24;
        const all = this.allPlayers();
        for (const p of all) {
          if (p.sentOff || p.kickCd > 0) continue;
          if (ball.noTouch === p.id && ball.noTouchT > 0) continue;
          const r = p.isGK ? 32 : 18;
          const d = dist(p, ball);
          if (d < r && d < bd) { bd = d; best = p; }
        }
        if (best) this.gainPossession(best);
      }
    }

    gainPossession(p) {
      const ball = this.ball;
      const previousSide = ball.passSide;
      this.possession = p;
      p.kickCd = Math.min(p.kickCd, .05);
      ball.x = p.x; ball.y = p.y;
      ball.shot = false; ball.saved = false;
      ball.passTo = null;
      if (previousSide === p.side) {
        this[p.side].stats.passCompleted++;
        if (ball.lastPasser && ball.lastPasser !== p) { ball.lastPasser.passesOk++; ball.lastPasser.rating += .04; }
      }
      ball.passSide = null;
      if (ball.lastTouch && ball.lastTouch.side !== p.side) {
        p.rating += .08;
        if (Math.random() < .16) this.pushEvent({ type: 'commentary', text: `${p.name} intercepta e recupera a posse!` });
      }
      ball.lastTouch = p;
      if (p.isGK) p.think = 1.2;
    }

    checkGoal() {
      const ball = this.ball;
      if (this.state !== 'live' && this.state !== 'penalty') return false;
      if (ball.z > GOAL.height) return false;
      const inMouth = ball.y > GOAL.top + 3 && ball.y < GOAL.bottom - 3;
      if (ball.x < FIELD.x - 2 && ball.x > FIELD.x - GOAL.depth - 6 && inMouth) { this.goalScored('away', 'home'); return true; }
      if (ball.x > FIELD.r + 2 && ball.x < FIELD.r + GOAL.depth + 6 && inMouth) { this.goalScored('home', 'away'); return true; }
      if (Math.abs(ball.x - FIELD.x) < 9 || Math.abs(ball.x - FIELD.r) < 9) {
        if ((Math.abs(ball.y - GOAL.top) < 6 || Math.abs(ball.y - GOAL.bottom) < 6) && ball.z < GOAL.height + 12) {
          ball.vx *= -.55; ball.vy += (Math.random() - .5) * 200; ball.vz = 60;
          if (AU) AU.post();
          this.pushEvent({ type: 'commentary', text: 'Na trave! A bola beija a madeira!' });
        }
      }
      return false;
    }

    goalScored(scoringSide, concedingSide) {
      const scoring = this[scoringSide];
      scoring.score++;
      const scorer = this.ball.lastTouch;
      const ownGoal = scorer && scorer.side !== scoringSide;
      let assist = null;
      if (scorer && !ownGoal) {
        scorer.goals++;
        scorer.rating += 1.4;
        const passer = this.ball.lastPasser;
        if (passer && passer.side === scoringSide && passer.id !== scorer.id && this.animTime - (passer.lastPassT || -99) < 9) {
          assist = passer; passer.assists++; passer.rating += .7;
        }
      }
      this.state = 'goal'; this.stateT = 0; this.replayStarted = false;
      this.goalInfo = { side: scoringSide, scorer, ownGoal, assist };
      this.kickoffTeam = concedingSide;
      this.possession = null;
      this.shake = .55;
      this.crowdJump = 1;
      this.confetti(scoringSide);
      if (this.training) {
        this.trainingStats.goals++;
        this.pushEvent({ type: 'trainingGoal', text: 'GOL! Excelente finalização!' });
        if (AU) AU.goal();
        setTimeout(() => { if (!this.ended) this.trainingReset(false); }, 1800);
        return;
      }
      if (AU) { AU.goal(); AU.speak(`Gol! Gol de ${scorer ? scorer.name : scoring.team.name}! ${scoring.team.name} ${scoring.score} a ${this[concedingSide].score}!`, true); }
      const text = ownGoal
        ? `Gol contra de ${scorer ? scorer.name : 'jogador'}! ${scoring.team.name} marca.`
        : `GOOOOL! ${scorer ? scorer.name : scoring.team.name} marca para ${scoring.team.name}!`;
      this.pushEvent({ type: 'goal', side: scoringSide, player: scorer, ownGoal, assist, score: `${this.home.score} x ${this.away.score}`, text });
      this.emit('goal');
      this.emitHud();
    }

    checkBoundaries() {
      if (this.state !== 'live') return;
      const ball = this.ball;
      if (ball.y < FIELD.y - 1) {
        if (this.training) return this.trainingOut();
        const side = (ball.lastTouch && ball.lastTouch.side === 'home') ? 'away' : 'home';
        this.restart('throwin', side, clamp(ball.x, FIELD.x + 20, FIELD.r - 20), FIELD.y + 8);
        return;
      }
      if (ball.y > FIELD.b + 1) {
        if (this.training) return this.trainingOut();
        const side = (ball.lastTouch && ball.lastTouch.side === 'home') ? 'away' : 'home';
        this.restart('throwin', side, clamp(ball.x, FIELD.x + 20, FIELD.r - 20), FIELD.b - 8);
        return;
      }
      if (ball.x < FIELD.x - 1) {
        if (this.training) return this.trainingOut();
        const last = ball.lastTouch ? ball.lastTouch.side : 'home';
        if (last === 'home') { this.home.stats.corners; this.away.stats.corners++; this.restart('corner', 'away', FIELD.x + 6, ball.y < FIELD.cy ? FIELD.y + 6 : FIELD.b - 6); }
        else this.restart('goalkick', 'home', FIELD.x + SIX.depth - 8, FIELD.cy);
        return;
      }
      if (ball.x > FIELD.r + 1) {
        if (this.training) return this.trainingOut();
        const last = ball.lastTouch ? ball.lastTouch.side : 'away';
        if (last === 'away') { this.home.stats.corners++; this.restart('corner', 'home', FIELD.r - 6, ball.y < FIELD.cy ? FIELD.y + 6 : FIELD.b - 6); }
        else this.restart('goalkick', 'away', FIELD.r - SIX.depth + 8, FIELD.cy);
      }
    }

    trainingOut() {
      if (this.trainingResetTimer) return;
      this.ball.vx = this.ball.vy = 0;
      this.trainingResetTimer = setTimeout(() => { this.trainingResetTimer = null; if (!this.ended) this.trainingReset(false); }, 900);
    }

    restart(type, side, x, y) {
      this.state = 'restart'; this.stateT = 0; this.restartT = 0;
      this.restart = { type, side, x, y };
      this.possession = null;
      this.ball.owner = null;
      this.ball.x = x; this.ball.y = y; this.ball.z = 0;
      this.ball.vx = this.ball.vy = this.ball.vz = 0;
      this.ball.touchLock = 1.1;
      let taker;
      if (type === 'goalkick') taker = this[side].players.find(p => p.isGK && !p.sentOff) || this[side].players[0];
      else taker = this[side].players.filter(p => !p.sentOff && !p.isGK).sort((a, b) => dist2(a.x, a.y, x, y) - dist2(b.x, b.y, x, y))[0];
      if (!taker) taker = this[side].players.find(p => !p.sentOff);
      this.restart.taker = taker;
      if (taker) {
        taker.x = type === 'goalkick' ? (side === 'home' ? FIELD.x + 18 : FIELD.r - 18) : clamp(x, FIELD.x + 14, FIELD.r - 14);
        taker.y = type === 'goalkick' ? FIELD.cy : clamp(y + (side === 'home' ? 10 : -10), FIELD.y + 14, FIELD.b - 14);
        taker.vx = taker.vy = 0;
        taker.dir = side === 'home' ? 0 : Math.PI;
        this.ball.x = type === 'goalkick' ? taker.x : taker.x;
        this.ball.y = type === 'goalkick' ? taker.y : taker.y;
      }
      this.emitHud();
    }

    completeRestart() {
      const r = this.restart;
      if (!r) { this.state = 'live'; return; }
      const taker = r.taker;
      if (taker && !taker.sentOff) {
        this.possession = taker;
        this.ball.x = taker.x + Math.cos(taker.dir) * 10;
        this.ball.y = taker.y + Math.sin(taker.dir) * 10;
        this.ball.touchLock = 0;
      }
      this.state = 'live'; this.stateT = 0;
      if (r.type === 'corner') this.pushEvent({ type: 'commentary', text: `Escanteio para ${this[r.side].team.name}.` });
      else if (r.type === 'foul') this.pushEvent({ type: 'commentary', text: `Falta para ${this[r.side].team.name}.` });
      else if (r.type === 'goalkick') this.pushEvent({ type: 'commentary', text: `${this[r.side].team.name} recomeça com o goleiro.` });
      this.restart = null;
      if (r.type === 'goalkick' && AU) AU.whistle();
    }

    startPenalty(attackingSide) {
      if (this.ended) return;
      const defendingSide = attackingSide === 'home' ? 'away' : 'home';
      this.state = 'penalty'; this.stateT = 0;
      this.penalty = { side: attackingSide, t: 0, shot: false, done: false, doneT: 0, kicked: false };
      const goalX = attackingSide === 'home' ? FIELD.r : FIELD.x;
      const spotX = attackingSide === 'home' ? FIELD.r - 105 : FIELD.x + 105;
      this.ball.x = spotX; this.ball.y = FIELD.cy; this.ball.z = 0;
      this.ball.vx = this.ball.vy = this.ball.vz = 0;
      this.ball.lastTouch = null; this.ball.shot = false; this.ball.saved = false;
      this.ball.touchLock = 0;
      const shooter = this[attackingSide].players.filter(p => !p.isGK && !p.sentOff).sort((a, b) => b.sho - a.sho)[0] || this[attackingSide].players[0];
      const gk = this[defendingSide].players.find(p => p.isGK && !p.sentOff);
      this.penalty.shooter = shooter; this.penalty.gk = gk;
      this[attackingSide].players.forEach(p => {
        if (p.sentOff) return;
        if (p === shooter) { p.x = spotX - (attackingSide === 'home' ? 20 : -20); p.y = FIELD.cy; p.dir = attackingSide === 'home' ? 0 : Math.PI; }
        else { p.x = goalX + (attackingSide === 'home' ? -260 : 260) + (Math.random() * 40 - 20); p.y = FIELD.y + 80 + Math.random() * (FIELD.h - 160); }
        p.vx = p.vy = 0; p.state = 'idle'; p.stateT = 0;
      });
      this[defendingSide].players.forEach(p => {
        if (p.sentOff) return;
        if (p === gk) { p.x = goalX + (defendingSide === 'home' ? 14 : -14); p.y = FIELD.cy; }
        else { p.x = goalX + (defendingSide === 'home' ? 190 : -190) + (Math.random() * 50 - 25); p.y = FIELD.y + 60 + Math.random() * (FIELD.h - 120); }
        p.vx = p.vy = 0; p.state = 'idle'; p.stateT = 0;
      });
      this.possession = shooter;
      this.charges[attackingSide].shoot = 0;
      this.pushEvent({ type: 'penalty', text: `Pênalti para ${this[attackingSide].team.name}! ${shooter ? shooter.name : ''} é o cobrador.` });
      if (AU) AU.whistle();
      this.emitHud();
    }

    updatePenalty(dt) {
      const pen = this.penalty;
      if (!pen) { this.state = 'live'; return; }
      pen.t += dt;
      const humanAttacking = this[pen.side].human;
      const inp = this.inputs[pen.side];
      const shooter = pen.shooter;
      if (!pen.shot) {
        if (humanAttacking) {
          if (inp.x || inp.y) shooter.dir = Math.atan2(inp.y, inp.x * (pen.side === 'home' ? 1 : -1));
          if (inp.shootHeld) this.charges[pen.side].shoot = Math.min(1, this.charges[pen.side].shoot + dt * 1.4);
          if (this.prevInputs[pen.side].shootHeld && !inp.shootHeld) pen.shot = true;
          else if (pen.t > 7) pen.shot = true;
        } else if (pen.t > 1.1) pen.shot = true;
        if (pen.shot) {
          const power = humanAttacking ? Math.max(.55, this.charges[pen.side].shoot) : .65 + Math.random() * .3;
          this.charges[pen.side].shoot = 0;
          const goalY = FIELD.cy;
          let aimY = goalY;
          if (humanAttacking && Math.abs(inp.y) > .2) aimY = clamp(goalY + inp.y * 120, GOAL.top + 15, GOAL.bottom - 15);
          else aimY = goalY + (Math.random() - .5) * 135;
          const targetX = pen.side === 'home' ? FIELD.r + 4 : FIELD.x - 4;
          const d = Math.abs(targetX - this.ball.x);
          const speed = 760 + power * 260;
          const flight = d / speed;
          this.ball.vx = (targetX - this.ball.x) / flight;
          this.ball.vy = (aimY - this.ball.y) / flight;
          this.ball.z = 10; this.ball.vz = 55;
          this.ball.shot = true; this.ball.saved = false; this.ball.shotSide = pen.side;
          this.ball.noTouch = shooter.id; this.ball.noTouchT = .4;
          this.ball.lastTouch = shooter;
          this.ball.x = shooter.x + (pen.side === 'home' ? 12 : -12);
          this.possession = null;
          pen.kicked = true;
          if (pen.gk) {
            pen.gk.diveT = 1;
            pen.gk.diveDir = Math.random() < .5 ? -1 : 1;
            pen.gk.diveDirY = aimY < goalY ? -1 : 1;
          }
          if (AU) AU.kick(.9);
          this.emitHud();
        }
        return;
      }
      pen.doneT += dt;
      if (pen.doneT > .6) {
        if (this.state === 'goal') return;
        const gk = pen.gk;
        const stopped = this.possession === gk || this.ball.x < FIELD.x - 20 || this.ball.x > FIELD.r + 20 || (Math.hypot(this.ball.vx, this.ball.vy) < 25 && Math.abs(this.ball.z) < 2 && pen.doneT > 1.4);
        if (stopped) {
          this.penalty = null;
          const defending = pen.side === 'home' ? 'away' : 'home';
          this.restart('goalkick', defending, defending === 'home' ? FIELD.x + SIX.depth - 8 : FIELD.r - SIX.depth + 8, FIELD.cy);
          this.pushEvent({ type: 'commentary', text: this.possession === gk ? `${gk.name} defende o pênalti!` : 'O pênalti foi desperdiçado!' });
        }
      }
      if (pen.doneT > 4 && this.state === 'penalty') {
        this.penalty = null;
        this.restart('goalkick', pen.side === 'home' ? 'away' : 'home', pen.side === 'home' ? FIELD.r - SIX.depth + 8 : FIELD.x + SIX.depth - 8, FIELD.cy);
      }
    }

    /* ---- Subs / controls / lifecycle ---- */
    substitute(side, outId, inPlayer) {
      const team = this[side];
      if (!team || team.substitutions >= 5) return { ok: false, reason: 'Limite de 5 substituições atingido.' };
      const idx = team.players.findIndex(p => p.id === outId && !p.sentOff);
      if (idx < 0) return { ok: false, reason: 'Jogador não está em campo.' };
      const bi = team.bench.findIndex(p => p.id === inPlayer.id);
      if (bi < 0) return { ok: false, reason: 'Jogador não está no banco.' };
      const out = team.players[idx];
      const np = this.makeEntity(team.bench[bi], side, team.team, out.isGK, idx);
      np.x = out.x; np.y = out.y; np.vx = out.vx; np.vy = out.vy; np.stateT = 0;
      if (out.isGK) np.isGK = true;
      team.bench.splice(bi, 1);
      team.players[idx] = np;
      team.substitutions++;
      if (this.possession === out) this.possession = np;
      if (this.control[side] === out) this.control[side] = np;
      if (team.legendId === outId) team.legendId = np.id;
      this.pushEvent({ type: 'sub', side, player: np, out, text: `Substituição no ${team.team.name}: entra ${np.name}, sai ${out.name}.` });
      if (AU) AU.ui();
      this.emitHud();
      return { ok: true };
    }

    getBench(side) { return this[side].bench; }
    getLineup(side) { return this[side].players.filter(p => !p.sentOff); }

    setCamera(mode) { this.cameraMode = mode; this.camInit = false; }

    pause() {
      if (this.ended) return;
      this.paused = true;
      if (AU) AU.setCrowdLevel(.2);
      this.emit('pause');
    }
    resume() {
      if (this.ended) return;
      this.paused = false; this.last = now();
      if (AU) AU.setCrowdLevel(.55);
      this.emit('resume');
    }

    startReplay() {
      if (this.frames.length < 8) return;
      this.replay = this.frames.slice(-46);
      this.replayT = 0;
      this.state = 'replay';
      this.emit('replay');
      if (AU) AU.setCrowdLevel(.3);
    }
    skipReplay() { if (this.state === 'replay') this.finishReplay(); }
    finishReplay() { this.replay = null; this.beginKickoff(); }

    beginKickoff() {
      if (this.ended) return;
      this.state = 'kickoff'; this.stateT = 0;
      this.possession = null;
      this.ball.x = CENTER.x; this.ball.y = CENTER.y; this.ball.z = 0;
      this.ball.vx = this.ball.vy = this.ball.vz = 0;
      this.ball.shot = false; this.ball.saved = false;
      this.ball.lastTouch = null; this.ball.touchLock = 1;
      this.resetPositions(this.kickoffTeam);
      this.replayStarted = false;
      this.emit('kickoff');
    }

    resetPositions(kickoffTeam) {
      const setup = (side) => {
        const team = this[side];
        team.players.forEach(p => {
          if (p.sentOff) return;
          p.x = p.baseX; p.y = p.baseY; p.vx = p.vy = 0;
          p.state = 'idle'; p.stateT = 0;
          p.dir = side === 'home' ? 0 : Math.PI;
        });
      };
      setup('home'); setup('away');
      const t = this[kickoffTeam];
      if (!t) return;
      const taker = t.players.filter(p => !p.isGK && !p.sentOff && ['ST', 'AM', 'CM', 'LW', 'RW'].includes(p.slot))
        .sort((a, b) => Math.abs(a.baseY - FIELD.cy) - Math.abs(b.baseY - FIELD.cy))[0] || t.players.find(p => !p.isGK && !p.sentOff);
      if (taker) {
        taker.x = CENTER.x + (kickoffTeam === 'home' ? -18 : 18);
        taker.y = CENTER.y;
        taker.dir = kickoffTeam === 'home' ? 0 : Math.PI;
        this.kickoffTaker = taker;
      }
      this.ball.x = CENTER.x; this.ball.y = CENTER.y; this.ball.z = 0;
    }

    emitHud() {
      const total = this.home.stats.possession + this.away.stats.possession;
      this.onHud({
        homeScore: this.home.score, awayScore: this.away.score,
        homePoss: total ? Math.round(this.home.stats.possession / total * 100) : 50,
        clock: this.clockText(), half: this.half, state: this.state,
        players: this.control,
        training: this.training ? { ...this.trainingStats } : null
      });
    }

    clockText() {
      if (this.training) return 'TREINO';
      if (!this.halftimeDone && this.clock >= 2700) return `45+${Math.max(1, Math.ceil((this.clock - 2700) / 60))}'`;
      if (this.halftimeDone && this.clock >= 5400) return `90+${Math.max(1, Math.ceil((this.clock - 5400) / 60))}'`;
      return `${Math.max(0, Math.min(90, Math.floor(this.clock / 60)))}'`;
    }

    pushEvent(ev) {
      this.events.push(ev);
      if (this.events.length > 60) this.events.shift();
      this.onEvent(ev);
      if (ev.narrate && AU && !this.training) AU.speak(ev.text, false);
    }

    emit(type) { this.onState({ type, match: this }); }

    record(dt) {
      if (this.state !== 'live' && this.state !== 'penalty') return;
      this.recordTimer += dt;
      if (this.recordTimer < .075) return;
      this.recordTimer = 0;
      this.frames.push({
        players: this.allPlayers().map(p => ({ x: p.x, y: p.y, d: p.dir, s: p.side, gk: p.isGK, id: p.id })),
        ball: { x: this.ball.x, y: this.ball.y, z: this.ball.z, r: this.ball.rot }
      });
      if (this.frames.length > 120) this.frames.shift();
    }

    updateCamera(dt) {
      const mode = this.cameraMode || 'dynamic';
      const cw = this.cw || 1000, ch = this.ch || 700;
      const fit = Math.min(cw / (W + 60), ch / (H + 60));
      const dynamic = Math.max(fit * 1.45, Math.min(cw / 650, ch / 430));
      let scale = dynamic, tx = this.ball.x, ty = this.ball.y;
      if (mode === 'top' || mode === 'wide') { scale = fit; tx = FIELD.cx; ty = FIELD.cy; }
      else if (mode === 'broadcast') { scale = Math.max(fit * 1.14, fit); tx = FIELD.cx + (this.ball.x - FIELD.cx) * .28; ty = FIELD.cy; }
      else if (mode === 'close') { scale = dynamic * 1.3; }
      else if (mode === 'player') { const p = this.control.home || this.possession; if (p) { tx = p.x; ty = p.y; } scale = dynamic * 1.12; }
      if (this.state === 'replay' && this.replay) {
        const f = this.replay[Math.min(this.replay.length - 1, Math.floor(this.replayT / 3.1 * (this.replay.length - 1)))];
        if (f) { tx = f.ball.x; ty = f.ball.y; }
        scale = Math.max(fit * 1.6, Math.min(cw / 520, ch / 360));
      }
      const halfW = cw / (2 * scale), halfH = ch / (2 * scale);
      const margin = 170;
      tx = clamp(tx, Math.min(FIELD.cx, halfW - margin), Math.max(FIELD.cx, W - halfW + margin));
      ty = clamp(ty, Math.min(FIELD.cy, halfH - margin), Math.max(FIELD.cy, H - halfH + margin));
      if (mode === 'top' || mode === 'wide') { tx = FIELD.cx; ty = FIELD.cy; }
      if (!this.camInit) { this.cam.x = tx; this.cam.y = ty; this.cam.scale = scale; this.camInit = true; }
      else {
        const k = 1 - Math.exp(-dt * 6);
        this.cam.x = lerp(this.cam.x, tx, k);
        this.cam.y = lerp(this.cam.y, ty, k);
        this.cam.scale = lerp(this.cam.scale, scale, k);
      }
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.6);
    }

    buildCrowd() {
      const r = rnd(77123);
      const colors = [this.homeTeam.colors.primary, this.homeTeam.colors.secondary, this.awayTeam.colors.primary, this.awayTeam.colors.secondary, '#233746', '#d7e6f2', '#8fa6b8', '#1a2731'];
      for (let i = 0; i < 620; i++) {
        let x, y;
        const zone = Math.floor(r() * 4);
        if (zone === 0) { x = -40 + r() * (W + 80); y = -120 + r() * 145; }
        else if (zone === 1) { x = -40 + r() * (W + 80); y = H - 25 + r() * 150; }
        else if (zone === 2) { x = -140 + r() * 160; y = 20 + r() * (H - 40); }
        else { x = W - 20 + r() * 160; y = 20 + r() * (H - 40); }
        this.crowdDots.push({ x, y, c: colors[Math.floor(r() * colors.length)], s: .8 + r() * 1.5, p: r() * TWO_PI });
      }
    }

    buildWeather() {
      const r = rnd(9981);
      for (let i = 0; i < 110; i++) this.rain.push({ x: r(), y: r(), v: .55 + r() * .8, l: .01 + r() * .025, s: .5 + r() * 1.4, p: r() * TWO_PI });
    }

    addGrass(x, y) {
      if (this.particles.length > 160) return;
      this.particles.push({ type: 'grass', x: x + (Math.random() - .5) * 16, y: y + (Math.random() - .5) * 10, vx: (Math.random() - .5) * 80, vy: -Math.random() * 60, s: 1 + Math.random() * 2, life: .5, max: .5, color: Math.random() < .5 ? '#2d7a3c' : '#4c9c4a' });
    }

    confetti(side) {
      const color = this[side].team.colors.primary;
      for (let i = 0; i < 90; i++) {
        this.particles.push({
          type: 'confetti', x: this.ball.x + (Math.random() - .5) * 80, y: this.ball.y - Math.random() * 40,
          vx: (Math.random() - .5) * 260, vy: -120 - Math.random() * 220, s: 1.5 + Math.random() * 2.4,
          life: 1.4 + Math.random(), max: 2.4, color: Math.random() < .5 ? color : ['#c9ff3d', '#35e6ff', '#fff'][i % 3]
        });
      }
    }

    updateParticles(dt) {
      this.particles = this.particles.filter(p => {
        p.life -= dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += (p.type === 'confetti' ? 90 : 220) * dt;
        p.vx *= Math.pow(.3, dt);
        return p.life > 0;
      });
    }

    /*__ENGINE_RENDER_HOOK__*/
  }

  window.PES.Match = Match;
  window.PES.MatchConstants = { W, H, FIELD, GOAL, PEN, SIX, CENTER };
})();
