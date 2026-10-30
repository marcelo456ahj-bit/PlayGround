import { TAU, clamp, approach, sign, rand } from './util.js';

export class Player {
  constructor(world) {
    this.world = world;
    this.maxMasks = 5;
    this.reset();
  }

  reset() {
    const w = this.world;
    this.ph = w.playerH;
    this.pw = this.ph * 0.42;
    this.x = w.W * 0.30;
    this.y = w.groundY;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.masks = this.maxMasks;
    this.soul = 0;
    this.maxSoul = 99;
    this.grounded = true;
    this.coyote = 0.1;
    this.jumpBuffer = 0;
    this.doubleJumpUsed = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDir = 1;
    this.ghostTimer = 0;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.attackBuffer = 0;
    this.attackDir = 0;
    this.attackHit = false;
    this.invuln = 0;
    this.hurtTimer = 0;
    this.focusTimer = 0;
    this.focusActive = false;
    this.stepTimer = 0;
    this.animTime = 0;
    this.dead = false;
    this.deathTime = 0;
    this.spawnPulse = 1;
  }

  resize() {
    this.ph = this.world.playerH;
    this.pw = this.ph * 0.42;
    this.x = clamp(this.x, this.world.wallL + this.pw, this.world.wallR - this.pw);
    this.y = clamp(this.y, this.world.H * 0.2, this.world.groundY);
  }

  get rect() {
    return {
      x: this.x - this.pw * 0.42,
      y: this.y - this.ph * 0.92,
      w: this.pw * 0.84,
      h: this.ph * 0.92
    };
  }

  get chestY() {
    return this.y - this.ph * 0.56;
  }

  update(dt) {
    const w = this.world;
    const input = w.input;
    this.animTime += dt;
    if (this.dead) {
      this.deathTime += dt;
      this.vy += 1400 * dt;
      this.y = Math.min(this.world.groundY, this.y + this.vy * dt);
      return;
    }
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.attackBuffer = Math.max(0, this.attackBuffer - dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.spawnPulse = Math.max(0, this.spawnPulse - dt);

    const move = clamp(input.moveX, -1, 1);
    const wasGrounded = this.grounded;
    const prevY = this.y;

    if (Math.abs(move) > 0.16) this.facing = sign(move);

    const wantsFocus = input.focusHeld && this.grounded && this.soul >= 33 && this.masks < this.maxMasks
      && this.hurtTimer <= 0 && this.dashTimer <= 0 && this.attackTimer <= 0 && Math.abs(move) < 0.3;

    if (wantsFocus) {
      this.focusActive = true;
      this.focusTimer += dt;
      this.vx = approach(this.vx, 0, 1800 * dt);
      if (Math.random() < dt * 30) {
        const a = rand(0, TAU);
        const r = rand(16, 46);
        w.particles.spawn({
          x: this.x + Math.cos(a) * r,
          y: this.chestY + Math.sin(a) * r,
          vx: -Math.cos(a) * r * 2.2,
          vy: -Math.sin(a) * r * 2.2,
          life: rand(0.2, 0.42),
          size: rand(1, 2.4),
          color: '#dff9ff',
          drag: 0.9
        });
      }
      if (this.focusTimer >= 0.85) {
        this.soul -= 33;
        this.masks = Math.min(this.maxMasks, this.masks + 1);
        this.focusTimer = 0;
        this.focusActive = false;
        w.healsUsed++;
        w.audio.heal();
        w.burstSoul(this.x, this.chestY, 26);
        w.shake = Math.max(w.shake, 4);
        w.lastHeal = 0.8;
      }
    } else {
      this.focusActive = false;
      this.focusTimer = 0;
    }

    if (input.consumeAttack()) this.attackBuffer = 0.14;
    if (this.attackBuffer > 0 && this.attackCooldown <= 0 && !this.focusActive) {
      this.attackBuffer = 0;
      this.startAttack(input);
    }

    if (input.consumeDash() && this.dashCooldown <= 0 && this.hurtTimer <= 0) {
      this.startDash(move);
    }

    if (input.consumeJump()) this.jumpBuffer = 0.12;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

    if (this.jumpBuffer > 0 && this.hurtTimer <= 0) {
      if (this.grounded || this.coyote > 0) {
        this.vy = -this.world.jumpVelocity;
        this.grounded = false;
        this.coyote = 0;
        this.jumpBuffer = 0;
        this.doubleJumpUsed = false;
        w.audio.jump();
        w.dust(this.x, this.y, 6, 1);
      } else if (!this.doubleJumpUsed) {
        this.vy = -this.world.jumpVelocity * 0.92;
        this.doubleJumpUsed = true;
        this.jumpBuffer = 0;
        w.audio.doubleJump();
        w.burstWings(this.x, this.chestY, this.facing);
        w.dust(this.x, this.y - this.ph * 0.3, 8, 1.2);
      }
    }

    if (this.dashTimer > 0) {
      this.vx = this.dashDir * w.dashSpeed;
      this.vy = 0;
      this.ghostTimer -= dt;
      if (this.ghostTimer <= 0) {
        this.ghostTimer = 0.024;
        w.afterimages.push({ x: this.x, y: this.y, facing: this.facing, ph: this.ph, pw: this.pw, life: 0.3, max: 0.3 });
        w.particles.spawn({
          x: this.x - this.facing * this.pw * 0.3,
          y: this.y - this.ph * rand(0.1, 0.8),
          vx: -this.facing * rand(20, 90),
          vy: rand(-20, 20),
          life: rand(0.12, 0.3),
          size: rand(0.8, 2),
          color: '#bfe9f6',
          type: 'streak',
          drag: 0.94
        });
      }
    } else {
      const accel = this.hurtTimer > 0 ? 900 : (this.grounded ? 3000 : 1800);
      const target = this.focusActive ? 0 : move * w.runSpeed;
      this.vx = approach(this.vx, target, accel * w.motionScale * dt);
    }

    if (this.dashTimer <= 0) {
      const gravity = w.gravity * (this.vy < 0 && input.jumpHeld ? 0.62 : 1);
      this.vy += gravity * dt;
      this.vy = Math.min(this.vy, 1700 * w.motionScale);
    }

    this.x += this.vx * dt;
    this.x = clamp(this.x, w.wallL + this.pw * 0.55, w.wallR - this.pw * 0.55);

    this.grounded = false;
    if (wasGrounded) this.coyote = 0.1; else this.coyote = Math.max(0, this.coyote - dt);
    this.y += this.vy * dt;

    if (this.dashTimer <= 0) {
      for (const platform of w.platforms) {
        if (this.vy >= 0 && prevY <= platform.y + 2 && this.y >= platform.y
          && this.x + this.pw * 0.32 > platform.x - platform.w / 2
          && this.x - this.pw * 0.32 < platform.x + platform.w / 2) {
          this.y = platform.y;
          this.vy = 0;
          this.grounded = true;
          this.doubleJumpUsed = false;
          this.coyote = 0.1;
          if (!wasGrounded) w.dust(this.x, this.y, 5, 0.7);
        }
      }
    }

    if (this.y >= w.groundY) {
      if (!wasGrounded && this.vy > 250) w.dust(this.x, w.groundY, 7, 1.2);
      this.y = w.groundY;
      this.vy = 0;
      this.grounded = true;
      this.doubleJumpUsed = false;
      this.coyote = 0.1;
    }

    if (this.grounded && Math.abs(this.vx) > 20 && !this.focusActive) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = 0.17;
        w.dust(this.x - this.facing * this.pw * 0.4, this.y, 2, 0.55);
      }
    }

    if (this.attackTimer > 0 && !this.attackHit) this.checkAttack();
  }

  startAttack(input) {
    const w = this.world;
    const aimY = input.moveY;
    this.attackDir = aimY < -0.45 ? -1 : (aimY > 0.45 && !this.grounded ? 1 : 0);
    this.attackTimer = 0.24;
    this.attackCooldown = 0.36;
    this.attackHit = false;
    w.audio.slash();
  }

  startDash(move) {
    const w = this.world;
    if (Math.abs(move) > 0.2) this.facing = sign(move);
    this.dashTimer = 0.155;
    this.dashCooldown = 0.52;
    this.dashDir = this.facing;
    this.vy = 0;
    this.invuln = Math.max(this.invuln, 0.18);
    this.ghostTimer = 0;
    w.audio.dash();
    w.dust(this.x, this.y, 10, 1.6);
    w.shake = Math.max(w.shake, 3);
  }

  attackBox() {
    const { x, y, ph, pw, facing } = this;
    if (this.attackDir === -1) {
      return { x: x - pw * 0.9, y: y - ph * 1.72, w: pw * 1.8, h: ph * 1.02 };
    }
    if (this.attackDir === 1) {
      return { x: x - pw * 0.9, y: y - ph * 0.08, w: pw * 1.8, h: ph * 0.95 };
    }
    const reach = ph * 1.18;
    return facing > 0
      ? { x: x + pw * 0.1, y: y - ph * 1.02, w: reach, h: ph * 0.86 }
      : { x: x - pw * 0.1 - reach, y: y - ph * 1.02, w: reach, h: ph * 0.86 };
  }

  checkAttack() {
    const w = this.world;
    const box = this.attackBox();
    const boss = w.boss;
    if (boss && !boss.dying && boss.phase !== 'transition' && boss.overlapsRect(box)) {
      const hx = boss.x + rand(-boss.w * 0.2, boss.w * 0.2);
      const hy = boss.y - boss.h * rand(0.35, 0.65);
      const dealt = boss.takeDamage(1, hx, hy);
      if (dealt) {
        this.attackHit = true;
        this.soul = Math.min(this.maxSoul, this.soul + 9);
        w.particles.burst(hx, hy, 12, {
          color: '#fff3d8', speedMin: 60, speedMax: 360, lifeMin: 0.16, lifeMax: 0.42,
          size: rand(1, 2.8), type: 'spark', length: 0.035, additive: true
        });
        w.particles.burst(hx, hy, 8, {
          color: '#ffb066', speedMin: 30, speedMax: 200, lifeMin: 0.2, lifeMax: 0.6,
          size: rand(1.4, 3.4), additive: true
        });
        w.audio.hit();
        w.hitstop = Math.max(w.hitstop, 0.036);
        w.shake = Math.max(w.shake, 7);
        if (this.attackDir === 1 && !this.grounded) {
          this.vy = -w.jumpVelocity * 0.72;
          this.doubleJumpUsed = false;
          w.audio.jump();
        }
      }
    }
    if (!this.attackHit) {
      for (let i = w.projectiles.length - 1; i >= 0; i--) {
        const p = w.projectiles[i];
        if (p.x > box.x && p.x < box.x + box.w && p.y > box.y && p.y < box.y + box.h) {
          w.projectiles.splice(i, 1);
          this.attackHit = true;
          this.soul = Math.min(this.maxSoul, this.soul + 4);
          w.particles.burst(p.x, p.y, 14, {
            color: '#ffcf8a', speedMin: 40, speedMax: 300, lifeMin: 0.2, lifeMax: 0.55,
            size: rand(1.2, 3), type: 'spark', length: 0.04, additive: true
          });
          w.audio.parry();
          w.shake = Math.max(w.shake, 4);
          w.hitstop = Math.max(w.hitstop, 0.02);
          break;
        }
      }
    }
  }

  takeDamage(sourceX) {
    if (this.dead || this.invuln > 0 || this.dashTimer > 0) return false;
    const w = this.world;
    this.masks = Math.max(0, this.masks - 1);
    this.world.hitsTaken++;
    this.invuln = 1.28;
    this.hurtTimer = 0.38;
    this.focusTimer = 0;
    this.focusActive = false;
    this.attackTimer = 0;
    this.dashTimer = 0;
    this.vx = sign(this.x - sourceX) * 310 * w.motionScale;
    this.vy = -290 * w.motionScale;
    this.grounded = false;
    this.doubleJumpUsed = false;
    w.audio.hurt();
    w.hurtFlash = 1;
    w.shake = Math.max(w.shake, 19);
    w.hitstop = Math.max(w.hitstop, 0.075);
    w.vibrate([18, 30, 18]);
    w.particles.burst(this.x, this.chestY, 22, {
      color: '#ff6b78', speedMin: 60, speedMax: 360, lifeMin: 0.2, lifeMax: 0.7,
      size: rand(1.4, 3.6), type: 'spark', length: 0.04, additive: true
    });
    w.particles.burst(this.x, this.chestY, 12, {
      color: '#ffd9c2', speedMin: 30, speedMax: 200, lifeMin: 0.2, lifeMax: 0.6,
      size: rand(1.4, 3), additive: true
    });
    if (this.masks <= 0) {
      this.dead = true;
      this.deathTime = 0;
      this.vy = -420 * w.motionScale;
      w.playerDied();
    }
    return true;
  }

  drawShadow(ctx) {
    const w = this.world;
    const air = clamp(1 - (w.groundY - this.y) / (w.H * 0.3), 0.28, 1);
    ctx.save();
    ctx.globalAlpha = 0.4 * air;
    ctx.fillStyle = '#020306';
    ctx.beginPath();
    ctx.ellipse(this.x, w.groundY + 3, this.pw * 0.85 * air, this.ph * 0.07 * air, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  draw(ctx) {
    const ph = this.ph;
    const pw = this.pw;
    const t = this.animTime;
    ctx.save();
    if (this.dead) ctx.globalAlpha = clamp(1 - this.deathTime * 0.55, 0, 1);
    if (this.invuln > 0 && !this.dead && Math.sin(this.invuln * 46) > 0.2) ctx.globalAlpha *= 0.42;
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing, 1);

    const running = this.grounded && Math.abs(this.vx) > 24;
    const bob = running ? Math.sin(t * 17) * 1.8 : Math.sin(t * 2.3) * 0.7;
    ctx.translate(0, bob);

    if (this.focusActive) this.drawFocus(ctx);
    if (this.dashTimer > 0) ctx.rotate(-0.07);
    else if (this.hurtTimer > 0) ctx.rotate(-0.12);

    const step = running ? Math.sin(t * 17) * ph * 0.09 : 0;

    ctx.strokeStyle = '#04070c';
    ctx.lineWidth = ph * 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-pw * 0.13, -ph * 0.27);
    ctx.lineTo(-pw * 0.16 + step * 0.5, -ph * 0.06);
    ctx.lineTo(-pw * 0.2 + step, -ph * 0.005);
    ctx.moveTo(pw * 0.13, -ph * 0.27);
    ctx.lineTo(pw * 0.16 - step * 0.5, -ph * 0.06);
    ctx.lineTo(pw * 0.2 - step, -ph * 0.005);
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha *= 0.92;
    ctx.strokeStyle = '#a9bcc2';
    ctx.lineWidth = Math.max(1.5, ph * 0.038);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pw * 0.05, -ph * 0.38);
    ctx.lineTo(pw * 0.44, -ph * 0.09);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(191,233,246,.35)';
    ctx.lineWidth = Math.max(0.7, ph * 0.012);
    ctx.beginPath();
    ctx.moveTo(pw * 0.08, -ph * 0.395);
    ctx.lineTo(pw * 0.46, -ph * 0.1);
    ctx.stroke();
    ctx.restore();

    const sway = Math.sin(t * 3.1) * pw * 0.035;
    const cloak = ctx.createLinearGradient(0, -ph * 0.7, 0, 0);
    cloak.addColorStop(0, '#111c2a');
    cloak.addColorStop(0.55, '#080f1a');
    cloak.addColorStop(1, '#03060b');
    ctx.fillStyle = cloak;
    ctx.beginPath();
    ctx.moveTo(-pw * 0.34, -ph * 0.68);
    ctx.bezierCurveTo(-pw * 0.72 + sway, -ph * 0.54, -pw * 0.7, -ph * 0.2, -pw * 0.5, -ph * 0.015);
    ctx.lineTo(-pw * 0.35, -ph * 0.085);
    ctx.lineTo(-pw * 0.23, ph * 0.012);
    ctx.lineTo(-pw * 0.08, -ph * 0.04);
    ctx.lineTo(pw * 0.02, ph * 0.025);
    ctx.lineTo(pw * 0.12, -ph * 0.035);
    ctx.lineTo(pw * 0.26, ph * 0.01);
    ctx.lineTo(pw * 0.36, -ph * 0.08);
    ctx.lineTo(pw * 0.5, -ph * 0.015);
    ctx.bezierCurveTo(pw * 0.7, -ph * 0.2, pw * 0.72 + sway, -ph * 0.54, pw * 0.34, -ph * 0.68);
    ctx.quadraticCurveTo(0, -ph * 0.73, -pw * 0.34, -ph * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,172,196,.34)';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(71,112,138,.32)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-pw * 0.3, -ph * 0.6);
    ctx.quadraticCurveTo(-pw * 0.48, -ph * 0.36, -pw * 0.32, -ph * 0.1);
    ctx.moveTo(pw * 0.3, -ph * 0.6);
    ctx.quadraticCurveTo(pw * 0.48, -ph * 0.36, pw * 0.32, -ph * 0.1);
    ctx.stroke();

    ctx.fillStyle = '#0b1420';
    ctx.beginPath();
    ctx.ellipse(0, -ph * 0.63, pw * 0.4, ph * 0.08, 0, 0, TAU);
    ctx.fill();

    const headY = -ph * 0.82;
    const hx = pw * 0.78;
    const hy = ph * 0.15;
    ctx.save();
    ctx.translate(0, headY);
    ctx.rotate(Math.sin(t * 2.1) * 0.012);
    const maskGrad = ctx.createLinearGradient(-hx, -hy, hx, hy);
    maskGrad.addColorStop(0, '#f5f2e8');
    maskGrad.addColorStop(0.45, '#d9d9cf');
    maskGrad.addColorStop(0.8, '#aeb9b8');
    maskGrad.addColorStop(1, '#8d9c9e');
    ctx.fillStyle = maskGrad;
    ctx.strokeStyle = 'rgba(225,246,250,.55)';
    ctx.lineWidth = 0.8;

    const horn = (dir) => {
      ctx.beginPath();
      ctx.moveTo(dir * hx * 0.52, -hy * 0.66);
      ctx.bezierCurveTo(dir * hx * 0.92, -hy * 1.45, dir * hx * 1.32, -hy * 1.7, dir * hx * 1.48, -hy * 2.32);
      ctx.bezierCurveTo(dir * hx * 0.98, -hy * 1.5, dir * hx * 0.62, -hy * 1.15, dir * hx * 0.2, -hy * 0.86);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    horn(-1);
    horn(1);

    ctx.beginPath();
    ctx.moveTo(-hx * 0.72, -hy * 0.7);
    ctx.bezierCurveTo(-hx * 1.06, -hy * 0.34, -hx * 1.02, hy * 0.28, -hx * 0.4, hy * 0.82);
    ctx.quadraticCurveTo(0, hy * 1.18, hx * 0.4, hy * 0.82);
    ctx.bezierCurveTo(hx * 1.02, hy * 0.28, hx * 1.06, -hy * 0.34, hx * 0.72, -hy * 0.7);
    ctx.quadraticCurveTo(0, -hy * 1.08, -hx * 0.72, -hy * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#05070c';
    ctx.beginPath();
    ctx.ellipse(-hx * 0.32, hy * 0.03, hx * 0.105, hy * 0.34, -0.06, 0, TAU);
    ctx.ellipse(hx * 0.32, hy * 0.03, hx * 0.105, hy * 0.34, 0.06, 0, TAU);
    ctx.fill();

    ctx.fillStyle = 'rgba(220,248,255,.65)';
    ctx.beginPath();
    ctx.ellipse(-hx * 0.35, -hy * 0.06, hx * 0.028, hy * 0.1, 0, 0, TAU);
    ctx.ellipse(hx * 0.29, -hy * 0.06, hx * 0.028, hy * 0.1, 0, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = 'rgba(70,92,96,.45)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-hx * 0.12, -hy * 0.62);
    ctx.lineTo(-hx * 0.02, -hy * 0.2);
    ctx.lineTo(-hx * 0.14, hy * 0.12);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, hy * 1.05, Math.PI * 1.05, Math.PI * 1.55);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const aura = ctx.createRadialGradient(0, -ph * 0.55, 1, 0, -ph * 0.55, ph * 0.8);
    aura.addColorStop(0, 'rgba(178,238,255,.09)');
    aura.addColorStop(0.5, 'rgba(120,200,230,.035)');
    aura.addColorStop(1, 'rgba(80,170,210,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -ph * 0.55, ph * 0.8, 0, TAU);
    ctx.fill();
    ctx.restore();

    if (this.attackTimer > 0) this.drawSlash(ctx);
    ctx.restore();
  }

  drawSlash(ctx) {
    const ph = this.ph;
    const progress = 1 - this.attackTimer / 0.24;
    const alpha = Math.sin(Math.PI * clamp(progress, 0, 1));
    const dir = this.attackDir;
    ctx.save();
    ctx.translate(0, -ph * 0.52);
    if (dir === -1) ctx.rotate(-Math.PI / 2);
    else if (dir === 1) { ctx.translate(0, ph * 0.1); ctx.rotate(Math.PI / 2); }
    const radius = ph * 1.02;
    const start = -1.62;
    const end = 0.92;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(188,238,255,${0.22 * alpha})`;
    ctx.lineWidth = ph * 0.36;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, radius, start, end);
    ctx.stroke();
    ctx.strokeStyle = `rgba(241,253,255,${0.88 * alpha})`;
    ctx.lineWidth = ph * 0.13;
    ctx.beginPath();
    ctx.arc(0, 0, radius, start, end);
    ctx.stroke();
    ctx.strokeStyle = `rgba(120,190,220,${0.4 * alpha})`;
    ctx.lineWidth = ph * 0.035;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.86, start, end);
    ctx.stroke();

    const tipAngle = start + (end - start) * progress;
    const tx = Math.cos(tipAngle) * radius;
    const ty = Math.sin(tipAngle) * radius;
    ctx.strokeStyle = `rgba(226,250,255,${alpha})`;
    ctx.lineWidth = Math.max(1, ph * 0.03);
    ctx.beginPath();
    ctx.moveTo(ph * 0.1, 0);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    ctx.fillStyle = `rgba(255,255,255,${0.55 * alpha})`;
    ctx.beginPath();
    ctx.arc(tx, ty, ph * 0.055, 0, TAU);
    ctx.fill();

    const crescent = ctx.createRadialGradient(0, 0, radius * 0.55, 0, 0, radius * 1.12);
    crescent.addColorStop(0, 'rgba(200,245,255,0)');
    crescent.addColorStop(0.72, `rgba(200,245,255,${0.12 * alpha})`);
    crescent.addColorStop(1, 'rgba(200,245,255,0)');
    ctx.fillStyle = crescent;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.12, start, end);
    ctx.arc(0, 0, radius * 0.5, end, start, true);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawFocus(ctx) {
    const ph = this.ph;
    const progress = clamp(this.focusTimer / 0.85, 0, 1);
    const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 10);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glowR = ph * (0.65 + progress * 0.55 + pulse * 0.08);
    const g = ctx.createRadialGradient(0, -ph * 0.55, 2, 0, -ph * 0.55, glowR);
    g.addColorStop(0, `rgba(232,252,255,${0.24 + progress * 0.24})`);
    g.addColorStop(0.45, `rgba(150,225,248,${0.1 + progress * 0.12})`);
    g.addColorStop(1, 'rgba(100,190,230,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -ph * 0.55, glowR, 0, TAU);
    ctx.fill();

    ctx.translate(0, -ph * 0.55);
    ctx.rotate(this.animTime * 1.4);
    ctx.strokeStyle = `rgba(205,245,255,${0.2 + progress * 0.35})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 9]);
    ctx.beginPath();
    ctx.arc(0, 0, ph * 0.72, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU;
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = `rgba(224,250,255,${0.25 + progress * 0.35})`;
      ctx.fillRect(ph * 0.62, -1, 4 + progress * 5, 1.4);
      ctx.restore();
    }
    ctx.restore();
  }
}
