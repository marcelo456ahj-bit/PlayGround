import { TAU, clamp, lerp, rand, drawGlow, easeOutCubic, easeInCubic } from './utils.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.maxHp = 5;
    this.reset(game.w * 0.28);
  }

  reset(x) {
    const game = this.game;
    const s = game.s;
    this.x = x ?? game.w * 0.28;
    this.y = game.groundY;
    this.vx = 0;
    this.vy = 0;
    this.w = 38 * s;
    this.h = 79 * s;
    this.face = 1;
    this.hp = this.maxHp;
    this.soul = 0;
    this.maxSoul = 99;
    this.grounded = true;
    this.wasGrounded = true;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumpHeld = false;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.attackDir = 'side';
    this.attackActive = false;
    this.attackHitBoss = false;
    this.attackHitProjectiles = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashInvuln = 0;
    this.dashDir = 1;
    this.dashTrailTimer = 0;
    this.invuln = 0;
    this.hurtTimer = 0;
    this.focusTimer = 0;
    this.focusHeld = false;
    this.focusCooldown = 0;
    this.focusLock = false;
    this.soulSpent = 0;
    this.hitsTaken = 0;
    this.dead = false;
    this.deathTimer = 0;
    this.anim = 0;
    this.runCycle = 0;
    this.landDust = false;
    this.afterimages = [];
    this.flash = 0;
    this.attackArc = 0;
  }

  get focusProgress() {
    return clamp(this.focusTimer / 0.72, 0, 1);
  }

  get isFocusing() {
    return this.focusTimer > 0;
  }

  gainSoul(amount) {
    this.soul = Math.min(this.maxSoul, this.soul + amount);
  }

  update(dt) {
    const game = this.game;
    const input = game.input;
    const s = game.s;
    this.anim += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.dashInvuln > 0) this.dashInvuln -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.focusCooldown > 0) this.focusCooldown -= dt;
    if (this.attackArc > 0) this.attackArc -= dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;

    if (this.dead) {
      this.deathTimer += dt;
      this.vx *= Math.max(0, 1 - 5 * dt);
      this.x += this.vx * dt;
      if (this.y < game.groundY || this.vy < 0) {
        this.vy += 2100 * s * dt;
        this.y = Math.min(game.groundY, this.y + this.vy * dt);
      }
      return;
    }

    if (game.introTimer > 0.7) {
      this.vx = 0;
      this.vy = 0;
      this.y = game.groundY;
      this.grounded = true;
      this._updateAfterimages(dt);
      return;
    }

    const axis = input.horizontal;
    const moveLocked = this.hurtTimer > 0.12 || this.isFocusing;
    const accel = (this.grounded ? 2700 : 1750) * s;
    const maxSpeed = 305 * s;

    if (!moveLocked) {
      if (Math.abs(axis) > 0.04) {
        this.vx += axis * accel * dt;
        this.vx = clamp(this.vx, -maxSpeed, maxSpeed);
        if (Math.abs(axis) > 0.18) this.face = axis > 0 ? 1 : -1;
      } else {
        const friction = (this.grounded ? 2500 : 600) * s;
        const sign = Math.sign(this.vx);
        this.vx -= sign * Math.min(Math.abs(this.vx), friction * dt);
      }
    } else if (this.hurtTimer <= 0.12 && this.grounded) {
      const friction = 1800 * s;
      const sign = Math.sign(this.vx);
      this.vx -= sign * Math.min(Math.abs(this.vx), friction * dt);
    }

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.vx = this.dashDir * 790 * s;
      this.vy = 0;
      this.grounded = false;
      this.dashTrailTimer -= dt;
      if (this.dashTrailTimer <= 0) {
        this.dashTrailTimer = 0.028;
        this.afterimages.push({
          x: this.x,
          y: this.y,
          face: this.face,
          life: 0.28,
          maxLife: 0.28,
          pose: 'dash',
          vx: this.vx,
        });
        game.particles.spawn({
          x: this.x - this.face * rand(4, 18) * s,
          y: this.y - rand(15, 66) * s,
          vx: -this.face * rand(35, 110) * s,
          vy: rand(-35, 15) * s,
          life: rand(0.16, 0.4),
          size: rand(1, 2.6) * s,
          color: Math.random() < 0.35 ? '#e8e2cf' : '#9fd8d2',
          style: 'spark',
          gravity: 0,
          streak: 0.02,
        });
      }
      if (this.dashTimer <= 0) {
        this.vx *= 0.58;
        this.dashInvuln = 0;
      }
    } else {
      if (game.input.take('dash') || input.take('dash')) {
        this._tryDash(axis);
      }
      this.vy += 2550 * s * dt;
    }

    if (game.introTimer <= 0) {
      this._handleJump(dt, axis);
      if (input.take('attack') || game.input.take('attack')) this._startAttack(input);
      this._updateFocus(dt, input);
    } else {
      input.take('jump');
      input.take('attack');
      input.take('dash');
      input.take('heal');
    }

    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      const t = 1 - this.attackTimer / 0.34;
      this.attackActive = t > 0.14 && t < 0.58;
      if (this.attackTimer <= 0) {
        this.attackActive = false;
        this.attackCooldown = 0.07;
      }
    } else {
      this.attackActive = false;
    }

    this.wasGrounded = this.grounded;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const margin = 22 * s;
    if (this.x < margin) {
      this.x = margin;
      this.vx = Math.max(0, this.vx);
    } else if (this.x > game.w - margin) {
      this.x = game.w - margin;
      this.vx = Math.min(0, this.vx);
    }

    if (this.y >= game.groundY) {
      const wasAir = !this.grounded;
      this.y = game.groundY;
      if (this.vy > 620 * s) {
        if (!this.landDust) {
          game.particles.burst(this.x, this.y, 8, {
            angle: -Math.PI / 2,
            spread: Math.PI * 1.2,
            speedMin: 20,
            speedMax: 95,
            lifeMin: 0.25,
            lifeMax: 0.6,
            sizeMin: 1,
            sizeMax: 3.5,
            color: ['#5c7168', '#8fa49a'],
            style: 'dust',
            gravity: 110,
          });
          game.audio.land();
          this.landDust = true;
        }
      }
      this.vy = 0;
      this.grounded = true;
      this.coyote = 0.09;
      if (wasAir) this.jumpHeld = input.down('jump');
    } else {
      this.grounded = false;
      this.coyote -= dt;
      this.landDust = false;
    }

    if (!input.down('jump') || !input.down('up')) {
      this.jumpHeld = input.down('jump') || input.down('up');
    }

    if (this.grounded) {
      this.runCycle += Math.abs(this.vx) * dt * 0.045;
    } else {
      this.runCycle += dt * 2;
    }

    this._updateAfterimages(dt);

    if (this.focusTimer > 0 && Math.random() < dt * 32) {
      const angle = rand(0, TAU);
      const radius = rand(15, 36) * s;
      game.particles.spawn({
        x: this.x + Math.cos(angle) * radius,
        y: this.y - this.h * 0.5 + Math.sin(angle) * radius * 0.8,
        vx: -Math.cos(angle) * rand(8, 26) * s,
        vy: -Math.sin(angle) * rand(8, 26) * s - 10 * s,
        life: rand(0.4, 0.9),
        size: rand(1, 2.8) * s,
        color: Math.random() < 0.22 ? '#f0e4b9' : '#a8f0e2',
        style: 'soul',
        gravity: -20,
      });
    }
  }

  _handleJump(dt, axis) {
    const input = this.game.input;
    if (input.take('jump') || input.pressed.has('jump')) {
      this.jumpBuffer = 0.12;
    } else {
      this.jumpBuffer -= dt;
    }
    const wantsUp = input.down('up') || (input.joystickActive && input.joystickY < -0.58);
    if (!this.jumpHeld && input.down('jump') && this.vy < -120) {
      this.vy *= 0.53;
      this.jumpHeld = true;
    }
    if (this.jumpBuffer > 0 && (this.grounded || this.coyote > 0)) {
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.vy = -850 * this.game.s;
      this.grounded = false;
      this.jumpHeld = true;
      this.game.audio.jump();
      this.game.particles.burst(this.x, this.y, 7, {
        angle: -Math.PI / 2,
        spread: Math.PI,
        speedMin: 15,
        speedMax: 75,
        lifeMin: 0.2,
        lifeMax: 0.55,
        sizeMin: 1,
        sizeMax: 2.8,
        color: ['#6d8c82', '#a7b7a6'],
        style: 'dust',
        gravity: 80,
      });
    }
    if (wantsUp && Math.abs(axis) < 0.2) this.face = this.face || 1;
  }

  _tryDash(axis) {
    if (this.dashCooldown > 0 || this.isFocusing) {
      if (this.dashCooldown > 0) this.game.audio.deny();
      return;
    }
    const dir = Math.abs(axis) > 0.22 ? Math.sign(axis) : this.face;
    this.dashDir = dir;
    this.face = dir;
    this.dashTimer = 0.155;
    this.dashCooldown = 0.62;
    this.dashInvuln = 0.2;
    this.dashTrailTimer = 0;
    this.attackTimer = 0;
    this.attackActive = false;
    this.focusTimer = 0;
    this.game.audio.dash();
    this.game.addTrauma(0.06);
  }

  _startAttack(input) {
    if (this.attackTimer > 0 || this.attackCooldown > 0 || this.isFocusing) return;
    const wantsUp = input.down('up') || (input.joystickActive && input.joystickY < -0.55);
    const wantsDown = input.down('down') || (input.joystickActive && input.joystickY > 0.55);
    if (wantsUp) {
      this.attackDir = 'up';
    } else if (wantsDown && !this.grounded) {
      this.attackDir = 'down';
    } else {
      this.attackDir = 'side';
    }
    if (this.attackDir === 'side' && Math.abs(input.horizontal) > 0.25) {
      this.face = input.horizontal > 0 ? 1 : -1;
    }
    this.attackTimer = 0.34;
    this.attackArc = 0.22;
    this.attackCooldown = 0.28;
    this.attackActive = true;
    this.attackHitBoss = false;
    this.attackHitProjectiles = false;
    this.focusTimer = 0;
    this.game.audio.slash();
    this.game.particles.burst(
      this.x + this.face * 34 * this.game.s,
      this.y - this.h * 0.52,
      4,
      {
        angle: this.attackDir === 'up' ? -Math.PI / 2 : this.face > 0 ? 0 : Math.PI,
        spread: 1.2,
        speedMin: 40,
        speedMax: 110,
        lifeMin: 0.14,
        lifeMax: 0.3,
        sizeMin: 0.8,
        sizeMax: 2,
        color: '#e8e2cf',
        style: 'spark',
        gravity: 0,
      },
    );
  }

  _updateFocus(dt, input) {
    const held = input.down('heal') || this.game.input.down('heal');
    if (this.focusTimer > 0) {
      if (!held) {
        this.focusTimer = 0;
        this.focusCooldown = 0.25;
        this.game.audio.deny();
        return;
      }
      if (!this.grounded || this.hurtTimer > 0) {
        this.focusTimer = 0;
        return;
      }
      this.focusTimer += dt;
      this.vx = 0;
      if (this.focusTimer >= 0.72) {
        this.focusTimer = 0;
        this.focusCooldown = 0.18;
        if (this.soul >= 33 && this.hp < this.maxHp) {
          this.soul -= 33;
          this.soulSpent += 33;
          this.hp = Math.min(this.maxHp, this.hp + 1);
          this.game.audio.heal();
          this.game.flash('#c9f4e8', 0.22);
          this.game.particles.burst(this.x, this.y - this.h * 0.55, 18, {
            speedMin: 20,
            speedMax: 120,
            lifeMin: 0.4,
            lifeMax: 1.0,
            sizeMin: 1,
            sizeMax: 3.5,
            color: ['#a8f0e2', '#e8e2cf', '#c8b47b'],
            style: 'soul',
            gravity: -40,
          });
          this.game.afterimage(this.x, this.y, this.face, 0.5);
        }
      }
    } else if (held && this.focusCooldown <= 0 && this.soul >= 33 && this.hp < this.maxHp && this.grounded && this.attackTimer <= 0) {
      if (!this.focusHeld) {
        this.game.audio.focusStart();
      }
      this.focusHeld = true;
      this.focusTimer = 0.0001;
      this.vx = 0;
    } else {
      this.focusHeld = false;
    }
    if (held && this.soul < 33 && this.focusCooldown <= 0 && this.grounded && this.hp < this.maxHp) {
      if (!this.focusDenied) {
        this.focusDenied = true;
        this.game.audio.deny();
        this.game.toast('You need more soul to focus.');
      }
    }
    if (!held) this.focusDenied = false;
  }

  _updateAfterimages(dt) {
    for (const ghost of this.afterimages) ghost.life -= dt;
    this.afterimages = this.afterimages.filter((ghost) => ghost.life > 0);
  }

  takeDamage(amount, sourceX) {
    if (this.dead || this.invuln > 0 || this.dashInvuln > 0) return false;
    const game = this.game;
    const s = game.s;
    this.hp = Math.max(0, this.hp - amount);
    this.hitsTaken += amount;
    this.invuln = 1.15;
    this.hurtTimer = 0.32;
    this.flash = 0.16;
    this.focusTimer = 0;
    this.focusHeld = false;
    this.attackTimer = 0;
    this.attackActive = false;
    this.vx = (this.x < sourceX ? -1 : 1) * 330 * s;
    this.vy = -390 * s;
    this.grounded = false;
    game.audio.hurt();
    game.addTrauma(0.55);
    game.hitStop(0.055);
    game.flash('#b85c58', 0.18);
    game.particles.burst(this.x, this.y - this.h * 0.5, 18, {
      speedMin: 40,
      speedMax: 210,
      lifeMin: 0.25,
      lifeMax: 0.75,
      sizeMin: 1,
      sizeMax: 3,
      color: ['#efe7d2', '#b85c58', '#e0a58e'],
      style: 'spark',
      gravity: 220,
    });
    if (this.hp <= 0) {
      this.dead = true;
      this.deathTimer = 0;
      game.onPlayerDeath();
    } else {
      game.onPlayerHurt();
    }
    return true;
  }

  get attackHitbox() {
    if (!this.attackActive) return null;
    const s = this.game.s;
    const w = 74 * s;
    const h = 58 * s;
    if (this.attackDir === 'up') {
      return { x: this.x - 20 * s, y: this.y - this.h - 42 * s, w: 40 * s, h: h * 0.86 };
    }
    if (this.attackDir === 'down') {
      return { x: this.x - 20 * s, y: this.y - 2 * s, w: 40 * s, h: h * 0.9 };
    }
    return {
      x: this.face > 0 ? this.x + 8 * s : this.x - w + 8 * s,
      y: this.y - this.h * 0.82,
      w,
      h: h * 0.72,
    };
  }

  draw(ctx, time) {
    const game = this.game;
    const s = game.s;
    const flicker = this.invuln > 0 && Math.floor(this.invuln * 22) % 2 === 0;
    const moving = Math.abs(this.vx) > 30 * s;
    const run = moving && this.grounded ? Math.sin(this.runCycle * 2.35) : 0;
    const legSwing = moving && this.grounded ? Math.sin(this.runCycle * 2.35) * 11 * s : 0;
    const bob = this.grounded ? Math.sin(this.anim * 3.2) * 0.9 * s : 0;
    const focus = this.isFocusing ? easeOutCubic(this.focusProgress) : 0;

    for (const ghost of this.afterimages) {
      const t = ghost.life / ghost.maxLife;
      ctx.save();
      ctx.globalAlpha = t * 0.32;
      ctx.globalCompositeOperation = 'lighter';
      this._drawKnight(ctx, ghost.x, ghost.y, ghost.face, time, {
        ghost: true,
        pose: ghost.pose,
        legSwing: 0,
        bob: 0,
        tint: '#9fd8d2',
      });
      ctx.restore();
    }

    if (this.dead) {
      ctx.save();
      ctx.globalAlpha = clamp(1 - this.deathTimer * 0.18, 0, 1);
      this._drawKnight(ctx, this.x, this.y, this.face, time, { legSwing: 0, bob: 0, dead: true });
      ctx.restore();
      return;
    }

    if (focus > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cx = this.x;
      const cy = this.y - this.h * 0.5;
      drawGlow(ctx, cx, cy, (55 + focus * 35) * s, `rgba(168, 240, 226, ${0.08 + focus * 0.11})`);
      ctx.strokeStyle = `rgba(168, 240, 226, ${0.12 + focus * 0.32})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, (24 + i * 12 + focus * 12) * s, (16 + i * 8) * s, time * (0.5 + i * 0.3), 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
      if (this.focusProgress > 0.02) {
        const r = (36 + Math.sin(time * 8) * 2) * s;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(232,226,207,${0.25 + focus * 0.5})`;
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.h * 0.52, r, -Math.PI / 2, -Math.PI / 2 + TAU * focus);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.save();
    if (flicker) ctx.globalAlpha = 0.4;
    if (this.flash > 0) ctx.globalAlpha = 0.55 + Math.sin(this.flash * 90) * 0.2;
    this._drawKnight(ctx, this.x, this.y, this.face, time, {
      legSwing,
      bob,
      run,
      dash: this.dashTimer > 0,
      attack: this.attackTimer > 0 ? 1 - this.attackTimer / 0.34 : 0,
      attackDir: this.attackDir,
      hurt: this.hurtTimer > 0,
      focus,
    });
    ctx.restore();
  }

  _drawKnight(ctx, x, y, face, time, opts = {}) {
    const s = this.game.s;
    const {
      legSwing = 0,
      bob = 0,
      dash = false,
      attack = 0,
      attackDir = 'side',
      hurt = false,
      ghost = false,
      tint = null,
      dead = false,
    } = opts;
    const lean = dash ? 0.15 * face : hurt ? -0.15 * face : 0;
    const cloakSway = dash ? 22 * face : clamp(-this.vx * 0.028, -10, 10);
    const maskGlow = ghost ? tint : '#e9e4d1';
    const cloakColor = ghost ? tint : '#111827';
    const cloakMid = ghost ? tint : '#162b31';
    const outline = ghost ? 'rgba(0,0,0,0)' : 'rgba(2, 6, 7, 0.65)';

    ctx.save();
    if (!ghost) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(x, y + 2 * s, 28 * s, 6 * s, 0, 0, TAU);
      ctx.fill();
    }
    ctx.translate(x, y + bob);
    ctx.scale(face, 1);
    ctx.rotate(lean);

    if (dead) {
      ctx.rotate(-1.22);
    }

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // trailing cloak
    const tatter = 3.2 * s;
    ctx.fillStyle = cloakMid;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.1 * s;
    ctx.beginPath();
    ctx.moveTo(-14 * s, -61 * s);
    ctx.quadraticCurveTo(-27 * s + cloakSway, -48 * s, -28 * s + cloakSway, -19 * s);
    ctx.lineTo(-23 * s + cloakSway, -22 * s);
    ctx.lineTo(-20 * s + cloakSway, -10 * s);
    ctx.lineTo(-13 * s + cloakSway * 0.8, -15 * s);
    ctx.lineTo(-9 * s + cloakSway * 0.6, -6 * s);
    ctx.lineTo(-3 * s, -14 * s);
    ctx.lineTo(4 * s, -5 * s);
    ctx.lineTo(9 * s, -14 * s);
    ctx.lineTo(16 * s, -8 * s);
    ctx.lineTo(19 * s, -20 * s);
    ctx.lineTo(24 * s, -24 * s);
    ctx.quadraticCurveTo(24 * s, -49 * s, 13 * s, -62 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // legs
    const legBack = legSwing * 0.65;
    const legFront = -legSwing * 0.65;
    ctx.strokeStyle = '#090f12';
    ctx.lineWidth = 7.5 * s;
    ctx.beginPath();
    ctx.moveTo(-6 * s, -31 * s);
    ctx.quadraticCurveTo(-8 * s + legBack, -21 * s, -9 * s + legBack, -4 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6 * s, -31 * s);
    ctx.quadraticCurveTo(8 * s + legFront, -21 * s, 9 * s + legFront, -4 * s);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(99, 126, 119, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-10 * s + legBack, -5 * s);
    ctx.lineTo(-6 * s + legBack, -3 * s);
    ctx.moveTo(9 * s + legFront, -5 * s);
    ctx.lineTo(13 * s + legFront, -3 * s);
    ctx.stroke();

    // torso
    const torso = ctx.createLinearGradient(0, -66 * s, 0, -28 * s);
    torso.addColorStop(0, ghost ? tint : '#1d3237');
    torso.addColorStop(0.6, ghost ? tint : '#0e1b20');
    torso.addColorStop(1, ghost ? tint : '#080f13');
    ctx.fillStyle = torso;
    ctx.beginPath();
    ctx.moveTo(-15 * s, -65 * s);
    ctx.quadraticCurveTo(-23 * s, -50 * s, -14 * s, -31 * s);
    ctx.lineTo(0, -25 * s);
    ctx.lineTo(14 * s, -31 * s);
    ctx.quadraticCurveTo(23 * s, -50 * s, 15 * s, -65 * s);
    ctx.closePath();
    ctx.fill();

    // shoulder pauldrons
    ctx.fillStyle = ghost ? tint : '#1a2c30';
    ctx.beginPath();
    ctx.moveTo(-16 * s, -64 * s);
    ctx.quadraticCurveTo(-27 * s, -62 * s, -24 * s, -51 * s);
    ctx.lineTo(-12 * s, -54 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(16 * s, -64 * s);
    ctx.quadraticCurveTo(27 * s, -62 * s, 24 * s, -51 * s);
    ctx.lineTo(12 * s, -54 * s);
    ctx.closePath();
    ctx.fill();

    // front arm and nail
    const isUp = attackDir === 'up';
    const isDown = attackDir === 'down';
    let armAngle = -0.38;
    if (attack > 0) {
      if (isUp) armAngle = lerp(-2.3, -0.5, easeOutCubic(clamp(attack * 1.4, 0, 1)));
      else if (isDown) armAngle = lerp(-0.2, 2.35, easeOutCubic(clamp(attack * 1.4, 0, 1)));
      else armAngle = lerp(-1.55, 1.25, easeOutCubic(clamp(attack * 1.5, 0, 1)));
    } else if (dash) {
      armAngle = 0.2;
    }
    const shoulderX = 12 * s;
    const shoulderY = -53 * s;
    const handX = shoulderX + Math.cos(armAngle) * 20 * s;
    const handY = shoulderY + Math.sin(armAngle) * 20 * s;
    ctx.strokeStyle = ghost ? tint : '#0a1418';
    ctx.lineWidth = 5.5 * s;
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(handX, handY);
    ctx.stroke();

    const nailLen = 51 * s;
    const nailAngle = attack > 0 ? armAngle + 0.06 : -0.34;
    const nx = Math.cos(nailAngle);
    const ny = Math.sin(nailAngle);
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(nailAngle);
    const blade = ctx.createLinearGradient(0, -2 * s, nailLen, 0);
    blade.addColorStop(0, ghost ? tint : 'rgba(190, 198, 181, 0.9)');
    blade.addColorStop(0.6, ghost ? tint : 'rgba(233, 228, 209, 0.95)');
    blade.addColorStop(1, ghost ? tint : 'rgba(255, 252, 232, 1)');
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(0, 1.5 * s);
    ctx.lineTo(nailLen, -0.8 * s);
    ctx.lineTo(nailLen + 5 * s, 0);
    ctx.lineTo(nailLen, 1.6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ghost ? tint : 'rgba(37, 45, 38, 0.85)';
    ctx.lineWidth = 0.8 * s;
    ctx.stroke();
    ctx.fillStyle = ghost ? tint : '#4a4438';
    ctx.fillRect(-5 * s, -2.3 * s, 9 * s, 4.6 * s);
    ctx.restore();

    // mask
    const mx = 1 * s;
    const my = -76 * s;
    const mask = ctx.createLinearGradient(mx - 15 * s, my - 14 * s, mx + 11 * s, my + 15 * s);
    if (ghost) {
      mask.addColorStop(0, tint);
      mask.addColorStop(1, tint);
    } else {
      mask.addColorStop(0, '#f4efdd');
      mask.addColorStop(0.56, '#d8d3c0');
      mask.addColorStop(1, '#9a9b8b');
    }
    ctx.fillStyle = mask;
    ctx.strokeStyle = ghost ? 'rgba(0,0,0,0)' : 'rgba(48, 50, 43, 0.42)';
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    ctx.moveTo(-13 * s, my - 2 * s);
    ctx.quadraticCurveTo(-17 * s, my - 16 * s, -8 * s, my - 25 * s);
    ctx.quadraticCurveTo(-3 * s, my - 21 * s, 0, my - 28 * s);
    ctx.quadraticCurveTo(3 * s, my - 21 * s, 8 * s, my - 25 * s);
    ctx.quadraticCurveTo(17 * s, my - 16 * s, 13 * s, my - 2 * s);
    ctx.quadraticCurveTo(10 * s, my + 14 * s, 0, my + 16 * s);
    ctx.quadraticCurveTo(-10 * s, my + 14 * s, -13 * s, my - 2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (!ghost) {
      ctx.fillStyle = '#071012';
      ctx.beginPath();
      ctx.ellipse(-4.7 * s, my + 1.5 * s, 3.1 * s, 5.2 * s, -0.16, 0, TAU);
      ctx.ellipse(5.2 * s, my + 1.5 * s, 3.1 * s, 5.2 * s, 0.16, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(207, 227, 216, 0.5)';
      ctx.beginPath();
      ctx.arc(-3.8 * s, my - 0.7 * s, 0.8 * s, 0, TAU);
      ctx.arc(6.1 * s, my - 0.7 * s, 0.8 * s, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(70, 69, 58, 0.35)';
      ctx.lineWidth = 0.7 * s;
      ctx.beginPath();
      ctx.moveTo(-1.8 * s, my + 9 * s);
      ctx.quadraticCurveTo(0, my + 10 * s, 2 * s, my + 9 * s);
      ctx.stroke();
    }

    // cloak clasp / glint
    if (!ghost) {
      ctx.fillStyle = 'rgba(200, 180, 123, 0.65)';
      ctx.beginPath();
      ctx.arc(0, -61 * s, 1.7 * s, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    if (attack > 0 && !ghost) {
      this._drawSlash(ctx, x, y, face, attack, attackDir);
    }
  }

  _drawSlash(ctx, x, y, face, attack, dir) {
    const s = this.game.s;
    const progress = clamp(attack * 1.5, 0, 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(face, 1);
    ctx.globalCompositeOperation = 'lighter';
    const alpha = Math.sin(progress * Math.PI);
    let cx = 28 * s;
    let cy = -49 * s;
    let radius = 48 * s;
    let start = -1.2;
    let end = 1.15;
    if (dir === 'up') {
      cx = 0;
      cy = -83 * s;
      radius = 45 * s;
      start = Math.PI * 0.2;
      end = Math.PI * 0.8;
    } else if (dir === 'down') {
      cx = 0;
      cy = -4 * s;
      radius = 43 * s;
      start = -Math.PI * 0.8;
      end = -Math.PI * 0.2;
    }
    const sweep = lerp(0.2, 1, easeOutCubic(progress));
    const a0 = start + (dir === 'side' ? 0 : 0);
    const a1 = lerp(a0, end, sweep);
    ctx.strokeStyle = `rgba(232, 226, 207, ${alpha * 0.25})`;
    ctx.lineWidth = 10 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.min(a0, a1), Math.max(a0, a1));
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 252, 232, ${alpha * 0.95})`;
    ctx.lineWidth = 2.1 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.min(a0, a1), Math.max(a0, a1));
    ctx.stroke();
    ctx.strokeStyle = `rgba(200, 180, 123, ${alpha * 0.4})`;
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 5 * s, Math.min(a0, a1), Math.max(a0, a1));
    ctx.stroke();
    ctx.restore();
  }
}
