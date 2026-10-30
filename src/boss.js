import { TAU, clamp, approach, sign, rand, pick, ellipseRectOverlap, hexRgba } from './util.js';

export class Boss {
  constructor(world) {
    this.world = world;
    this.maxHp = 48;
    this.reset();
  }

  reset() {
    const w = this.world;
    this.w = w.playerH * 2.02;
    this.h = w.playerH * 3.68;
    this.x = w.W * 0.70;
    this.y = w.groundY;
    this.vx = 0;
    this.vy = 0;
    this.facing = -1;
    this.hp = this.maxHp;
    this.phase = 1;
    this.state = 'idle';
    this.timer = 1.4;
    this.telegraphMax = 1;
    this.queued = null;
    this.lastAttack = '';
    this.flashTimer = 0;
    this.invuln = 0;
    this.dying = false;
    this.deathTimer = 0;
    this.deathTime = 0;
    this.targetX = this.x;
    this.animTime = 0;
    this.alpha = 1;
    this.slamCooldown = 0;
    this.attackCount = 0;
  }

  resize() {
    const w = this.world;
    const ratio = this.y / (w.groundY || 1);
    this.w = w.playerH * 2.02;
    this.h = w.playerH * 3.68;
    this.x = clamp(this.x, w.wallL + this.w * 0.42, w.wallR - this.w * 0.42);
    this.y = Math.min(w.groundY, this.y);
    if (this.state === 'idle' || this.state === 'recover') this.y = w.groundY;
  }

  get ratio() {
    return clamp(this.hp / this.maxHp, 0, 1);
  }

  get centerY() {
    return this.y - this.h * 0.46;
  }

  overlapsRect(rect) {
    return ellipseRectOverlap(this.x, this.centerY, this.w * 0.44, this.h * 0.46, rect);
  }

  update(dt) {
    const w = this.world;
    this.animTime += dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.alpha = this.state === 'teleport' ? Math.max(0, this.timer / 0.28) : 1;

    if (this.state === 'dead') return;

    if (this.dying) {
      this.deathTime += dt;
      this.deathTimer -= dt;
      if (Math.random() < dt * 46) {
        w.particles.spawn({
          x: this.x + rand(-this.w * 0.5, this.w * 0.5),
          y: this.y - rand(0, this.h),
          vx: rand(-40, 40),
          vy: rand(-120, -20),
          life: rand(0.5, 1.4),
          size: rand(1, 3.4),
          color: Math.random() < 0.55 ? '#ff9a4a' : '#ffd0a0',
          drag: 0.97
        });
      }
      if (this.deathTimer <= 0) {
        this.state = 'dead';
        w.bossDefeated();
      }
      return;
    }

    if (w.player.dead) {
      if (this.state !== 'idle') {
        this.state = 'idle';
        this.timer = 999;
        this.vx = 0;
      }
      this.y = approach(this.y, w.groundY, 1200 * dt);
      this.facing = sign(w.player.x - this.x);
      return;
    }

    switch (this.state) {
      case 'idle': this.updateIdle(dt); break;
      case 'telegraph': this.updateTelegraph(dt); break;
      case 'lunge': this.updateLunge(dt); break;
      case 'recover': this.updateRecover(dt); break;
      case 'leap': this.updateLeap(dt); break;
      case 'shoot': this.updateShoot(dt); break;
      case 'spikes': this.updateSpikes(dt); break;
      case 'teleport': this.updateTeleport(dt); break;
      case 'phase': this.updatePhase(dt); break;
      case 'slam': this.updateSlam(dt); break;
      default: break;
    }

    this.x = clamp(this.x, w.wallL + this.w * 0.44, w.wallR - this.w * 0.44);
    if (this.y > w.groundY) this.y = w.groundY;
  }

  updateIdle(dt) {
    const w = this.world;
    const player = w.player;
    this.facing = sign(player.x - this.x);
    const desired = Math.abs(player.x - this.x) > w.W * 0.34
      ? this.x + sign(player.x - this.x) * 18 * w.motionScale
      : this.x;
    this.vx = approach(this.vx, clamp((desired - this.x) * 1.6, -44, 44) * w.motionScale, 260 * dt);
    this.x += this.vx * dt;
    this.timer -= dt;
    if (this.timer <= 0) this.chooseAttack();
  }

  chooseAttack() {
    const w = this.world;
    const dist = Math.abs(w.player.x - this.x);
    const pool = dist > w.W * 0.32
      ? ['lunge', 'lunge', 'leap', 'shoot']
      : ['leap', 'shoot', 'spikes', 'lunge'];
    if (this.phase === 2) pool.push('teleport', 'spikes', 'shoot');
    let next = pick(pool);
    for (let i = 0; i < 4 && next === this.lastAttack; i++) next = pick(pool);
    this.queued = next;
    this.lastAttack = next;
    this.attackCount++;
    this.state = 'telegraph';
    this.telegraphMax = this.phase === 2 ? 0.5 : 0.64;
    this.timer = this.telegraphMax;
    this.facing = sign(w.player.x - this.x);
    this.targetX = clamp(w.player.x + w.player.vx * 0.26, w.wallL + this.w * 0.5, w.wallR - this.w * 0.5);
    w.audio.tone({ freq: this.phase === 2 ? 74 : 62, freqEnd: 40, dur: 0.45, gain: 0.05, type: 'sawtooth' });
    if (this.queued === 'lunge') {
      w.particles.burst(this.x, this.centerY, 9, {
        color: '#ff9a4a', speedMin: 10, speedMax: 60, lifeMin: 0.2, lifeMax: 0.6, size: rand(1, 2.6), additive: true
      });
    }
  }

  updateTelegraph(dt) {
    this.timer -= dt;
    const w = this.world;
    if (this.queued === 'spikes') {
      if (Math.random() < dt * 24) {
        w.particles.spawn({
          x: this.targetX + rand(-w.W * 0.2, w.W * 0.2),
          y: w.groundY - rand(0, 8),
          vx: rand(-8, 8),
          vy: rand(-40, -8),
          life: rand(0.2, 0.5),
          size: rand(0.8, 2),
          color: '#ff9a4a',
          additive: true
        });
      }
    }
    if (this.timer <= 0) this.executeAttack();
  }

  executeAttack() {
    const w = this.world;
    switch (this.queued) {
      case 'lunge': {
        this.state = 'lunge';
        this.timer = 0.5;
        this.vx = this.facing * 860 * w.motionScale;
        w.audio.roar();
        w.shake = Math.max(w.shake, 8);
        w.particles.burst(this.x - this.facing * this.w * 0.3, this.y - this.h * 0.2, 16, {
          color: '#ff9a4a', speedMin: 40, speedMax: 260, lifeMin: 0.2, lifeMax: 0.6,
          size: rand(1.2, 3.2), angle: this.facing > 0 ? Math.PI : 0, spread: 1.4, additive: true
        });
        break;
      }
      case 'leap': {
        this.state = 'leap';
        this.timer = 0.95;
        this.vy = -w.jumpVelocity * 1.3;
        const airtime = Math.max(0.4, (2 * Math.abs(this.vy)) / (w.gravity * 1.05));
        this.vx = (this.targetX - this.x) / airtime;
        this.facing = sign(this.targetX - this.x || this.facing);
        w.audio.tone({ freq: 120, freqEnd: 300, dur: 0.3, gain: 0.07, type: 'sawtooth' });
        w.dust(this.x, this.y, 14, 1.6);
        break;
      }
      case 'shoot': {
        this.state = 'shoot';
        this.timer = 0.3;
        this.fireOrbs();
        break;
      }
      case 'spikes': {
        this.state = 'spikes';
        this.timer = 0.9;
        this.castSpikes();
        break;
      }
      case 'teleport': {
        this.startTeleport();
        break;
      }
      default: this.startRecover(0.5); break;
    }
  }

  updateLunge(dt) {
    const w = this.world;
    this.x += this.vx * dt;
    this.timer -= dt;
    if (Math.random() < dt * 50) {
      w.particles.spawn({
        x: this.x + rand(-this.w * 0.42, this.w * 0.42),
        y: this.y - rand(this.h * 0.05, this.h * 0.7),
        vx: -this.vx * rand(0.1, 0.35),
        vy: rand(-30, 30),
        life: rand(0.15, 0.46),
        size: rand(1, 3),
        color: '#ff9a4a',
        additive: true,
        type: 'streak'
      });
    }
    if (this.timer <= 0) {
      this.vx = 0;
      this.startRecover(this.phase === 2 ? 0.42 : 0.58);
    }
  }

  updateLeap(dt) {
    const w = this.world;
    this.vy += w.gravity * 1.05 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y >= w.groundY && this.vy > 0) {
      this.y = w.groundY;
      this.vy = 0;
      this.vx = 0;
      this.state = 'slam';
      this.timer = 0.34;
      this.slamImpact();
    }
  }

  slamImpact() {
    const w = this.world;
    w.audio.slam();
    w.shake = Math.max(w.shake, 25);
    w.hitstop = Math.max(w.hitstop, 0.05);
    w.flashOrange = 0.55;
    w.spawnShockwave(this.x, -1, this.phase === 2 ? 620 : 520);
    w.spawnShockwave(this.x, 1, this.phase === 2 ? 620 : 520);
    w.particles.burst(this.x, this.y - 6, 34, {
      color: '#ffb066', angle: -Math.PI / 2, spread: Math.PI * 1.55,
      speedMin: 80, speedMax: 430, lifeMin: 0.25, lifeMax: 0.85,
      size: rand(1.2, 4), type: 'spark', length: 0.035, additive: true
    });
    w.particles.burst(this.x, this.y - 4, 22, {
      color: '#7f8f97', speedMin: 20, speedMax: 190, lifeMin: 0.35, lifeMax: 0.9,
      size: rand(2, 5), additive: false, gravity: 120, jitter: this.w * 0.4
    });
    for (let i = 0; i < 4; i++) {
      w.spawnRock(this.x + rand(-this.w * 0.4, this.w * 0.4), this.y, rand(-160, 160), rand(-420, -220));
    }
  }

  updateSlam(dt) {
    this.timer -= dt;
    if (this.timer <= 0) this.startRecover(this.phase === 2 ? 0.42 : 0.6);
  }

  fireOrbs() {
    const w = this.world;
    const count = this.phase === 2 ? 5 : 3;
    const spread = this.phase === 2 ? 0.44 : 0.28;
    const originX = this.x + this.facing * this.w * 0.08;
    const originY = this.y - this.h * 0.66;
    const targetX = w.player.x;
    const targetY = w.player.chestY;
    const base = Math.atan2(targetY - originY, targetX - originX);
    for (let i = 0; i < count; i++) {
      const a = base + (i - (count - 1) / 2) * spread;
      w.spawnProjectile(originX, originY, a, this.phase === 2 ? 370 : 300, i === Math.floor(count / 2));
    }
    w.audio.shoot();
    w.particles.burst(originX, originY, 14, {
      color: '#ffb066', speedMin: 30, speedMax: 180, lifeMin: 0.2, lifeMax: 0.5,
      size: rand(1.4, 3), additive: true
    });
  }

  updateShoot(dt) {
    this.timer -= dt;
    if (this.timer <= 0) this.startRecover(this.phase === 2 ? 0.32 : 0.5);
  }

  castSpikes() {
    const w = this.world;
    const positions = [w.player.x, w.player.x - w.W * 0.13, w.player.x + w.W * 0.13];
    if (this.phase === 2) {
      positions.push(w.player.x - w.W * 0.26, w.player.x + w.W * 0.26);
    }
    positions.forEach((x, i) => {
      w.spawnSpike(clamp(x, w.wallL + 16, w.wallR - 16), 0.12 + i * 0.13);
    });
    w.audio.spike();
  }

  updateSpikes(dt) {
    this.timer -= dt;
    if (this.timer <= 0) this.startRecover(this.phase === 2 ? 0.32 : 0.5);
  }

  startTeleport() {
    const w = this.world;
    this.state = 'teleport';
    this.timer = 0.3;
    this.vx = 0;
    this.invuln = 0.48;
    w.audio.noiseBurst({ dur: 0.4, gain: 0.12, type: 'bandpass', freq: 300, freqEnd: 1900, q: 1.4 });
    w.particles.burst(this.x, this.centerY, 26, {
      color: '#ff9a4a', speedMin: 20, speedMax: 170, lifeMin: 0.3, lifeMax: 0.9,
      size: rand(1, 3.2), additive: true
    });
    const side = w.player.x < w.W * 0.5 ? 1 : -1;
    this.teleportX = clamp(w.player.x + side * w.W * 0.2, w.wallL + this.w * 0.5, w.wallR - this.w * 0.5);
    this.teleportFacing = sign(w.player.x - this.teleportX);
  }

  updateTeleport(dt) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.x = this.teleportX;
      this.facing = this.teleportFacing;
      this.state = 'telegraph';
      this.queued = 'lunge';
      this.telegraphMax = 0.42;
      this.timer = this.telegraphMax;
      this.targetX = this.world.player.x;
      w_particles_burst(this.world, this.x, this.centerY);
    }
  }

  updatePhase(dt) {
    const w = this.world;
    this.timer -= dt;
    if (Math.random() < dt * 50) {
      const a = rand(0, TAU);
      const r = rand(this.w * 0.2, this.w * 0.9);
      w.particles.spawn({
        x: this.x + Math.cos(a) * r,
        y: this.centerY + Math.sin(a) * r,
        vx: -Math.cos(a) * r * 1.8,
        vy: -Math.sin(a) * r * 1.8,
        life: rand(0.3, 0.9),
        size: rand(1, 3.4),
        color: Math.random() < 0.5 ? '#ff7a2e' : '#ffc27a',
        additive: true
      });
    }
    if (Math.random() < dt * 8) w.shake = Math.max(w.shake, 5);
    if (this.timer <= 0) {
      this.state = 'idle';
      this.timer = 0.45;
      this.invuln = 0;
    }
  }

  startRecover(duration) {
    this.state = 'recover';
    this.timer = duration;
    this.telegraphMax = duration;
  }

  updateRecover(dt) {
    this.facing = sign(this.world.player.x - this.x);
    this.timer -= dt;
    if (this.timer <= 0) {
      this.state = 'idle';
      this.timer = this.phase === 2 ? rand(0.45, 0.95) : rand(0.85, 1.35);
    }
  }

  takeDamage(amount, hx, hy) {
    if (this.dying || this.state === 'dead' || this.invuln > 0 || this.state === 'phase') return false;
    this.hp -= amount;
    this.flashTimer = 0.14;
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
      return true;
    }
    if (this.hp <= this.maxHp * 0.5 && this.phase === 1) {
      this.startPhaseTwo();
    }
    return true;
  }

  startPhaseTwo() {
    const w = this.world;
    this.phase = 2;
    this.state = 'phase';
    this.timer = 1.55;
    this.telegraphMax = this.timer;
    this.invuln = 1.7;
    this.vx = 0;
    this.vy = 0;
    this.y = w.groundY;
    w.audio.phase();
    w.shake = Math.max(w.shake, 30);
    w.flashOrange = 1;
    w.hitstop = Math.max(w.hitstop, 0.12);
    w.slowmo = 0.55;
    w.phaseFlash = 1;
    setTimeout(() => { if (w.state === 'playing') w.slowmo = 1; }, 500);
    w.particles.burst(this.x, this.centerY, 70, {
      color: '#ff7a2e', speedMin: 30, speedMax: 460, lifeMin: 0.4, lifeMax: 1.5,
      size: rand(1.2, 4.4), additive: true
    });
    w.particles.burst(this.x, this.centerY, 36, {
      color: '#ffd8a8', speedMin: 20, speedMax: 260, lifeMin: 0.3, lifeMax: 1.2,
      size: rand(1, 3), additive: true
    });
    w.vibrate([30, 50, 30, 50, 60]);
  }

  die() {
    const w = this.world;
    this.dying = true;
    this.state = 'dying';
    this.deathTimer = 2.4;
    this.deathTime = 0;
    this.invuln = 999;
    this.vx = 0;
    this.vy = 0;
    w.audio.death();
    w.shake = Math.max(w.shake, 34);
    w.flashOrange = 1;
    w.hitstop = Math.max(w.hitstop, 0.12);
    w.slowmo = 0.3;
    w.vibrate([40, 60, 40, 60, 120]);
    w.particles.burst(this.x, this.centerY, 90, {
      color: '#ff9a4a', speedMin: 40, speedMax: 520, lifeMin: 0.4, lifeMax: 1.8,
      size: rand(1.2, 4.6), additive: true
    });
    w.particles.burst(this.x, this.centerY, 50, {
      color: '#e8fbff', speedMin: 20, speedMax: 380, lifeMin: 0.4, lifeMax: 1.6,
      size: rand(1, 3.2), additive: true
    });
  }

  drawWarnings(ctx) {
    if (this.dying) return;
    const w = this.world;
    if (this.state === 'telegraph') {
      const t = 1 - this.timer / this.telegraphMax;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (this.queued === 'lunge') {
        const dir = this.facing;
        const startX = this.x + dir * this.w * 0.3;
        const endX = clamp(this.x + dir * w.W * 0.48, w.wallL, w.wallR);
        const grad = ctx.createLinearGradient(startX, 0, endX, 0);
        grad.addColorStop(0, `rgba(255,120,45,${0.02 + t * 0.07})`);
        grad.addColorStop(1, `rgba(255,160,80,${0.14 + t * 0.32})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5 + t * 3;
        ctx.setLineDash([10, 8]);
        ctx.lineDashOffset = -performance.now() * 0.03;
        ctx.beginPath();
        ctx.moveTo(startX, w.groundY - 2);
        ctx.lineTo(endX, w.groundY - 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = `rgba(255,150,70,${0.05 + t * 0.15})`;
        ctx.fillRect(Math.min(startX, endX), w.groundY - 5, Math.abs(endX - startX), 3);
      } else if (this.queued === 'leap') {
        const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 12);
        ctx.strokeStyle = `rgba(255,140,60,${0.15 + t * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(this.targetX, w.groundY, w.W * 0.075, 8 + pulse * 3, 0, 0, TAU);
        ctx.stroke();
        const g = ctx.createRadialGradient(this.targetX, w.groundY, 1, this.targetX, w.groundY, w.W * 0.08);
        g.addColorStop(0, `rgba(255,120,40,${0.12 + t * 0.18})`);
        g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(this.targetX, w.groundY, w.W * 0.085, 12, 0, 0, TAU);
        ctx.fill();
      } else if (this.queued === 'spikes') {
        ctx.strokeStyle = `rgba(255,140,60,${0.18 + t * 0.3})`;
        ctx.lineWidth = 1.2;
        for (let i = -1; i <= 1; i++) {
          const x = w.player.x + i * w.W * 0.16;
          ctx.beginPath();
          ctx.ellipse(x, w.groundY, w.W * 0.04, 5, 0, 0, TAU);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    if (this.state === 'teleport') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(this.teleportX, this.centerY, 1, this.teleportX, this.centerY, this.w * 0.9);
      g.addColorStop(0, 'rgba(255,100,40,.22)');
      g.addColorStop(1, 'rgba(255,100,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.teleportX, this.centerY, this.w * 0.9, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  drawShadow(ctx) {
    const w = this.world;
    const air = clamp(1 - (w.groundY - this.y) / (w.h * 0.4 || 1), 0.2, 1);
    ctx.save();
    ctx.globalAlpha = 0.55 * air * (this.dying ? clamp(this.deathTimer / 2.4, 0, 1) : 1);
    ctx.fillStyle = '#020306';
    ctx.beginPath();
    ctx.ellipse(this.x, w.groundY + 4, this.w * 0.55 * air, this.h * 0.035 * air, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  draw(ctx) {
    if (this.state === 'dead') return;
    const bh = this.h;
    const bw = this.w;
    const t = this.animTime;
    const world = this.world;
    const dyingAlpha = this.dying ? clamp(this.deathTimer / 2.4, 0, 1) : 1;
    const globalAlpha = this.alpha * dyingAlpha;
    if (globalAlpha <= 0.01) return;
    const isTelegraph = this.state === 'telegraph';
    const charge = isTelegraph ? clamp(1 - this.timer / this.telegraphMax, 0, 1) : 0;
    const lunge = this.state === 'lunge';
    const leap = this.state === 'leap' || this.state === 'slam';
    const phasePulse = this.phase === 2 ? 0.5 + 0.5 * Math.sin(t * 4.5) : 0;
    const bob = (this.state === 'idle' || this.state === 'recover') ? Math.sin(t * 1.9) * bh * 0.008 : 0;
    const crouch = isTelegraph ? charge * 0.06 : 0;

    ctx.save();
    ctx.globalAlpha = globalAlpha;
    ctx.translate(this.x, this.y + bob);
    ctx.scale(this.facing, 1);
    if (lunge) ctx.rotate(-0.09);
    ctx.scale(1 + crouch * 0.6, 1 - crouch);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const auraR = bw * (0.9 + phasePulse * 0.16 + charge * 0.3);
    const aura = ctx.createRadialGradient(0, -bh * 0.5, bw * 0.08, 0, -bh * 0.5, auraR);
    aura.addColorStop(0, `rgba(255,110,40,${this.phase === 2 ? 0.16 + phasePulse * 0.08 : 0.045 + charge * 0.07})`);
    aura.addColorStop(0.5, `rgba(220,70,20,${this.phase === 2 ? 0.07 : 0.02 + charge * 0.03})`);
    aura.addColorStop(1, 'rgba(200,50,10,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -bh * 0.5, auraR, 0, TAU);
    ctx.fill();
    if (this.state === 'phase') {
      ctx.strokeStyle = `rgba(255,140,60,${0.3 + 0.2 * Math.sin(t * 9)})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const rr = bw * (0.5 + i * 0.28) * (0.7 + (1 - this.timer / this.telegraphMax) * 0.6);
        ctx.beginPath();
        ctx.arc(0, -bh * 0.48, rr, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();

    const sway = Math.sin(t * 1.5) * bw * 0.025;
    const capeGrad = ctx.createLinearGradient(0, -bh * 0.72, 0, 0);
    capeGrad.addColorStop(0, '#0c131d');
    capeGrad.addColorStop(0.55, '#070b12');
    capeGrad.addColorStop(1, '#020407');
    ctx.fillStyle = capeGrad;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.26, -bh * 0.7);
    ctx.bezierCurveTo(-bw * 0.62 + sway, -bh * 0.56, -bw * 0.7, -bh * 0.24, -bw * 0.58, -bh * 0.03);
    ctx.lineTo(-bw * 0.48, -bh * 0.1);
    ctx.lineTo(-bw * 0.38, -bh * 0.005);
    ctx.lineTo(-bw * 0.22, -bh * 0.08);
    ctx.lineTo(-bw * 0.08, bh * 0.012);
    ctx.lineTo(bw * 0.05, -bh * 0.06);
    ctx.lineTo(bw * 0.2, bh * 0.012);
    ctx.lineTo(bw * 0.35, -bh * 0.07);
    ctx.lineTo(bw * 0.47, bh * 0.005);
    ctx.lineTo(bw * 0.58, -bh * 0.04);
    ctx.bezierCurveTo(bw * 0.7, -bh * 0.24, bw * 0.62 + sway, -bh * 0.56, bw * 0.26, -bh * 0.7);
    ctx.quadraticCurveTo(0, -bh * 0.76, -bw * 0.26, -bh * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,105,130,.28)';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(52,80,100,.24)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.2, -bh * 0.62);
    ctx.quadraticCurveTo(-bw * 0.46, -bh * 0.32, -bw * 0.3, -bh * 0.08);
    ctx.moveTo(bw * 0.2, -bh * 0.62);
    ctx.quadraticCurveTo(bw * 0.46, -bh * 0.32, bw * 0.3, -bh * 0.08);
    ctx.stroke();

    const hipY = -bh * 0.35;
    ctx.strokeStyle = '#05080d';
    ctx.lineWidth = bw * 0.085;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-bw * 0.14, hipY);
    ctx.lineTo(-bw * 0.32, -bh * 0.18);
    ctx.lineTo(-bw * 0.42, -bh * 0.005);
    ctx.moveTo(bw * 0.14, hipY);
    ctx.lineTo(bw * 0.31, -bh * 0.19);
    ctx.lineTo(bw * 0.42, -bh * 0.005);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(84,124,148,.3)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.22, hipY - bh * 0.02);
    ctx.lineTo(-bw * 0.34, -bh * 0.18);
    ctx.moveTo(bw * 0.22, hipY - bh * 0.02);
    ctx.lineTo(bw * 0.33, -bh * 0.19);
    ctx.stroke();

    const body = ctx.createLinearGradient(0, -bh * 0.68, 0, -bh * 0.25);
    body.addColorStop(0, '#18222e');
    body.addColorStop(0.5, '#0e1621');
    body.addColorStop(1, '#060a10');
    ctx.fillStyle = body;
    ctx.strokeStyle = 'rgba(94,138,164,.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.24, -bh * 0.64);
    ctx.bezierCurveTo(-bw * 0.31, -bh * 0.5, -bw * 0.24, -bh * 0.36, -bw * 0.19, -bh * 0.29);
    ctx.lineTo(-bw * 0.16, -bh * 0.33);
    ctx.lineTo(bw * 0.16, -bh * 0.33);
    ctx.lineTo(bw * 0.19, -bh * 0.29);
    ctx.bezierCurveTo(bw * 0.24, -bh * 0.36, bw * 0.31, -bh * 0.5, bw * 0.24, -bh * 0.64);
    ctx.quadraticCurveTo(0, -bh * 0.72, -bw * 0.24, -bh * 0.64);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(103,150,176,.25)';
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 3; i++) {
      const y = -bh * (0.58 - i * 0.08);
      ctx.beginPath();
      ctx.moveTo(-bw * (0.2 - i * 0.012), y);
      ctx.quadraticCurveTo(0, y + bh * 0.025, bw * (0.2 - i * 0.012), y);
      ctx.stroke();
    }

    ctx.fillStyle = '#101923';
    ctx.strokeStyle = 'rgba(96,140,166,.32)';
    ctx.beginPath();
    ctx.ellipse(-bw * 0.27, -bh * 0.62, bw * 0.09, bh * 0.055, -0.35, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(bw * 0.27, -bh * 0.62, bw * 0.09, bh * 0.055, 0.35, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0b121a';
    ctx.strokeStyle = 'rgba(104,150,176,.34)';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * bw * 0.2, -bh * 0.68);
      ctx.lineTo(side * bw * 0.33, -bh * 0.8);
      ctx.lineTo(side * bw * 0.38, -bh * 0.66);
      ctx.lineTo(side * bw * 0.46, -bh * 0.7);
      ctx.lineTo(side * bw * 0.34, -bh * 0.59);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.strokeStyle = '#080e15';
    ctx.lineWidth = bw * 0.05;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-bw * 0.2, -bh * 0.58);
    ctx.lineTo(-bw * 0.42, -bh * 0.42);
    ctx.lineTo(-bw * 0.52, -bh * 0.46);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,164,188,.24)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.21, -bh * 0.578);
    ctx.lineTo(-bw * 0.42, -bh * 0.424);
    ctx.stroke();
    ctx.strokeStyle = '#aeb8b6';
    ctx.lineWidth = Math.max(1, bw * 0.018);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-bw * 0.5, -bh * 0.455);
      ctx.lineTo(-bw * (0.58 + i * 0.035), -bh * (0.42 + i * 0.03));
      ctx.stroke();
    }

    const nailHandX = bw * 0.3;
    const nailHandY = -bh * 0.44;
    const nailAngle = lunge ? -0.18 : (isTelegraph ? -0.95 - charge * 0.25 : 0.68);
    ctx.save();
    ctx.translate(nailHandX, nailHandY);
    ctx.rotate(nailAngle);
    ctx.strokeStyle = '#0a121b';
    ctx.lineWidth = bw * 0.06;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-bw * 0.03, 0);
    ctx.lineTo(bw * 0.1, 0);
    ctx.stroke();
    const nailLen = bh * 0.46;
    const nailGrad = ctx.createLinearGradient(0, 0, nailLen, 0);
    nailGrad.addColorStop(0, '#4f6069');
    nailGrad.addColorStop(0.55, '#a7b6bb');
    nailGrad.addColorStop(1, '#e6ece8');
    ctx.strokeStyle = nailGrad;
    ctx.lineWidth = Math.max(2, bw * 0.03);
    ctx.beginPath();
    ctx.moveTo(bw * 0.08, 0);
    ctx.lineTo(nailLen, 0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(bw * 0.1, -bw * 0.008);
    ctx.lineTo(nailLen * 0.96, -bw * 0.004);
    ctx.stroke();
    ctx.fillStyle = '#c9d2d0';
    ctx.beginPath();
    ctx.moveTo(nailLen, 0);
    ctx.lineTo(nailLen - bw * 0.03, -bw * 0.022);
    ctx.lineTo(nailLen - bw * 0.018, 0);
    ctx.lineTo(nailLen - bw * 0.03, bw * 0.022);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#0a1119';
    ctx.lineWidth = bw * 0.045;
    ctx.beginPath();
    ctx.moveTo(bw * 0.19, -bh * 0.6);
    ctx.lineTo(bw * 0.3, -bh * 0.44);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,164,188,.25)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(bw * 0.2, -bh * 0.598);
    ctx.lineTo(bw * 0.305, -bh * 0.446);
    ctx.stroke();

    const maskY = -bh * 0.80;
    const mw = bw * 0.205;
    const mh = bh * 0.135;
    ctx.save();
    ctx.translate(0, maskY);
    const hornGrad = ctx.createLinearGradient(-mw * 1.4, -mh * 2.6, mw, mh);
    hornGrad.addColorStop(0, '#f2efe3');
    hornGrad.addColorStop(0.35, '#d8d5c7');
    hornGrad.addColorStop(0.72, '#aab4b2');
    hornGrad.addColorStop(1, '#758387');
    ctx.fillStyle = hornGrad;
    ctx.strokeStyle = 'rgba(214,244,252,.5)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(-mw * 0.5, -mh * 0.62);
    ctx.bezierCurveTo(-mw * 0.9, -mh * 1.32, -mw * 1.36, -mh * 1.72, -mw * 1.52, -mh * 2.75);
    ctx.bezierCurveTo(-mw * 1.33, -mh * 2.0, -mw * 1.04, -mh * 1.48, -mw * 0.72, -mh * 1.12);
    ctx.lineTo(-mw * 0.8, -mh * 0.94);
    ctx.bezierCurveTo(-mw * 0.96, -mh * 1.08, -mw * 1.06, -mh * 1.1, -mw * 1.16, -mh * 1.24);
    ctx.bezierCurveTo(-mw * 0.92, -mh * 0.94, -mw * 0.66, -mh * 0.82, -mw * 0.18, -mh * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(mw * 0.5, -mh * 0.62);
    ctx.bezierCurveTo(mw * 0.8, -mh * 0.98, mw * 1.05, -mh * 1.12, mw * 1.2, -mh * 1.48);
    ctx.lineTo(mw * 1.05, -mh * 1.24);
    ctx.lineTo(mw * 1.14, -mh * 1.18);
    ctx.lineTo(mw * 1.0, -mh * 1.05);
    ctx.bezierCurveTo(mw * 0.88, -mh * 0.88, mw * 0.62, -mh * 0.82, mw * 0.18, -mh * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const maskGrad = ctx.createLinearGradient(-mw, -mh * 1.2, mw, mh * 1.2);
    maskGrad.addColorStop(0, '#f7f4e8');
    maskGrad.addColorStop(0.28, '#e0ddd0');
    maskGrad.addColorStop(0.6, '#bfc6c2');
    maskGrad.addColorStop(0.86, '#929e9e');
    maskGrad.addColorStop(1, '#737f82');
    ctx.fillStyle = maskGrad;
    ctx.beginPath();
    ctx.moveTo(0, -mh * 1.2);
    ctx.bezierCurveTo(mw * 0.62, -mh * 1.15, mw * 1.03, -mh * 0.62, mw * 0.98, -mh * 0.06);
    ctx.bezierCurveTo(mw * 0.94, mh * 0.46, mw * 0.5, mh * 0.98, 0, mh * 1.26);
    ctx.bezierCurveTo(-mw * 0.5, mh * 0.98, -mw * 0.94, mh * 0.46, -mw * 0.98, -mh * 0.06);
    ctx.bezierCurveTo(-mw * 1.03, -mh * 0.62, -mw * 0.62, -mh * 1.15, 0, -mh * 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(58,68,70,.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-mw * 0.16, -mh * 1.08);
    ctx.lineTo(-mw * 0.05, -mh * 0.62);
    ctx.lineTo(-mw * 0.2, -mh * 0.36);
    ctx.lineTo(-mw * 0.08, -mh * 0.02);
    ctx.lineTo(-mw * 0.18, mh * 0.24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mw * 0.58, mh * 0.34);
    ctx.lineTo(mw * 0.4, mh * 0.6);
    ctx.lineTo(mw * 0.48, mh * 0.72);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,130,45,.38)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(mw * 0.38, mh * 0.28);
    ctx.lineTo(mw * 0.2, mh * 0.5);
    ctx.lineTo(mw * 0.3, mh * 0.72);
    ctx.moveTo(-mw * 0.38, mh * 0.26);
    ctx.lineTo(-mw * 0.12, mh * 0.48);
    ctx.stroke();

    const eyeGlow = (this.phase === 2 ? 1 : 0.62) + charge * 0.75 + (lunge ? 0.45 : 0);
    const eyeY = -mh * 0.06;
    const eyeX = mw * 0.4;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const side of [-1, 1]) {
      const ex = side * eyeX;
      const er = mw * (0.7 + eyeGlow * 0.2);
      const g = ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, er * 2.4);
      g.addColorStop(0, `rgba(255,236,196,${0.85 * clamp(eyeGlow, 0, 1)})`);
      g.addColorStop(0.18, `rgba(255,168,66,${0.7 * clamp(eyeGlow, 0, 1)})`);
      g.addColorStop(0.48, `rgba(235,82,20,${0.34 * clamp(eyeGlow, 0, 1)})`);
      g.addColorStop(0.78, `rgba(180,38,8,${0.12 * clamp(eyeGlow, 0, 1)})`);
      g.addColorStop(1, 'rgba(150,20,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ex, eyeY, er * 2.4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    for (const side of [-1, 1]) {
      ctx.fillStyle = '#030508';
      ctx.beginPath();
      ctx.ellipse(side * eyeX, eyeY, mw * 0.27, mh * 0.28, side * 0.15, 0, TAU);
      ctx.fill();
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const side of [-1, 1]) {
      const ex = side * eyeX;
      const g = ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, mw * 0.16);
      g.addColorStop(0, 'rgba(255,250,230,.98)');
      g.addColorStop(0.3, `rgba(255,196,110,${0.85 + charge * 0.1})`);
      g.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ex, eyeY, mw * 0.16, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = `rgba(255,130,50,${0.4 + charge * 0.5})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(mw * 0.38, mh * 0.16);
    ctx.quadraticCurveTo(mw * 0.18, mh * 0.54, mw * 0.3, mh * 0.86);
    ctx.moveTo(-mw * 0.34, mh * 0.2);
    ctx.quadraticCurveTo(-mw * 0.08, mh * 0.5, -mw * 0.15, mh * 0.72);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,.65)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, mh * 1.16, Math.PI * 1.08, Math.PI * 1.55);
    ctx.stroke();
    ctx.restore();

    if (this.flashTimer > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = clamp(this.flashTimer / 0.14, 0, 1) * 0.65;
      ctx.fillStyle = '#fff8e8';
      ctx.beginPath();
      ctx.ellipse(0, -bh * 0.5, bw * 0.4, bh * 0.46, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    if (this.phase === 2) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const a = t * 1.3 + i / 5 * TAU;
        const rx = bw * (0.34 + Math.sin(t * 2 + i) * 0.1);
        const ry = bh * (0.3 + Math.cos(t * 1.7 + i) * 0.08);
        const x = Math.cos(a) * rx;
        const y = -bh * 0.48 + Math.sin(a) * ry;
        ctx.globalAlpha = 0.18 + 0.12 * Math.sin(t * 4 + i);
        ctx.fillStyle = '#ff8a3a';
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    if (leap) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,140,60,.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-bw * 0.5 + i * bw * 0.3, -bh * (0.2 + i * 0.1));
        ctx.lineTo(-bw * 0.5 + i * bw * 0.3, -bh * (0.35 + i * 0.1));
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }
}

function w_particles_burst(world, x, y) {
  world.particles.burst(x, y, 26, {
    color: '#ff9a4a', speedMin: 30, speedMax: 240, lifeMin: 0.25, lifeMax: 0.8,
    size: rand(1, 3.2), additive: true
  });
}
