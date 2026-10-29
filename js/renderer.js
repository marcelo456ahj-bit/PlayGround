/* Renderizador 2.5D: estádio, gramado, stickmen animados, bola e clima. */

import { FIELD, GOAL } from './engine.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

export class MatchRenderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.engine = engine;
    this.ctx = canvas.getContext('2d');
    this.w = 1; this.h = 1; this.dpr = 1;
    this.crowd = this.makeCrowd();
    this.rain = this.makeParticles('rain', 170);
    this.snow = this.makeParticles('snow', 130);
    this.confetti = [];
    this.lastGoal = null;
    this.flash = 0;
    this.resize();
  }

  makeCrowd() {
    const colors = ['#c8ff3d', '#36e5c0', '#ff7b3c', '#f2f7ef', '#ffd84a', '#ba8cff', '#54a8ff', '#ff4a5a', '#ffffff'];
    const arr = [];
    for (let i = 0; i < 780; i++) {
      const top = i < 420;
      arr.push({
        x: -420 + Math.random() * 2440,
        y: top ? -195 + Math.random() * 300 : 810 + Math.random() * 260,
        c: colors[Math.floor(Math.random() * colors.length)],
        s: .7 + Math.random() * 1.8,
        p: Math.random() * TAU,
        sp: .6 + Math.random() * 1.8,
        row: top ? 0 : 1
      });
    }
    return arr;
  }

  makeParticles(kind, count) {
    return Array.from({ length: count }, () => ({
      x: Math.random(), y: Math.random(), s: .4 + Math.random() * 1.6,
      v: kind === 'rain' ? .8 + Math.random() * .9 : .08 + Math.random() * .22,
      drift: (Math.random() - .5) * (kind === 'rain' ? .16 : .35),
      a: .2 + Math.random() * .55
    }));
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, this.engine.quality === 'baixa' ? 1 : 2);
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.dpr = dpr;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
  }

  getView() {
    const w = this.w, h = this.h;
    const aspect = w / h;
    const portrait = aspect < .82;
    let scale;
    if (portrait) scale = w / 900;
    else {
      scale = Math.min(w / 1760, h / 1080);
      if (this.engine.cameraMode === 'dinamica') scale *= 1.2;
      else if (this.engine.cameraMode === 'aerea') scale *= .86;
      else if (this.engine.cameraMode === 'classica') scale *= .82;
    }
    const ball = this.engine.ball;
    let x = 800, y = portrait ? 510 : 485;
    if (portrait || this.engine.cameraMode === 'dinamica') {
      const visibleW = w / scale;
      const halfW = visibleW / 2;
      x = clamp(ball.x, FIELD.x0 + halfW - 120, FIELD.x1 - halfW + 120);
      if (visibleW > 1600) x = 800;
      y = portrait ? 515 : 490 + (ball.z - 335) * .08;
    } else if (this.engine.cameraMode === 'aerea') {
      y = 455;
    } else if (this.engine.cameraMode === 'classica') {
      y = 495;
    }
    if (this.engine.replayState) {
      const frame = this.currentReplayFrame();
      if (frame) {
        const b = frame.ball;
        const visibleW = w / scale;
        const halfW = visibleW / 2;
        x = clamp(b.x, FIELD.x0 + halfW - 130, FIELD.x1 - halfW + 130);
        if (visibleW > 1600) x = 800;
        y = portrait ? 520 : 492;
      }
    }
    const sx = (Math.random() - .5) * this.engine.shake * 1.2;
    const sy = (Math.random() - .5) * this.engine.shake * 1.2;
    return { scale, x, y, w, h, sx, sy, portrait };
  }

  toScreen(x, z, view) {
    return {
      x: (x - view.x) * view.scale + view.w / 2 + view.sx,
      y: (150 + z - view.y) * view.scale + view.h / 2 + view.sy
    };
  }

  currentReplayFrame() {
    const rs = this.engine.replayState;
    if (!rs || !rs.frames?.length) return null;
    const elapsed = this.engine.elapsed - rs.started;
    const progress = clamp(elapsed / rs.duration, 0, 1);
    const idx = Math.min(rs.frames.length - 1, Math.floor(progress * rs.frames.length));
    return rs.frames[idx];
  }

  render(dt) {
    const eng = this.engine;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    const view = this.getView();
    this.view = view;

    if (eng.replayState && eng.replayState.frames?.length > 2) {
      const frame = this.currentReplayFrame();
      this.drawSky(view);
      this.drawStadium(view, false);
      this.drawPitch(view);
      this.drawGoalFrames(view);
      if (frame) this.drawReplayFrame(frame, view);
      this.drawWeather(view, dt);
      this.drawVignette();
      if (eng.elapsed - eng.replayState.started > eng.replayState.duration) {
        if (eng.replayState.manual) { eng.replayState = null; eng.hud.hideReplayTag(); }
        else if (eng.state !== 'goal') { eng.replayState = null; }
      }
      return;
    }

    this.drawSky(view);
    this.drawStadium(view, true);
    this.drawPitch(view);
    this.drawGoalFrames(view);
    this.drawAdBoards(view);
    this.drawPlayerShadows(view);
    this.drawPlayersAndBall(view, dt);
    this.drawWeather(view, dt);
    this.drawPostEffects(view);
    this.drawVignette();
  }

  drawSky(view) {
    const ctx = this.ctx;
    const weather = this.engine.weather.id;
    const g = ctx.createLinearGradient(0, 0, 0, this.h);
    if (weather === 'noite') {
      g.addColorStop(0, '#03080d'); g.addColorStop(.45, '#07161a'); g.addColorStop(1, '#04100d');
    } else if (weather === 'chuva') {
      g.addColorStop(0, '#101b20'); g.addColorStop(.5, '#162b26'); g.addColorStop(1, '#0a1712');
    } else if (weather === 'neve') {
      g.addColorStop(0, '#1a2a2b'); g.addColorStop(.5, '#2b4140'); g.addColorStop(1, '#13231e');
    } else if (weather === 'nublado') {
      g.addColorStop(0, '#0b1718'); g.addColorStop(.5, '#122823'); g.addColorStop(1, '#07110d');
    } else {
      g.addColorStop(0, '#061217'); g.addColorStop(.38, '#0b2623'); g.addColorStop(.72, '#0e3429'); g.addColorStop(1, '#07130e');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
    // Flutuação de luzes / lua
    if (weather === 'noite' || weather === 'nublado') {
      for (let i = 0; i < 30; i++) {
        const x = (i * 173 + 90) % this.w;
        const y = ((i * 97) % (this.h * .3)) + 20;
        const a = .15 + .3 * (.5 + .5 * Math.sin(this.engine.elapsed * .7 + i));
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(x, y, 1.2, 1.2);
      }
    }
    const glow = ctx.createRadialGradient(this.w * .15, 40, 10, this.w * .15, 40, this.h * .55);
    glow.addColorStop(0, 'rgba(200,255,61,.11)');
    glow.addColorStop(1, 'rgba(200,255,61,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  drawStadium(view, withCrowd) {
    const ctx = this.ctx;
    const eng = this.engine;
    const P = (x, y) => this.toScreen(x, y, view);
    const accent = eng.homeTeam.colors.primary;
    const accent2 = eng.awayTeam.colors.primary;

    // Top stand structure (behind pitch)
    const topBack = P(-500, -300);
    const topFront = P(2100, 150);
    const tg = ctx.createLinearGradient(0, topBack.y, 0, topFront.y);
    tg.addColorStop(0, '#030a08');
    tg.addColorStop(.55, '#0a1a14');
    tg.addColorStop(1, '#10251b');
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, this.w, Math.max(0, topFront.y));

    // Roof/truss lines
    ctx.strokeStyle = 'rgba(120,170,145,.13)';
    ctx.lineWidth = 1;
    for (let i = -3; i < 16; i++) {
      const x = (i * 150 - view.x * .18) * view.scale + this.w / 2;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 120 * view.scale, topFront.y * .55); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(200,255,61,.1)';
    ctx.beginPath();
    const ridge = P(0, -125);
    ctx.moveTo(0, ridge.y); ctx.lineTo(this.w, ridge.y - 5); ctx.stroke();

    // Top crowd tier
    if (withCrowd) {
      for (const c of this.crowd) {
        if (c.row !== 0) continue;
        const q = P(c.x, c.y);
        if (q.x < -10 || q.x > this.w + 10 || q.y < -10 || q.y > this.h) continue;
        const flick = .55 + .45 * Math.sin(eng.elapsed * c.sp + c.p);
        ctx.globalAlpha = .45 + .45 * flick;
        ctx.fillStyle = c.c;
        const s = Math.max(.8, c.s * view.scale * .9);
        ctx.fillRect(q.x, q.y, s, s * 1.5);
      }
      ctx.globalAlpha = 1;
    }

    // Top ad/banner strip
    const topBoard = P(0, 78);
    const topBoard2 = P(0, 148);
    ctx.fillStyle = '#07110c';
    ctx.fillRect(0, topBoard.y, this.w, Math.max(4, topBoard2.y - topBoard.y));
    ctx.strokeStyle = 'rgba(255,255,255,.09)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, topBoard.y, this.w, Math.max(4, topBoard2.y - topBoard.y));
    // top banners
    for (let i = 0; i < 12; i++) {
      const bx = ((i * 230 - view.x * .9) * view.scale + this.w / 2) % (this.w + 300) - 150;
      const q1 = P(0, 92), q2 = P(0, 136);
      const bh = q1.y - q2.y;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(200,255,61,.11)' : i % 3 === 1 ? 'rgba(54,229,192,.08)' : 'rgba(255,255,255,.04)';
      ctx.fillRect(bx, q1.y - 2, 190 * view.scale, Math.abs(bh) + 10);
      ctx.fillStyle = 'rgba(242,247,239,.38)';
      ctx.font = `700 ${Math.max(5, 8 * view.scale)}px "Segoe UI", sans-serif`;
      ctx.fillText(i % 3 === 0 ? 'PES 2027' : i % 3 === 1 ? 'FOOTBALL LIVES HERE' : 'STICKMAN 2D', bx + 10, q1.y + Math.abs(bh) * .5);
    }

    // Bottom stand
    const bottomStart = P(-500, 812);
    const bottomEnd = P(2100, 1120);
    const bg = ctx.createLinearGradient(0, bottomStart.y, 0, this.h);
    bg.addColorStop(0, '#0a1a13');
    bg.addColorStop(.4, '#08130e');
    bg.addColorStop(1, '#030806');
    ctx.fillStyle = bg;
    ctx.fillRect(0, Math.max(0, bottomStart.y), this.w, this.h - Math.max(0, bottomStart.y));

    // Bottom crowd
    if (withCrowd) {
      for (const c of this.crowd) {
        if (c.row !== 1) continue;
        const q = P(c.x, c.y);
        if (q.x < -10 || q.x > this.w + 10 || q.y < -10 || q.y > this.h) continue;
        const flick = .55 + .45 * Math.sin(eng.elapsed * c.sp + c.p);
        ctx.globalAlpha = .4 + .4 * flick;
        ctx.fillStyle = c.c;
        const s = Math.max(.8, c.s * view.scale * .9);
        ctx.fillRect(q.x, q.y, s, s * 1.5);
      }
      ctx.globalAlpha = 1;
    }

    // Lower ad boards
    const lowA = P(0, 770), lowB = P(0, 818);
    ctx.fillStyle = '#050d0a';
    ctx.fillRect(0, lowB.y, this.w, Math.max(4, lowA.y - lowB.y));
    ctx.strokeStyle = 'rgba(255,255,255,.09)';
    ctx.strokeRect(0, lowB.y, this.w, Math.max(4, lowA.y - lowB.y));
    for (let i = 0; i < 12; i++) {
      const bx = ((i * 250 - view.x * .9) * view.scale + this.w / 2) % (this.w + 320) - 160;
      const q1 = P(0, 792), q2 = P(0, 814);
      const hh = Math.abs(q2.y - q1.y);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(200,255,61,.13)' : 'rgba(255,255,255,.055)';
      ctx.fillRect(bx, Math.min(q1.y, q2.y), 206 * view.scale, hh + 6);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(7,17,12,.8)' : 'rgba(242,247,239,.45)';
      ctx.font = `800 ${Math.max(5, 8 * view.scale)}px "Segoe UI", sans-serif`;
      ctx.fillText(i % 2 === 0 ? 'PES 2027 · CENTRAL DE COMANDO' : 'LIBERTADORES · CHAMPIONS · BRASILEIRÃO', bx + 9, Math.min(q1.y, q2.y) + hh * .75);
    }

    // Floodlight towers
    const towers = [this.w * .13, this.w * .87];
    for (const tx of towers) {
      ctx.strokeStyle = 'rgba(180,210,195,.18)';
      ctx.lineWidth = Math.max(1, view.scale * 3);
      ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx + (tx < this.w / 2 ? 30 : -30), 100 + view.scale * 30); ctx.stroke();
      const lg = ctx.createRadialGradient(tx, 50, 2, tx, 50, 230);
      lg.addColorStop(0, 'rgba(235,255,205,.18)');
      lg.addColorStop(1, 'rgba(235,255,205,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(tx - 240, -30, 480, 330);
      ctx.fillStyle = 'rgba(230,255,200,.65)';
      for (let i = 0; i < 3; i++) ctx.fillRect(tx - 18 + i * 13, 44, 7, 5);
    }

    // Team flags on stands
    const flags = [
      { x: 380, color: accent, text: eng.homeTeam.abbr },
      { x: 650, color: accent2, text: eng.awayTeam.abbr },
      { x: 1050, color: accent, text: eng.homeTeam.abbr },
      { x: 1300, color: accent2, text: eng.awayTeam.abbr }
    ];
    for (const f of flags) {
      const q = P(f.x, 38);
      if (q.x < -80 || q.x > this.w + 80) continue;
      const wave = Math.sin(eng.elapsed * 2 + f.x) * 4;
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.moveTo(q.x, q.y - 32);
      ctx.lineTo(q.x + 44, q.y - 26 + wave);
      ctx.lineTo(q.x + 44, q.y + 4 + wave);
      ctx.lineTo(q.x, q.y - 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(7,17,12,.8)';
      ctx.font = `800 ${Math.max(5, 7.5 * view.scale)}px "Segoe UI", sans-serif`;
      ctx.fillText(f.text, q.x + 9, q.y - 11 + wave * .4);
      ctx.strokeStyle = 'rgba(255,255,255,.22)';
      ctx.beginPath(); ctx.moveTo(q.x, q.y - 36); ctx.lineTo(q.x, q.y + 26); ctx.stroke();
    }
  }

  drawPitch(view) {
    const ctx = this.ctx;
    const P = (x, z) => this.toScreen(x, z, view);
    const left = P(FIELD.x0, FIELD.z0);
    const right = P(FIELD.x1, FIELD.z1);
    const px = left.x;
    const py = left.y;
    const pw = right.x - left.x;
    const ph = right.y - left.y;

    // Surrounding track
    ctx.fillStyle = '#0b2319';
    ctx.fillRect(px - 48 * view.scale, py - 44 * view.scale, pw + 96 * view.scale, ph + 90 * view.scale);

    // Pitch base
    const grd = ctx.createLinearGradient(0, py, 0, py + ph);
    grd.addColorStop(0, '#176b3d');
    grd.addColorStop(.55, '#1d7d47');
    grd.addColorStop(1, '#146134');
    ctx.fillStyle = grd;
    ctx.fillRect(px, py, pw, ph);

    // Mowing stripes vertical
    const bands = 14;
    for (let i = 0; i < bands; i++) {
      const bx = px + (pw / bands) * i;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.045)';
      ctx.fillRect(bx, py, pw / bands, ph);
    }
    // depth shading
    const depth = ctx.createLinearGradient(0, py, 0, py + ph);
    depth.addColorStop(0, 'rgba(0,0,0,.28)');
    depth.addColorStop(.3, 'rgba(0,0,0,0)');
    depth.addColorStop(.8, 'rgba(255,255,255,.03)');
    depth.addColorStop(1, 'rgba(0,0,0,.12)');
    ctx.fillStyle = depth;
    ctx.fillRect(px, py, pw, ph);

    // field markings
    const lw = Math.max(1.2, view.scale * 2.6);
    ctx.strokeStyle = 'rgba(237,255,243,.74)';
    ctx.lineWidth = lw;
    ctx.strokeRect(px, py, pw, ph);

    const mid = P(FIELD.cx, FIELD.cz);
    ctx.beginPath(); ctx.moveTo(mid.x, py); ctx.lineTo(mid.x, py + ph); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(mid.x, mid.y, 105 * view.scale, 105 * view.scale, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(237,255,243,.85)';
    ctx.beginPath(); ctx.arc(mid.x, mid.y, lw * 1.4, 0, TAU); ctx.fill();

    // penalty areas
    const drawBox = (x0, z0, x1, z1) => {
      const a = P(x0, z0), b = P(x1, z1);
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    };
    drawBox(FIELD.x0, 190, FIELD.x0 + 238, 482);
    drawBox(FIELD.x1 - 238, 190, FIELD.x1, 482);
    drawBox(FIELD.x0, 276, FIELD.x0 + 92, 396);
    drawBox(FIELD.x1 - 92, 276, FIELD.x1, 396);

    // penalty spots and arcs
    const spotL = P(FIELD.x0 + 160, 335), spotR = P(FIELD.x1 - 160, 335);
    ctx.beginPath(); ctx.arc(spotL.x, spotL.y, lw * 1.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(spotR.x, spotR.y, lw * 1.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(spotL.x, spotL.y, 66 * view.scale, 66 * view.scale, 0, -1.05, 1.05); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(spotR.x, spotR.y, 66 * view.scale, 66 * view.scale, 0, Math.PI - 1.05, Math.PI + 1.05); ctx.stroke();

    // corner arcs
    for (const [cx, cz, a0, a1] of [[FIELD.x0, FIELD.z0, 0, Math.PI / 2], [FIELD.x1, FIELD.z0, Math.PI / 2, Math.PI], [FIELD.x1, FIELD.z1, Math.PI, Math.PI * 1.5], [FIELD.x0, FIELD.z1, Math.PI * 1.5, TAU]]) {
      const q = P(cx, cz);
      ctx.beginPath(); ctx.ellipse(q.x, q.y, 12 * view.scale, 12 * view.scale, 0, a0, a1); ctx.stroke();
    }

    // subtle grass texture
    ctx.globalAlpha = .12;
    for (let i = 0; i < 70; i++) {
      const gx = px + ((i * 97) % pw);
      const gy = py + ((i * 61) % ph);
      ctx.fillStyle = i % 2 ? 'rgba(0,0,0,.15)' : 'rgba(255,255,255,.12)';
      ctx.fillRect(gx, gy, 3, 1);
    }
    ctx.globalAlpha = 1;
  }

  drawGoalFrames(view) {
    const ctx = this.ctx;
    const P = (x, z) => this.toScreen(x, z, view);
    const s = view.scale;
    const drawGoal = (x, dir) => {
      const backX = x + dir * GOAL.depth;
      const z0 = GOAL.z0, z1 = GOAL.z1;
      const frontTopL = P(x, z0); const frontTopR = P(x, z1);
      const backTopL = P(backX, z0); const backTopR = P(backX, z1);
      const h = GOAL.height * s;
      // net fill
      ctx.fillStyle = 'rgba(6,14,10,.5)';
      ctx.beginPath();
      ctx.moveTo(frontTopL.x, frontTopL.y - h);
      ctx.lineTo(frontTopR.x, frontTopR.y - h);
      ctx.lineTo(backTopR.x, backTopR.y - h);
      ctx.lineTo(backTopL.x, backTopL.y - h);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.strokeStyle = 'rgba(225,245,235,.3)';
      ctx.lineWidth = Math.max(.5, s * .6);
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const z = lerp(z0, z1, t);
        const fa = P(x, z), ba = P(backX, z);
        ctx.beginPath(); ctx.moveTo(fa.x, fa.y - h); ctx.lineTo(fa.x, fa.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(fa.x, fa.y - h * t); ctx.lineTo(ba.x, ba.y - h * t); ctx.stroke();
      }
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const a = P(x, z0), b = P(backX, z1);
        const yy = a.y - h * t;
        ctx.beginPath(); ctx.moveTo(lerp(frontTopL.x, frontTopR.x, t), lerp(frontTopL.y, frontTopR.y, t) - h); ctx.lineTo(lerp(backTopL.x, backTopR.x, t), lerp(backTopL.y, backTopR.y, t) - h); ctx.stroke();
      }
      ctx.restore();
      // frame posts
      ctx.strokeStyle = 'rgba(245,252,248,.92)';
      ctx.lineWidth = Math.max(2, s * 3.4);
      ctx.beginPath();
      ctx.moveTo(frontTopL.x, frontTopL.y);
      ctx.lineTo(frontTopL.x, frontTopL.y - h);
      ctx.lineTo(frontTopR.x, frontTopR.y - h);
      ctx.lineTo(frontTopR.x, frontTopR.y);
      ctx.stroke();
      ctx.lineWidth = Math.max(1.2, s * 1.6);
      ctx.strokeStyle = 'rgba(245,252,248,.5)';
      ctx.beginPath();
      ctx.moveTo(backTopL.x, backTopL.y - h); ctx.lineTo(backTopR.x, backTopR.y - h);
      ctx.stroke();
      // goal line
      ctx.strokeStyle = 'rgba(245,252,248,.7)';
      ctx.lineWidth = Math.max(1.2, s * 2.4);
      ctx.beginPath(); ctx.moveTo(frontTopL.x, frontTopL.y); ctx.lineTo(frontTopR.x, frontTopR.y); ctx.stroke();
    };
    drawGoal(FIELD.x0, -1);
    drawGoal(FIELD.x1, 1);
  }

  drawAdBoards(view) {
    // integrated into stadium drawing
  }

  drawPlayerShadows(view) {
    const ctx = this.ctx;
    for (const p of this.engine.players) {
      if (p.sentOff) continue;
      const q = this.toScreen(p.x, p.z, view);
      const scale = view.scale * (0.82 + (p.z / FIELD.z1) * .32);
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.beginPath();
      ctx.ellipse(q.x, q.y + 1, 13 * scale, 5 * scale, 0, 0, TAU);
      ctx.fill();
    }
    const b = this.engine.ball;
    const bq = this.toScreen(b.x, b.z, view);
    const bs = view.scale * (0.9 + (b.z / FIELD.z1) * .25);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(bq.x, bq.y + 1, 7 * bs, 3.2 * bs, 0, 0, TAU); ctx.fill();
  }

  drawPlayersAndBall(view, dt) {
    const eng = this.engine;
    const list = eng.players.filter(p => !p.sentOff).sort((a, b) => a.z - b.z);
    for (const p of list) this.drawPlayer(p, view, false);
    this.drawBall(eng.ball, view);
  }

  drawPlayer(p, view, replay) {
    const ctx = this.ctx;
    const team = this.engine.sides[p.side].team;
    const q = this.toScreen(p.x, p.z, view);
    const s = view.scale * (0.84 + (p.z / FIELD.z1) * .35);
    const colors = team.colors;
    const isKeeper = p.pos === 'GOL';
    const shirt = isKeeper ? (colors.secondary === colors.primary ? colors.accent : colors.secondary) : colors.primary;
    const shorts = colors.shorts || colors.secondary;
    const socks = colors.socks || colors.primary;
    const skin = p.data?.skin || '#e0b088';
    const hair = p.data?.hair || '#2a1d14';
    const facing = (p.facing || 1) >= 0 ? 1 : -1;
    const run = p.state === 'run' ? 1 : 0;
    const phase = p.anim || 0;
    const bounce = run ? Math.abs(Math.sin(phase)) * 2.4 : Math.sin(phase * .7) * .6;
    let footY = q.y - bounce * s;
    let bodyLift = 0;
    let lean = 0;

    if (p.state === 'tackle') { bodyLift = 30 * s; lean = facing * 1.1; }
    if (p.state === 'dive') { bodyLift = 20 * s; lean = facing * 1.35; }
    if (p.state === 'celebrate') { footY -= Math.abs(Math.sin(this.engine.elapsed * 8 + p.slotIndex)) * 7 * s; }

    const hipY = footY - 44 * s;
    const shoulderY = footY - 81 * s - bodyLift;
    const headY = footY - 98 * s - bodyLift;
    const headR = 7.4 * s;
    const lw = Math.max(1.4, 5.4 * s);

    ctx.save();
    ctx.translate(q.x, 0);

    if (p.controlled) {
      const g = ctx.createRadialGradient(0, q.y, 2, 0, q.y, 24 * s);
      g.addColorStop(0, 'rgba(200,255,61,.32)');
      g.addColorStop(1, 'rgba(200,255,61,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, q.y, 26 * s, 10 * s, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(200,255,61,.9)';
      ctx.lineWidth = Math.max(1.2, s * 1.8);
      ctx.beginPath(); ctx.ellipse(0, q.y + 1, 16 * s, 6 * s, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(200,255,61,.95)';
      ctx.beginPath();
      ctx.moveTo(0, q.y - 115 * s);
      ctx.lineTo(-5 * s, q.y - 123 * s);
      ctx.lineTo(5 * s, q.y - 123 * s);
      ctx.closePath(); ctx.fill();
    }

    // Legs
    const legSwing = Math.sin(phase) * 13 * s * run;
    const legSwing2 = Math.sin(phase + Math.PI) * 13 * s * run;
    const legSpread = 4.2 * s;
    const kneeY = hipY + 22 * s;
    const drawLeg = (offset, swing, kick = 0) => {
      const hipX = offset;
      let kneeX = offset + swing * .5 + lean * 10 * s;
      let footX = offset + swing + kick * 19 * s * facing;
      let ky = kneeY, fy = footY;
      if (kick) { kneeX += facing * 10 * s; ky -= 3 * s; fy -= 9 * s; }
      ctx.strokeStyle = shorts;
      ctx.lineWidth = lw * 1.05;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, ky); ctx.stroke();
      ctx.strokeStyle = socks;
      ctx.lineWidth = lw * .82;
      ctx.beginPath(); ctx.moveTo(kneeX, ky); ctx.lineTo(footX, fy); ctx.stroke();
      ctx.fillStyle = p.data?.boots || '#f4f4f4';
      ctx.beginPath(); ctx.ellipse(footX + facing * 2 * s, fy + 1 * s, 5.2 * s, 2.7 * s, 0, 0, TAU); ctx.fill();
    };
    if (p.state === 'tackle' || p.state === 'dive') {
      ctx.save();
      ctx.translate(0, hipY);
      ctx.rotate(facing * 1.2);
      ctx.strokeStyle = shorts; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(facing * 25 * s, -3 * s); ctx.stroke();
      ctx.strokeStyle = socks; ctx.lineWidth = lw * .8;
      ctx.beginPath(); ctx.moveTo(facing * 25 * s, -3 * s); ctx.lineTo(facing * 40 * s, 5 * s); ctx.stroke();
      ctx.fillStyle = p.data?.boots || '#f4f4f4';
      ctx.beginPath(); ctx.ellipse(facing * 42 * s, 6 * s, 5 * s, 2.6 * s, 0, 0, TAU); ctx.fill();
      ctx.restore();
    } else {
      drawLeg(-legSpread, legSwing, p.kick > 0 ? 1 : 0);
      drawLeg(legSpread, legSwing2);
    }

    // Torso
    if (p.state === 'tackle' || p.state === 'dive') {
      ctx.save();
      ctx.translate(0, hipY);
      ctx.rotate(facing * (p.state === 'dive' ? 1.35 : 1.25));
      const bodyLen = 37 * s;
      ctx.strokeStyle = shirt; ctx.lineWidth = lw * 2.05; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-facing * bodyLen, 0); ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath(); ctx.arc(-facing * (bodyLen + 6 * s), -2 * s, headR, 0, TAU); ctx.fill();
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.arc(-facing * (bodyLen + 6 * s), -5 * s, headR * .9, Math.PI, TAU); ctx.fill();
      // arm extended
      ctx.strokeStyle = skin; ctx.lineWidth = lw * .7;
      ctx.beginPath(); ctx.moveTo(-facing * bodyLen * .7, 0); ctx.lineTo(-facing * (bodyLen + 21 * s), -12 * s); ctx.stroke();
      if (p.pos === 'GOL') {
        ctx.beginPath(); ctx.moveTo(-facing * bodyLen * .6, 0); ctx.lineTo(-facing * (bodyLen + 18 * s), 15 * s); ctx.stroke();
      }
      ctx.restore();
    } else {
      ctx.strokeStyle = shirt;
      ctx.lineWidth = lw * 2.15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, hipY + 3 * s);
      ctx.lineTo(lean * 8 * s, shoulderY + 4 * s);
      ctx.stroke();
      // chest contrast
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = lw * .48;
      ctx.beginPath();
      ctx.moveTo(-4 * s, hipY - 4 * s);
      ctx.lineTo(3 * s, shoulderY + 6 * s);
      ctx.stroke();
      // number
      ctx.save();
      ctx.translate(0, hipY - 18 * s);
      ctx.fillStyle = colors.secondary;
      ctx.font = `800 ${Math.max(3, 5.5 * s)}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(String(p.num || ''), 0, 0);
      ctx.restore();
    }

    // Arms
    if (p.state !== 'tackle' && p.state !== 'dive') {
      const armSwing = Math.sin(phase + Math.PI) * 11 * s * run;
      const armSwing2 = Math.sin(phase) * 11 * s * run;
      const drawArm = (offset, swing, up = false) => {
        const sx = offset + lean * 6 * s;
        const sy = shoulderY + 3 * s;
        const elbowX = offset + swing * .45 + facing * 4 * s;
        const elbowY = sy + 13 * s;
        let handX = offset + swing + facing * 3 * s;
        let handY = sy + 25 * s;
        if (up) { handX = sx + facing * 9 * s; handY = sy - 20 * s; }
        ctx.strokeStyle = shirt;
        ctx.lineWidth = lw * .85;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(elbowX, elbowY); ctx.stroke();
        ctx.strokeStyle = skin;
        ctx.lineWidth = lw * .66;
        ctx.beginPath(); ctx.moveTo(elbowX, elbowY); ctx.lineTo(handX, handY); ctx.stroke();
      };
      drawArm(-7 * s, armSwing, p.state === 'celebrate');
      drawArm(7 * s, armSwing2, p.state === 'celebrate');
    }

    // Head
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(lean * 10 * s, headY, headR, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.2)';
    ctx.lineWidth = .6;
    ctx.stroke();
    // hair
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(lean * 10 * s, headY - 1.6 * s, headR * .98, Math.PI * 1.02, TAU * .98);
    ctx.fill();
    if (isKeeper) {
      ctx.strokeStyle = '#c8ff3d'; ctx.lineWidth = Math.max(.8, 1.2 * s);
      ctx.beginPath(); ctx.arc(lean * 10 * s, headY, headR + 1.3 * s, Math.PI * .9, TAU * .9); ctx.stroke();
    }
    // focus marker
    if (p.hasBall) {
      const glow = ctx.createRadialGradient(0, footY, 1, 0, footY, 20 * s);
      glow.addColorStop(0, 'rgba(255,255,255,.18)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, footY, 20 * s, 0, TAU); ctx.fill();
    }
    ctx.restore();

    if (p.controlled && !replay) {
      ctx.save();
      ctx.fillStyle = 'rgba(4,12,8,.72)';
      const label = p.data?.name || '';
      ctx.font = `700 ${Math.max(6, 8 * s)}px "Segoe UI", sans-serif`;
      const tw = ctx.measureText(label).width + 12;
      ctx.beginPath();
      ctx.roundRect(q.x - tw / 2, q.y - 137 * s, tw, 14, 4);
      ctx.fill();
      ctx.fillStyle = '#c8ff3d';
      ctx.textAlign = 'center';
      ctx.fillText(label, q.x, q.y - 127 * s);
      ctx.restore();
    }
  }

  drawBall(ball, view) {
    const ctx = this.ctx;
    const q = this.toScreen(ball.x, ball.z, view);
    const s = view.scale * (0.9 + (ball.z / FIELD.z1) * .24);
    const y = q.y - ball.y * s * .75;
    const r = Math.max(3.5, 6.2 * s);
    // trail
    if (Math.hypot(ball.vx, ball.vz) > 250) {
      for (let i = 0; i < ball.trail.length; i += 2) {
        const t = ball.trail[i];
        const tq = this.toScreen(t.x, t.z, view);
        const ty = tq.y - t.y * s * .75;
        const a = i / ball.trail.length * .18;
        ctx.fillStyle = `rgba(200,255,61,${a})`;
        ctx.beginPath(); ctx.arc(tq.x, ty, r * (.4 + i / ball.trail.length * .5), 0, TAU); ctx.fill();
      }
    }
    // glow
    const glow = ctx.createRadialGradient(q.x, y, 1, q.x, y, r * 2.8);
    glow.addColorStop(0, 'rgba(255,255,255,.22)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(q.x, y, r * 2.8, 0, TAU); ctx.fill();
    // ball
    ctx.save();
    ctx.translate(q.x, y);
    ctx.rotate(ball.spin || 0);
    ctx.fillStyle = '#f8fbf6';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(8,18,12,.75)';
    ctx.lineWidth = Math.max(.6, r * .16);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#0a140e';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2;
      const rr = r * .42;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(10,20,14,.55)';
    ctx.lineWidth = Math.max(.4, r * .1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * .92, Math.sin(a) * r * .92); ctx.stroke();
    }
    ctx.restore();
  }

  drawReplayFrame(frame, view) {
    const ctx = this.ctx;
    const eng = this.engine;
    const players = [...frame.players].sort((a, b) => a.z - b.z);
    for (const fp of players) {
      const team = eng.sides[fp.side]?.team;
      const stub = {
        side: fp.side, x: fp.x, z: fp.z, facing: fp.facing, state: fp.state, anim: fp.anim,
        num: fp.num, pos: fp.pos, data: { skin: '#e0b088', hair: '#2a1d14', boots: '#f4f4f4', name: '' },
        controlled: false, sentOff: false
      };
      if (team) {
        const q = this.toScreen(fp.x, fp.z, view);
        const s = view.scale * (0.84 + (fp.z / FIELD.z1) * .35);
        ctx.fillStyle = 'rgba(0,0,0,.3)';
        ctx.beginPath(); ctx.ellipse(q.x, q.y + 1, 13 * s, 5 * s, 0, 0, TAU); ctx.fill();
      }
      this.drawPlayer(stub, view, true);
    }
    const b = frame.ball;
    this.drawBall({ x: b.x, z: b.z, y: b.y, vx: 0, vz: 0, trail: [], spin: 0 }, view);
    // Letterbox + tag
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.75)';
    ctx.fillRect(0, 0, this.w, 26 * Math.min(1, view.scale * 2));
    ctx.fillRect(0, this.h - 26 * Math.min(1, view.scale * 2), this.w, 26 * Math.min(1, view.scale * 2));
    ctx.fillStyle = '#c8ff3d';
    ctx.font = `800 ${Math.max(8, 10 * view.scale)}px "Segoe UI", sans-serif`;
    ctx.fillText('● REPLAY', 16, 19 * Math.min(1, view.scale * 2));
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.font = `600 ${Math.max(7, 8 * view.scale)}px "Segoe UI", sans-serif`;
    ctx.fillText('PES 2027 STICKMAN 2D', this.w - 130, 19 * Math.min(1, view.scale * 2));
    ctx.restore();
  }

  drawWeather(view, dt) {
    const eng = this.engine;
    const weather = eng.weather.id;
    const ctx = this.ctx;
    if (weather === 'chuva') {
      ctx.save();
      ctx.strokeStyle = 'rgba(155,205,225,.28)';
      ctx.lineWidth = 1;
      for (const p of this.rain) {
        p.y += p.v * dt * 1.8;
        p.x += p.drift * dt;
        if (p.y > 1.05) { p.y = -.05; p.x = Math.random(); }
        const x = p.x * this.w + view.sx * 2;
        const y = p.y * this.h;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y + 14 * p.s); ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(40,85,95,.08)';
      ctx.fillRect(0, 0, this.w, this.h);
    } else if (weather === 'neve') {
      ctx.save();
      ctx.fillStyle = 'rgba(240,250,250,.7)';
      for (const p of this.snow) {
        p.y += p.v * dt * .45;
        p.x += Math.sin(eng.elapsed * .7 + p.y * 10) * dt * .012;
        if (p.y > 1.02) { p.y = -.02; p.x = Math.random(); }
        ctx.globalAlpha = p.a * .65;
        ctx.beginPath(); ctx.arc(p.x * this.w, p.y * this.h, p.s * 1.1, 0, TAU); ctx.fill();
      }
      ctx.restore();
    } else if (weather === 'noite') {
      ctx.fillStyle = 'rgba(2,14,20,.12)';
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }

  drawPostEffects(view) {
    const eng = this.engine;
    if (eng.state === 'goal') {
      if (!this.confetti.length) this.spawnConfetti();
      const ctx = this.ctx;
      for (const c of this.confetti) {
        c.x += c.vx * .016;
        c.y += c.vy * .016;
        c.vy += 8.2;
        c.rot += c.spin * .016;
        if (c.y > this.h + 20) c.y = -20, c.vy = -2;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      }
    } else if (this.confetti.length) {
      this.confetti = [];
    }
    // charge indicator
    for (const side of ['home', 'away']) {
      const st = side === 'home' ? eng.action : eng.action2;
      if (!st.chargeHeld) continue;
      const p = eng.getControlled(side);
      if (!p) continue;
      const q = this.toScreen(p.x, p.z, view);
      const s = view.scale;
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.beginPath(); ctx.roundRect(q.x - 28 * s, q.y - 142 * s, 56 * s, 6 * s, 3 * s); ctx.fill();
      const g = ctx.createLinearGradient(q.x - 28 * s, 0, q.x + 28 * s, 0);
      g.addColorStop(0, '#36e5c0'); g.addColorStop(.6, '#c8ff3d'); g.addColorStop(1, '#ff7b3c');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(q.x - 28 * s, q.y - 142 * s, 56 * s * st.charge, 6 * s, 3 * s); ctx.fill();
      ctx.restore();
    }
  }

  spawnConfetti() {
    const eng = this.engine;
    const colors = [eng.homeTeam.colors.primary, eng.homeTeam.colors.secondary, eng.awayTeam.colors.primary, '#c8ff3d', '#ffffff', '#ffd84a'];
    this.confetti = Array.from({ length: 150 }, () => ({
      x: Math.random() * this.w,
      y: -30 - Math.random() * this.h * .35,
      vx: (Math.random() - .5) * 40,
      vy: 40 + Math.random() * 70,
      rot: Math.random() * TAU,
      spin: (Math.random() - .5) * 7,
      w: 3 + Math.random() * 6,
      h: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
  }

  drawVignette() {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * .3, this.w / 2, this.h / 2, Math.max(this.w, this.h) * .72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
    // scanline subtle
    if (this.engine.quality !== 'baixa') {
      ctx.globalAlpha = .028;
      ctx.fillStyle = '#000';
      for (let y = 0; y < this.h; y += 4) ctx.fillRect(0, y, this.w, 1);
      ctx.globalAlpha = 1;
    }
  }
}
