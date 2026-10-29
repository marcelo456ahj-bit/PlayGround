import { FORMATIONS, STADIUMS, BALLS, DIFFICULTIES, WEATHERS, COMMENTARY } from "./data.js";
import { FIELD, clamp, dist, buildLineup, initialStats, createMatchPlayer, randomRange } from "./match-utils.js";
import { shoot, aiPass, slideTackle, updatePenalty, takePenalty } from "./match-actions.js";
import { updatePlayers, updateBall, closestToBall } from "./match-ai.js";
import { drawMatch } from "./match-render.js";
import { buildStadium } from "./stadium.js";

export class MatchEngine {
  constructor(options) {
    this.options = options;
    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext("2d");
    this.audio = options.audio;
    this.homeTeam = options.homeTeam;
    this.awayTeam = options.awayTeam;
    this.homeFormation = options.homeFormation || this.homeTeam.formation || "4-3-3";
    this.awayFormation = options.awayFormation || this.awayTeam.formation || "4-4-2";
    this.difficulty = DIFFICULTIES.find((item) => item.id === (options.difficulty || "profissional")) || DIFFICULTIES[1];
    this.weather = WEATHERS.find((item) => item.id === (options.weather || "clear")) || WEATHERS[0];
    this.stadium = STADIUMS.find((item) => item.id === options.stadium) || STADIUMS[0];
    this.ballSkin = BALLS.find((item) => item.id === options.ball) || BALLS[0];
    this.cameraMode = options.camera || "broadcast";
    this.controlMode = options.controlMode || "single";
    this.halfRealSeconds = Math.max(55, (options.matchMinutes || 6) * 30);
    this.replayEnabled = options.replay !== false;
    this.narration = options.narration !== false;
    this.crowdLevel = options.crowd || 0.8;
    this.careerPlayerId = options.careerPlayerId || null;
    this.homeKit = options.homeKit || "primary";
    this.awayKit = options.awayKit || "primary";
    this.onEvent = options.onEvent || (() => {});
    this.isMultiplayer = this.controlMode === "local";
    this.tilt = options.tilt || false;
    this.tiltX = 0;
    this.tiltY = 0;
    this.homeScore = 0;
    this.awayScore = 0;
    this.half = 1;
    this.time = 0;
    this.state = "countdown";
    this.countdown = 2.6;
    this.goalTimer = 0;
    this.replayTimer = 0;
    this.replayFrames = [];
    this.replayIndex = 0;
    this.recordBuffer = [];
    this.recordClock = 0;
    this.lastHud = 0;
    this.lastCommentary = 0;
    this.lastCrowdChant = 0;
    this.pausedFrom = "playing";
    this.stats = { home: initialStats(), away: initialStats() };
    this.substitutions = { home: 0, away: 0 };
    this.performance = new Map();
    this.events = [];
    this.penalty = null;
    this.goalFlash = 0;
    this.shake = 0;
    this.weatherParticles = [];
    this.goalText = null;
    this.message = null;
    this.messageTimer = 0;
    this.commentaryText = "";
    this.controlledId = null;
    this.p2ControlledId = null;
    this.lastTouch = null;
    this.passTarget = null;
    this.passTeam = null;
    this.restart = null;
    this.endAfterGoal = false;
    this.tactics = {
      home: { mentality: 0.5, line: 0.5, press: 0.5 },
      away: { mentality: 0.5, line: 0.5, press: 0.5 }
    };
    this.input = {
      x: 0,
      y: 0,
      activeX: 0,
      activeY: 0,
      sprint: false,
      shootCharging: false,
      shootCharge: 0,
      p2x: 0,
      p2y: 0,
      p2sprint: false,
      p2ShootCharging: false,
      p2ShootCharge: 0,
      keys: new Set()
    };
    const careerClub = options.careerPlayerId && this.homeTeam.squad.some((player) => player.id === options.careerPlayerId) ? "home" : "away";
    this.lineups = {
      home: buildLineup(this.homeTeam, this.homeFormation, careerClub === "home" ? options.careerPlayerId : null),
      away: buildLineup(this.awayTeam, this.awayFormation, careerClub === "away" ? options.careerPlayerId : null)
    };
    this.bench = {
      home: this.lineups.home.bench.map((player) => ({ ...player })),
      away: this.lineups.away.bench.map((player) => ({ ...player }))
    };
    this.players = [];
    this.createPlayers();
    this.ball = { x: FIELD.centerX, y: FIELD.centerY, z: 0, vx: 0, vy: 0, vz: 0, owner: null, rotation: 0, lastOwner: null };
    this.camera = { x: FIELD.centerX, y: FIELD.centerY, zoom: 1, targetX: FIELD.centerX, targetY: FIELD.centerY };
    this.frame = 0;
    this.lastTime = 0;
    this.raf = null;
    this.running = false;
    this.destroyed = false;
    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    this.resetPositions(0);
    this.updateControlled(true);
    const built = buildStadium(this);
    this.stadiumCanvas = built.canvas;
    this.stadiumOrigin = built.origin;
    this.setupWeather();
    window.addEventListener("resize", this.resize);
    this.resize();
    this.bindKeyboard();
    this.audio.crowdStart(this.crowdLevel);
    if (this.narration) setTimeout(() => this.audio.say("kickoff"), 900);
    this.emitHud(true);
  }

  createPlayers() {
    const build = (side, team, lineup, formation) => lineup.starters.map((player, index) => {
      const slot = FORMATIONS[formation].slots[index] || FORMATIONS[formation].slots[FORMATIONS[formation].slots.length - 1];
      const matchPlayer = createMatchPlayer(player, slot, side, team, index);
      this.performance.set(matchPlayer.id, { side, goals: 0, assists: 0, passes: 0, tackles: 0, shots: 0, rating: 6.3 });
      return matchPlayer;
    });
    this.players = [
      ...build(0, this.homeTeam, this.lineups.home, this.homeFormation),
      ...build(1, this.awayTeam, this.lineups.away, this.awayFormation)
    ];
  }

  bindKeyboard() {
    this.keyDown = (event) => {
      const code = event.code;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code)) event.preventDefault();
      if (this.input.keys.has(code)) return;
      this.input.keys.add(code);
      if (code === "Escape") {
        this.onEvent("pauseRequest", {});
        return;
      }
      if (code === "Space") this.pressAction("pass", 0);
      if (code === "KeyJ") this.pressAction("shoot", 0);
      if (code === "KeyK") this.pressAction("sprint", 0);
      if (code === "KeyL") this.pressAction("tackle", 0);
      if (code === "KeyI") this.pressAction("skill", 0);
      if (this.isMultiplayer) {
        if (code === "Comma") this.pressAction("pass", 1);
        if (code === "Period") this.pressAction("shoot", 1);
        if (code === "Slash") this.pressAction("sprint", 1);
        if (code === "Semicolon") this.pressAction("tackle", 1);
      }
    };
    this.keyUp = (event) => {
      const code = event.code;
      this.input.keys.delete(code);
      if (code === "KeyJ") this.releaseAction("shoot", 0);
      if (code === "KeyK") this.releaseAction("sprint", 0);
      if (this.isMultiplayer) {
        if (code === "Period") this.releaseAction("shoot", 1);
        if (code === "Slash") this.releaseAction("sprint", 1);
      }
    };
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
  }

  setJoystick(x, y) {
    this.input.x = clamp(x, -1, 1);
    this.input.y = clamp(y, -1, 1);
  }

  setP2Joystick(x, y) {
    this.input.p2x = clamp(x, -1, 1);
    this.input.p2y = clamp(y, -1, 1);
  }

  setTilt(x, y) {
    this.tiltX = clamp(x, -0.65, 0.65);
    this.tiltY = clamp(y, -0.65, 0.65);
  }

  pressAction(action, playerIndex) {
    const p2 = playerIndex === 1;
    if (action === "shoot") {
      if (p2) this.input.p2ShootCharging = true;
      else this.input.shootCharging = true;
      return;
    }
    if (action === "sprint") {
      if (p2) this.input.p2sprint = true;
      else this.input.sprint = true;
      return;
    }
    if (this.state !== "playing" && this.state !== "penalty") return;
    if (action === "pass") this.userPass(p2 ? 1 : 0);
    if (action === "tackle") this.userTackle(p2 ? 1 : 0);
    if (action === "skill") this.userSkill(p2 ? 1 : 0);
    if (action === "shoot" && this.state === "penalty") this.takePenalty(p2 ? 1 : 0, 0.6);
  }

  releaseAction(action, playerIndex) {
    const p2 = playerIndex === 1;
    if (action === "shoot") {
      const charge = p2 ? this.input.p2ShootCharge : this.input.shootCharge;
      if (p2) {
        this.input.p2ShootCharging = false;
        this.input.p2ShootCharge = 0;
      } else {
        this.input.shootCharging = false;
        this.input.shootCharge = 0;
      }
      if (this.state === "penalty") this.takePenalty(p2 ? 1 : 0, charge);
      else this.userShoot(p2 ? 1 : 0, Math.max(0.22, charge));
    }
    if (action === "sprint") {
      if (p2) this.input.p2sprint = false;
      else this.input.sprint = false;
    }
  }

  userPlayer(side) {
    const id = side === 1 ? this.p2ControlledId : this.controlledId;
    return this.players.find((player) => player.id === id) || null;
  }

  userPass(side) {
    const player = this.userPlayer(side);
    if (!player || this.ball.owner !== player || player.slideTimer > 0) return;
    const mx = side === 1 ? this.input.p2x : this.input.x;
    const my = side === 1 ? this.input.p2y : this.input.y;
    aiPass(this, player, mx, my, true);
  }

  userShoot(side, charge) {
    const player = this.userPlayer(side);
    if (!player) return;
    if (this.state === "penalty") {
      this.takePenalty(side === 1, charge);
      return;
    }
    if (this.ball.owner !== player || player.slideTimer > 0) return;
    const mx = side === 1 ? this.input.p2x : this.input.x;
    const my = side === 1 ? this.input.p2y : this.input.y;
    shoot(this, player, mx, my, Math.max(0.28, charge));
  }

  userTackle(side) {
    const player = this.userPlayer(side);
    if (!player || player.tackleCooldown > 0 || player.slideTimer > 0) return;
    slideTackle(this, player);
  }

  userSkill(side) {
    const player = this.userPlayer(side);
    if (!player || player.skillTimer > 0 || player.cooldown > 0) return;
    const mx = side === 1 ? this.input.p2x : this.input.x;
    const my = side === 1 ? this.input.p2y : this.input.y;
    const magnitude = Math.abs(mx) + Math.abs(my);
    const direction = magnitude > 0.1 ? { x: mx / magnitude, y: my / magnitude } : { x: player.dir, y: 0 };
    player.skillTimer = 0.34;
    player.vx += direction.x * 125;
    player.vy += direction.y * 125;
    player.cooldown = 0.18;
    if (this.ball.owner === player) {
      this.ball.x += direction.x * 12;
      this.ball.y += direction.y * 12;
    }
    this.audio.click();
  }

  takePenalty(side, charge) {
    takePenalty(this, side, charge);
  }

  nearestOpponentDistance(player, side) {
    let best = 999;
    this.players.forEach((other) => {
      if (other.side !== side && !other.sentOff) best = Math.min(best, dist(player, other));
    });
    return best;
  }

  updateControlled(force) {
    const userSide = 0;
    const career = this.careerPlayerId ? this.players.find((player) => player.id === this.careerPlayerId) : null;
    if (career && !career.sentOff) {
      this.controlledId = career.id;
      if (this.isMultiplayer && (!this.p2ControlledId || force)) {
        const candidates = this.players.filter((player) => player.side === 1 && !player.isGK && !player.sentOff);
        candidates.sort((a, b) => dist(a, this.ball) - dist(b, this.ball));
        this.p2ControlledId = candidates[0]?.id || null;
      }
      this.players.forEach((player) => {
        player.controlled = player.id === career.id || (this.isMultiplayer && player.id === this.p2ControlledId);
      });
      return;
    }
    if (this.ball.owner && this.ball.owner.side === userSide) {
      if (force || !this.controlledId || this.ball.owner.id !== this.controlledId) this.controlledId = this.ball.owner.id;
    } else if (force || !this.controlledId || Math.random() < 0.22) {
      const candidates = this.players.filter((player) => player.side === userSide && !player.isGK && !player.sentOff);
      candidates.sort((a, b) => dist(a, this.ball) - dist(b, this.ball));
      this.controlledId = candidates[0]?.id || null;
    }
    if (this.isMultiplayer) {
      if (this.ball.owner && this.ball.owner.side === 1) this.p2ControlledId = this.ball.owner.id;
      else if (!this.p2ControlledId || force) {
        const candidates = this.players.filter((player) => player.side === 1 && !player.isGK && !player.sentOff);
        candidates.sort((a, b) => dist(a, this.ball) - dist(b, this.ball));
        this.p2ControlledId = candidates[0]?.id || null;
      }
    }
    this.players.forEach((player) => {
      player.controlled = player.id === this.controlledId || (this.isMultiplayer && player.id === this.p2ControlledId);
    });
  }

  setRestart(type, side, x, y, delay) {
    this.state = "setpiece";
    this.restart = {
      type,
      side,
      x: clamp(x, FIELD.left + 8, FIELD.right - 8),
      y: clamp(y, FIELD.top + 8, FIELD.bottom - 8),
      timer: delay || 1.1,
      total: delay || 1.1
    };
    this.ball.owner = null;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;
    this.ball.z = 0;
    this.ball.x = this.restart.x;
    this.ball.y = this.restart.y;
    const label = type === "foul" ? "Falta" : type === "throw" ? "Lateral" : type === "corner" ? "Escanteio" : "Tiro de meta";
    this.message = { title: label.toUpperCase(), subtitle: `${this.teamName(side)} reinicia a jogada`, tone: "info" };
    this.messageTimer = 1.5;
    if (type === "corner") this.stats[side === 0 ? "home" : "away"].corners += 1;
    this.positionForRestart(side, type, x, y);
    if (type === "corner") this.say("corner");
    this.emitHud(true);
  }

  positionForRestart(side, type, x, y) {
    const formation = side === 0 ? this.homeFormation : this.awayFormation;
    const slots = FORMATIONS[formation].slots;
    this.players.forEach((player) => {
      if (player.sentOff) return;
      if (player.isGK) {
        player.x = player.side === 0 ? FIELD.left + 34 : FIELD.right - 34;
        player.y = FIELD.centerY;
        player.vx = 0;
        player.vy = 0;
        return;
      }
      const slot = slots[player.matchIndex] || slots[0];
      const baseX = player.side === 0 ? FIELD.left + (FIELD.right - FIELD.left) * slot[0] : FIELD.right - (FIELD.right - FIELD.left) * slot[0];
      const baseY = FIELD.top + (FIELD.bottom - FIELD.top) * slot[1];
      player.x = baseX + (x - baseX) * (type === "corner" ? 0.24 : 0.12);
      player.y = baseY + (y - baseY) * (type === "corner" ? 0.22 : 0.12);
      player.vx = 0;
      player.vy = 0;
      player.slideTimer = 0;
    });
    let taker = this.players.find((player) => player.side === side && !player.isGK && !player.sentOff);
    if (type === "goalKick") taker = this.players.find((player) => player.side === side && player.isGK && !player.sentOff) || taker;
    if (taker) {
      const offsetX = side === 0 ? -15 : 15;
      taker.x = x + (type === "goalKick" ? 0 : offsetX);
      taker.y = y;
      this.restart.taker = taker;
    }
  }

  endSetpiece() {
    const restart = this.restart;
    if (!restart) return;
    this.state = "playing";
    if (restart.taker && !restart.taker.sentOff) {
      const direction = restart.side === 0 ? 1 : -1;
      if (restart.type !== "goalKick") {
        restart.taker.x = clamp(restart.x - direction * 13, FIELD.left + 12, FIELD.right - 12);
        restart.taker.y = restart.y;
      }
      this.ball.owner = restart.taker;
      restart.taker.dir = direction;
    }
    this.restart = null;
    this.message = null;
  }

  kickoff(side) {
    this.state = "countdown";
    this.countdown = 1.8;
    this.ball = { ...this.ball, x: FIELD.centerX, y: FIELD.centerY, z: 0, vx: 0, vy: 0, vz: 0, owner: null, rotation: 0 };
    this.passTarget = null;
    this.penalty = null;
    this.goalFlash = 0;
    this.resetPositions(side);
    this.updateControlled(true);
    this.audio.whistle(false);
  }

  resetPositions(kickoffSide) {
    const slotsHome = FORMATIONS[this.homeFormation].slots;
    const slotsAway = FORMATIONS[this.awayFormation].slots;
    this.players.forEach((player) => {
      if (player.sentOff) return;
      const slots = player.side === 0 ? slotsHome : slotsAway;
      const slot = slots[player.matchIndex];
      if (!slot) return;
      player.slot = [slot[0], slot[1]];
      player.homeX = player.side === 0 ? FIELD.left + (FIELD.right - FIELD.left) * slot[0] : FIELD.right - (FIELD.right - FIELD.left) * slot[0];
      player.homeY = FIELD.top + (FIELD.bottom - FIELD.top) * slot[1];
      player.x = player.homeX;
      player.y = player.homeY;
      player.vx = 0;
      player.vy = 0;
      player.phase = Math.random() * Math.PI * 2;
      player.slideTimer = 0;
      player.controlGrace = 0;
      if (player.isGK) {
        player.x = player.side === 0 ? FIELD.left + 30 : FIELD.right - 30;
        player.y = FIELD.centerY;
      }
    });
    const taker = this.players.find((player) => player.side === kickoffSide && player.matchIndex === 9 && !player.sentOff) || this.players.find((player) => player.side === kickoffSide && !player.isGK && !player.sentOff);
    if (taker) {
      taker.x = FIELD.centerX - (kickoffSide === 0 ? 18 : -18);
      taker.y = FIELD.centerY;
      this.ball.owner = taker;
      this.lastTouch = taker;
    } else {
      this.ball.owner = null;
    }
  }

  scoreGoal(scorer, side, penalty) {
    if (this.state === "ended") return;
    if (side === 0) this.homeScore += 1;
    else this.awayScore += 1;
    if (scorer) {
      scorer.goals += 1;
      const perf = this.performance.get(scorer.id);
      if (perf) {
        perf.goals += 1;
        perf.rating = Math.min(10, perf.rating + 1.15);
      }
    }
    this.stats[side === 0 ? "home" : "away"].onTarget += 1;
    this.audio.goal();
    this.audio.setCrowd(1);
    const scorerName = scorer ? scorer.shortName : "Gol contra";
    const assist = this.ball.lastOwner && this.ball.lastOwner.side === side && this.ball.lastOwner.id !== scorer?.id ? this.ball.lastOwner : this.passTarget;
    if (assist) {
      const perf = this.performance.get(assist.id);
      if (perf && assist.side === side) {
        perf.assists += 1;
        perf.rating = Math.min(10, perf.rating + 0.65);
      }
    }
    this.goalText = {
      side,
      team: this.teamName(side),
      scorer: scorerName,
      assist: assist ? assist.shortName : null,
      minute: this.clockLabel(),
      penalty: !!penalty
    };
    this.message = { title: "GOL!", subtitle: `${scorerName} marca para ${this.teamName(side)}`, tone: side === 0 ? "home" : "away" };
    this.messageTimer = 2.4;
    this.say("goal");
    this.goalFlash = 1;
    this.shake = 10;
    this.events.push({ type: "goal", time: this.time, side, scorer: scorerName });
    this.onEvent("goal", this.goalText);
    this.state = "goal";
    this.goalTimer = 0;
    this.replayFrames = this.recordBuffer.slice(-78);
    this.replayIndex = 0;
    this.players.forEach((player) => {
      player.vx *= 0.1;
      player.vy *= 0.1;
    });
    if (this.half > 1 && this.time >= 5395) this.endAfterGoal = true;
    setTimeout(() => {
      if (!this.destroyed) this.audio.setCrowd(this.crowdLevel);
    }, 2200);
    this.emitHud(true);
  }

  ownGoal(player, side) {
    this.scoreGoal(null, side, false);
    if (player) {
      const perf = this.performance.get(player.id);
      if (perf) perf.rating = Math.max(3.8, perf.rating - 1.2);
      this.events.push({ type: "ownGoal", player: player.name, side });
    }
  }

  teamName(side) {
    return side === 0 ? this.homeTeam.name : this.awayTeam.name;
  }

  clockLabel() {
    const minutes = Math.min(90, Math.floor(this.time / 60));
    const seconds = Math.floor(this.time % 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  getScorerForGoal(side) {
    const owner = this.ball.lastOwner;
    if (owner && owner.side === side) return owner;
    const team = this.players.filter((player) => player.side === side && !player.isGK && !player.sentOff);
    return team.sort((a, b) => dist(a, this.ball) - dist(b, this.ball))[0] || null;
  }

  update(dt) {
    if (["paused", "halftime", "ended"].includes(this.state)) return;
    this.frame += 1;
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    if (this.messageTimer <= 0 && this.state !== "goal") this.message = null;
    this.goalFlash = Math.max(0, this.goalFlash - dt * 1.7);
    this.shake = Math.max(0, this.shake - dt * 25);
    if (this.state === "countdown") {
      this.countdown -= dt;
      updatePlayers(this, dt, true);
      updateBall(this, dt, false);
      if (this.countdown <= 0) {
        this.state = "playing";
        this.audio.whistle(false);
        this.emitHud(true);
      }
      this.updateCamera(dt);
      return;
    }
    if (this.state === "goal") {
      this.goalTimer += dt;
      updatePlayers(this, dt, false);
      updateBall(this, dt, false);
      if (this.goalTimer > 1.55 && this.replayEnabled && this.replayFrames.length > 8) {
        this.state = "replay";
        this.replayTimer = 0;
        this.replayIndex = 0;
        this.onEvent("replayStart", { duration: 3.1 });
      } else if (this.goalTimer > 2.9) {
        this.afterGoal();
      }
      this.updateCamera(dt);
      return;
    }
    if (this.state === "replay") {
      this.replayTimer += dt;
      this.replayIndex += dt * 24;
      if (this.replayIndex >= this.replayFrames.length || this.replayTimer > 3.2) {
        this.onEvent("replayEnd", {});
        this.afterGoal();
      }
      this.updateCamera(dt);
      return;
    }
    if (this.state === "setpiece") {
      const restart = this.restart;
      if (restart) {
        restart.timer -= dt;
        updatePlayers(this, dt, false);
        updateBall(this, dt, false);
        if (restart.timer <= 0) this.endSetpiece();
      }
      this.updateCamera(dt);
      this.updateClock(dt);
      return;
    }
    if (this.state === "penalty") {
      updatePenalty(this, dt);
      updatePlayers(this, dt, false);
      this.updateCamera(dt);
      return;
    }
    if (this.state === "playing") {
      this.recordClock += dt;
      if (this.recordClock > 0.085) {
        this.recordClock = 0;
        this.captureFrame();
      }
      this.updateClock(dt);
      this.updateInput(dt);
      updatePlayers(this, dt, false);
      updateBall(this, dt, true);
      this.updateActionCharges(dt);
      this.updateControlled(false);
      if (this.ball.owner) {
        if (this.ball.owner.side === 0) this.stats.home.possession += dt;
        else this.stats.away.possession += dt;
      }
      this.checkAmbient(dt);
    }
    this.updateWeather(dt);
    this.updateCamera(dt);
    if (this.frame % 4 === 0) this.emitHud(false);
  }

  afterGoal() {
    if (this.endAfterGoal || (this.half > 1 && this.time >= 5400)) {
      this.endMatch();
      return;
    }
    const conceding = this.goalText.side === 0 ? 1 : 0;
    this.goalText = null;
    this.state = "countdown";
    this.countdown = 1.7;
    this.kickoff(conceding);
    this.emitHud(true);
  }

  updateClock(dt) {
    const rate = 2700 / this.halfRealSeconds;
    this.time += dt * rate;
    if (this.half === 1 && this.time >= 2700) {
      this.time = 2700;
      this.state = "halftime";
      this.audio.whistle(true);
      this.audio.setCrowd(0.35);
      this.say("halftime");
      this.message = { title: "INTERVALO", subtitle: "Os times voltam para o vestiário", tone: "info" };
      this.onEvent("halftime", this.getSnapshot());
      this.emitHud(true);
    } else if (this.half === 2 && this.time >= 5400) {
      this.time = 5400;
      this.endMatch();
    }
  }

  updateInput(dt) {
    const keys = this.input.keys;
    let x = this.input.x;
    let y = this.input.y;
    let keyX;
    let keyY;
    if (this.isMultiplayer) {
      keyX = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
      keyY = (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0);
    } else {
      keyX = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
      keyY = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
    }
    if (Math.abs(keyX) + Math.abs(keyY) > 0) {
      x = keyX;
      y = keyY;
    }
    if (this.tilt) {
      x += this.tiltX;
      y += this.tiltY;
    }
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) {
      x /= magnitude;
      y /= magnitude;
    }
    const player = this.userPlayer(0);
    if (!player || player.sentOff) return;
    this.input.activeX = x;
    this.input.activeY = y;
    player.moveX = x;
    player.moveY = y;
    player.sprinting = this.input.sprint || keys.has("KeyK");
    if (this.isMultiplayer) {
      let p2x = this.input.p2x;
      let p2y = this.input.p2y;
      const p2keyX = (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
      const p2keyY = (keys.has("ArrowDown") ? 1 : 0) - (keys.has("ArrowUp") ? 1 : 0);
      if (Math.abs(p2keyX) + Math.abs(p2keyY) > 0) {
        p2x = p2keyX;
        p2y = p2keyY;
      }
      const p2mag = Math.hypot(p2x, p2y);
      if (p2mag > 1) {
        p2x /= p2mag;
        p2y /= p2mag;
      }
      const p2 = this.userPlayer(1);
      if (p2) {
        p2.moveX = p2x;
        p2.moveY = p2y;
        p2.sprinting = this.input.p2sprint || keys.has("Slash");
      }
    }
  }

  updateActionCharges(dt) {
    if (this.input.shootCharging) this.input.shootCharge = Math.min(1, this.input.shootCharge + dt * 1.65);
    if (this.input.p2ShootCharging) this.input.p2ShootCharge = Math.min(1, this.input.p2ShootCharge + dt * 1.65);
  }

  checkAmbient(dt) {
    this.lastCrowdChant += dt;
    if (this.lastCrowdChant > 17 + Math.random() * 9) {
      this.lastCrowdChant = 0;
      this.audio.chant();
    }
    this.lastCommentary += dt;
    if (this.lastCommentary > 22) {
      this.lastCommentary = 0;
      this.say("build");
    }
  }

  say(type) {
    if (!this.narration) return;
    const pool = COMMENTARY[type] || [];
    if (!pool.length) return;
    const line = pool[Math.floor(Math.random() * pool.length)];
    this.commentaryText = line;
    this.audio.say(type, line);
    this.onEvent("commentary", { text: line });
  }

  updateWeather(dt) {
    if (!["rain", "snow"].includes(this.weather.id)) return;
    const count = this.weather.id === "rain" ? 95 : 65;
    while (this.weatherParticles.length < count) {
      this.weatherParticles.push({
        x: randomRange(-100, 1300),
        y: randomRange(-150, 700),
        speed: randomRange(220, 480),
        size: this.weather.id === "rain" ? randomRange(0.6, 1.6) : randomRange(1, 2.8),
        drift: randomRange(-30, 30)
      });
    }
    this.weatherParticles.forEach((particle) => {
      particle.y += particle.speed * dt;
      particle.x += particle.drift * dt;
      if (particle.y > 740) {
        particle.y = -120;
        particle.x = randomRange(-100, 1300);
      }
    });
  }

  setupWeather() {
    this.weatherParticles = [];
    if (["rain", "snow"].includes(this.weather.id)) this.updateWeather(0.016);
  }

  captureFrame() {
    const frame = {
      ball: { x: this.ball.x, y: this.ball.y, z: this.ball.z, rotation: this.ball.rotation },
      players: this.players.map((player) => ({
        id: player.id,
        side: player.side,
        x: player.x,
        y: player.y,
        dir: player.dir,
        phase: player.phase,
        speed: player.speed,
        slideTimer: player.slideTimer,
        slideAngle: player.slideAngle,
        isGK: player.isGK,
        number: player.number,
        controlled: player.controlled,
        shortName: player.shortName,
        sentOff: player.sentOff,
        skin: player.skin
      }))
    };
    this.recordBuffer.push(frame);
    if (this.recordBuffer.length > 90) this.recordBuffer.shift();
  }

  updateCamera(dt) {
    const w = this.canvas.clientWidth || 900;
    const h = this.canvas.clientHeight || 560;
    if (this.state === "replay" && this.replayFrames.length) {
      const frame = this.replayFrames[Math.min(this.replayFrames.length - 1, Math.floor(this.replayIndex))];
      if (frame) {
        this.camera.targetX = frame.ball.x;
        this.camera.targetY = frame.ball.y;
      }
    } else {
      const target = this.getCameraTarget();
      this.camera.targetX = target.x;
      this.camera.targetY = target.y;
    }
    const base = Math.max(w / 1160, h / 720);
    let factor = 1.04;
    if (this.cameraMode === "dynamic") factor = 1.25;
    if (this.cameraMode === "close") factor = 1.5;
    if (this.cameraMode === "tactical") factor = 0.84;
    if (this.state === "goal") factor = 1.26;
    if (this.state === "replay") factor = 1.42;
    const targetZoom = base * factor;
    this.camera.zoom += (targetZoom - this.camera.zoom) * clamp(dt * 2.4, 0, 1);
    const viewW = w / this.camera.zoom;
    const viewH = h / this.camera.zoom;
    const margin = 220;
    const minX = FIELD.left - margin + viewW / 2;
    const maxX = FIELD.right + margin - viewW / 2;
    const minY = FIELD.top - 160 + viewH / 2;
    const maxY = FIELD.bottom + 140 - viewH / 2;
    let tx = this.camera.targetX;
    let ty = this.camera.targetY;
    if (viewW < FIELD.right - FIELD.left + margin * 2) tx = clamp(tx, minX, maxX);
    if (viewH < FIELD.bottom - FIELD.top + 300) ty = clamp(ty, minY, maxY);
    this.camera.x += (tx - this.camera.x) * clamp(dt * 5.2, 0, 1);
    this.camera.y += (ty - this.camera.y) * clamp(dt * 5.2, 0, 1);
  }

  getCameraTarget() {
    return { x: this.ball.x, y: this.ball.y };
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(320, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(220, Math.floor(rect.height * dpr));
    this.dpr = dpr;
  }

  emitHud(force) {
    const now = performance.now();
    if (!force && now - this.lastHud < 180) return;
    this.lastHud = now;
    const totalPossession = Math.max(0.001, this.stats.home.possession + this.stats.away.possession);
    const controlled = this.players.find((player) => player.id === this.controlledId);
    this.onEvent("hud", {
      score: [this.homeScore, this.awayScore],
      time: this.clockLabel(),
      half: this.half,
      state: this.state,
      countdown: this.state === "countdown" ? Math.max(0, this.countdown) : 0,
      possession: Math.round((this.stats.home.possession / totalPossession) * 100),
      stats: this.stats,
      message: this.message,
      goalText: this.goalText,
      commentary: this.commentaryText,
      stamina: controlled ? Math.round(controlled.stamina) : 100,
      charge: this.input.shootCharge,
      controlled: controlled ? controlled.shortName : "",
      homeTeam: { name: this.homeTeam.name, short: this.homeTeam.short, primary: this.homeTeam.primary, secondary: this.homeTeam.secondary },
      awayTeam: { name: this.awayTeam.name, short: this.awayTeam.short, primary: this.awayTeam.primary, secondary: this.awayTeam.secondary }
    });
  }

  getSnapshot() {
    const performanceList = [...this.performance.entries()].map(([id, data]) => {
      const player = this.players.find((item) => item.id === id);
      return {
        id,
        name: player ? player.name : "",
        shortName: player ? player.shortName : "",
        team: player ? player.team.name : "",
        side: data.side,
        goals: data.goals,
        assists: data.assists,
        passes: data.passes,
        tackles: data.tackles,
        shots: data.shots,
        rating: Number(data.rating.toFixed(1))
      };
    });
    const career = this.careerPlayerId ? performanceList.find((player) => player.id === this.careerPlayerId) : null;
    return {
      homeTeam: this.homeTeam,
      awayTeam: this.awayTeam,
      score: [this.homeScore, this.awayScore],
      stats: this.stats,
      events: this.events,
      performance: performanceList,
      career,
      time: this.clockLabel(),
      half: this.half,
      stadium: this.stadium,
      weather: this.weather,
      difficulty: this.difficulty
    };
  }

  endMatch() {
    if (this.state === "ended") return;
    this.state = "ended";
    this.audio.whistle(true);
    this.audio.setCrowd(0.5);
    this.say("fulltime");
    this.onEvent("end", this.getSnapshot());
    this.emitHud(true);
  }

  beginSecondHalf() {
    if (this.state !== "halftime") return;
    this.half = 2;
    this.state = "countdown";
    this.countdown = 1.8;
    this.audio.setCrowd(this.crowdLevel);
    this.kickoff(1);
    this.emitHud(true);
  }

  substitute(side, outId, inId) {
    if (["ended", "replay"].includes(this.state)) return false;
    const key = side === 0 ? "home" : "away";
    if (this.substitutions[key] >= 3) return false;
    const index = this.players.findIndex((player) => player.id === outId && player.side === side);
    const benchIndex = this.bench[key].findIndex((player) => player.id === inId);
    if (index < 0 || benchIndex < 0) return false;
    const outPlayer = this.players[index];
    const incoming = this.bench[key].splice(benchIndex, 1)[0];
    const replacement = createMatchPlayer(incoming, [outPlayer.slot[0], outPlayer.slot[1], outPlayer.role], side, side === 0 ? this.homeTeam : this.awayTeam, outPlayer.matchIndex);
    replacement.x = outPlayer.x;
    replacement.y = outPlayer.y;
    replacement.homeX = outPlayer.homeX;
    replacement.homeY = outPlayer.homeY;
    this.performance.set(replacement.id, { side, goals: 0, assists: 0, passes: 0, tackles: 0, shots: 0, rating: 6.3 });
    this.players[index] = replacement;
    this.substitutions[key] += 1;
    this.events.push({ type: "substitution", time: this.time, side, playerOut: outPlayer.shortName, playerIn: replacement.shortName });
    if (this.controlledId === outId) this.controlledId = replacement.id;
    this.updateControlled(true);
    this.emitHud(true);
    return true;
  }

  setFormation(side, formation) {
    if (!FORMATIONS[formation]) return;
    if (side === 0) this.homeFormation = formation;
    else this.awayFormation = formation;
    const slots = FORMATIONS[formation].slots;
    this.players.forEach((player) => {
      if (player.side !== side || player.sentOff) return;
      const slot = slots[player.matchIndex];
      if (!slot) return;
      player.slot = [slot[0], slot[1]];
      player.role = slot[2];
      player.isGK = slot[2] === "GOL";
      player.homeX = side === 0 ? FIELD.left + (FIELD.right - FIELD.left) * slot[0] : FIELD.right - (FIELD.right - FIELD.left) * slot[0];
      player.homeY = FIELD.top + (FIELD.bottom - FIELD.top) * slot[1];
    });
  }

  setTactics(side, tactics) {
    const key = side === 0 ? "home" : "away";
    this.tactics[key] = { ...this.tactics[key], ...tactics };
    const mentality = this.tactics[key].mentality - 0.5;
    const line = this.tactics[key].line - 0.5;
    this.players.forEach((player) => {
      if (player.side !== side || player.isGK) return;
      const direction = side === 0 ? 1 : -1;
      player.homeX = clamp(player.homeX + direction * mentality * 46 + direction * line * 18, FIELD.left + 40, FIELD.right - 40);
    });
  }

  setCamera(mode) {
    this.cameraMode = mode;
  }

  pause() {
    if (["paused", "ended", "halftime", "replay"].includes(this.state)) return;
    this.pausedFrom = this.state;
    this.state = "paused";
    this.onEvent("paused", {});
  }

  resume() {
    if (this.state !== "paused") return;
    this.state = this.pausedFrom;
    this.onEvent("resumed", {});
  }

  skipReplay() {
    if (this.state !== "replay") return;
    this.onEvent("replayEnd", {});
    this.afterGoal();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  loop(time) {
    if (this.destroyed) return;
    const dt = Math.min(0.033, Math.max(0.001, (time - this.lastTime) / 1000));
    this.lastTime = time;
    this.update(dt);
    drawMatch(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.destroyed = true;
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
    this.audio.stopSpeech();
    this.audio.crowdStop();
  }
}
