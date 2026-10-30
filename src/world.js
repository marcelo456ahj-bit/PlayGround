import { TAU, clamp, rand, sign, hexRgba, approach } from './util.js';
import { Particles, Ambient } from './fx.js';
import { buildBackground, windowPath } from './background.js';
import { Player } from './player.js';
import { Boss } from './boss.js';

export class World {
  constructor(canvas, input, audio, callbacks = {}) {
    this.canvas = canvas;
    this.input = input;
    this.audio = audio;
    this.callbacks = callbacks;
    this.windowPath = windowPath;
    this.state = 'title';
    this.totalTime = 0;
    this.runTime = 0;
    this.hitsTaken = 0;
    this.healsUsed = 0;
    this.slowmo = 1;
    this.hitstop = 0;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.hurtFlash = 0;
    this.flashOrange = 0;
    this.phaseFlash = 0;
    this.deathTimer = 0;
    this.victoryTimer = 0;
    this.reported = false;
    this.projectiles = [];
    this.shockwaves = [];
    this.spikes = [];
    this.rocks = [];
    this.afterimages = [];
    this.computeLayout();
    this.particles = new Particles(760);
    this.ambient = new Ambient(this);
    this.player = new Player(this);
    this.boss = new Boss(this);
    this.buildScene();
    this.resetPositions();
  }

  computeLayout() {
    this.W = Math.max(300, window.innerWidth || 800);
    this.H = Math.max(320, window.innerHeight || 600);
    const pixels = this.W * this.H;
    this.dpr = clamp(window.devicePixelRatio || 1, 1, pixels > 1200000 ? 1.5 : 2);
    this.groundY = this.H * (this.H > this.W ? 0.70 : 0.79);
    this.playerH = clamp(Math.min(this.H * 0.095, this.W * 0.15), 38, 88);
    this.motionScale = clamp(this.playerH / 62, 0.7, 1.35);
    this.playerW = this.playerH * 0.42;
    this.runSpeed = 335 * this.motionScale;
    this.dashSpeed = 960 * this.motionScale;
    this.jumpVelocity = 880 * this.motionScale;
    this.gravity = 2500 * this.motionScale;
    this.wallL = Math.max(10, this.W * 0.025);
    this.wallR = this.W - this.wallL;
    const rise = clamp(this.H * 0.15, 92, 145);
    const pw = clamp(this.W * 0.18, 76, 210);
    this.platforms = [
      { x: this.W * 0.19, y: this.groundY - rise, w: pw, h: 14 },
      { x: this.W * 0.81, y: this.groundY - rise, w: pw, h: 14 }
    ];
  }

  buildScene() {
    this.canvas.width = Math.max(1, Math.round(this.W * this.dpr));
    this.canvas.height = Math.max(1, Math.round(this.H * this.dpr));
    const built = buildBackground(this);
    this.bg = built.canvas;
    this.windows = built.windows;
    this.ambient.reset();
  }

  resetPositions() {
    this.player.x = this.W * 0.30;
    this.player.y = this.groundY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.boss.x = this.W * 0.70;
    this.boss.y = this.groundY;
    this.boss.facing = -1;
    this.player.facing = 1;
  }

  resize() {
    this.computeLayout();
    this.player.ph = this.playerH;
    this.player.pw = this.playerW;
    this.player.resize();
    this.boss.resize();
    if (this.state === 'title') this.resetPositions();
    else {
      this.player.x = clamp(this.player.x, this.wallL + this.player.pw, this.wallR - this.player.pw);
      this.boss.x = clamp(this.boss.x, this.wallL + this.boss.w * 0.44, this.wallR - this.boss.w * 0.44);
      if (this.player.grounded) this.player.y = this.groundY;
      if (this.boss.state === 'idle' || this.boss.state === 'recover') this.boss.y = this.groundY;
    }
    this.buildScene();
  }

  startRun() {
    this.particles.clear();
    this.afterimages.length = 0;
    this.projectiles.length = 0;
    this.shockwaves.length = 0;
    this.spikes.length = 0;
    this.rocks.length = 0;
    this.player.reset();
    this.boss.reset();
    this.player.invuln = 1.1;
    this.boss.timer = 2.1;
    this.state = 'playing';
    this.runTime = 0;
    this.hitsTaken = 0;
    this.healsUsed = 0;
    this.slowmo = 1;
    this.hitstop = 0;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.hurtFlash = 0;
    this.flashOrange = 0;
    this.phaseFlash = 0;
    this.deathTimer = 0;
    this.victoryTimer = 0;
    this.reported = false;
    this.audio.bell(392, 0.4, 4.2);
    this.audio.bell(523.25, 0.3, 4.8);
    this.dust(this.player.x, this.groundY, 10, 1.2);
  }

  pause() {
    if (this.state === 'playing') this.state = 'paused';
  }

  resume() {
    if (this.state === 'paused') this.state = 'playing';
  }

  stats() {
    return {
      time: this.runTime,
      hits: this.hitsTaken,
      masks: this.player.masks,
      heals: this.healsUsed
    };
  }

  update(dt) {
    this.totalTime += dt;
    this.ambient.update(dt, this.totalTime);
    this.updateCamera(dt);
    this.updateFlashes(dt);
    if (this.state === 'paused') return;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.particles.update(dt * 0.15);
      return;
    }
    this.updateAfterimages(dt);
    if (this.state === 'title') {
      this.player.animTime += dt;
      this.boss.animTime += dt;
      this.particles.update(dt);
      return;
    }
    const sdt = dt * this.slowmo;
    if (this.state === 'playing') {
      this.runTime += dt;
      this.player.update(sdt);
      this.boss.update(sdt);
      this.updateProjectiles(sdt);
      this.updateShockwaves(sdt);
      this.updateSpikes(sdt);
      this.updateRocks(sdt);
      this.checkContact();
      this.particles.update(sdt);
    } else if (this.state === 'dying') {
      this.player.update(dt);
      this.boss.update(sdt);
      this.updateProjectiles(sdt);
      this.updateShockwaves(sdt);
      this.updateSpikes(sdt);
      this.updateRocks(sdt);
      this.particles.update(sdt);
      this.deathTimer -= dt;
      if (this.deathTimer <= 0 && !this.reported) {
        this.reported = true;
        this.state = 'dead';
        this.slowmo = 1;
        this.callbacks.onDeath?.(this.stats());
      }
    } else if (this.state === 'victory') {
      this.player.update(dt * 0.5);
      this.updateProjectiles(sdt);
      this.particles.update(sdt);
      this.victoryTimer -= dt;
      if (this.victoryTimer <= 0 && !this.reported) {
        this.reported = true;
        this.state = 'victoryShown';
        this.slowmo = 1;
        this.callbacks.onVictory?.(this.stats());
      }
    } else {
      this.particles.update(dt);
    }
  }

  updateCamera(dt) {
    this.shake *= Math.exp(-7.5 * dt);
    if (this.shake < 0.1) this.shake = 0;
    const magnitude = this.shake;
    this.shakeX = rand(-magnitude, magnitude);
    this.shakeY = rand(-magnitude, magnitude);
  }

  updateFlashes(dt) {
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.6);
    this.flashOrange = Math.max(0, this.flashOrange - dt * 2.1);
    this.phaseFlash = Math.max(0, this.phaseFlash - dt * 0.9);
  }

  updateAfterimages(dt) {
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const a = this.afterimages[i];
      a.life -= dt;
      if (a.life <= 0) this.afterimages.splice(i, 1);
    }
  }

  checkContact() {
    const player = this.player;
    const boss = this.boss;
    if (player.dead || player.invuln > 0) return;
    if (boss.dying || boss.state === 'dead' || boss.state === 'phase' || boss.state === 'teleport') return;
    if (boss.overlapsRect(player.rect)) player.takeDamage(boss.x);
  }

  spawnProjectile(x, y, angle, speed, center) {
    const r = (center ? 7 : 5.4) * this.motionScale;
    this.projectiles.push({
      x, y,
      vx: Math.cos(angle) * speed * this.motionScale,
      vy: Math.sin(angle) * speed * this.motionScale,
      r,
      age: 0,
      life: 5,
      trail: 0,
      phase: rand(0, TAU)
    });
  }

  updateProjectiles(dt) {
    const player = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt;
      p.trail -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.trail <= 0) {
        p.trail = 0.028;
        this.particles.spawn({
          x: p.x + rand(-2, 2),
          y: p.y + rand(-2, 2),
          vx: -p.vx * 0.06 + rand(-12, 12),
          vy: -p.vy * 0.06 + rand(-12, 12),
          life: rand(0.16, 0.4),
          size: p.r * rand(0.35, 0.7),
          color: Math.random() < 0.5 ? '#ff9a4a' : '#ffd0a0',
          additive: true,
          drag: 0.94
        });
      }
      const hitPlayer = !player.dead && p.x > player.x - player.pw * 0.5 - p.r && p.x < player.x + player.pw * 0.5 + p.r
        && p.y > player.y - player.ph * 0.92 - p.r && p.y < player.y + p.r;
      if (hitPlayer) {
        if (player.takeDamage(p.x)) {
          this.burstProjectile(p);
          this.projectiles.splice(i, 1);
          continue;
        }
      }
      if (p.y >= this.groundY || p.y < 0 || p.x < this.wallL || p.x > this.wallR) {
        this.burstProjectile(p);
        this.projectiles.splice(i, 1);
        continue;
      }
      if (p.age > p.life) this.projectiles.splice(i, 1);
    }
  }

  burstProjectile(p) {
    this.particles.burst(p.x, p.y, 16, {
      color: '#ffb066', speedMin: 30, speedMax: 230, lifeMin: 0.2, lifeMax: 0.6,
      size: rand(1.2, 3.2), additive: true
    });
    this.audio.tone({ freq: 160, freqEnd: 70, dur: 0.16, gain: 0.06, type: 'triangle' });
  }

  spawnShockwave(x, dir, speed) {
    this.shockwaves.push({ x, dir, speed: speed * this.motionScale, life: 2.2, maxLife: 2.2, cooldown: 0, seed: rand(0, TAU) });
  }

  updateShockwaves(dt) {
    const player = this.player;
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life -= dt;
      s.cooldown = Math.max(0, s.cooldown - dt);
      s.x += s.dir * s.speed * dt;
      if (Math.random() < dt * 42) {
        this.particles.spawn({
          x: s.x + rand(-16, 16),
          y: this.groundY - rand(0, 18),
          vx: s.dir * rand(20, 90),
          vy: rand(-90, -18),
          life: rand(0.2, 0.6),
          size: rand(0.8, 2.4),
          color: Math.random() < 0.5 ? '#ff9a4a' : '#ffcf8a',
          gravity: 220,
          additive: true
        });
      }
      if (!player.dead && s.cooldown <= 0 && s.x > player.x - 24 && s.x < player.x + 24
        && player.y > this.groundY - 10) {
        if (player.takeDamage(s.x)) s.cooldown = 0.55;
      }
      if (s.life <= 0 || s.x < this.wallL - 30 || s.x > this.wallR + 30) this.shockwaves.splice(i, 1);
    }
  }

  spawnSpike(x, delay) {
    this.spikes.push({ x, delay, life: 0.52, maxLife: 0.52, active: false, hit: false, age: 0, seed: rand(0, TAU) });
  }

  updateSpikes(dt) {
    const player = this.player;
    for (let i = this.spikes.length - 1; i >= 0; i--) {
      const s = this.spikes[i];
      if (s.delay > 0) {
        s.delay -= dt;
        if (s.delay <= 0) {
          s.active = true;
          this.audio.spike();
          this.shake = Math.max(this.shake, 4);
          this.particles.burst(s.x, this.groundY, 10, {
            color: '#ffb066', angle: -Math.PI / 2, spread: 1.4,
            speedMin: 40, speedMax: 200, lifeMin: 0.2, lifeMax: 0.5,
            size: rand(1, 2.6), additive: true
          });
        }
      } else {
        s.age += dt;
        s.life -= dt;
        if (!s.hit && !player.dead && player.y > this.groundY - 10
          && Math.abs(player.x - s.x) < 22 + player.pw * 0.4) {
          if (player.takeDamage(s.x)) s.hit = true;
        }
        if (s.life <= 0) this.spikes.splice(i, 1);
      }
    }
  }

  spawnRock(x, y, vx, vy) {
    this.rocks.push({ x, y, vx, vy, rot: rand(0, TAU), spin: rand(-6, 6), size: rand(4, 11) * this.motionScale, life: 4 });
  }

  updateRocks(dt) {
    const player = this.player;
    for (let i = this.rocks.length - 1; i >= 0; i--) {
      const r = this.rocks[i];
      r.life -= dt;
      r.vy += this.gravity * 0.8 * dt;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.rot += r.spin * dt;
      if (!player.dead && r.x > player.x - player.pw * 0.5 - r.size && r.x < player.x + player.pw * 0.5 + r.size
        && r.y > player.y - player.ph - r.size && r.y < player.y + r.size) {
        if (player.takeDamage(r.x)) {
          this.particles.burst(r.x, r.y, 8, { color: '#8d9499', speedMin: 20, speedMax: 160, lifeMin: 0.2, lifeMax: 0.6, size: rand(1, 3), additive: false });
          this.rocks.splice(i, 1);
          continue;
        }
      }
      if (r.y >= this.groundY) {
        this.dust(r.x, this.groundY, 5, 0.8);
        this.rocks.splice(i, 1);
        continue;
      }
      if (r.life <= 0) this.rocks.splice(i, 1);
    }
  }

  dust(x, y, count, power = 1) {
    for (let i = 0; i < count; i++) {
      this.particles.spawn({
        x: x + rand(-8, 8) * this.motionScale,
        y: y - rand(0, 5),
        vx: rand(-60, 60) * power,
        vy: rand(-90, -12) * power,
        life: rand(0.25, 0.7),
        size: rand(1.4, 4.2),
        color: Math.random() < 0.4 ? '#7c8a92' : '#48555d',
        additive: false,
        gravity: 180,
        drag: 0.975
      });
    }
  }

  burstSoul(x, y, count) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const speed = rand(30, 190);
      this.particles.spawn({
        x: x + Math.cos(a) * rand(2, 20),
        y: y + Math.sin(a) * rand(2, 26),
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 30,
        life: rand(0.35, 1),
        size: rand(1, 2.8),
        color: Math.random() < 0.5 ? '#e8fcff' : '#9fe4f7',
        additive: true,
        drag: 0.94
      });
    }
  }

  burstWings(x, y, facing) {
    for (let i = 0; i < 18; i++) {
      const side = i % 2 ? 1 : -1;
      this.particles.spawn({
        x: x + rand(-6, 6),
        y: y + rand(-6, 6),
        vx: side * rand(20, 150) - facing * 30,
        vy: rand(-80, 40),
        life: rand(0.25, 0.6),
        size: rand(1, 2.6),
        color: Math.random() < 0.5 ? '#dff8ff' : '#a9e6fa',
        type: 'streak',
        additive: true,
        drag: 0.93
      });
    }
  }

  playerDied() {
    if (this.state !== 'playing') return;
    this.state = 'dying';
    this.deathTimer = 1.9;
    this.slowmo = 0.3;
    this.shake = Math.max(this.shake, 26);
    this.hurtFlash = 1;
    this.audio.death();
    this.boss.state = 'idle';
    this.boss.timer = 999;
    this.boss.vx = 0;
    const p = this.player;
    this.particles.burst(p.x, p.chestY, 60, {
      color: '#e8fcff', speedMin: 20, speedMax: 340, lifeMin: 0.4, lifeMax: 1.6,
      size: rand(1, 3.4), additive: true
    });
    this.particles.burst(p.x, p.chestY, 30, {
      color: '#6fb9d0', speedMin: 10, speedMax: 180, lifeMin: 0.4, lifeMax: 1.4,
      size: rand(1, 2.6), additive: true
    });
    this.vibrate([40, 60, 120]);
  }

  bossDefeated() {
    if (this.state !== 'playing') return;
    this.state = 'victory';
    this.victoryTimer = 0.9;
    this.audio.victory();
    this.shake = Math.max(this.shake, 12);
    this.player.invuln = 999;
    const p = this.player;
    this.burstSoul(p.x, p.chestY, 30);
  }

  vibrate(pattern) {
    if (navigator.vibrate && !this.audio.muted) {
      try { navigator.vibrate(pattern); } catch {}
    }
  }

  render(ctx) {
    const { W, H, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#04060b';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    if (this.bg) ctx.drawImage(this.bg, 0, 0, W, H);
    this.ambient.drawRain(ctx);
    this.drawLightShafts(ctx);
    this.ambient.drawMotes(ctx, this.totalTime);
    this.drawWindowFog(ctx);

    this.boss.drawWarnings(ctx);
    this.drawShockwaves(ctx);
    this.drawAfterimages(ctx);

    this.boss.drawShadow(ctx);
    this.player.drawShadow(ctx);

    if (this.boss.x < this.player.x) {
      this.boss.draw(ctx);
      this.player.draw(ctx);
    } else {
      this.player.draw(ctx);
      this.boss.draw(ctx);
    }

    this.drawSpikes(ctx);
    this.drawProjectiles(ctx);
    this.drawRocks(ctx);
    this.particles.draw(ctx, true);
    this.drawForeground(ctx);
    ctx.restore();

    this.drawFlashes(ctx);
  }

  drawLightShafts(ctx) {
    if (!this.windows) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.windows.length; i++) {
      const win = this.windows[i];
      const flicker = 0.82 + 0.18 * Math.sin(this.totalTime * 0.6 + i * 2.1);
      const sway = Math.sin(this.totalTime * 0.25 + i) * 10;
      const top = win.top + win.h * 0.24;
      const bottom = this.groundY + 20;
      const width = win.w * (0.42 + i * 0.04);
      const g = ctx.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, `rgba(150,220,246,${0.05 * flicker})`);
      g.addColorStop(0.55, `rgba(120,195,225,${0.022 * flicker})`);
      g.addColorStop(1, 'rgba(100,180,220,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(win.cx - width * 0.22 + sway, top);
      ctx.lineTo(win.cx + width * 0.22 + sway, top);
      ctx.lineTo(win.cx + width * 0.85 + sway + width * 0.1, bottom);
      ctx.lineTo(win.cx - width * 0.85 + sway - width * 0.1, bottom);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawWindowFog(ctx) {
    if (!this.windows) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.windows.length; i++) {
      const win = this.windows[i];
      if (i === 0) continue;
      const drift = Math.sin(this.totalTime * 0.14 + i * 3) * win.w * 0.12;
      const g = ctx.createRadialGradient(win.cx + drift, win.top + win.h * 0.6, 2, win.cx + drift, win.top + win.h * 0.6, win.w * 1.25);
      g.addColorStop(0, 'rgba(122,198,226,.04)');
      g.addColorStop(1, 'rgba(122,198,226,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(win.cx + drift, win.top + win.h * 0.6, win.w * 1.25, win.h * 0.32, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawShockwaves(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.shockwaves) {
      const t = clamp(s.life / s.maxLife, 0, 1);
      const wobble = Math.sin(s.seed + this.totalTime * 18);
      const height = (16 + 8 * wobble) * this.motionScale;
      const w = 20 * this.motionScale;
      const x = s.x;
      ctx.strokeStyle = `rgba(255,150,70,${0.5 * t + 0.1})`;
      ctx.lineWidth = 2.4 * this.motionScale;
      ctx.beginPath();
      ctx.moveTo(x - s.dir * w, this.groundY + 2);
      ctx.lineTo(x - s.dir * w * 0.4, this.groundY - height * 0.5);
      ctx.lineTo(x + s.dir * w * 0.2, this.groundY - height);
      ctx.lineTo(x + s.dir * w * 0.65, this.groundY - height * 0.35);
      ctx.lineTo(x + s.dir * w, this.groundY + 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,220,170,${0.3 * t})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - s.dir * w * 0.7, this.groundY - height * 0.15);
      ctx.lineTo(x + s.dir * w * 0.55, this.groundY - height * 0.5);
      ctx.stroke();
      const g = ctx.createRadialGradient(x, this.groundY - height * 0.4, 1, x, this.groundY - height * 0.4, w * 2.6);
      g.addColorStop(0, `rgba(255,150,70,${0.17 * t})`);
      g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, this.groundY - height * 0.4, w * 2.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawProjectiles(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.projectiles) {
      const pulse = 1 + 0.08 * Math.sin(p.age * 16 + p.phase);
      const r = p.r * pulse;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.8);
      g.addColorStop(0, 'rgba(255,246,224,.95)');
      g.addColorStop(0.18, 'rgba(255,196,112,.9)');
      g.addColorStop(0.42, 'rgba(255,120,44,.45)');
      g.addColorStop(0.72, 'rgba(200,60,18,.14)');
      g.addColorStop(1, 'rgba(180,40,10,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 3.8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,250,235,.98)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.48, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawSpikes(ctx) {
    for (const s of this.spikes) {
      if (s.delay > 0) {
        const t = 1 - s.delay / 0.9;
        const pulse = 0.5 + 0.5 * Math.sin(this.totalTime * 15 + s.seed);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,140,60,${0.2 + pulse * 0.35})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(s.x, this.groundY, 12, 4, 0, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,170,90,${0.08 + t * 0.2})`;
        ctx.beginPath();
        ctx.arc(s.x, this.groundY, 12 + t * 16, Math.PI, TAU);
        ctx.stroke();
        ctx.restore();
      } else {
        const t = 1 - s.life / s.maxLife;
        const grow = clamp((s.maxLife - s.life) / 0.12, 0, 1);
        const height = (22 + 18 * Math.sin(s.seed)) * this.motionScale * grow;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const off = (i - 1) * 8 * this.motionScale;
          const h = height * (0.65 + 0.35 * Math.sin(i * 2 + s.seed));
          ctx.fillStyle = `rgba(255,120,40,${0.3 * (1 - t)})`;
          ctx.beginPath();
          ctx.moveTo(s.x + off - 5 * this.motionScale, this.groundY + 2);
          ctx.lineTo(s.x + off, this.groundY - h);
          ctx.lineTo(s.x + off + 5 * this.motionScale, this.groundY + 2);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = `rgba(255,220,170,${0.5 * (1 - t)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        const g = ctx.createRadialGradient(s.x, this.groundY - height * 0.4, 1, s.x, this.groundY - height * 0.4, 34 * this.motionScale);
        g.addColorStop(0, `rgba(255,140,60,${0.2 * (1 - t)})`);
        g.addColorStop(1, 'rgba(255,100,30,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, this.groundY - height * 0.3, 34 * this.motionScale, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  drawRocks(ctx) {
    for (const r of this.rocks) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rot);
      ctx.fillStyle = '#0a1017';
      ctx.strokeStyle = 'rgba(255,150,70,.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU;
        const rr = r.size * (0.7 + 0.3 * Math.sin(i * 3.1));
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  drawAfterimages(ctx) {
    ctx.save();
    for (const a of this.afterimages) {
      ctx.globalAlpha = clamp(a.life / a.max, 0, 1) * 0.3;
      ctx.translate(a.x, a.y);
      ctx.scale(a.facing, 1);
      ctx.fillStyle = '#6fdcfa';
      ctx.beginPath();
      ctx.moveTo(-a.pw * 0.34, -a.ph * 0.68);
      ctx.bezierCurveTo(-a.pw * 0.72, -a.ph * 0.54, -a.pw * 0.7, -a.ph * 0.2, -a.pw * 0.5, -a.ph * 0.015);
      ctx.lineTo(-a.pw * 0.26, -a.ph * 0.05);
      ctx.lineTo(a.pw * 0.03, -a.ph * 0.02);
      ctx.lineTo(a.pw * 0.36, -a.ph * 0.08);
      ctx.lineTo(a.pw * 0.5, -a.ph * 0.015);
      ctx.bezierCurveTo(a.pw * 0.7, -a.ph * 0.2, a.pw * 0.72, -a.ph * 0.54, a.pw * 0.34, -a.ph * 0.68);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha *= 0.8;
      ctx.beginPath();
      ctx.ellipse(0, -a.ph * 0.82, a.pw * 0.78, a.ph * 0.15, 0, 0, TAU);
      ctx.fill();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, this.shakeX, this.shakeY);
    }
    ctx.restore();
  }

  drawForeground(ctx) {
    ctx.save();
    const mist = ctx.createLinearGradient(0, this.groundY - 26, 0, this.groundY + 24);
    mist.addColorStop(0, 'rgba(90,160,190,0)');
    mist.addColorStop(0.6, 'rgba(90,160,190,.035)');
    mist.addColorStop(1, 'rgba(50,100,130,.055)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, this.groundY - 26, this.W, 50);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      const drift = Math.sin(this.totalTime * 0.07 + i * 4) * this.W * 0.08;
      const y = this.groundY - 10 - i * 9;
      const g = ctx.createRadialGradient(this.W * (0.35 + i * 0.3) + drift, y, 2, this.W * (0.35 + i * 0.3) + drift, y, this.W * 0.35);
      g.addColorStop(0, 'rgba(130,200,225,.025)');
      g.addColorStop(1, 'rgba(130,200,225,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(this.W * (0.35 + i * 0.3) + drift, y, this.W * 0.35, 12, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawFlashes(ctx) {
    if (this.hurtFlash > 0) {
      const g = ctx.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.18, this.W / 2, this.H / 2, this.H * 0.78);
      g.addColorStop(0, 'rgba(255,40,60,0)');
      g.addColorStop(0.65, `rgba(255,30,55,${0.09 * this.hurtFlash})`);
      g.addColorStop(1, `rgba(255,20,40,${0.32 * this.hurtFlash})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.W, this.H);
    }
    if (this.flashOrange > 0) {
      ctx.fillStyle = `rgba(255,120,45,${0.15 * this.flashOrange})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }
    if (this.phaseFlash > 0) {
      const g = ctx.createRadialGradient(this.W / 2, this.H / 2, 2, this.W / 2, this.H / 2, this.H * 0.8);
      g.addColorStop(0, `rgba(255,210,150,${0.2 * this.phaseFlash})`);
      g.addColorStop(1, 'rgba(255,100,30,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }
}
