import { TAU, clamp, seeded, drawGlow, lerp } from './utils.js';

export class WorldRenderer {
  constructor(game) {
    this.game = game;
    this.data = null;
    this.groundY = game.groundY;
    this.w = game.w;
    this.h = game.h;
    this.s = game.s;
  }

  resize() {
    const { w, h, s, groundY } = this.game;
    this.w = w;
    this.h = h;
    this.s = s;
    this.groundY = groundY;
    const rng = seeded(Math.floor(w * 13 + h * 7 + 91));

    const vines = [];
    const vineCount = w > 900 ? 20 : 12;
    for (let i = 0; i < vineCount; i++) {
      vines.push({
        x: rng() * w,
        y: -10,
        len: (60 + rng() * 200) * s,
        sway: (6 + rng() * 18) * s,
        phase: rng() * TAU,
        width: (0.7 + rng() * 1.5) * s,
        leaves: Math.floor(2 + rng() * 5),
        back: rng() < 0.5,
      });
    }

    const pillars = [];
    const count = Math.max(4, Math.round(w / 310));
    for (let i = 0; i < count; i++) {
      pillars.push({
        x: (i + 0.4 + rng() * 0.2) * (w / count),
        width: (42 + rng() * 40) * s,
        height: (250 + rng() * 220) * s,
        arch: i < count - 1,
        broken: rng() < 0.35,
      });
    }

    const grasses = [];
    const grassCount = w > 900 ? 54 : 30;
    for (let i = 0; i < grassCount; i++) {
      const edge = rng() < 0.35;
      grasses.push({
        x: edge ? (rng() < 0.5 ? rng() * w * 0.18 : w - rng() * w * 0.18) : rng() * w,
        h: (14 + rng() * 44) * s,
        lean: (rng() * 2 - 1) * 0.6,
        phase: rng() * TAU,
        color: rng() < 0.16 ? 'rgba(168, 176, 143, 0.35)' : 'rgba(19, 37, 35, 0.78)',
        width: (0.8 + rng() * 1.8) * s,
      });
    }

    const stones = [];
    for (let i = 0; i < 40; i++) {
      stones.push({
        x: rng() * w,
        y: groundY + (8 + rng() * 80) * s,
        w: (16 + rng() * 65) * s,
        h: (2 + rng() * 8) * s,
        shade: rng(),
      });
    }

    const spores = [];
    const sporeCount = w > 900 ? 46 : 27;
    for (let i = 0; i < sporeCount; i++) {
      spores.push({
        x: rng(),
        y: rng(),
        phase: rng() * TAU,
        speed: 0.008 + rng() * 0.024,
        drift: (2 + rng() * 10) * s,
        size: (0.7 + rng() * 1.7) * s,
        alpha: 0.2 + rng() * 0.5,
        gold: rng() < 0.14,
      });
    }

    const rubble = [];
    for (let i = 0; i < 10; i++) {
      rubble.push({
        x: rng() * w,
        y: groundY + (2 + rng() * 16) * s,
        w: (6 + rng() * 22) * s,
        h: (3 + rng() * 12) * s,
        rot: rng() * TAU,
      });
    }

    this.data = { vines, pillars, grasses, stones, spores, rubble, rng };
    this._buildStatic();
  }

  _buildStatic() {
    const dpr = Math.min(this.game.dpr || 1, 2);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(this.w * dpr));
    canvas.height = Math.max(1, Math.round(this.h * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._drawStaticBase(ctx);
    this.staticCanvas = canvas;
  }

  _drawStaticBase(ctx) {
    const { w, h } = this;
    const base = ctx.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#03070a');
    base.addColorStop(0.28, '#061015');
    base.addColorStop(0.62, '#0a191b');
    base.addColorStop(0.82, '#0a1414');
    base.addColorStop(1, '#040808');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    this._drawMoon(ctx, 0);
    this._drawSkyline(ctx, 0);
    this._drawFarArches(ctx);
    this._drawStatue(ctx, this.w * 0.16, this.groundY, this.s);
    this._drawMidArches(ctx);
    this._drawFloor(ctx, 0);
    this._drawGrass(ctx, 0);
  }

  drawBack(ctx, time) {
    if (!this.data) this.resize();
    if (this.staticCanvas) ctx.drawImage(this.staticCanvas, 0, 0, this.w, this.h);
    else this._drawStaticBase(ctx);
    this._drawMist(ctx, time, 0.28, 0.25);
    this._drawShafts(ctx, time);
    this._drawVines(ctx, time);
    this._drawSpores(ctx, time);
    this._drawMist(ctx, time, 0.58, 0.6);
  }

  drawForeground(ctx, time) {
    if (!this.data) return;
    const { w, h, s } = this;
    ctx.save();
    const dark = ctx.createLinearGradient(0, h - 90 * s, 0, h);
    dark.addColorStop(0, 'rgba(2, 5, 5, 0)');
    dark.addColorStop(0.65, 'rgba(2, 5, 5, 0.2)');
    dark.addColorStop(1, 'rgba(1, 3, 4, 0.68)');
    ctx.fillStyle = dark;
    ctx.fillRect(0, h - 90 * s, w, 90 * s);

    ctx.strokeStyle = 'rgba(5, 12, 11, 0.82)';
    ctx.lineWidth = 2 * s;
    ctx.lineCap = 'round';
    for (const g of this.data.grasses) {
      if (g.x > w * 0.2 && g.x < w * 0.8 && g.h < 26 * s) continue;
      const sway = Math.sin(time * 0.8 + g.phase) * 2 * s;
      ctx.beginPath();
      ctx.moveTo(g.x, this.groundY + 4 * s);
      ctx.quadraticCurveTo(g.x + g.lean * g.h * 0.4, this.groundY - g.h * 0.5, g.x + g.lean * g.h * 0.6 + sway, this.groundY - g.h);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawMoon(ctx, time) {
    const { w, h, s } = this;
    const cx = w * 0.615;
    const cy = h * 0.18;
    const r = 88 * s;
    const pulse = 1 + Math.sin(time * 0.29) * 0.02;
    drawGlow(ctx, cx, cy, 330 * s * pulse, 'rgba(160, 199, 184, 0.09)');
    drawGlow(ctx, cx, cy, 170 * s * pulse, 'rgba(190, 220, 205, 0.08)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const moon = ctx.createRadialGradient(cx - r * 0.24, cy - r * 0.28, r * 0.1, cx, cy, r);
    moon.addColorStop(0, 'rgba(232, 238, 218, 0.22)');
    moon.addColorStop(0.7, 'rgba(187, 211, 195, 0.11)');
    moon.addColorStop(1, 'rgba(160, 190, 178, 0.015)');
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    const veil = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    veil.addColorStop(0, 'rgba(5, 11, 13, 0)');
    veil.addColorStop(1, 'rgba(6, 13, 15, 0.42)');
    ctx.fillStyle = veil;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(207, 227, 216, 0.035)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const rr = r * (1.28 + i * 0.18);
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0.3, Math.PI * 1.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawSkyline(ctx, time) {
    const { w, h, s } = this;
    ctx.save();
    ctx.fillStyle = 'rgba(3, 7, 9, 0.55)';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.47);
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * w;
      const peak = h * (0.35 + (i % 3) * 0.035) + Math.sin(i * 4.2) * 11 * s;
      ctx.lineTo(x + 12 * s, peak);
      ctx.lineTo(x + 28 * s, h * 0.49);
    }
    ctx.lineTo(w, h * 0.57);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(121, 196, 187, 0.035)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const x = w * (0.12 + i * 0.22);
      ctx.beginPath();
      ctx.moveTo(x, h * 0.36);
      ctx.lineTo(x + 18 * s, h * 0.48);
      ctx.stroke();
    }
    ctx.restore();
  }

  _archPath(ctx, cx, baseY, width, height, rise = 0.56) {
    const half = width / 2;
    ctx.beginPath();
    ctx.moveTo(cx - half, baseY);
    ctx.lineTo(cx - half, baseY - height * rise);
    ctx.quadraticCurveTo(cx - half * 0.82, baseY - height * (rise + 0.08), cx - half * 0.18, baseY - height * 0.92);
    ctx.quadraticCurveTo(cx, baseY - height * 1.02, cx + half * 0.18, baseY - height * 0.92);
    ctx.quadraticCurveTo(cx + half * 0.82, baseY - height * (rise + 0.08), cx + half, baseY - height * rise);
    ctx.lineTo(cx + half, baseY);
    ctx.closePath();
  }

  _drawFarArches(ctx) {
    const { s, groundY, w } = this;
    ctx.save();
    const far = [
      { x: w * 0.09, ww: 120 * s, hh: 370 * s, a: 0.2 },
      { x: w * 0.36, ww: 200 * s, hh: 470 * s, a: 0.16 },
      { x: w * 0.615, ww: 330 * s, hh: 600 * s, a: 0.2 },
      { x: w * 0.88, ww: 120 * s, hh: 360 * s, a: 0.18 },
    ];
    for (const arch of far) {
      this._archPath(ctx, arch.x, groundY, arch.ww, arch.hh);
      ctx.fillStyle = `rgba(3, 8, 10, ${arch.a})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(143, 188, 175, ${arch.a * 0.11})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const windowX = w * 0.615;
    const windowY = groundY - 310 * s;
    ctx.save();
    ctx.translate(windowX, windowY);
    ctx.scale(1, 1.8);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 56 * s);
    glow.addColorStop(0, 'rgba(207, 227, 216, 0.13)');
    glow.addColorStop(1, 'rgba(207, 227, 216, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 56 * s, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(207, 227, 216, 0.06)';
    ctx.lineWidth = 1.1 * s;
    ctx.beginPath();
    ctx.moveTo(windowX, windowY - 48 * s);
    ctx.quadraticCurveTo(windowX - 26 * s, windowY - 16 * s, windowX - 18 * s, windowY + 26 * s);
    ctx.moveTo(windowX, windowY - 48 * s);
    ctx.quadraticCurveTo(windowX + 26 * s, windowY - 16 * s, windowX + 18 * s, windowY + 26 * s);
    ctx.moveTo(windowX - 11 * s, windowY - 34 * s);
    ctx.lineTo(windowX - 11 * s, windowY + 26 * s);
    ctx.moveTo(windowX + 11 * s, windowY - 34 * s);
    ctx.lineTo(windowX + 11 * s, windowY + 26 * s);
    ctx.stroke();
    ctx.restore();
  }

  _drawMidArches(ctx) {
    const { s, groundY, w, h } = this;
    ctx.save();
    for (const p of this.data.pillars) {
      const bottom = groundY + 9 * s;
      const top = bottom - p.height;
      const grad = ctx.createLinearGradient(p.x - p.width / 2, 0, p.x + p.width / 2, 0);
      grad.addColorStop(0, 'rgba(3, 7, 8, 0.72)');
      grad.addColorStop(0.45, 'rgba(12, 25, 25, 0.62)');
      grad.addColorStop(1, 'rgba(2, 6, 7, 0.8)');
      ctx.fillStyle = grad;
      ctx.fillRect(p.x - p.width / 2, top, p.width, p.height);
      ctx.fillStyle = 'rgba(2, 5, 6, 0.72)';
      ctx.fillRect(p.x - p.width * 0.72, top + p.height * 0.12, p.width * 1.44, 10 * s);
      ctx.fillRect(p.x - p.width * 0.64, bottom - 16 * s, p.width * 1.28, 16 * s);
      ctx.strokeStyle = 'rgba(143, 188, 175, 0.055)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x - p.width * 0.38, top + 16 * s);
      ctx.lineTo(p.x - p.width * 0.38, bottom - 22 * s);
      ctx.stroke();

      if (p.arch) {
        const next = this.data.pillars[this.data.pillars.indexOf(p) + 1];
        if (next) {
          const mid = (p.x + next.x) / 2;
          const span = next.x - p.x;
          const rise = Math.min(p.height, next.height) * 0.95;
          this._archPath(ctx, mid, top + 8 * s, span * 0.93, rise * 0.28);
          ctx.fillStyle = 'rgba(3, 8, 9, 0.45)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(121, 196, 187, 0.025)';
          ctx.stroke();
        }
      }
    }

    ctx.strokeStyle = 'rgba(143, 188, 175, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.31);
    ctx.lineTo(w * 0.12, h * 0.35);
    ctx.lineTo(w * 0.27, h * 0.33);
    ctx.stroke();
    ctx.restore();
  }

  _drawStatue(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    const grad = ctx.createLinearGradient(-50 * s, -270 * s, 50 * s, 0);
    grad.addColorStop(0, 'rgba(11, 23, 23, 0.6)');
    grad.addColorStop(0.55, 'rgba(17, 32, 30, 0.42)');
    grad.addColorStop(1, 'rgba(4, 9, 10, 0.7)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-52 * s, 0);
    ctx.lineTo(-34 * s, -100 * s);
    ctx.quadraticCurveTo(-52 * s, -146 * s, -34 * s, -190 * s);
    ctx.quadraticCurveTo(-30 * s, -248 * s, 0, -252 * s);
    ctx.quadraticCurveTo(30 * s, -248 * s, 34 * s, -190 * s);
    ctx.quadraticCurveTo(52 * s, -146 * s, 34 * s, -100 * s);
    ctx.lineTo(52 * s, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(19, 35, 33, 0.46)';
    ctx.beginPath();
    ctx.moveTo(-36 * s, -220 * s);
    ctx.quadraticCurveTo(-66 * s, -182 * s, -74 * s, -108 * s);
    ctx.lineTo(-30 * s, -130 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(36 * s, -220 * s);
    ctx.quadraticCurveTo(66 * s, -182 * s, 74 * s, -108 * s);
    ctx.lineTo(30 * s, -130 * s);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(143, 188, 175, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-19 * s, -206 * s);
    ctx.quadraticCurveTo(0, -224 * s, 19 * s, -206 * s);
    ctx.moveTo(0, -166 * s);
    ctx.lineTo(0, -120 * s);
    ctx.stroke();

    ctx.fillStyle = 'rgba(4, 9, 10, 0.72)';
    ctx.beginPath();
    ctx.ellipse(0, 2 * s, 70 * s, 8 * s, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  _drawShafts(ctx, time) {
    const { w, h, s } = this;
    const cx = w * 0.615;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 3; i++) {
      const offset = (i - 1) * 55 * s;
      const sway = Math.sin(time * 0.16 + i * 1.8) * 15 * s;
      const grad = ctx.createLinearGradient(cx, 0, cx + offset + sway, h * 0.75);
      grad.addColorStop(0, `rgba(190, 222, 207, ${0.035 - i * 0.007})`);
      grad.addColorStop(0.65, `rgba(143, 196, 185, ${0.013 - i * 0.002})`);
      grad.addColorStop(1, 'rgba(143, 196, 185, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx - 14 * s + offset, 0);
      ctx.lineTo(cx + 20 * s + offset, 0);
      ctx.lineTo(cx + 160 * s + offset + sway, h * 0.78);
      ctx.lineTo(cx + 54 * s + offset + sway, h * 0.78);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  _drawVines(ctx, time) {
    const { s, groundY } = this;
    for (const vine of this.data.vines) {
      if (!vine.back) continue;
      const sway = Math.sin(time * 0.5 + vine.phase) * vine.sway;
      ctx.strokeStyle = 'rgba(5, 15, 14, 0.6)';
      ctx.lineWidth = vine.width;
      ctx.beginPath();
      ctx.moveTo(vine.x, vine.y);
      ctx.bezierCurveTo(vine.x - vine.sway * 0.4, vine.y + vine.len * 0.4, vine.x + sway, vine.y + vine.len * 0.76, vine.x + sway * 1.2, vine.y + vine.len);
      ctx.stroke();
      for (let i = 0; i < vine.leaves; i++) {
        const t = (i + 1) / (vine.leaves + 1);
        const lx = vine.x + Math.sin(time * 0.5 + vine.phase + t * 3) * vine.sway * t;
        const ly = vine.y + vine.len * t;
        ctx.fillStyle = 'rgba(8, 22, 20, 0.52)';
        ctx.beginPath();
        ctx.ellipse(lx + (i % 2 ? 7 : -7) * s, ly, 6 * s, 2.4 * s, (i % 2 ? 0.5 : -0.5), 0, TAU);
        ctx.fill();
      }
      if (vine.y + vine.len > groundY - 20) continue;
    }
    for (const vine of this.data.vines) {
      if (vine.back) continue;
      const sway = Math.sin(time * 0.58 + vine.phase) * vine.sway;
      ctx.strokeStyle = 'rgba(4, 12, 12, 0.72)';
      ctx.lineWidth = vine.width * 1.1;
      ctx.beginPath();
      ctx.moveTo(vine.x, vine.y);
      ctx.bezierCurveTo(vine.x + vine.sway * 0.5, vine.y + vine.len * 0.33, vine.x + sway, vine.y + vine.len * 0.7, vine.x + sway * 1.15, vine.y + vine.len);
      ctx.stroke();
    }
  }

  _drawSpores(ctx, time) {
    const { w, h, s } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const spore of this.data.spores) {
      const y = ((spore.y - time * spore.speed) % 1 + 1) % 1;
      const x = (spore.x + Math.sin(time * 0.22 + spore.phase) * 0.012 + 1) % 1;
      const px = x * w;
      const py = y * h;
      const twinkle = 0.55 + Math.sin(time * 1.3 + spore.phase) * 0.45;
      const alpha = spore.alpha * twinkle;
      ctx.fillStyle = spore.gold ? `rgba(234, 215, 154, ${alpha * 0.8})` : `rgba(168, 240, 226, ${alpha * 0.66})`;
      ctx.beginPath();
      ctx.arc(px, py, spore.size, 0, TAU);
      ctx.fill();
      if (spore.size > 1.8 * s) {
        ctx.fillStyle = spore.gold ? `rgba(234, 215, 154, ${alpha * 0.08})` : `rgba(168, 240, 226, ${alpha * 0.07})`;
        ctx.beginPath();
        ctx.arc(px, py, spore.size * 5, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  _drawFloor(ctx, time) {
    const { w, h, s, groundY } = this;
    ctx.save();
    const floor = ctx.createLinearGradient(0, groundY - 2 * s, 0, h);
    floor.addColorStop(0, '#152623');
    floor.addColorStop(0.08, '#0d1a19');
    floor.addColorStop(0.55, '#08100f');
    floor.addColorStop(1, '#030707');
    ctx.fillStyle = floor;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.quadraticCurveTo(w * 0.3, groundY - 5 * s, w * 0.55, groundY - 3 * s);
    ctx.quadraticCurveTo(w * 0.8, groundY - 2 * s, w, groundY + 1 * s);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(173, 196, 174, 0.16)';
    ctx.lineWidth = 1.1 * s;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.quadraticCurveTo(w * 0.3, groundY - 5 * s, w * 0.55, groundY - 3 * s);
    ctx.quadraticCurveTo(w * 0.8, groundY - 2 * s, w, groundY + 1 * s);
    ctx.stroke();

    for (const stone of this.data.stones) {
      ctx.fillStyle = stone.shade > 0.6 ? 'rgba(37, 52, 47, 0.22)' : 'rgba(3, 8, 8, 0.38)';
      ctx.fillRect(stone.x, stone.y, stone.w, stone.h);
    }

    for (const rock of this.data.rubble) {
      ctx.save();
      ctx.translate(rock.x, rock.y);
      ctx.rotate(rock.rot);
      ctx.fillStyle = 'rgba(17, 30, 27, 0.75)';
      ctx.beginPath();
      ctx.moveTo(-rock.w / 2, 0);
      ctx.lineTo(-rock.w * 0.18, -rock.h);
      ctx.lineTo(rock.w * 0.3, -rock.h * 0.7);
      ctx.lineTo(rock.w / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const sigilX = w * 0.5;
    const sigilY = groundY + 62 * s;
    ctx.save();
    ctx.translate(sigilX, sigilY);
    ctx.scale(1, 0.22);
    ctx.rotate(time * 0.015);
    ctx.strokeStyle = 'rgba(168, 240, 226, 0.085)';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.arc(0, 0, 130 * s, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 96 * s, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200, 180, 123, 0.06)';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 98 * s, Math.sin(a) * 98 * s);
      ctx.lineTo(Math.cos(a) * 128 * s, Math.sin(a) * 128 * s);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(3, 6, 7, 0.5)';
    ctx.lineWidth = 1.4 * s;
    const cracks = [
      [-0.4, 0.7, 0.2, 0.35, 0.9, 0.52],
      [0.52, 0.36, 0.66, 0.17, 0.78, 0.22],
    ];
    for (const c of cracks) {
      ctx.beginPath();
      ctx.moveTo(w * c[0], groundY + h * 0.12);
      ctx.quadraticCurveTo(w * c[2], groundY + h * c[3], w * c[4], groundY + h * c[5]);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  _drawGrass(ctx, time) {
    const { s, groundY } = this;
    for (const g of this.data.grasses) {
      const sway = Math.sin(time * 0.9 + g.phase) * 1.6 * s;
      ctx.strokeStyle = g.color;
      ctx.lineWidth = g.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(g.x, groundY + 2 * s);
      ctx.quadraticCurveTo(g.x + g.lean * g.h * 0.42, groundY - g.h * 0.54, g.x + g.lean * g.h * 0.58 + sway, groundY - g.h);
      ctx.stroke();
    }
  }

  _drawMist(ctx, time, yFactor, alpha) {
    const { w, h, s } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 2; i++) {
      const y = h * (yFactor + i * 0.045);
      const drift = Math.sin(time * 0.08 + i * 2.2) * w * 0.04;
      const grad = ctx.createLinearGradient(0, y - 45 * s, 0, y + 50 * s);
      grad.addColorStop(0, 'rgba(120, 166, 155, 0)');
      grad.addColorStop(0.5, `rgba(120, 166, 155, ${alpha * 0.075})`);
      grad.addColorStop(1, 'rgba(120, 166, 155, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(w * 0.5 + drift, y, w * (0.62 + i * 0.08), 48 * s, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
