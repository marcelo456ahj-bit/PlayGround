import { TAU, rand, randInt, hexRgba, clamp, lerp } from './util.js';

export class Particles {
  constructor(max = 700) {
    this.items = [];
    this.max = max;
  }

  clear() {
    this.items.length = 0;
  }

  spawn(options) {
    if (this.items.length >= this.max) this.items.shift();
    const p = {
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0.6, maxLife: 0.6,
      size: 2, color: '#bfe9f6', alpha: 1,
      gravity: 0, drag: 0.985, type: 'dot',
      additive: true, front: true, length: 0.02,
      ...options
    };
    p.maxLife = p.life;
    this.items.push(p);
    return p;
  }

  burst(x, y, count, options = {}) {
    const spread = options.spread ?? Math.PI * 2;
    const angle = options.angle ?? 0;
    for (let i = 0; i < count; i++) {
      const a = angle + rand(-spread / 2, spread / 2);
      const speed = rand(options.speedMin ?? 40, options.speedMax ?? 220);
      const life = rand(options.lifeMin ?? 0.2, options.lifeMax ?? 0.6);
      this.spawn({
        ...options,
        x: x + rand(-(options.jitter ?? 0), options.jitter ?? 0),
        y: y + rand(-(options.jitter ?? 0), options.jitter ?? 0),
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life,
        size: options.size ?? rand(1.2, 3.4)
      });
    }
  }

  update(dt) {
    const list = this.items;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        list.splice(i, 1);
        continue;
      }
      const drag = Math.pow(p.drag, dt * 60);
      p.vx *= drag;
      p.vy *= drag;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx, front = true) {
    for (const p of this.items) {
      if (p.front !== front) continue;
      const t = clamp(p.life / p.maxLife, 0, 1);
      const alpha = p.alpha * Math.min(1, (1 - t) * 5) * Math.min(1, t * 2.4);
      if (alpha <= 0.004) continue;
      ctx.globalCompositeOperation = p.additive ? 'lighter' : 'source-over';
      ctx.globalAlpha = alpha;
      if (p.type === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.5, p.size * t);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * p.length, p.y - p.vy * p.length);
        ctx.stroke();
      } else if (p.type === 'streak') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.4, p.size * t);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.08, p.y - p.vy * 0.08);
        ctx.stroke();
      } else {
        const size = p.size * (0.35 + 0.65 * t);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, TAU);
        ctx.fill();
        if (size > 2.4) {
          ctx.globalAlpha = alpha * 0.18;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 2.8, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

export class Ambient {
  constructor(world) {
    this.world = world;
    this.motes = [];
    this.rain = [];
  }

  reset() {
    const { W, H, groundY, windows } = this.world;
    this.motes = [];
    const count = Math.round(clamp(W * H / 18000, 36, 92));
    for (let i = 0; i < count; i++) {
      const orange = Math.random() < 0.14;
      this.motes.push({
        x: rand(0, W),
        y: rand(H * 0.06, groundY - 10),
        size: rand(0.6, 2.3),
        speed: rand(3, 15),
        drift: rand(-8, 8),
        phase: rand(0, TAU),
        twinkle: rand(0.6, 2.1),
        color: orange ? '#ff9a4a' : (Math.random() < 0.5 ? '#bfe9f6' : '#e7f7ff')
      });
    }
    this.rain = (windows || []).map((win) => {
      const drops = [];
      const count = Math.round(win.w / 9);
      for (let i = 0; i < count; i++) {
        drops.push({
          u: Math.random(),
          v: Math.random(),
          speed: rand(0.5, 1.5),
          len: rand(8, 22),
          alpha: rand(0.05, 0.18)
        });
      }
      return drops;
    });
  }

  update(dt, time) {
    const { W, groundY } = this.world;
    for (const m of this.motes) {
      m.y -= m.speed * dt;
      m.x += Math.sin(time * 0.35 + m.phase) * 4 * dt + m.drift * dt;
      if (m.y < this.world.H * 0.04) { m.y = groundY - 8; m.x = rand(0, W); }
      if (m.x < -8) m.x = W + 8;
      if (m.x > W + 8) m.x = -8;
    }
    if (!this.world.windows) return;
    for (let w = 0; w < this.rain.length; w++) {
      const win = this.world.windows[w];
      for (const drop of this.rain[w]) {
        drop.v += drop.speed * dt * (0.32 + (win.h / 900));
        if (drop.v > 1) { drop.v = -0.05; drop.u = Math.random(); }
      }
    }
  }

  drawRain(ctx) {
    const { windows } = this.world;
    if (!windows) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < windows.length; i++) {
      const win = windows[i];
      const drops = this.rain[i];
      if (!drops) continue;
      this.world.windowPath(ctx, win);
      ctx.clip();
      for (const drop of drops) {
        if (drop.v < 0) continue;
        const x = win.cx - win.w / 2 + drop.u * win.w;
        const y = win.top + drop.v * (win.h + win.archTop);
        ctx.strokeStyle = `rgba(174,222,245,${drop.alpha})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 1.5, y + drop.len);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawMotes(ctx, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      const tw = 0.3 + 0.7 * Math.abs(Math.sin(time * m.twinkle + m.phase));
      ctx.globalAlpha = 0.24 + 0.5 * tw;
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, TAU);
      ctx.fill();
      if (m.size > 1.5) {
        ctx.globalAlpha = 0.08 + 0.12 * tw;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size * 4, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
