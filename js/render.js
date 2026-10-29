import { clamp, lerp, damp, RNG, rgba, mix, hexToRgb, TAU, dist } from './util.js';
import { FIELD } from './match.js';

const DEPTH = 0.84;

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

export class Renderer {
  constructor(gameCanvas, bgCanvas, audio) {
    this.canvas = gameCanvas;
    this.bgCanvas = bgCanvas;
    this.ctx = gameCanvas.getContext('2d', { alpha: false });
    this.bgCtx = bgCanvas.getContext('2d', { alpha: false });
    this.audio = audio;
    this.dpr = 1;
    this.w = 1; this.h = 1;
    this.bw = 1; this.bh = 1;
    this.quality = 'auto';
    this.cam = { x: FIELD.cx, y: FIELD.cy, zoom: .9, shakeX: 0, shakeY: 0 };
    this.t = 0;
    this.crowd = [];
    this.grassPattern = null;
    this.weatherParts = [];
    this.confetti = [];
    this.flashes = [];
    this.menuT = 0;
    this.resize();
    this.buildEffects();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 150));
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.w = w; this.h = h;
    let dpr = window.devicePixelRatio || 1;
    if (this.quality === 'low') dpr = Math.min(dpr, 1);
    else if (this.quality === 'medium') dpr = Math.min(dpr, 1.5);
    else if (this.quality === 'high') dpr = Math.min(dpr, 2);
    else dpr = Math.min(dpr, w * h > 1400 * 800 ? 1.5 : 2);
    this.dpr = dpr;
    for (const c of [this.canvas, this.bgCanvas]) {
      c.width = Math.max(1, Math.floor(w * dpr));
      c.height = Math.max(1, Math.floor(h * dpr));
      c.style.width = w + 'px';
      c.style.height = h + 'px';
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.bw = w; this.bh = h;
    this.grassPattern = null;
  }

  setQuality(q) {
    this.quality = q;
    this.resize();
    this.buildEffects();
  }

  buildEffects() {
    const rng = new RNG('crowd');
    const count = this.quality === 'low' ? 260 : this.quality === 'medium' ? 440 : 620;
    this.crowd = [];
    const palette = ['#ffcf4a', '#ff5a6a', '#59b6ff', '#ffffff', '#9be37d', '#c89bff', '#ff9a3d', '#53d7d7', '#28384a'];
    for (let i = 0; i < count; i++) {
      const top = rng.chance(.56);
      this.crowd.push({
        x: rng.range(-360, FIELD.w + 360),
        y: top ? rng.range(-350, -42) : rng.range(FIELD.h + 42, FIELD.h + 350),
        c: rng.pick(palette),
        s: rng.range(.9, 2.3),
        ph: rng.range(0, TAU)
      });
    }
    for (let i = 0; i < 18; i++) {
      this.flashes.push({ x: rng.range(-200, FIELD.w + 200), y: rng.chance(.6) ? rng.range(-300, -60) : rng.range(FIELD.h + 60, FIELD.h + 300), t: rng.range(0, 8), sp: rng.range(1.6, 4.2) });
    }
    this.weatherParts = [];
    const pcount = this.quality === 'low' ? 60 : this.quality === 'medium' ? 120 : 190;
    for (let i = 0; i < pcount; i++) {
      this.weatherParts.push({ x: Math.random() * this.w, y: Math.random() * this.h, v: 300 + Math.random() * 500, l: 8 + Math.random() * 18, d: Math.random() * TAU, s: .8 + Math.random() * 1.8 });
    }
  }

  buildGrass() {
    if (this.grassPattern) return;
    const c = document.createElement('canvas');
    c.width = 200; c.height = 200;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 200, 200);
    const rng = new RNG('grass42');
    for (let i = 0; i < 340; i++) {
      g.strokeStyle = rng.chance(.5) ? 'rgba(255,255,255,0.05)' : 'rgba(0,30,10,0.11)';
      g.lineWidth = rng.range(.4, 1.1);
      const x = rng.range(0, 200), y = rng.range(0, 200);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + rng.range(-1.5, 1.5), y - rng.range(1.5, 5)); g.stroke();
    }
    for (let i = 0; i < 90; i++) {
      g.fillStyle = 'rgba(255,255,255,0.025)';
      g.fillRect(rng.range(0, 200), rng.range(0, 200), rng.range(1, 3), 1);
    }
    this.grassPattern = this.ctx.createPattern(c, 'repeat');
  }

  project(x, y, z = 0) {
    const cam = this.cam;
    return {
      x: (x - cam.x) * cam.zoom + this.w / 2 + cam.shakeX,
      y: (y - cam.y) * cam.zoom * DEPTH + this.h / 2 - z * cam.zoom + cam.shakeY
    };
  }
  depthScale(y) { return this.cam.zoom * (0.74 + 0.38 * clamp(y / FIELD.h, 0, 1)); }

  updateCamera(match, dt, replay = false) {
    let targetX, targetY, viewW;
    const mode = replay ? 'close' : match.cameraMode;
    if (mode === 'close') viewW = 700;
    else if (mode === 'tv') viewW = 1260;
    else if (mode === 'wide') viewW = 2000;
    else viewW = clamp(960 + Math.abs(match.ball.x - FIELD.cx) * .22, 940, 1220);
    if (match.phase === 'penalty' && match.penalty) {
      viewW = 760;
      targetX = match.attackX(match.penalty.side) - match.dir(match.penalty.side) * 140;
      targetY = FIELD.cy;
    } else {
      targetX = replay ? (match.replayFrame?.ball.x ?? match.ball.x) : match.ball.x + match.ball.vx * .11;
      targetY = replay ? (match.replayFrame?.ball.y ?? match.ball.y) : match.ball.y + match.ball.vy * .08;
    }
    const zoom = clamp(this.w / viewW, .32, 1.65);
    const viewH = this.h / (zoom * DEPTH);
    const halfW = viewW / 2 - 95, halfH = viewH / 2 - 80;
    if (viewW > FIELD.w + 260) targetX = FIELD.cx;
    else targetX = clamp(targetX, halfW, FIELD.w - halfW);
    if (viewH > FIELD.h + 180) targetY = FIELD.cy;
    else targetY = clamp(targetY, halfH, FIELD.h - halfH);
    if (mode === 'close' || replay) {
      targetX = clamp(targetX, 320, FIELD.w - 320);
      targetY = clamp(targetY, 240, FIELD.h - 240);
    }
    const smooth = replay ? 7 : (mode === 'wide' ? 3.2 : 5.4);
    this.cam.x = damp(this.cam.x, targetX, smooth, dt);
    this.cam.y = damp(this.cam.y, targetY, smooth, dt);
    this.cam.zoom = damp(this.cam.zoom, zoom, replay ? 5 : 3.8, dt);
    const shake = match.cameraShake || 0;
    this.cam.shakeX = (Math.random() - .5) * shake;
    this.cam.shakeY = (Math.random() - .5) * shake * .6;
  }

  draw(match, dt) {
    this.t += dt;
    this.updateCamera(match, dt, match.phase === 'replay');
    this.drawScene(match);
  }

  drawScene(match) {
    const ctx = this.ctx;
    const weather = match.weather;
    const dark = weather === 'night' || match.stadium?.theme === 'elite';
    ctx.save();
    this.drawSky(weather);
    this.drawStands(match, weather);
    this.drawFloodlights(weather, dark);
    this.drawPitch(match, weather);
    this.drawAdvertising(match);
    this.drawGoals(match);
    const replay = match.phase === 'replay' && match.replayFrame;
    if (replay) this.drawReplayFrame(match);
    else {
      this.drawShadows(match);
      this.drawPlayers(match);
      this.drawBall(match);
    }
    this.drawWeather(match, weather);
    this.drawLighting(match, dark);
    this.drawVignette();
    ctx.restore();
  }

  drawSky(weather) {
    const ctx = this.ctx, w = this.w, h = this.h;
    let top = '#0a2038', bottom = '#06121f';
    if (weather === 'clear' || weather === 'day') { top = '#1a4d73'; bottom = '#0c2a40'; }
    else if (weather === 'cloudy') { top = '#283c4e'; bottom = '#101f2b'; }
    else if (weather === 'rain') { top = '#162936'; bottom = '#071018'; }
    else if (weather === 'snow') { top = '#445c6e'; bottom = '#152430'; }
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top); g.addColorStop(.62, bottom); g.addColorStop(1, '#040b12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w * .5, h * .2, 10, w * .5, h * .25, h * .9);
    glow.addColorStop(0, weather === 'clear' || weather === 'day' ? 'rgba(120,210,255,.14)' : 'rgba(80,160,230,.09)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }

  drawStands(match, weather) {
    const ctx = this.ctx;
    const p1 = this.project(-420, -430), p2 = this.project(FIELD.w + 420, -430);
    const p3 = this.project(FIELD.w + 420, 0), p4 = this.project(-420, 0);
    const b1 = this.project(-420, FIELD.h), b2 = this.project(FIELD.w + 420, FIELD.h);
    const b3 = this.project(FIELD.w + 420, FIELD.h + 430), b4 = this.project(-420, FIELD.h + 430);
    ctx.fillStyle = '#0a1724';
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill();
    const g = ctx.createLinearGradient(0, p1.y, 0, p4.y);
    g.addColorStop(0, '#0b1b2b'); g.addColorStop(.55, '#16344d'); g.addColorStop(1, '#0c2134');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill();
    const gb = ctx.createLinearGradient(0, b1.y, 0, b4.y);
    gb.addColorStop(0, '#0d2336'); gb.addColorStop(1, '#08131f');
    ctx.fillStyle = gb;
    ctx.beginPath(); ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(b3.x, b3.y); ctx.lineTo(b4.x, b4.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,180,220,.10)'; ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const yy = -430 + i * 60;
      const a = this.project(-420, yy), b = this.project(FIELD.w + 420, yy);
      line(ctx, a.x, a.y, b.x, b.y);
      const c = this.project(-420, FIELD.h + 430 - i * 60), d = this.project(FIELD.w + 420, FIELD.h + 430 - i * 60);
      line(ctx, c.x, c.y, d.x, d.y);
    }
    for (const c of this.crowd) {
      const p = this.project(c.x, c.y, 8 + Math.sin(this.t * 3 + c.ph) * 2);
      if (p.x < -8 || p.x > this.w + 8 || p.y < -8 || p.y > this.h + 8) continue;
      const s = c.s * clamp(this.cam.zoom * .85, .5, 1.4);
      ctx.globalAlpha = .55 + Math.sin(this.t * 2.2 + c.ph) * .17;
      ctx.fillStyle = c.c;
      ctx.fillRect(p.x, p.y, s, s);
    }
    ctx.globalAlpha = 1;
    for (const f of this.flashes) {
      const p = this.project(f.x, f.y, 10);
      if (p.x < 0 || p.x > this.w || p.y < 0 || p.y > this.h) continue;
      const a = Math.max(0, Math.sin(this.t * f.sp + f.t));
      if (a > .93) {
        ctx.globalAlpha = (a - .93) * 8;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    const banners = [
      { text: match.home.short + ' · ' + match.home.name.toUpperCase(), color: match.home.colors.primary, x: -60 },
      { text: 'PES 2027 STICKMAN', color: '#0f4f8a', x: 460 },
      { text: match.away.name.toUpperCase() + ' · ' + match.away.short, color: match.away.colors.primary, x: 1040 }
    ];
    ctx.textAlign = 'center';
    for (const bn of banners) {
      const a = this.project(bn.x + 130, -250), b = this.project(bn.x + 330, -250);
      const w = Math.abs(b.x - a.x), x = (a.x + b.x) / 2, y = a.y;
      if (x < -200 || x > this.w + 200) continue;
      ctx.globalAlpha = .3;
      ctx.fillStyle = bn.color;
      ctx.fillRect(x - w / 2, y - 8, w, 18);
      ctx.globalAlpha = .55;
      ctx.fillStyle = '#eaf6ff';
      ctx.font = `900 ${clamp(w / Math.max(7, bn.text.length) * 1.25, 6, 12)}px Arial Narrow, Arial`;
      ctx.fillText(bn.text, x, y + 5);
    }
    ctx.globalAlpha = 1;
  }

  drawFloodlights(weather, dark) {
    const ctx = this.ctx;
    const spots = [[-260, -330], [FIELD.w + 260, -330], [-260, FIELD.h + 330], [FIELD.w + 260, FIELD.h + 330]];
    for (const [x, y] of spots) {
      const p = this.project(x, y, 320);
      if (p.x < -200 || p.x > this.w + 200 || p.y < -200 || p.y > this.h + 200) continue;
      const h = this.project(x, y, 0);
      ctx.strokeStyle = '#152433'; ctx.lineWidth = Math.max(2, this.cam.zoom * 4);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(h.x, h.y); ctx.stroke();
      ctx.fillStyle = '#dff6ff';
      ctx.shadowColor = '#bfeaff'; ctx.shadowBlur = 26;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2, this.cam.zoom * 5), 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = dark ? .11 : .06;
      const beam = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(180, this.h * .7));
      beam.addColorStop(0, 'rgba(200,240,255,.8)'); beam.addColorStop(1, 'rgba(200,240,255,0)');
      ctx.fillStyle = beam;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - this.w * .3, this.h); ctx.lineTo(p.x + this.w * .3, this.h); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawPitch(match, weather) {
    const ctx = this.ctx;
    this.buildGrass();
    const tl = this.project(0, 0), br = this.project(FIELD.w, FIELD.h);
    const x = Math.min(tl.x, br.x), y = Math.min(tl.y, br.y);
    const w = Math.abs(br.x - tl.x), h = Math.abs(br.y - tl.y);
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.fillRect(x - 14, y - 14, w + 28, h + 28);
    const base = weather === 'snow' ? '#2d5b42' : weather === 'rain' ? '#145232' : '#1c6b3c';
    ctx.fillStyle = base;
    ctx.fillRect(x, y, w, h);
    const stripes = 16;
    for (let i = 0; i < stripes; i++) {
      const wx = i * FIELD.w / stripes;
      const a = this.project(wx, 0), b = this.project(wx + FIELD.w / stripes, FIELD.h);
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.038)' : 'rgba(0,28,10,.07)';
      ctx.fillRect(a.x, Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    }
    if (this.grassPattern) {
      ctx.save();
      ctx.globalAlpha = .5;
      ctx.fillStyle = this.grassPattern;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(0,0,0,.16)'); g.addColorStop(.35, 'rgba(255,255,255,.025)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(238,250,255,.82)';
    ctx.lineWidth = clamp(this.cam.zoom * 2.2, 1, 3);
    ctx.beginPath();
    this.pathLine(ctx, 0, 0, FIELD.w, 0); this.pathLine(ctx, FIELD.w, 0, FIELD.w, FIELD.h);
    this.pathLine(ctx, FIELD.w, FIELD.h, 0, FIELD.h); this.pathLine(ctx, 0, FIELD.h, 0, 0);
    ctx.stroke();
    ctx.lineWidth = clamp(this.cam.zoom * 1.8, 1, 2.4);
    ctx.beginPath();
    this.pathLine(ctx, FIELD.cx, 0, FIELD.cx, FIELD.h); ctx.stroke();
    this.ellipsePath(ctx, FIELD.cx, FIELD.cy, FIELD.centerR, FIELD.centerR);
    ctx.stroke();
    const spot = this.project(FIELD.cx, FIELD.cy);
    ctx.fillStyle = 'rgba(238,250,255,.85)';
    ctx.beginPath(); ctx.arc(spot.x, spot.y, Math.max(1.4, this.cam.zoom * 2.2), 0, TAU); ctx.fill();
    ctx.beginPath();
    this.rectPath(ctx, 0, FIELD.cy - FIELD.boxHalf, FIELD.boxDepth, FIELD.boxHalf * 2);
    this.rectPath(ctx, FIELD.w - FIELD.boxDepth, FIELD.cy - FIELD.boxHalf, FIELD.boxDepth, FIELD.boxHalf * 2);
    this.rectPath(ctx, 0, FIELD.cy - FIELD.sixHalf, FIELD.sixDepth, FIELD.sixHalf * 2);
    this.rectPath(ctx, FIELD.w - FIELD.sixDepth, FIELD.cy - FIELD.sixHalf, FIELD.sixDepth, FIELD.sixHalf * 2);
    ctx.stroke();
    for (const px of [FIELD.penSpot, FIELD.w - FIELD.penSpot]) {
      const p = this.project(px, FIELD.cy);
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.2, this.cam.zoom * 1.9), 0, TAU); ctx.fill();
    }
    this.ellipseArcPath(ctx, FIELD.penSpot, FIELD.cy, 72, -.9, .9); ctx.stroke();
    this.ellipseArcPath(ctx, FIELD.w - FIELD.penSpot, FIELD.cy, 72, Math.PI - .9, Math.PI + .9); ctx.stroke();
    for (const [cx, cy, a1, a2] of [[0, 0, 0, Math.PI / 2], [FIELD.w, 0, Math.PI / 2, Math.PI], [FIELD.w, FIELD.h, Math.PI, Math.PI * 1.5], [0, FIELD.h, Math.PI * 1.5, TAU]]) {
      this.ellipseArcPath(ctx, cx, cy, 14, a1, a2); ctx.stroke();
    }
  }

  pathLine(ctx, x1, y1, x2, y2) {
    const a = this.project(x1, y1), b = this.project(x2, y2);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }
  rectPath(ctx, x, y, w, h) {
    const a = this.project(x, y), b = this.project(x + w, y), c = this.project(x + w, y + h), d = this.project(x, y + h);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
  }
  ellipsePath(ctx, x, y, rx, ry) {
    const c = this.project(x, y);
    ctx.moveTo(c.x + rx * this.cam.zoom, c.y);
    ctx.ellipse(c.x, c.y, rx * this.cam.zoom, ry * this.cam.zoom * DEPTH, 0, 0, TAU);
  }
  ellipseArcPath(ctx, x, y, r, a1, a2) {
    const c = this.project(x, y);
    ctx.moveTo(c.x + Math.cos(a1) * r * this.cam.zoom, c.y + Math.sin(a1) * r * this.cam.zoom * DEPTH);
    ctx.ellipse(c.x, c.y, r * this.cam.zoom, r * this.cam.zoom * DEPTH, 0, a1, a2);
  }

  drawAdvertising(match) {
    const ctx = this.ctx;
    const sponsors = ['PES 2027', 'STICKMAN', 'OMGITHUB', 'MASTER LEAGUE', 'LIBERTADORES', 'CHAMPIONS', 'BRASILEIRÃO', 'COPA DO MUNDO'];
    for (const [yy, flip] of [[-24, 1], [FIELD.h + 24, -1]]) {
      for (let i = 0; i < 10; i++) {
        const x0 = -160 + i * 200;
        const a = this.project(x0, yy), b = this.project(x0 + 194, yy);
        const w = Math.abs(b.x - a.x);
        if (w < 3) continue;
        const center = (a.x + b.x) / 2;
        if (center < -80 || center > this.w + 80) continue;
        const bh = clamp(this.cam.zoom * 24, 7, 20);
        ctx.fillStyle = i % 2 ? '#0b2740' : '#e8f7ff';
        ctx.globalAlpha = .82;
        ctx.fillRect(Math.min(a.x, b.x), a.y - (flip > 0 ? bh : 0), w, bh);
        ctx.globalAlpha = .9;
        ctx.fillStyle = i % 2 ? '#9fe6ff' : '#0a3357';
        ctx.font = `900 ${clamp(bh * .54, 4, 11)}px Arial Narrow, Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(sponsors[(i + (yy > 0 ? 3 : 0)) % sponsors.length], center, a.y + (flip > 0 ? bh * .72 : bh * .72));
      }
    }
    ctx.globalAlpha = 1;
  }

  drawGoals(match) {
    this.drawOneGoal(this.project(0, FIELD.cy - FIELD.goalHalf), this.project(0, FIELD.cy + FIELD.goalHalf), 1);
    this.drawOneGoal(this.project(FIELD.w, FIELD.cy - FIELD.goalHalf), this.project(FIELD.w, FIELD.cy + FIELD.goalHalf), -1);
  }

  drawOneGoal(top, bottom, dir) {
    const ctx = this.ctx;
    const z = FIELD.goalHeight;
    const h = z * this.cam.zoom;
    const depth = 62 * this.cam.zoom;
    ctx.save();
    ctx.strokeStyle = 'rgba(230,248,255,.30)';
    ctx.lineWidth = .8;
    const cols = 12, rows = 6;
    for (let i = 0; i <= cols; i++) {
      const t = i / cols;
      const x = lerp(top.x, bottom.x, t);
      ctx.beginPath(); ctx.moveTo(x, top.y - h); ctx.lineTo(x - dir * depth, top.y - h - 16); ctx.stroke();
      const x2 = lerp(top.x, bottom.x, t);
      ctx.beginPath(); ctx.moveTo(x2, bottom.y); ctx.lineTo(x2 - dir * depth, bottom.y - 16); ctx.stroke();
    }
    for (let i = 0; i <= rows; i++) {
      const t = i / rows;
      const y1 = top.y - h + t * (bottom.y - top.y + h);
      ctx.beginPath(); ctx.moveTo(top.x, y1); ctx.lineTo(top.x - dir * depth, y1 - 16); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(240,252,255,.94)';
    ctx.lineWidth = clamp(this.cam.zoom * 3.6, 1.5, 5);
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(top.x, top.y - h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bottom.x, bottom.y); ctx.lineTo(bottom.x, bottom.y - h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(top.x, top.y - h); ctx.lineTo(bottom.x, bottom.y - h); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(top.x, top.y, 5 * this.cam.zoom, 2 * this.cam.zoom, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(bottom.x, bottom.y, 5 * this.cam.zoom, 2 * this.cam.zoom, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = .2;
    ctx.fillStyle = '#04111c';
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bottom.x, bottom.y); ctx.lineTo(bottom.x - dir * depth, bottom.y - 16); ctx.lineTo(top.x - dir * depth, top.y - 16); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  drawShadows(match) {
    const ctx = this.ctx;
    for (const p of match.players) {
      if (!p.active) continue;
      const base = this.project(p.x, p.y, 0);
      const s = this.depthScale(p.y);
      const z = p.z || 0;
      ctx.fillStyle = `rgba(0,10,5,${clamp(.28 - z * .001, .08, .3)})`;
      ctx.beginPath();
      ctx.ellipse(base.x + 2, base.y + 1, 14 * s * (1 + z * .001), 4.6 * s * (1 + z * .001), 0, 0, TAU);
      ctx.fill();
    }
    const b = match.ball;
    const bp = this.project(b.x, b.y, 0);
    const bs = this.depthScale(b.y);
    ctx.fillStyle = 'rgba(0,8,4,.26)';
    ctx.beginPath(); ctx.ellipse(bp.x + 2, bp.y + 1, 6.4 * bs * (1 + b.z * .002), 2.4 * bs, 0, 0, TAU); ctx.fill();
  }

  kitColors(match, p) {
    const team = p.side === 'home' ? match.home : match.away;
    const c = team.colors;
    const other = p.side === 'home' ? match.away : match.home;
    let primary = p.isGK ? c.gk : c.primary;
    const secondary = c.secondary;
    if (!p.isGK) {
      const d = Math.abs(hexToRgb(primary).r - hexToRgb(other.colors.primary).r) + Math.abs(hexToRgb(primary).g - hexToRgb(other.colors.primary).g) + Math.abs(hexToRgb(primary).b - hexToRgb(other.colors.primary).b);
      if (d < 110) primary = c.secondary;
    }
    return { primary, secondary: secondary === primary ? '#ffffff' : secondary, accent: c.accent, shorts: p.isGK ? c.gk : c.shorts, socks: p.isGK ? c.gk : c.socks };
  }

  drawPlayers(match) {
    const list = match.players.filter(p => p.active).slice().sort((a, b) => a.y - b.y);
    for (const p of list) {
      const controlled = match.control[p.side] === p && (p.side === match.userSide || p.side === match.p2Side);
      this.drawStickman(p, match, controlled);
    }
  }

  drawStickman(p, match, controlled) {
    const ctx = this.ctx;
    const base = this.project(p.x, p.y, p.z || 0);
    const s = this.depthScale(p.y);
    if (base.x < -60 || base.x > this.w + 60 || base.y < -28 || base.y > this.h + 60) return;
    const c = this.kitColors(match, p);
    const state = p.state || 'idle';
    const run = state === 'run' || state === 'sprint';
    const phase = p.animPhase || 0;
    const swing = run ? Math.sin(phase) * (state === 'sprint' ? 1.15 : .85) : Math.sin(this.t * 1.8 + (p.slot || 0)) * .06;
    const facing = p.facing >= 0 ? 1 : -1;
    const hipY = -42 * s;
    const shoulderY = -68 * s;
    const headY = -81 * s;
    const headR = 7.8 * s;
    const lw = Math.max(1.5, 3.1 * s);
    const lwLeg = Math.max(1.8, 3.8 * s);
    ctx.save();
    ctx.translate(base.x, base.y);
    if (controlled) {
      const pulse = .6 + Math.sin(this.t * 5) * .2;
      ctx.strokeStyle = `rgba(53,214,255,${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, 19 * s, 6 * s, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(53,214,255,.92)';
      ctx.beginPath();
      ctx.moveTo(0, -103 * s); ctx.lineTo(-5.5 * s, -111 * s); ctx.lineTo(5.5 * s, -111 * s); ctx.closePath(); ctx.fill();
    }
    let rot = 0, ox = 0, oy = 0;
    if (state === 'slide') { rot = facing * -.72; oy = -5 * s; }
    else if (state === 'down') { rot = facing * 1.42; oy = 2 * s; }
    else if (state === 'dive') { rot = facing * (p.diveDir || 0) * .85; oy = -9 * s; }
    else if (state === 'kick' || state === 'pass') { rot = facing * -.09; }
    else if (state === 'celebrate') { oy = -Math.abs(Math.sin(this.t * 6)) * 5 * s; }
    ctx.rotate(rot);
    ctx.translate(ox, oy);
    let frontKnee, frontFoot, backKnee, backFoot, armSwing = swing;
    if (state === 'kick' || state === 'pass') {
      const kt = clamp(p.stateTime / .24, 0, 1);
      const reach = Math.sin(kt * Math.PI) * (state === 'kick' ? 25 : 17) * s;
      frontKnee = { x: facing * 7 * s, y: -21 * s };
      frontFoot = { x: facing * (9 * s + reach), y: Math.max(-14 * s, -2 * s - reach * .55) };
      backKnee = { x: -facing * 5 * s, y: -19 * s };
      backFoot = { x: -facing * 7 * s, y: 0 };
      armSwing = 0;
    } else if (state === 'slide') {
      frontKnee = { x: facing * 13 * s, y: -13 * s };
      frontFoot = { x: facing * 28 * s, y: -4 * s };
      backKnee = { x: -facing * 6 * s, y: -11 * s };
      backFoot = { x: -facing * 21 * s, y: -2 * s };
    } else if (state === 'down') {
      frontKnee = { x: facing * 12 * s, y: -7 * s };
      frontFoot = { x: facing * 19 * s, y: -2 * s };
      backKnee = { x: -facing * 2 * s, y: -9 * s };
      backFoot = { x: -facing * 11 * s, y: -3 * s };
    } else if (state === 'celebrate') {
      frontKnee = { x: facing * 8 * s, y: -19 * s };
      frontFoot = { x: facing * 6 * s, y: 0 };
      backKnee = { x: -facing * 8 * s, y: -19 * s };
      backFoot = { x: -facing * 5 * s, y: 0 };
    } else if (state === 'dive') {
      frontKnee = { x: facing * 17 * s, y: -11 * s };
      frontFoot = { x: facing * 26 * s, y: -3 * s };
      backKnee = { x: facing * 4 * s, y: -18 * s };
      backFoot = { x: -facing * 8 * s, y: -2 * s };
    } else {
      const sw = swing * 13 * s;
      frontKnee = { x: facing * 3 * s + sw * .4, y: -21 * s };
      frontFoot = { x: facing * 5 * s + sw, y: 0 };
      backKnee = { x: -facing * 2 * s - sw * .4, y: -21 * s };
      backFoot = { x: -facing * 4 * s - sw, y: 0 };
    }
    ctx.strokeStyle = '#0a1016'; ctx.lineWidth = lwLeg + 2.4 * s;
    line(ctx, 0, hipY, backKnee.x, backKnee.y); line(ctx, backKnee.x, backKnee.y, backFoot.x, backFoot.y);
    ctx.strokeStyle = c.socks; ctx.lineWidth = lwLeg;
    line(ctx, 0, hipY, backKnee.x, backKnee.y); line(ctx, backKnee.x, backKnee.y, backFoot.x, backFoot.y);
    this.drawArm(ctx, -facing, shoulderY, -armSwing * .8, s, c, true);
    ctx.strokeStyle = '#0a1016'; ctx.lineWidth = lw + 3.2 * s;
    line(ctx, 0, hipY, 0, shoulderY);
    ctx.strokeStyle = c.primary; ctx.lineWidth = lw + 1.8 * s;
    line(ctx, 0, hipY, 0, shoulderY);
    ctx.strokeStyle = c.secondary; ctx.lineWidth = Math.max(.8, 1.2 * s);
    line(ctx, -facing * 1.7 * s, hipY + 2 * s, -facing * 1.7 * s, shoulderY + 3 * s);
    ctx.strokeStyle = c.shorts; ctx.lineWidth = lw + 2.4 * s;
    line(ctx, 0, hipY + 2 * s, 0, hipY - 6 * s);
    ctx.strokeStyle = '#0a1016'; ctx.lineWidth = lwLeg + 2.4 * s;
    line(ctx, 0, hipY, frontKnee.x, frontKnee.y); line(ctx, frontKnee.x, frontKnee.y, frontFoot.x, frontFoot.y);
    ctx.strokeStyle = c.socks; ctx.lineWidth = lwLeg;
    line(ctx, 0, hipY, frontKnee.x, frontKnee.y); line(ctx, frontKnee.x, frontKnee.y, frontFoot.x, frontFoot.y);
    ctx.strokeStyle = '#0b0d10'; ctx.lineWidth = Math.max(1.5, 2.6 * s);
    line(ctx, frontFoot.x - facing * 1.5 * s, frontFoot.y, frontFoot.x + facing * 4.5 * s, frontFoot.y);
    line(ctx, backFoot.x - facing * 1.5 * s, backFoot.y, backFoot.x + facing * 4.5 * s, backFoot.y);
    this.drawArm(ctx, facing, shoulderY, armSwing, s, c, false);
    ctx.fillStyle = '#0a1016';
    ctx.beginPath(); ctx.arc(0, headY, headR + 1.4 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = p.data.skin || '#c6885c';
    ctx.beginPath(); ctx.arc(0, headY, headR, 0, TAU); ctx.fill();
    ctx.strokeStyle = p.data.skin || '#c6885c'; ctx.lineWidth = Math.max(1.6, 2.4 * s);
    line(ctx, 0, headY + headR * .9, 0, shoulderY + 1 * s);
    const hair = p.data.hair || '#2b1a10';
    const hs = p.data.hairStyle || 'curto';
    ctx.fillStyle = hair;
    if (hs === 'moicano') {
      ctx.fillRect(-1.6 * s, headY - headR, 3.2 * s, headR * 1.2);
    } else if (hs === 'afro') {
      ctx.beginPath(); ctx.arc(0, headY - 1 * s, headR + 1.8 * s, Math.PI * .96, Math.PI * 2.04); ctx.fill();
    } else if (hs === 'coque') {
      ctx.beginPath(); ctx.arc(0, headY - 1 * s, headR + .5 * s, Math.PI, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(-facing * 1 * s, headY - headR - 1 * s, 2.5 * s, 0, TAU); ctx.fill();
    } else if (hs === 'longo') {
      ctx.beginPath(); ctx.arc(0, headY - 1 * s, headR + .45 * s, Math.PI, TAU); ctx.fill();
      ctx.fillRect(-facing * headR * .75 - 1.4 * s, headY - 1 * s, 2.8 * s, 9 * s);
    } else if (hs === 'careca') {
      /* no hair */
    } else if (hs === 'fade') {
      ctx.beginPath(); ctx.arc(0, headY - 1.2 * s, headR + .3 * s, Math.PI * 1.03, TAU * .98); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, headY - 1 * s, headR + .35 * s, Math.PI * 1.02, TAU * .99); ctx.fill();
    }
    ctx.fillStyle = '#12181f';
    ctx.beginPath(); ctx.arc(facing * 3.1 * s, headY + .5 * s, Math.max(.7, .95 * s), 0, TAU); ctx.fill();
    if (p.num && this.cam.zoom > .7) {
      ctx.save();
      ctx.scale(facing, 1);
      ctx.fillStyle = c.secondary;
      ctx.font = `900 ${Math.max(5, 5.2 * s)}px Arial Narrow, Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(String(p.num), 0, hipY + 4 * s);
      ctx.restore();
    }
    if (p.isGK) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(facing * 10 * s, shoulderY + 15 * s, 1.9 * s, 0, TAU); ctx.fill();
    }
    if (controlled && p.stamina < 55) {
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(-11 * s, -92 * s, 22 * s, 2.6 * s);
      ctx.fillStyle = p.stamina < 25 ? '#ff4d5e' : '#ffcf4a';
      ctx.fillRect(-11 * s, -92 * s, 22 * s * p.stamina / 100, 2.6 * s);
    }
    ctx.restore();
  }

  drawArm(ctx, side, shoulderY, swing, s, c, back) {
    const sx = side * 2 * s;
    const elbow = { x: side * 7 * s + swing * 4 * s, y: shoulderY + 10 * s };
    const hand = { x: side * 11 * s + swing * 6 * s, y: shoulderY + 18 * s };
    ctx.strokeStyle = '#0a1016'; ctx.lineWidth = Math.max(1.4, 2.2 * s) + 1.4 * s;
    line(ctx, sx, shoulderY, elbow.x, elbow.y); line(ctx, elbow.x, elbow.y, hand.x, hand.y);
    ctx.strokeStyle = back ? mix(c.primary, '#000000', .25) : c.primary;
    ctx.lineWidth = Math.max(1.4, 2.2 * s);
    line(ctx, sx, shoulderY, elbow.x, elbow.y); line(ctx, elbow.x, elbow.y, hand.x, hand.y);
    ctx.fillStyle = pSkin(c) || c.secondary;
    ctx.beginPath(); ctx.arc(elbow.x, elbow.y, Math.max(.8, .9 * s), 0, TAU); ctx.fill();
  }

  drawBall(match) {
    const ctx = this.ctx;
    const b = match.ball;
    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i];
      const p = this.project(t.x, t.y, t.z);
      const s = this.depthScale(t.y);
      ctx.globalAlpha = clamp(t.life * .9, 0, .2);
      ctx.fillStyle = '#d8f5ff';
      ctx.beginPath(); ctx.arc(p.x, p.y, BALL_R_SCALE(s, t.z) * .8, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const p = this.project(b.x, b.y, b.z);
    const s = this.depthScale(b.y);
    const r = BALL_R_SCALE(s, b.z);
    if (p.x < -20 || p.x > this.w + 20 || p.y < -20 || p.y > this.h + 20) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(b.rot || 0);
    ctx.fillStyle = '#f4fbff';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#16324a';
    ctx.beginPath(); ctx.arc(0, 0, r * .34, 0, TAU); ctx.fill();
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5 - .35;
      const x = Math.cos(a) * r * .64, y = Math.sin(a) * r * .64;
      ctx.beginPath(); ctx.arc(x, y, r * .2, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(10,30,50,.55)'; ctx.lineWidth = Math.max(.8, r * .09);
    ctx.beginPath(); ctx.arc(0, 0, r * .93, 0, TAU); ctx.stroke();
    ctx.restore();
    if (Math.hypot(b.vx, b.vy) > 500) {
      ctx.globalAlpha = .35;
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
      grd.addColorStop(0, 'rgba(255,255,255,.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(p.x, p.y, r * 3, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawReplayFrame(match) {
    const ctx = this.ctx;
    const fr = match.replayFrame;
    if (!fr) return;
    const players = match.players;
    const list = [];
    fr.players.forEach((snap, i) => {
      if (snap.active && players[i]) list.push({ snap, p: players[i] });
    });
    list.sort((a, b) => a.snap.y - b.snap.y);
    for (const { snap, p } of list) {
      const proxy = { ...p, x: snap.x, y: snap.y, z: snap.z, facing: snap.facing, state: snap.state, animPhase: snap.phase, lean: snap.lean, active: true };
      this.drawStickman(proxy, match, false);
    }
    const fake = { ball: { x: fr.ball.x, y: fr.ball.y, z: fr.ball.z, rot: fr.ball.rot, trail: [] } };
    this.drawBall(fake);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    const bar = Math.max(0, this.h * .08);
    ctx.fillRect(0, 0, this.w, bar);
    ctx.fillRect(0, this.h - bar, this.w, bar);
  }

  drawWeather(match, weather) {
    const ctx = this.ctx, w = this.w, h = this.h;
    if (weather === 'rain') {
      ctx.strokeStyle = 'rgba(180,220,255,.32)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (const p of this.weatherParts) {
        p.y += p.v * .016;
        p.x -= 70 * .016;
        if (p.y > h) { p.y = -20; p.x = Math.random() * w; }
        if (p.x < 0) p.x = w;
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 3, p.y + p.l);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(100,160,200,.045)';
      ctx.fillRect(0, 0, w, h);
    } else if (weather === 'snow') {
      ctx.fillStyle = 'rgba(238,250,255,.72)';
      for (const p of this.weatherParts) {
        p.y += p.v * .006;
        p.x += Math.sin(this.t + p.d) * .35;
        if (p.y > h) { p.y = -10; p.x = Math.random() * w; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s || 1.6, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(200,225,240,.05)'; ctx.fillRect(0, 0, w, h);
    } else if (weather === 'cloudy') {
      ctx.fillStyle = 'rgba(80,110,130,.035)'; ctx.fillRect(0, 0, w, h);
    }
    if (match.phase === 'goal' || match.phase === 'replay') {
      this.updateConfetti();
      this.drawConfetti();
    }
  }

  spawnConfetti() {
    const colors = ['#ffcf4a', '#35d6ff', '#ff4d5e', '#43e57a', '#ffffff', '#ff9a3d'];
    for (let i = 0; i < 100; i++) {
      this.confetti.push({
        x: Math.random() * this.w, y: -20 - Math.random() * this.h * .4,
        vx: (Math.random() - .5) * 80, vy: 80 + Math.random() * 180,
        r: Math.random() * TAU, vr: (Math.random() - .5) * 8,
        w: 3 + Math.random() * 5, h: 5 + Math.random() * 8,
        c: colors[Math.floor(Math.random() * colors.length)], life: 3 + Math.random() * 2
      });
    }
  }
  updateConfetti() {
    for (const c of this.confetti) {
      c.x += c.vx * .016; c.y += c.vy * .016; c.r += c.vr * .016; c.life -= .016;
      c.vx += Math.sin(this.t * 2 + c.r) * 9 * .016;
    }
    this.confetti = this.confetti.filter(c => c.life > 0 && c.y < this.h + 30);
  }
  drawConfetti() {
    if (!this.confetti.length) return;
    const ctx = this.ctx;
    for (const c of this.confetti) {
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r);
      ctx.globalAlpha = clamp(c.life, 0, 1);
      ctx.fillStyle = c.c; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  drawLighting(match, dark) {
    const ctx = this.ctx, w = this.w, h = this.h;
    if (dark || match.weather === 'rain' || match.weather === 'snow') {
      ctx.fillStyle = dark ? 'rgba(2,10,20,.16)' : 'rgba(5,15,25,.10)';
      ctx.fillRect(0, 0, w, h);
    }
    if (match.phase === 'goal' || match.phase === 'replay') {
      const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * .7);
      grd.addColorStop(0, `rgba(255,207,74,${.10 + (match.goalFlash || 0) * .08})`);
      grd.addColorStop(1, 'rgba(255,207,74,0)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
    }
  }

  drawVignette() {
    const ctx = this.ctx, w = this.w, h = this.h;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.36)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  drawMenuBackground(dt) {
    this.menuT += dt;
    const ctx = this.bgCtx, w = this.bw, h = this.bh, t = this.menuT;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#061a2c'); g.addColorStop(.45, '#0a2c46'); g.addColorStop(1, '#040d17');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const rg = ctx.createRadialGradient(w * .72, h * .28, 10, w * .72, h * .28, h * .8);
    rg.addColorStop(0, 'rgba(53,214,255,.17)'); rg.addColorStop(.5, 'rgba(31,121,255,.07)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h * .58);
    ctx.scale(1, .38);
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(53,214,255,${.09 - i * .012})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, Math.min(w, h) * (0.25 + i * .09), 0, TAU); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(10,55,38,.5)';
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 1.06, w * .75, h * .4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(180,245,255,.13)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(w / 2, h * 1.06, w * .3, h * .1, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 26; i++) {
      const x = ((i * 137.5 + t * (6 + i % 5)) % (w + 80)) - 40;
      const y = h * .35 + Math.sin(t * .5 + i) * h * .22 + (i % 7) * 24;
      ctx.fillStyle = `rgba(120,220,255,${.05 + (i % 4) * .03})`;
      ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3), 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(140,225,255,.10)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const x = w * (.16 + i * .23) + Math.sin(t * .4 + i) * 30;
      const y = h * (.66 + (i % 2) * .05);
      const ph = t * 4 + i * 2;
      const sw = Math.sin(ph) * 10;
      ctx.beginPath();
      ctx.arc(x, y - 46, 7, 0, TAU);
      ctx.moveTo(x, y - 39); ctx.lineTo(x, y - 16);
      ctx.moveTo(x, y - 16); ctx.lineTo(x + sw, y + 8);
      ctx.moveTo(x, y - 16); ctx.lineTo(x - sw, y + 8);
      ctx.moveTo(x, y - 34); ctx.lineTo(x + sw * .7, y - 20);
      ctx.moveTo(x, y - 34); ctx.lineTo(x - sw * .7, y - 20);
      ctx.stroke();
    }
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .2, w / 2, h / 2, Math.max(w, h) * .75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,5,12,.66)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  }

  clearGame() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
  }

  celebrate() { this.spawnConfetti(); }
}

function BALL_R_SCALE(s, z) {
  return Math.max(2.6, 11 * s * (1 + Math.min(z, 200) * .0014));
}

function pSkin(c) { return null; }
