import { TAU, clamp, lerp, rand, easeOutCubic, drawGlow, chance } from './utils.js';

const ATTACKS = ['lunge', 'slam', 'volley', 'spikes', 'blink'];

export class Boss {
  constructor(game) {
    this.game = game;
    this.maxHp = 320;
    this.reset();
  }

  reset() {
    const game = this.game;
    const s = game.s;
    this.maxHp = 320;
    this.hp = this.maxHp;
    this.x = game.w * 0.72;
    this.y = game.groundY;
    this.vx = 0;
    this.vy = 0;
    this.w = 104 * s;
    this.h = 190 * s;
    this.face = -1;
    this.state = 'idle';
    this.attackName = null;
    this.attackTime = 0;
    this.phase = 1;
    this.enraged = false;
    this.phaseTimer = 0;
    this.invuln = 0;
    this.hitFlash = 0;
    this.attackCooldown = 1.15;
    this.danger = false;
    this.lastAttack = '';
    this.repeatCount = 0;
    this.afterimages = [];
    this.deathTimer = 0;
    this.dying = false;
    this.opacity = 1;
    this.aimX = this.x;
    this.aimDir = -1;
    this.launched = false;
    this.impacted = false;
    this.fired = false;
    this.teleported = false;
    this.spikeSound = false;
    this.anim = 0;
    this.volleyCount = 3;
    this.lungeSound = false;
    this.trailTimer = 0;
    this.introRoar = false;
    this.bodyAngle = 0;
    this.contactCooldown = 0;
  }

  update(dt) {
    const game = this.game;
    const s = game.s;
    this.anim += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.contactCooldown > 0) this.contactCooldown -= dt;

    if (this.state === 'dying' || this.state === 'dead') {
      this.deathTimer += dt;
      this.opacity = clamp(1 - this.deathTimer / 1.7, 0, 1);
      if (Math.random() < dt * 42 && this.opacity > 0.02) {
        game.particles.spawn({
          x: this.x + rand(-50, 50) * s,
          y: this.y - rand(20, 170) * s,
          vx: rand(-20, 20) * s,
          vy: rand(-55, -8) * s,
          life: rand(0.4, 1.4),
          size: rand(1, 3.4) * s,
          color: Math.random() < 0.2 ? '#ead79a' : '#a8f0e2',
          style: 'soul',
          gravity: -12,
          streak: 0.02,
        });
      }
      if (this.state === 'dying' && this.deathTimer > 1.7) {
        this.state = 'dead';
        game.onBossGone();
      }
      return;
    }

    if (this.state === 'phase') {
      this.phaseTimer -= dt;
      this.vx *= Math.max(0, 1 - 4 * dt);
      this._updateAfterimages(dt);
      if (Math.random() < dt * 45) {
        game.particles.spawn({
          x: this.x + rand(-38, 38) * s,
          y: this.y - rand(20, 150) * s,
          vx: rand(-50, 50) * s,
          vy: rand(-90, -20) * s,
          life: rand(0.3, 0.9),
          size: rand(1, 3) * s,
          color: this.enraged ? '#e0a58e' : '#a8f0e2',
          style: 'spark',
          gravity: -30,
        });
      }
      if (this.phaseTimer <= 0) {
        this.state = 'idle';
        this.attackCooldown = 0.42;
        this.invuln = 0;
        this.danger = false;
      }
      return;
    }

    if (game.introTimer > 0) {
      this.face = game.player.x < this.x ? -1 : 1;
      this.vx = 0;
      if (!this.introRoar && game.introTimer < 0.85) {
        this.introRoar = true;
        game.audio.bossRoar();
        game.addTrauma(0.22);
        game.particles.burst(this.x, this.y - this.h * 0.55, 24, {
          speedMin: 30,
          speedMax: 180,
          lifeMin: 0.3,
          lifeMax: 1,
          sizeMin: 1,
          sizeMax: 3,
          color: ['#6d8c82', '#a7b7a6', '#a8f0e2'],
          style: 'dust',
          gravity: 150,
        });
      }
      this._updateAfterimages(dt);
      return;
    }

    this.face = game.player.x < this.x ? -1 : 1;

    if (this.state === 'idle') {
      this.attackCooldown -= dt;
      const player = game.player;
      const away = Math.abs(player.x - this.x);
      const desired = 260 * s;
      if (away < desired - 75 * s) {
        this.vx = approach(this.vx, -Math.sign(player.x - this.x) * 80 * s, 600 * s * dt);
      } else if (away > desired + 90 * s) {
        this.vx = approach(this.vx, Math.sign(player.x - this.x) * 95 * s, 600 * s * dt);
      } else {
        this.vx = approach(this.vx, 0, 500 * s * dt);
      }
      if (this.attackCooldown <= 0) this._chooseAttack();
    } else if (this.state === 'attack') {
      this._updateAttack(dt);
    }

    this.vy += 2350 * s * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const margin = 54 * s;
    this.x = clamp(this.x, margin + this.w * 0.24, game.w - margin - this.w * 0.24);

    if (this.y >= game.groundY) {
      const wasAir = this.y - this.vy * dt < game.groundY - 2;
      this.y = game.groundY;
      this.vy = 0;
      if (wasAir && this.state === 'attack' && this.attackName === 'slam' && this.attackTime > 0.35 && !this.impacted) {
        this._slamImpact();
      }
    }

    this._updateAfterimages(dt);

    if (this.danger && this.contactCooldown <= 0) {
      const p = game.player;
      const hit =
        Math.abs(p.x - this.x) < (this.w * 0.48 + p.w * 0.34) &&
        p.y > this.y - this.h * 0.92 &&
        p.y - p.h < this.y + 6 * s;
      if (hit) {
        const did = game.damagePlayer(1, this.x);
        if (did) this.contactCooldown = 0.2;
      }
    }
  }

  _updateAfterimages(dt) {
    for (const ghost of this.afterimages) ghost.life -= dt;
    this.afterimages = this.afterimages.filter((ghost) => ghost.life > 0);
  }

  _chooseAttack() {
    const game = this.game;
    const s = game.s;
    const player = game.player;
    const distance = Math.abs(player.x - this.x);
    let pool;
    if (this.phase === 1) {
      if (distance < 210 * s) pool = ['slam', 'slam', 'lunge', 'volley'];
      else if (distance < 390 * s) pool = ['lunge', 'lunge', 'slam', 'volley'];
      else pool = ['lunge', 'volley', 'lunge', 'slam'];
    } else if (distance < 220 * s) {
      pool = ['spikes', 'slam', 'blink', 'volley', 'spikes'];
    } else if (distance < 410 * s) {
      pool = ['lunge', 'blink', 'volley', 'spikes', 'slam'];
    } else {
      pool = ['blink', 'lunge', 'volley', 'blink', 'spikes'];
    }
    let choice = pool[Math.floor(Math.random() * pool.length)];
    if (choice === this.lastAttack) {
      this.repeatCount++;
      if (this.repeatCount >= 2) {
        const alternatives = ATTACKS.filter((a) => a !== choice && (this.phase > 1 || !['spikes', 'blink'].includes(a)));
        choice = alternatives[Math.floor(Math.random() * alternatives.length)] || choice;
        this.repeatCount = 0;
      }
    } else {
      this.repeatCount = 0;
    }
    this._startAttack(choice);
  }

  _startAttack(name) {
    const game = this.game;
    const s = game.s;
    const player = game.player;
    this.state = 'attack';
    this.attackName = name;
    this.lastAttack = name;
    this.attackTime = 0;
    this.danger = false;
    this.launched = false;
    this.impacted = false;
    this.fired = false;
    this.teleported = false;
    this.spikeSound = false;
    this.lungeSound = false;
    this.aimDir = player.x < this.x ? -1 : 1;
    this.face = this.aimDir;
    this.aimX = clamp(player.x + player.vx * 0.15, 50 * s, game.w - 50 * s);
    this.volleyCount = this.phase >= 2 ? (this.enraged ? 5 : 4) : 3;
    this.trailTimer = 0;

    if (name === 'lunge') {
      game.audio.bossRoar();
      game.addTrauma(0.18);
    } else if (name === 'slam') {
      game.particles.burst(this.x, this.y - 8 * s, 12, {
        speedMin: 20,
        speedMax: 90,
        lifeMin: 0.25,
        lifeMax: 0.7,
        sizeMin: 1,
        sizeMax: 3,
        color: ['#657b73', '#94a398'],
        style: 'dust',
        gravity: 120,
        angle: -Math.PI / 2,
        spread: Math.PI * 1.4,
      });
    } else if (name === 'volley') {
      game.audio.focusStart();
    } else if (name === 'spikes') {
      const offsets = this.phase >= 2 ? [-150, -55, 55, 150] : [-105, 0, 105];
      for (const offset of offsets) {
        const x = clamp(player.x + offset * s, 45 * s, game.w - 45 * s);
        game.projectiles.spawnSpike(x, { delay: 0.68 });
      }
      game.audio.focusStart();
    } else if (name === 'blink') {
      game.particles.burst(this.x, this.y - this.h * 0.5, 20, {
        speedMin: 20,
        speedMax: 130,
        lifeMin: 0.3,
        lifeMax: 0.9,
        sizeMin: 1,
        sizeMax: 3,
        color: ['#081312', '#152826', '#4f6e67'],
        style: 'shadow',
        gravity: -35,
      });
      game.audio.dash();
    }
  }

  _updateAttack(dt) {
    const game = this.game;
    const s = game.s;
    const player = game.player;
    const t = (this.attackTime += dt);
    const cx = this.x;
    const cy = this.y;
    this.opacity = 1;

    if (this.attackName === 'lunge') {
      if (t < 0.58) {
        this.vx = 0;
        this.aimDir = player.x < this.x ? -1 : 1;
        this.face = this.aimDir;
        this.aimX = player.x;
        if (chance(dt * 20)) {
          game.particles.spawn({
            x: this.x + rand(-30, 30) * s,
            y: this.y - rand(60, 160) * s,
            vx: rand(-20, 20) * s,
            vy: rand(-60, -15) * s,
            life: rand(0.2, 0.5),
            size: rand(1, 2.3) * s,
            color: '#e8e2cf',
            style: 'soul',
            gravity: -30,
          });
        }
      } else if (t < 0.94) {
        if (!this.lungeSound) {
          this.lungeSound = true;
          game.audio.dash();
          game.addTrauma(0.12);
        }
        this.danger = true;
        this.vx = this.aimDir * 1160 * s;
        this.trailTimer -= dt;
        if (this.trailTimer <= 0) {
          this.trailTimer = 0.048;
          this.afterimages.push({
            x: this.x,
            y: this.y,
            face: this.face,
            life: 0.24,
            maxLife: 0.24,
            pose: 'lunge',
          });
          game.particles.spawn({
            x: this.x + rand(-24, 24) * s,
            y: this.y - rand(15, 130) * s,
            vx: -this.aimDir * rand(40, 120) * s,
            vy: rand(-30, 20) * s,
            life: rand(0.2, 0.55),
            size: rand(1, 3) * s,
            color: Math.random() < 0.25 ? '#ead79a' : '#9fd8d2',
            style: 'spark',
            gravity: 0,
            streak: 0.03,
          });
        }
      } else {
        this.danger = false;
        this.vx *= Math.max(0, 1 - 12 * dt);
        if (t > 1.42) this._finishAttack();
      }
    } else if (this.attackName === 'slam') {
      if (t < 0.34) {
        this.vx = 0;
        this.aimX = player.x;
        this.face = player.x < this.x ? -1 : 1;
      } else if (!this.launched) {
        this.launched = true;
        this.danger = true;
        this.vx = clamp((this.aimX - this.x) / 0.44, -520 * s, 520 * s);
        this.vy = -840 * s;
        game.audio.dash();
        game.particles.burst(this.x, this.y - 4 * s, 16, {
          speedMin: 30,
          speedMax: 150,
          lifeMin: 0.25,
          lifeMax: 0.7,
          sizeMin: 1,
          sizeMax: 3.5,
          color: ['#7f958b', '#b0b9a9'],
          style: 'dust',
          gravity: 170,
          angle: -Math.PI / 2,
          spread: Math.PI,
        });
      }
      if (this.launched && this.y >= game.groundY - 1 && this.impacted) {
        this.vx *= Math.max(0, 1 - 4 * dt);
        if (t > 1.82) this._finishAttack();
      }
    } else if (this.attackName === 'volley') {
      this.vx *= Math.max(0, 1 - 6 * dt);
      this.face = player.x < this.x ? -1 : 1;
      if (!this.fired && t > 0.64) {
        this.fired = true;
        const baseY = this.y - this.h * 0.58;
        for (let i = 0; i < this.volleyCount; i++) {
          const spread = (i - (this.volleyCount - 1) / 2) * 48 * s;
          const angle = rand(-0.2, 0.2);
          game.projectiles.spawnOrb(
            this.x + Math.cos(angle) * 35 * s,
            baseY + Math.sin(angle) * 25 * s,
            player.x + spread,
            player.y - player.h * 0.5 + rand(-20, 20) * s,
            { speed: this.phase >= 2 ? 300 : 270 },
          );
        }
        game.audio.bossRoar();
        game.addTrauma(0.16);
        game.particles.burst(this.x, baseY, 26, {
          speedMin: 40,
          speedMax: 190,
          lifeMin: 0.2,
          lifeMax: 0.7,
          sizeMin: 1,
          sizeMax: 3,
          color: ['#a8f0e2', '#e8e2cf', '#79c4bb'],
          style: 'soul',
          gravity: -10,
        });
      }
      if (t > 1.4) this._finishAttack();
    } else if (this.attackName === 'spikes') {
      this.vx *= Math.max(0, 1 - 7 * dt);
      this.face = player.x < this.x ? -1 : 1;
      if (!this.spikeSound && t > 0.68) {
        this.spikeSound = true;
        game.audio.spike();
        game.addTrauma(0.32);
        game.flash('#9fd8d2', 0.08);
      }
      if (t > 1.55) this._finishAttack();
    } else if (this.attackName === 'blink') {
      if (t < 0.36) {
        this.opacity = clamp(1 - t / 0.28, 0, 1);
        this.vx = 0;
        if (chance(dt * 90)) {
          game.particles.spawn({
            x: this.x + rand(-45, 45) * s,
            y: this.y - rand(10, 180) * s,
            vx: rand(-40, 40) * s,
            vy: rand(-60, 10) * s,
            life: rand(0.3, 0.8),
            size: rand(1.5, 4) * s,
            color: '#0b1b19',
            style: 'shadow',
            gravity: -18,
          });
        }
      } else if (!this.teleported) {
        this.teleported = true;
        const behind = player.x - player.face * 118 * s;
        this.x = clamp(behind, 70 * s, game.w - 70 * s);
        this.y = game.groundY;
        this.face = player.x < this.x ? -1 : 1;
        this.opacity = 1;
        this.afterimages.push({ x: this.x - this.face * 65 * s, y: this.y, face: this.face, life: 0.3, maxLife: 0.3, pose: 'lunge' });
        game.particles.burst(this.x, this.y - this.h * 0.55, 28, {
          speedMin: 20,
          speedMax: 180,
          lifeMin: 0.3,
          lifeMax: 0.9,
          sizeMin: 1,
          sizeMax: 3.4,
          color: ['#0a1615', '#1a302d', '#5d7b73'],
          style: 'shadow',
          gravity: -12,
        });
        game.audio.dash();
        game.addTrauma(0.24);
      } else if (t > 0.62 && t < 0.94) {
        this.danger = true;
        this.vx = this.face * 160 * s;
      } else {
        this.danger = false;
        this.vx *= Math.max(0, 1 - 9 * dt);
        if (t > 1.35) this._finishAttack();
      }
    }
  }

  _slamImpact() {
    const game = this.game;
    const s = game.s;
    this.impacted = true;
    this.danger = false;
    this.vx = 0;
    game.audio.heavyHit();
    game.addTrauma(0.72);
    game.hitStop(0.075);
    game.flash('#cfe3d8', 0.12);
    game.shakeGround(this.x, this.y);
    game.addCrack(this.x);
    game.particles.burst(this.x, this.y - 3 * s, 40, {
      speedMin: 60,
      speedMax: 330,
      lifeMin: 0.3,
      lifeMax: 1.1,
      sizeMin: 1,
      sizeMax: 4.5,
      color: ['#7f958b', '#b0b9a9', '#e8e2cf', '#566b62'],
      style: 'dust',
      gravity: 240,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.35,
    });
    game.projectiles.spawnWave(this.x - 70 * s, -1, { speed: this.phase >= 2 ? 500 : 440 });
    game.projectiles.spawnWave(this.x + 70 * s, 1, { speed: this.phase >= 2 ? 500 : 440 });
    if (this.phase >= 2) {
      game.projectiles.spawnWave(this.x, -1, { speed: 610 });
      game.projectiles.spawnWave(this.x, 1, { speed: 610 });
    }
    for (let i = 0; i < (this.phase >= 2 ? 8 : 5); i++) {
      game.particles.spawn({
        x: this.x + rand(-80, 80) * s,
        y: this.y + rand(-4, 2) * s,
        vx: rand(-140, 140) * s,
        vy: rand(-220, -40) * s,
        life: rand(0.3, 0.9),
        size: rand(1, 4) * s,
        color: Math.random() < 0.4 ? '#e8e2cf' : '#7f958b',
        style: 'spark',
        gravity: 260,
      });
    }
  }

  _finishAttack() {
    const s = this.game.s;
    this.state = 'idle';
    this.attackName = null;
    this.danger = false;
    this.vx *= 0.5;
    this.attackCooldown = this.phase >= 2 ? rand(0.38, 0.7) : rand(0.65, 1.05);
    this.game.particles.burst(this.x, this.y - 4 * s, 5, {
      speedMin: 10,
      speedMax: 50,
      lifeMin: 0.2,
      lifeMax: 0.5,
      sizeMin: 1,
      sizeMax: 2.5,
      color: ['#5d7b73', '#8fa49a'],
      style: 'dust',
      gravity: 100,
    });
  }

  takeDamage(amount, hitX, hitY) {
    const game = this.game;
    if (this.state === 'dying' || this.state === 'dead' || this.state === 'phase' || this.invuln > 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.14;
    const s = game.s;
    game.audio.hit();
    game.hitStop(0.03);
    game.addTrauma(0.14);
    game.particles.burst(hitX, hitY, 14, {
      angle: Math.atan2(hitY - (this.y - this.h * 0.55), hitX - this.x) + Math.PI,
      spread: 1.6,
      speedMin: 50,
      speedMax: 230,
      lifeMin: 0.2,
      lifeMax: 0.65,
      sizeMin: 1,
      sizeMax: 3.2,
      color: ['#efe7d2', '#c8b47b', '#a8f0e2'],
      style: 'spark',
      gravity: 210,
    });
    if (!this.enraged && this.hp > 0 && this.hp <= this.maxHp * 0.24) {
      this._enrage();
    }
    if (this.phase === 1 && this.hp > 0 && this.hp <= this.maxHp * 0.58) {
      this._enterPhaseTwo();
    }
    if (this.hp <= 0) {
      this._die();
    }
    return true;
  }

  _enterPhaseTwo() {
    const game = this.game;
    const s = game.s;
    this.phase = 2;
    this.state = 'phase';
    this.phaseTimer = 1.28;
    this.invuln = 1.45;
    this.danger = false;
    this.vx = 0;
    this.y = game.groundY;
    this.vy = 0;
    game.audio.bossRoar();
    game.addTrauma(0.8);
    game.hitStop(0.1);
    game.flash('#cfe3d8', 0.32);
    game.shakeGround(this.x, this.y);
    game.app.classList.add('is-phase-two');
    game.showBanner('THE CHAINS BREAK', 'PHASE II', 'Keeper of the dying light', 2.2);
    game.particles.burst(this.x, this.y - this.h * 0.55, 46, {
      speedMin: 50,
      speedMax: 320,
      lifeMin: 0.35,
      lifeMax: 1.3,
      sizeMin: 1,
      sizeMax: 4,
      color: ['#a8f0e2', '#e8e2cf', '#c8b47b', '#79c4bb'],
      style: 'soul',
      gravity: -20,
    });
    for (let i = 0; i < 12; i++) {
      game.particles.spawn({
        x: this.x + rand(-70, 70) * s,
        y: this.y - rand(5, 180) * s,
        vx: rand(-120, 120) * s,
        vy: rand(-180, -30) * s,
        life: rand(0.4, 1.1),
        size: rand(1.5, 5) * s,
        color: '#9fd8d2',
        style: 'spark',
        gravity: 200,
        streak: 0.03,
      });
    }
  }

  _enrage() {
    const game = this.game;
    this.enraged = true;
    game.app.classList.add('is-enraged');
    game.showBanner('THE PALE COURT TREMBLES', 'ENRAGED', 'No light remains', 1.8);
    game.audio.bossRoar();
    game.addTrauma(0.6);
    game.flash('#e0a58e', 0.2);
    game.audio.setIntensity(1);
  }

  _die() {
    const game = this.game;
    this.state = 'dying';
    this.deathTimer = 0;
    this.danger = false;
    this.vx = 0;
    this.vy = 0;
    this.invuln = 999;
    game.audio.death();
    game.audio.setIntensity(0);
    game.addTrauma(1);
    game.hitStop(0.15);
    game.flash('#e8e2cf', 0.55);
    game.shakeGround(this.x, this.y);
    game.onBossDying();
    for (let i = 0; i < 55; i++) {
      game.particles.spawn({
        x: this.x + rand(-55, 55) * game.s,
        y: this.y - rand(20, 180) * game.s,
        vx: rand(-160, 160) * game.s,
        vy: rand(-230, -20) * game.s,
        life: rand(0.6, 2.1),
        size: rand(1.5, 5) * game.s,
        color: Math.random() < 0.22 ? '#ead79a' : '#a8f0e2',
        style: 'soul',
        gravity: 40,
        streak: 0.03,
      });
    }
  }

  get bodyRect() {
    const s = this.game.s;
    return {
      x: this.x - this.w * 0.36,
      y: this.y - this.h * 0.94,
      w: this.w * 0.72,
      h: this.h * 0.9,
    };
  }

  draw(ctx, time) {
    const game = this.game;
    const s = game.s;
    const flash = this.hitFlash > 0;
    const phaseFlash = this.invuln > 0 && this.state === 'phase';
    const alpha = this.opacity * (this.state === 'dead' ? 0 : 1);
    if (alpha <= 0.01) return;

    for (const ghost of this.afterimages) {
      const t = ghost.life / ghost.maxLife;
      ctx.save();
      ctx.globalAlpha = t * t * (this.enraged ? 0.17 : 0.13) * alpha;
      ctx.globalCompositeOperation = 'lighter';
      this._drawBoss(ctx, ghost.x, ghost.y, ghost.face, time, {
        ghost: true,
        pose: ghost.pose,
        tint: this.enraged ? '#a95f4f' : '#326f68',
      });
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    this._drawBoss(ctx, this.x, this.y, this.face, time, {
      flash,
      phaseFlash,
      attack: this.state === 'attack' ? this.attackName : null,
      at: this.attackTime,
      enraged: this.enraged,
      dying: this.state === 'dying',
      deathTimer: this.deathTimer,
    });
    ctx.restore();

    if (this.state === 'attack') this._drawTelegraph(ctx, time);
  }

  _drawTelegraph(ctx, time) {
    const game = this.game;
    const s = game.s;
    const t = this.attackTime;
    if (this.attackName === 'lunge' && t < 0.58) {
      const pulse = 0.4 + Math.sin(time * 22) * 0.3;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const dir = this.aimDir;
      const startX = this.x + dir * 60 * s;
      const endX = clamp(this.aimX + dir * 160 * s, 0, game.w);
      const grad = ctx.createLinearGradient(startX, 0, endX, 0);
      grad.addColorStop(0, `rgba(232, 226, 207, ${0.2 + pulse * 0.16})`);
      grad.addColorStop(1, 'rgba(232, 226, 207, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(startX, this.y - 26 * s);
      ctx.lineTo(endX, this.y - 13 * s);
      ctx.lineTo(endX, this.y + 1 * s);
      ctx.lineTo(startX, this.y + 1 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(234, 215, 154, ${0.18 + pulse * 0.25})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, this.y - 2 * s);
      ctx.lineTo(endX, this.y - 2 * s);
      ctx.stroke();
      ctx.restore();
    } else if (this.attackName === 'slam' && t < 0.34) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.5 + Math.sin(time * 26) * 0.5;
      ctx.strokeStyle = `rgba(232, 226, 207, ${0.2 + pulse * 0.24})`;
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.ellipse(this.aimX, this.y, (40 + pulse * 10) * s, 8 * s, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    } else if (this.attackName === 'volley' && t < 0.64) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const baseY = this.y - this.h * 0.58;
      for (let i = 0; i < this.volleyCount; i++) {
        const a = time * 3 + (i / this.volleyCount) * TAU;
        const r = (34 + Math.sin(time * 6 + i) * 4) * s;
        const x = this.x + Math.cos(a) * r;
        const y = baseY + Math.sin(a) * r * 0.8;
        drawGlow(ctx, x, y, 18 * s, 'rgba(168,240,226,0.32)');
        ctx.fillStyle = '#e8faf1';
        ctx.beginPath();
        ctx.arc(x, y, 2.5 * s, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    } else if (this.attackName === 'spikes' && t < 0.7) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.4 + Math.sin(time * 30) * 0.35;
      drawGlow(ctx, this.x, this.y - 100 * s, 80 * s, `rgba(168,240,226,${0.04 + pulse * 0.05})`);
      ctx.restore();
    }
  }

  _drawBoss(ctx, x, y, face, time, opts = {}) {
    const s = this.game.s;
    const {
      ghost = false,
      tint = null,
      flash = false,
      phaseFlash = false,
      attack = null,
      at = 0,
      enraged = false,
      dying = false,
      deathTimer = 0,
    } = opts;

    const breathe = Math.sin(time * 1.7) * 1.6 * s;
    const walk = this.state === 'idle' && Math.abs(this.vx) > 8 * s ? Math.sin(this.anim * 7) : 0;
    const lunge = attack === 'lunge';
    const slam = attack === 'slam';
    const volley = attack === 'volley';
    const blink = attack === 'blink';
    const spikes = attack === 'spikes';
    let lean = 0;
    if (lunge) lean = at < 0.58 ? -0.12 : 0.18;
    if (slam) lean = at < 0.34 ? 0.1 : -0.12;
    if (blink && at > 0.36 && at < 0.94) lean = 0.2;
    const hit = flash ? 0.55 : 0;
    const white = phaseFlash ? 0.4 + Math.sin(time * 18) * 0.2 : 0;

    ctx.save();
    if (!ghost) {
      ctx.fillStyle = `rgba(0, 0, 0, ${0.36 * (this.opacity ?? 1)})`;
      ctx.beginPath();
      ctx.ellipse(x, y + 4 * s, 68 * s, 11 * s, 0, 0, TAU);
      ctx.fill();
    }
    ctx.translate(x, y + breathe);
    ctx.scale(face * 1.12, 1.12);
    if (dying) ctx.rotate(clamp(deathTimer * 0.1, 0, 0.16));
    ctx.rotate(lean);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (enraged && !ghost) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, 0, -95 * s, 135 * s, `rgba(224, 165, 142, ${0.06 + Math.sin(time * 3) * 0.015})`);
      ctx.restore();
    }

    const shade = (color) => (ghost ? tint : flash ? '#f6f0dc' : phaseFlash ? '#dff7ef' : color);
    const cloakOffset = clamp(-this.vx * 0.022, -14, 14);
    const cloakBottom = -10 + Math.sin(time * 1.3) * 3;

    // cape behind
    const cloak = ctx.createLinearGradient(0, -150 * s, 0, 0);
    cloak.addColorStop(0, shade(enraged ? '#1a1a1c' : '#0c1a1d'));
    cloak.addColorStop(0.55, shade(enraged ? '#251b1c' : '#0e2226'));
    cloak.addColorStop(1, shade('#050b0d'));
    ctx.fillStyle = cloak;
    ctx.strokeStyle = ghost ? 'rgba(0,0,0,0)' : 'rgba(2, 5, 6, 0.55)';
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.moveTo(-34 * s, -133 * s);
    ctx.quadraticCurveTo(-64 * s + cloakOffset, -104 * s, -72 * s + cloakOffset, -42 * s);
    ctx.lineTo(-64 * s + cloakOffset, -30 * s);
    ctx.lineTo(-55 * s + cloakOffset, -15 * s);
    ctx.lineTo(-43 * s + cloakOffset, -27 * s);
    ctx.lineTo(-37 * s + cloakOffset, cloakBottom * s);
    ctx.lineTo(-24 * s + cloakOffset, -18 * s);
    ctx.lineTo(-11 * s + cloakOffset * 0.6, cloakBottom * s + 4 * s);
    ctx.lineTo(1 * s, -17 * s);
    ctx.lineTo(12 * s + cloakOffset * 0.4, -5 * s);
    ctx.lineTo(25 * s, -18 * s);
    ctx.lineTo(38 * s, -7 * s);
    ctx.lineTo(48 * s, -22 * s);
    ctx.lineTo(62 * s + cloakOffset * 0.5, -34 * s);
    ctx.lineTo(54 * s + cloakOffset * 0.7, -68 * s);
    ctx.quadraticCurveTo(52 * s, -112 * s, 31 * s, -135 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // legs
    const step = walk * 10 * s;
    ctx.strokeStyle = shade('#071012');
    ctx.lineWidth = 12 * s;
    ctx.beginPath();
    ctx.moveTo(-17 * s, -51 * s);
    ctx.quadraticCurveTo(-30 * s + step, -28 * s, -31 * s + step, -2 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(17 * s, -51 * s);
    ctx.quadraticCurveTo(31 * s - step, -27 * s, 29 * s - step, -2 * s);
    ctx.stroke();
    ctx.strokeStyle = shade('#29403d');
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(-38 * s + step, -3 * s);
    ctx.lineTo(-23 * s + step, -2 * s);
    ctx.moveTo(22 * s - step, -3 * s);
    ctx.lineTo(38 * s - step, -2 * s);
    ctx.stroke();

    // torso armor
    const torso = ctx.createLinearGradient(-24 * s, -128 * s, 26 * s, -48 * s);
    torso.addColorStop(0, shade('#1b3437'));
    torso.addColorStop(0.5, shade('#0b1c20'));
    torso.addColorStop(1, shade('#061013'));
    ctx.fillStyle = torso;
    ctx.beginPath();
    ctx.moveTo(-27 * s, -125 * s);
    ctx.quadraticCurveTo(-45 * s, -101 * s, -35 * s, -62 * s);
    ctx.quadraticCurveTo(-22 * s, -42 * s, 0, -39 * s);
    ctx.quadraticCurveTo(22 * s, -42 * s, 35 * s, -62 * s);
    ctx.quadraticCurveTo(45 * s, -101 * s, 27 * s, -125 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ghost ? 'rgba(0,0,0,0)' : 'rgba(2, 6, 7, 0.68)';
    ctx.lineWidth = 1.4 * s;
    ctx.stroke();

    // pale ribs / armor seams
    ctx.strokeStyle = ghost ? tint : 'rgba(173, 196, 174, 0.17)';
    ctx.lineWidth = 1.2 * s;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-20 * s, (-104 + i * 13) * s);
      ctx.quadraticCurveTo(0, (-97 + i * 13) * s, 21 * s, (-105 + i * 13) * s);
      ctx.stroke();
    }

    // chest core
    const coreY = -87 * s;
    const corePulse = 0.7 + Math.sin(time * 3.2) * 0.3;
    if (!ghost) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, 0, coreY, (28 + corePulse * 8) * s, enraged ? 'rgba(224,165,142,0.22)' : 'rgba(168,240,226,0.18)');
      ctx.fillStyle = enraged ? `rgba(240, 174, 150, ${0.65 + corePulse * 0.3})` : `rgba(168, 240, 226, ${0.55 + corePulse * 0.35})`;
      ctx.beginPath();
      ctx.moveTo(0, coreY - 9 * s);
      ctx.lineTo(5 * s, coreY);
      ctx.lineTo(0, coreY + 10 * s);
      ctx.lineTo(-5 * s, coreY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // shoulder plates
    ctx.fillStyle = shade('#203b3b');
    ctx.strokeStyle = ghost ? 'rgba(0,0,0,0)' : 'rgba(2, 6, 7, 0.6)';
    ctx.beginPath();
    ctx.moveTo(-29 * s, -123 * s);
    ctx.quadraticCurveTo(-54 * s, -124 * s, -51 * s, -103 * s);
    ctx.lineTo(-31 * s, -97 * s);
    ctx.lineTo(-18 * s, -111 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(30 * s, -123 * s);
    ctx.quadraticCurveTo(55 * s, -124 * s, 52 * s, -103 * s);
    ctx.lineTo(32 * s, -97 * s);
    ctx.lineTo(19 * s, -111 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shade('#294542');
    ctx.beginPath();
    ctx.moveTo(-46 * s, -122 * s);
    ctx.lineTo(-63 * s, -137 * s);
    ctx.lineTo(-51 * s, -111 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(47 * s, -122 * s);
    ctx.lineTo(64 * s, -137 * s);
    ctx.lineTo(52 * s, -111 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ghost ? tint : 'rgba(173, 196, 174, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-47 * s, -113 * s);
    ctx.lineTo(-32 * s, -111 * s);
    ctx.moveTo(47 * s, -113 * s);
    ctx.lineTo(32 * s, -111 * s);
    ctx.stroke();

    // arms
    let frontHandX = 39 * s;
    let frontHandY = -72 * s;
    let backHandX = -40 * s;
    let backHandY = -60 * s;
    if (lunge) {
      frontHandX = at < 0.58 ? 28 * s : 58 * s;
      frontHandY = at < 0.58 ? -84 * s : -68 * s;
    } else if (slam) {
      frontHandX = 24 * s;
      frontHandY = at < 0.34 ? -108 * s : -92 * s;
    } else if (volley) {
      frontHandX = 22 * s;
      frontHandY = -130 * s;
      backHandX = -32 * s;
      backHandY = -126 * s;
    } else if (spikes) {
      frontHandX = 22 * s;
      frontHandY = -142 * s;
      backHandX = -24 * s;
      backHandY = -138 * s;
    } else if (blink && at > 0.62 && at < 0.98) {
      frontHandX = 60 * s;
      frontHandY = -70 * s;
    }

    ctx.strokeStyle = shade('#071114');
    ctx.lineWidth = 9 * s;
    ctx.beginPath();
    ctx.moveTo(-29 * s, -112 * s);
    ctx.quadraticCurveTo(-46 * s, -94 * s, backHandX, backHandY);
    ctx.stroke();
    ctx.lineWidth = 10 * s;
    ctx.beginPath();
    ctx.moveTo(29 * s, -112 * s);
    ctx.quadraticCurveTo(43 * s, -96 * s, frontHandX, frontHandY);
    ctx.stroke();

    // hand / talons
    ctx.fillStyle = shade('#111d1f');
    ctx.beginPath();
    ctx.arc(backHandX, backHandY, 5.5 * s, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(frontHandX, frontHandY, 6 * s, 0, TAU);
    ctx.fill();

    // giant nail
    let nailAngle = 0.42;
    if (lunge) nailAngle = at < 0.58 ? -0.06 : 0.02;
    else if (slam) nailAngle = at < 0.34 ? -1.9 : -1.3;
    else if (volley || spikes) nailAngle = -1.65;
    else if (blink && at > 0.62) nailAngle = 0.02;
    const nailLen = 126 * s;
    ctx.save();
    ctx.translate(frontHandX, frontHandY);
    ctx.rotate(nailAngle);
    const blade = ctx.createLinearGradient(0, -3 * s, nailLen, 0);
    blade.addColorStop(0, shade('#8e9384'));
    blade.addColorStop(0.42, shade('#d9d6c5'));
    blade.addColorStop(0.82, shade('#f1ecda'));
    blade.addColorStop(1, shade('#a9aa98'));
    ctx.fillStyle = blade;
    ctx.strokeStyle = ghost ? 'rgba(0,0,0,0)' : 'rgba(30, 38, 34, 0.8)';
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    ctx.moveTo(0, -3 * s);
    ctx.lineTo(nailLen * 0.78, -2.4 * s);
    ctx.lineTo(nailLen, 0);
    ctx.lineTo(nailLen * 0.78, 2.8 * s);
    ctx.lineTo(0, 3.2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shade('#3d3a2f');
    ctx.fillRect(-10 * s, -4 * s, 16 * s, 8 * s);
    ctx.strokeStyle = ghost ? tint : 'rgba(232, 226, 207, 0.28)';
    ctx.lineWidth = 0.7 * s;
    ctx.beginPath();
    ctx.moveTo(4 * s, -1.2 * s);
    ctx.lineTo(nailLen * 0.74, -1 * s);
    ctx.stroke();
    ctx.restore();

    // mask
    const maskY = -166 * s;
    const maskGrad = ctx.createLinearGradient(-27 * s, maskY - 28 * s, 24 * s, maskY + 24 * s);
    maskGrad.addColorStop(0, shade('#f3eedb'));
    maskGrad.addColorStop(0.55, shade('#d1cdb9'));
    maskGrad.addColorStop(1, shade('#8b8e7d'));
    ctx.fillStyle = maskGrad;
    ctx.strokeStyle = ghost ? 'rgba(0,0,0,0)' : 'rgba(31, 36, 30, 0.55)';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(-25 * s, maskY + 4 * s);
    ctx.quadraticCurveTo(-31 * s, maskY - 24 * s, -15 * s, maskY - 38 * s);
    ctx.quadraticCurveTo(-4 * s, maskY - 34 * s, 0, maskY - 44 * s);
    ctx.quadraticCurveTo(5 * s, maskY - 34 * s, 15 * s, maskY - 38 * s);
    ctx.quadraticCurveTo(31 * s, maskY - 24 * s, 25 * s, maskY + 4 * s);
    ctx.quadraticCurveTo(18 * s, maskY + 24 * s, 0, maskY + 27 * s);
    ctx.quadraticCurveTo(-18 * s, maskY + 24 * s, -25 * s, maskY + 4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // antler horns
    ctx.strokeStyle = ghost ? tint : shade('#cdc9b6');
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.moveTo(-16 * s, maskY - 31 * s);
    ctx.quadraticCurveTo(-37 * s, maskY - 50 * s, -45 * s, maskY - 70 * s);
    ctx.moveTo(-35 * s, maskY - 58 * s);
    ctx.lineTo(-48 * s, maskY - 55 * s);
    ctx.moveTo(16 * s, maskY - 31 * s);
    ctx.quadraticCurveTo(37 * s, maskY - 50 * s, 45 * s, maskY - 70 * s);
    ctx.moveTo(35 * s, maskY - 58 * s);
    ctx.lineTo(48 * s, maskY - 55 * s);
    ctx.stroke();
    ctx.strokeStyle = ghost ? tint : 'rgba(46, 48, 40, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-44 * s, maskY - 68 * s);
    ctx.lineTo(-40 * s, maskY - 72 * s);
    ctx.moveTo(44 * s, maskY - 68 * s);
    ctx.lineTo(40 * s, maskY - 72 * s);
    ctx.stroke();

    if (!ghost) {
      // hollow eyes
      const glow = enraged ? '#f0ae96' : '#a8f0e2';
      const eyeAlpha = blink && at < 0.36 ? 0.2 : 1;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, -9 * s, maskY + 2 * s, 14 * s * eyeAlpha, enraged ? 'rgba(240,174,150,0.2)' : 'rgba(168,240,226,0.15)');
      drawGlow(ctx, 10 * s, maskY + 2 * s, 14 * s * eyeAlpha, enraged ? 'rgba(240,174,150,0.2)' : 'rgba(168,240,226,0.15)');
      ctx.restore();
      ctx.fillStyle = '#04090a';
      ctx.beginPath();
      ctx.moveTo(-19 * s, maskY - 1 * s);
      ctx.quadraticCurveTo(-13 * s, maskY - 8 * s, -4 * s, maskY - 5 * s);
      ctx.quadraticCurveTo(-7 * s, maskY + 9 * s, -14 * s, maskY + 10 * s);
      ctx.quadraticCurveTo(-18 * s, maskY + 5 * s, -19 * s, maskY - 1 * s);
      ctx.closePath();
      ctx.moveTo(20 * s, maskY - 1 * s);
      ctx.quadraticCurveTo(14 * s, maskY - 8 * s, 5 * s, maskY - 5 * s);
      ctx.quadraticCurveTo(8 * s, maskY + 9 * s, 15 * s, maskY + 10 * s);
      ctx.quadraticCurveTo(19 * s, maskY + 5 * s, 20 * s, maskY - 1 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = glow;
      ctx.globalAlpha = 0.9 * eyeAlpha;
      ctx.beginPath();
      ctx.moveTo(-16 * s, maskY + 1 * s);
      ctx.quadraticCurveTo(-11 * s, maskY - 2 * s, -7 * s, maskY);
      ctx.quadraticCurveTo(-10 * s, maskY + 5 * s, -14 * s, maskY + 5 * s);
      ctx.closePath();
      ctx.moveTo(17 * s, maskY + 1 * s);
      ctx.quadraticCurveTo(12 * s, maskY - 2 * s, 8 * s, maskY);
      ctx.quadraticCurveTo(11 * s, maskY + 5 * s, 15 * s, maskY + 5 * s);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // mask cracks
      ctx.strokeStyle = 'rgba(69, 68, 56, 0.4)';
      ctx.lineWidth = 0.9 * s;
      ctx.beginPath();
      ctx.moveTo(-18 * s, maskY - 16 * s);
      ctx.lineTo(-10 * s, maskY - 21 * s);
      ctx.lineTo(-5 * s, maskY - 15 * s);
      ctx.moveTo(19 * s, maskY + 12 * s);
      ctx.lineTo(12 * s, maskY + 15 * s);
      ctx.stroke();

      // third eye mark
      ctx.fillStyle = enraged ? 'rgba(240,174,150,0.75)' : 'rgba(232,226,207,0.4)';
      ctx.beginPath();
      ctx.arc(0, maskY - 14 * s, 1.4 * s, 0, TAU);
      ctx.fill();
    }

    if (!ghost && dying) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, 0, -100 * s, (80 + deathTimer * 30) * s, `rgba(168,240,226,${clamp(0.3 - deathTimer * 0.04, 0, 0.3)})`);
      ctx.restore();
    }
    ctx.restore();
  }
}

function approach(value, target, maxDelta) {
  if (value < target) return Math.min(value + maxDelta, target);
  return Math.max(value - maxDelta, target);
}
