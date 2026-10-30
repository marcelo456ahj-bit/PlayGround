import { TAU, clamp, drawGlow, rand, circleRect, rectsOverlap } from './utils.js';

const PARTICLE_STYLES = {
  dust: { blend: 'source-over', decay: 0.7, gravity: 30, drag: 2.4 },
  spark: { blend: 'lighter', decay: 1.4, gravity: 130, drag: 0.8 },
  soul: { blend: 'lighter', decay: 0.6, gravity: -20, drag: 1.8 },
  ember: { blend: 'lighter', decay: 0.3, gravity: -28, drag: 0.5 },
  shadow: { blend: 'source-over', decay: 0.5, gravity: -10, drag: 2.2 },
};

export class ParticleSystem {
  constructor() {
    this.items = [];
  }

  clear() {
    this.items.length = 0;
  }

  spawn({
    x,
    y,
    vx = 0,
    vy = 0,
    life = 0.7,
    size = 3,
    color = '#e8e2cf',
    gravity = 0,
    drag = 0,
    style = 'spark',
    alpha = 1,
    shrink = true,
    streak = 0,
    ring = false,
    rotation = 0,
    spin = 0,
  }) {
    this.items.push({
      x,
      y,
      vx,
      vy,
      life,
      maxLife: life,
      size,
      color,
      gravity,
      drag,
      style,
      alpha,
      shrink,
      streak,
      ring,
      rotation,
      spin,
    });
  }

  burst(x, y, count, options = {}) {
    for (let i = 0; i < count; i++) {
      const angle = options.angle ?? rand(0, TAU);
      const spread = options.spread ?? TAU;
      const actual = angle + rand(-spread / 2, spread / 2);
      const speed = rand(options.speedMin ?? 40, options.speedMax ?? 180);
      this.spawn({
        x: x + rand(-1, 1) * (options.jitter ?? 3),
        y: y + rand(-1, 1) * (options.jitter ?? 3),
        vx: Math.cos(actual) * speed,
        vy: Math.sin(actual) * speed,
        life: rand(options.lifeMin ?? 0.35, options.lifeMax ?? 0.9),
        size: rand(options.sizeMin ?? 1.5, options.sizeMax ?? 3.6),
        color: Array.isArray(options.color) ? options.color[Math.floor(Math.random() * options.color.length)] : options.color || '#e8e2cf',
        gravity: options.gravity ?? 90,
        drag: options.drag ?? 1,
        style: options.style || 'spark',
        streak: options.streak ?? 0.02,
        alpha: options.alpha ?? 1,
      });
    }
  }

  trail(x, y, color = '#a8f0e2', count = 1) {
    for (let i = 0; i < count; i++) {
      this.spawn({
        x: x + rand(-4, 4),
        y: y + rand(-4, 4),
        vx: rand(-12, 12),
        vy: rand(-20, 6),
        life: rand(0.25, 0.55),
        size: rand(0.8, 2.2),
        color,
        style: 'soul',
        gravity: -8,
        drag: 2,
        streak: 0.02,
      });
    }
  }

  update(dt) {
    const items = this.items;
    let write = 0;
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      const style = PARTICLE_STYLES[p.style] || PARTICLE_STYLES.spark;
      p.vy += (p.gravity ?? style.gravity) * dt;
      const drag = p.drag ?? style.drag;
      if (drag) {
        const factor = Math.max(0, 1 - drag * dt);
        p.vx *= factor;
        p.vy *= factor;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
      items[write++] = p;
    }
    items.length = write;
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.items) {
      const t = clamp(p.life / p.maxLife, 0, 1);
      const alpha = clamp(t * p.alpha, 0, 1);
      if (alpha <= 0) continue;
      const style = PARTICLE_STYLES[p.style] || PARTICLE_STYLES.spark;
      ctx.globalCompositeOperation = style.blend;
      ctx.globalAlpha = alpha;
      const size = p.shrink ? p.size * (0.25 + t * 0.75) : p.size;
      if (p.ring) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.6, size * 0.22);
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * (1.2 + (1 - t) * 3), 0, TAU);
        ctx.stroke();
        continue;
      }
      if (p.streak > 0) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.8, size * 0.7);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * p.streak, p.y - p.vy * p.streak);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.4, size), 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

export class Projectiles {
  constructor(game) {
    this.game = game;
    this.items = [];
  }

  clear() {
    this.items.length = 0;
  }

  spawnWave(x, dir, { speed = 430, height = 45, damage = 1 } = {}) {
    const s = this.game.s;
    this.items.push({
      kind: 'wave',
      x,
      y: this.game.groundY,
      dir,
      speed: speed * s,
      w: 36 * s,
      h: height * s,
      life: 2.8,
      damage,
      age: 0,
      trailTimer: 0,
    });
  }

  spawnOrb(x, y, targetX, targetY, { speed = 260, damage = 1 } = {}) {
    const s = this.game.s;
    const angle = Math.atan2(targetY - y, targetX - x);
    this.items.push({
      kind: 'orb',
      x,
      y,
      vx: Math.cos(angle) * speed * s,
      vy: Math.sin(angle) * speed * s,
      r: 10 * s,
      life: 4.4,
      damage,
      age: 0,
      phase: rand(0, TAU),
      trailTimer: 0,
    });
    this.game.audio.orb();
  }

  spawnSpike(x, { delay = 0.52, damage = 1 } = {}) {
    const s = this.game.s;
    this.items.push({
      kind: 'spike',
      x,
      y: this.game.groundY,
      w: 27 * s,
      h: 54 * s,
      life: delay + 1.15,
      maxLife: delay + 1.15,
      age: 0,
      delay,
      damage,
      hasHit: false,
      cracked: false,
    });
  }

  update(dt) {
    const game = this.game;
    const player = game.player;
    const s = game.s;
    const items = this.items;
    let write = 0;

    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      p.life -= dt;
      p.age += dt;
      if (p.life <= 0) continue;

      if (p.kind === 'wave') {
        p.x += p.dir * p.speed * dt;
        p.trailTimer -= dt;
        if (p.trailTimer <= 0) {
          p.trailTimer = 0.028;
          game.particles.spawn({
            x: p.x - p.dir * 8 * s,
            y: p.y - rand(0, p.h * 0.7),
            vx: -p.dir * rand(20, 60) * s,
            vy: rand(-35, 5) * s,
            life: rand(0.2, 0.45),
            size: rand(1, 2.6) * s,
            color: '#cfe3d8',
            style: 'spark',
            gravity: 20 * s,
          });
          game.particles.spawn({
            x: p.x,
            y: p.y + 2,
            vx: -p.dir * rand(20, 80) * s,
            vy: rand(-45, -10) * s,
            life: rand(0.25, 0.5),
            size: rand(2, 5) * s,
            color: '#6d8c82',
            style: 'dust',
            gravity: 50 * s,
          });
        }
        if (p.x < -80 || p.x > game.w + 80) continue;
        const rect = {
          x: p.x - p.w / 2,
          y: p.y - p.h,
          w: p.w,
          h: p.h * 0.78,
        };
        if (circleRect(player.x, player.y - player.h * 0.5, player.w * 0.36, rect)) {
          game.damagePlayer(p.damage, p.x);
        }
      } else if (p.kind === 'orb') {
        const dx = player.x - p.x;
        const dy = player.y - player.h * 0.5 - p.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        const desired = Math.atan2(dy, dx);
        const current = Math.atan2(p.vy, p.vx);
        let diff = ((desired - current + Math.PI * 3) % TAU) - Math.PI;
        const steer = 0.55 * dt * (game.boss.phase >= 2 ? 1.3 : 1);
        const angle = current + diff * steer;
        const speed = Math.hypot(p.vx, p.vy);
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.trailTimer -= dt;
        if (p.trailTimer <= 0) {
          p.trailTimer = 0.03;
          game.particles.spawn({
            x: p.x + rand(-3, 3) * s,
            y: p.y + rand(-3, 3) * s,
            vx: -p.vx * 0.14,
            vy: -p.vy * 0.14,
            life: rand(0.25, 0.6),
            size: rand(1, 2.5) * s,
            color: Math.random() < 0.28 ? '#f0e4b9' : '#8fe8da',
            style: 'soul',
            gravity: -4,
          });
        }
        if (Math.hypot(player.x - p.x, player.y - player.h * 0.45 - p.y) < p.r + player.w * 0.28) {
          game.damagePlayer(p.damage, p.x);
        }
        if (p.x < -80 || p.x > game.w + 80 || p.y < -80 || p.y > game.h + 80) continue;
      } else if (p.kind === 'spike') {
        if (!p.cracked) {
          p.cracked = true;
          game.particles.burst(p.x, p.y - 2, 6, {
            angle: -Math.PI / 2,
            spread: Math.PI,
            speedMin: 18,
            speedMax: 70,
            lifeMin: 0.3,
            lifeMax: 0.8,
            sizeMin: 1,
            sizeMax: 3,
            color: ['#738c81', '#a7b7a6'],
            style: 'dust',
            gravity: 140,
          });
        }
        const grow = clamp((p.age - p.delay) / 0.16, 0, 1);
        if (grow > 0 && !p.hasHit) {
          const rect = {
            x: p.x - p.w * 0.4,
            y: p.y - p.h * 0.86 * grow,
            w: p.w * 0.8,
            h: p.h * 0.9 * grow,
          };
          if (
            rectsOverlap(rect, {
              x: player.x - player.w * 0.32,
              y: player.y - player.h,
              w: player.w * 0.64,
              h: player.h,
            })
          ) {
            p.hasHit = true;
            game.damagePlayer(p.damage, p.x);
          }
        }
      }

      items[write++] = p;
    }
    items.length = write;
  }

  checkNail(hitbox) {
    const game = this.game;
    let hit = false;
    for (const p of this.items) {
      if (p.kind !== 'orb' || p.dead) continue;
      if (circleRect(p.x, p.y, p.r + 6, hitbox)) {
        p.life = 0;
        p.dead = true;
        hit = true;
        game.particles.burst(p.x, p.y, 15, {
          speedMin: 50,
          speedMax: 210,
          lifeMin: 0.2,
          lifeMax: 0.55,
          sizeMin: 1,
          sizeMax: 3,
          color: ['#a8f0e2', '#e8e2cf', '#79c4bb'],
          style: 'soul',
          gravity: 10,
        });
        game.audio.orbBreak?.();
        game.audio.hit();
        game.addTrauma(0.1);
        game.player.gainSoul(4);
      }
    }
    return hit;
  }

  draw(ctx) {
    const game = this.game;
    const s = game.s;
    for (const p of this.items) {
      if (p.kind === 'wave') {
        const t = 1 - p.life / 2.8;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(p.x, p.y);
        ctx.scale(p.dir, 1);
        const alpha = clamp(p.life * 1.5, 0, 1) * 0.9;
        ctx.strokeStyle = `rgba(207, 227, 216, ${alpha * 0.45})`;
        ctx.lineWidth = 5 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, p.h * 1.12, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        ctx.strokeStyle = `rgba(232, 226, 207, ${alpha})`;
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        ctx.arc(0, 0, p.h * 1.05, Math.PI * 1.08, Math.PI * 1.92);
        ctx.stroke();
        ctx.fillStyle = `rgba(143, 232, 218, ${alpha * 0.12})`;
        ctx.beginPath();
        ctx.arc(0, -p.h * 0.1, p.h * 0.9, Math.PI, TAU);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (p.kind === 'orb') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const pulse = 1 + Math.sin(p.age * 12 + p.phase) * 0.1;
        drawGlow(ctx, p.x, p.y, p.r * 4.2 * pulse, 'rgba(121,196,187,0.14)');
        drawGlow(ctx, p.x, p.y, p.r * 2.2, 'rgba(168,240,226,0.4)');
        ctx.fillStyle = '#e8faf1';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.42, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(168,240,226,0.62)';
        ctx.lineWidth = 1.2 * s;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * pulse, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(232,226,207,0.2)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 1.75, p.age * 2, p.age * 2 + 2.1);
        ctx.stroke();
        ctx.restore();
      } else if (p.kind === 'spike') {
        const grow = clamp((p.age - p.delay) / 0.16, 0, 1);
        const retract = clamp((p.life - 0.3) / 0.3, 0, 1);
        const height = p.h * grow * retract;
        if (grow <= 0) {
          const pulse = 0.5 + Math.sin(p.age * 30) * 0.5;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          drawGlow(ctx, p.x, p.y - 4 * s, p.w * 1.9, `rgba(207,227,216,${0.1 + pulse * 0.16})`);
          ctx.strokeStyle = `rgba(232,226,207,${0.26 + pulse * 0.35})`;
          ctx.lineWidth = 1.2 * s;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.w * 0.8, 5 * s, 0, 0, TAU);
          ctx.stroke();
          ctx.fillStyle = `rgba(232,226,207,${0.12 + pulse * 0.2})`;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.w * 0.5, 2.6 * s, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        } else if (height > 1) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          drawGlow(ctx, p.x, p.y - height * 0.5, p.w * 2, 'rgba(143,232,218,0.14)');
          ctx.fillStyle = '#cfe3d8';
          ctx.strokeStyle = 'rgba(232,226,207,0.55)';
          ctx.lineWidth = 1;
          for (let i = -1; i <= 1; i++) {
            const x = p.x + i * p.w * 0.34;
            const h = height * (i === 0 ? 1 : 0.66);
            ctx.beginPath();
            ctx.moveTo(x - p.w * 0.22, p.y);
            ctx.lineTo(x, p.y - h);
            ctx.lineTo(x + p.w * 0.22, p.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(9,16,16,0.35)';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - height * 0.92);
          ctx.lineTo(p.x + p.w * 0.08, p.y);
          ctx.lineTo(p.x - p.w * 0.08, p.y);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }
}
