(function () {
  'use strict';
  const PES = window.PES;
  const { FIELD, GOAL, W, H } = PES.MatchConstants;
  const TWO_PI = Math.PI * 2;
  const clamp = PES.clamp;
  const lerp = (a, b, t) => a + (b - a) * t;
  const angDiff = (a, b) => {
    let d = (b - a + Math.PI) % TWO_PI;
    if (d < 0) d += TWO_PI;
    return d - Math.PI;
  };

  const methods = {
    buildPitchTexture() {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d');
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#1d6b35'); grad.addColorStop(.5, '#1a5f2f'); grad.addColorStop(1, '#155028');
      g.fillStyle = grad; g.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 72) {
        g.fillStyle = (x / 72) % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.035)';
        g.fillRect(x, 0, 72, H);
      }
      const r = PES.rnd(4441);
      for (let i = 0; i < 5200; i++) {
        const x = r() * W, y = r() * H;
        g.fillStyle = r() < .5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.03)';
        g.fillRect(x, y, 1.2 + r() * 2, .8 + r());
      }
      g.fillStyle = 'rgba(0,0,0,.2)';
      g.fillRect(0, 0, FIELD.x, H); g.fillRect(FIELD.r, 0, W - FIELD.r, H);
      g.fillRect(0, 0, W, FIELD.y); g.fillRect(0, FIELD.b, W, H - FIELD.b);
      g.strokeStyle = 'rgba(244,255,250,.72)'; g.lineWidth = 2.4;
      g.strokeRect(FIELD.x, FIELD.y, FIELD.w, FIELD.h);
      g.beginPath(); g.moveTo(FIELD.cx, FIELD.y); g.lineTo(FIELD.cx, FIELD.b); g.stroke();
      g.beginPath(); g.arc(FIELD.cx, FIELD.cy, 79, 0, TWO_PI); g.stroke();
      g.beginPath(); g.arc(FIELD.cx, FIELD.cy, 4.5, 0, TWO_PI);
      g.fillStyle = 'rgba(244,255,250,.8)'; g.fill();
      const box = (left) => {
        const x = left ? FIELD.x : FIELD.r - PES.MatchConstants.PEN.depth;
        const pen = PES.MatchConstants.PEN, six = PES.MatchConstants.SIX;
        g.strokeRect(x, pen.top, pen.depth, pen.bottom - pen.top);
        g.strokeRect(left ? FIELD.x : FIELD.r - six.depth, six.top, six.depth, six.bottom - six.top);
        const spot = left ? FIELD.x + 112 : FIELD.r - 112;
        g.beginPath(); g.arc(spot, FIELD.cy, 4, 0, TWO_PI); g.fill();
        g.beginPath();
        const arcX = left ? FIELD.x + pen.depth : FIELD.r - pen.depth;
        g.arc(arcX, FIELD.cy, 66, left ? -.94 : Math.PI - .94, left ? .94 : Math.PI + .94);
        g.stroke();
      };
      box(true); box(false);
      [[FIELD.x, FIELD.y, 0, Math.PI / 2], [FIELD.r, FIELD.y, Math.PI / 2, Math.PI], [FIELD.r, FIELD.b, Math.PI, Math.PI * 1.5], [FIELD.x, FIELD.b, Math.PI * 1.5, TWO_PI]].forEach(a => {
        g.beginPath(); g.arc(a[0], a[1], 13, a[2], a[3]); g.stroke();
      });
      const rg = g.createRadialGradient(FIELD.cx, FIELD.cy, 30, FIELD.cx, FIELD.cy, 300);
      rg.addColorStop(0, 'rgba(255,255,255,.035)'); rg.addColorStop(1, 'transparent');
      g.fillStyle = rg; g.fillRect(FIELD.x, FIELD.y, FIELD.w, FIELD.h);
      this.pitchCanvas = c;
    },

    render(dt) {
      const ctx = this.ctx;
      if (!ctx) return;
      const cw = this.cw || window.innerWidth, ch = this.ch || window.innerHeight;
      if (cw !== this.canvas.clientWidth || ch !== this.canvas.clientHeight) this.resize();
      const dpr = this.dpr || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#07131c';
      ctx.fillRect(0, 0, cw, ch);
      if (!this.camInit) this.updateCamera(dt || .016);
      const shakeX = this.shake > 0 ? (Math.random() - .5) * this.shake * 14 : 0;
      const shakeY = this.shake > 0 ? (Math.random() - .5) * this.shake * 14 : 0;
      const s = this.cam.scale;
      const ox = cw / 2 - this.cam.x * s + shakeX;
      const oy = ch / 2 - this.cam.y * s + shakeY;
      ctx.save();
      ctx.translate(ox, oy); ctx.scale(s, s);
      this.drawStadium(ctx);
      if (this.pitchCanvas) ctx.drawImage(this.pitchCanvas, 0, 0);
      this.drawGoals(ctx);
      this.drawParticles(ctx);
      if (this.state === 'replay' && this.replay) this.drawReplay(ctx);
      else this.drawPlayers(ctx);
      if (this.state !== 'replay') this.drawBall(ctx, this.ball, 1);
      this.drawFieldFx(ctx);
      ctx.restore();
      this.drawScreenFx(ctx, cw, ch);
      this.drawMinimap();
    },

    drawStadium(ctx) {
      const night = this.config.timeOfDay === 'noite';
      const sunset = this.config.timeOfDay === 'entardecer';
      const base = night ? '#071019' : sunset ? '#241a2a' : '#162430';
      ctx.fillStyle = base;
      ctx.fillRect(-500, -400, W + 1000, H + 800);
      const stand = (x, y, w, h) => {
        const g = ctx.createLinearGradient(x, y, x, y + h);
        g.addColorStop(0, 'rgba(10,18,26,.96)'); g.addColorStop(.5, 'rgba(17,31,43,.92)'); g.addColorStop(1, 'rgba(5,12,18,.96)');
        ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(120,180,220,.12)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
      };
      stand(-60, -150, W + 120, 150);
      stand(-60, H, W + 120, 190);
      stand(-170, -40, 170, H + 80);
      stand(W, -40, 190, H + 80);
      const jump = this.crowdJump || 0;
      this.crowdDots.forEach(d => {
        const wave = Math.sin(this.animTime * 2 + d.p) * .8;
        const jy = jump > 0 ? Math.abs(Math.sin(this.animTime * 9 + d.p)) * 5 * jump : 0;
        ctx.fillStyle = d.c;
        ctx.globalAlpha = .5 + Math.max(0, wave) * .3;
        ctx.fillRect(d.x, d.y - jy, d.s, d.s * 1.5);
      });
      ctx.globalAlpha = 1;
      if (this.crowdJump > 0) this.crowdJump = Math.max(0, this.crowdJump - .01);
      this.drawBoards(ctx);
      if (night) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        [[-40, -40], [W + 40, -40], [-40, H + 40], [W + 40, H + 40]].forEach(([x, y]) => {
          const g = ctx.createRadialGradient(x, y, 20, x, y, 360);
          g.addColorStop(0, 'rgba(150,220,255,.14)'); g.addColorStop(1, 'transparent');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 360, 0, TWO_PI); ctx.fill();
        });
        ctx.restore();
      }
    },

    drawBoards(ctx) {
      const y1 = FIELD.y - 22, y2 = FIELD.b + 8;
      for (let x = FIELD.x; x < FIELD.r; x += 108) {
        const alt = ((x / 108) | 0) % 2;
        ctx.fillStyle = alt ? 'rgba(10,26,38,.92)' : 'rgba(14,38,52,.92)';
        ctx.fillRect(x, y1, 100, 16);
        ctx.fillRect(x, y2, 100, 16);
        ctx.fillStyle = alt ? 'rgba(53,230,255,.55)' : 'rgba(201,255,61,.5)';
        ctx.font = '700 7px Arial';
        ctx.fillText(alt ? 'PES 2027' : 'STICKMAN', x + 5, y1 + 10);
        ctx.fillText(alt ? 'STICKMAN' : 'PES 2027', x + 5, y2 + 10);
      }
    },

    drawGoals(ctx) {
      const draw = (left) => {
        const x = left ? FIELD.x - GOAL.depth : FIELD.r;
        const w = GOAL.depth;
        const top = GOAL.top, bottom = GOAL.bottom;
        ctx.save();
        ctx.fillStyle = 'rgba(235,248,255,.05)';
        ctx.fillRect(x, top, w, bottom - top);
        ctx.strokeStyle = 'rgba(235,248,255,.42)'; ctx.lineWidth = .8;
        for (let i = 0; i <= 10; i++) {
          const yy = top + (bottom - top) * i / 10;
          ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
        }
        const step = left ? 7 : -7;
        for (let xx = x; left ? xx <= x + w : xx >= x + w; xx += step) {
          ctx.beginPath(); ctx.moveTo(xx, top); ctx.lineTo(xx, bottom); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = 3.4;
        ctx.beginPath(); ctx.moveTo(left ? FIELD.x : FIELD.r, top); ctx.lineTo(left ? FIELD.x : FIELD.r, bottom); ctx.stroke();
        ctx.fillStyle = '#f4f8fc';
        ctx.beginPath(); ctx.arc(left ? FIELD.x : FIELD.r, top, 3.2, 0, TWO_PI); ctx.fill();
        ctx.beginPath(); ctx.arc(left ? FIELD.x : FIELD.r, bottom, 3.2, 0, TWO_PI); ctx.fill();
        ctx.restore();
      };
      draw(true); draw(false);
    },

    drawPlayers(ctx) {
      const all = this.allPlayers().slice();
      all.forEach(p => {
        ctx.fillStyle = 'rgba(0,0,0,.26)';
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, p.isGK ? 10 : 8.5, 3.8, 0, 0, TWO_PI); ctx.fill();
      });
      all.sort((a, b) => a.y - b.y).forEach(p => this.drawPlayer(ctx, p));
    },

    drawPlayer(ctx, p) {
      const c = p.team.colors;
      const jersey = p.isGK ? c.accent : c.primary;
      const shorts = p.isGK ? '#111820' : (c.shorts || c.secondary);
      const socks = p.isGK ? c.accent : (c.socks || c.primary);
      const ctrl = this.control[p.side] === p && this[p.side].human;
      const active = this.possession === p;
      const sp = Math.hypot(p.vx, p.vy);
      const stride = p.state === 'slide' ? 9 : p.state === 'down' ? 5 : Math.sin(p.anim) * Math.min(5, 1 + sp * .05);
      const bob = p.state === 'down' ? 0 : Math.abs(Math.sin(p.anim)) * Math.min(1.2, sp * .02);
      const lean = Math.cos(p.dir) * (p.state === 'slide' ? 7 : 2.2);
      const baseY = p.y - bob;
      const hipY = baseY - 7;
      const shoulderY = baseY - 15;
      const headY = baseY - 20.5;
      ctx.save();
      if (p.state === 'slide') {
        ctx.translate(p.x, p.y); ctx.rotate(Math.cos(p.dir) * .35); ctx.translate(-p.x, -p.y);
      }
      ctx.lineCap = 'round';
      ctx.strokeStyle = socks; ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(p.x, hipY); ctx.lineTo(p.x + stride * .8, baseY - 1);
      ctx.moveTo(p.x, hipY); ctx.lineTo(p.x - stride * .8, baseY - 1);
      ctx.stroke();
      ctx.fillStyle = '#10171d';
      ctx.beginPath(); ctx.arc(p.x + stride * .8, baseY - 1, 1.8, 0, TWO_PI); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x - stride * .8, baseY - 1, 1.8, 0, TWO_PI); ctx.fill();
      ctx.strokeStyle = shorts; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(p.x - 2.5, hipY); ctx.lineTo(p.x + 2.5, hipY); ctx.stroke();
      const armSwing = p.state === 'down' ? 4 : Math.sin(p.anim + Math.PI) * Math.min(4, 1 + sp * .035);
      ctx.strokeStyle = p.skin; ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(p.x + lean * .5, shoulderY + 1); ctx.lineTo(p.x + lean + armSwing, shoulderY + 7);
      ctx.moveTo(p.x + lean * .5, shoulderY + 1); ctx.lineTo(p.x + lean - armSwing, shoulderY + 7);
      ctx.stroke();
      ctx.strokeStyle = jersey; ctx.lineWidth = 6.4;
      ctx.beginPath(); ctx.moveTo(p.x + lean, shoulderY); ctx.lineTo(p.x, hipY); ctx.stroke();
      ctx.strokeStyle = c.secondary; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(p.x + lean + .5, shoulderY + 1.5); ctx.lineTo(p.x + .5, hipY - 1.5); ctx.stroke();
      ctx.fillStyle = p.skin;
      ctx.beginPath(); ctx.arc(p.x + lean * 1.35, headY, 4.1, 0, TWO_PI); ctx.fill();
      ctx.fillStyle = p.hair;
      ctx.beginPath(); ctx.arc(p.x + lean * 1.35, headY - .8, 4.1, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
      if (!p.isGK) {
        ctx.fillStyle = c.secondary;
        ctx.font = '700 3.6px Arial'; ctx.textAlign = 'center';
        ctx.fillText(String(p.number), p.x, shoulderY + 5.5);
      } else {
        ctx.strokeStyle = '#e9f5ff'; ctx.lineWidth = .8;
        ctx.beginPath(); ctx.arc(p.x + lean * 1.35, headY, 4.8, 0, TWO_PI); ctx.stroke();
      }
      ctx.restore();
      if (ctrl) {
        const pulse = .6 + Math.sin(this.animTime * 5) * .2;
        ctx.strokeStyle = p.side === 'home' ? `rgba(201,255,61,${pulse})` : `rgba(53,230,255,${pulse})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 12, 5.5, 0, 0, TWO_PI); ctx.stroke();
        ctx.fillStyle = p.side === 'home' ? '#c9ff3d' : '#35e6ff';
        ctx.beginPath();
        ctx.moveTo(p.x, headY - 12); ctx.lineTo(p.x - 4, headY - 18); ctx.lineTo(p.x + 4, headY - 18);
        ctx.closePath(); ctx.fill();
      }
      if (active) {
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = .8;
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 14, 6.5, 0, 0, TWO_PI); ctx.stroke();
      }
      if (p.state === 'slide') {
        ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x - p.vx * .03, p.y - p.vy * .03); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
    },

    drawBall(ctx, b, alpha) {
      const z = b.z || 0;
      const sx = b.x, sy = b.y - z * .36;
      const r = 4.4 + z * .012;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.ellipse(b.x, b.y + 1.5, r * .9, r * .38, 0, 0, TWO_PI); ctx.fill();
      if (Math.hypot(b.vx || 0, b.vy || 0) > 380) {
        ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = r * .9;
        ctx.beginPath(); ctx.moveTo(sx - b.vx * .035, sy - b.vy * .035); ctx.lineTo(sx, sy); ctx.stroke();
      }
      ctx.translate(sx, sy); ctx.rotate(b.rot || 0);
      const g = ctx.createRadialGradient(-r * .35, -r * .35, r * .2, 0, 0, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c9d6df');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TWO_PI); ctx.fill();
      ctx.fillStyle = '#1b232b';
      const penta = (px, py, pr, rot) => {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = rot + i / 5 * TWO_PI;
          const xx = px + Math.cos(a) * pr, yy = py + Math.sin(a) * pr;
          if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
        }
        ctx.closePath(); ctx.fill();
      };
      penta(0, 0, r * .32, 0);
      penta(r * .62, -r * .2, r * .2, .6);
      penta(-r * .55, r * .3, r * .18, 1.4);
      penta(-r * .2, -r * .65, r * .16, 2.2);
      ctx.restore();
    },

    drawReplay(ctx) {
      const frames = this.replay;
      if (!frames || !frames.length) return;
      const t = clamp(this.replayT / 3.1, 0, 1);
      const idx = t * (frames.length - 1);
      const i0 = Math.floor(idx), i1 = Math.min(frames.length - 1, i0 + 1);
      const f = frames[i0], f2 = frames[i1] || f;
      const k = idx - i0;
      const map2 = new Map(f2.players.map(p => [p.id, p]));
      const players = f.players.map(p => {
        const q = map2.get(p.id) || p;
        return { ...p, x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k) };
      });
      players.sort((a, b) => a.y - b.y).forEach(p => {
        const team = p.s === 'home' ? this.home : this.away;
        const col = p.gk ? team.team.colors.accent : team.team.colors.primary;
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 8, 3.4, 0, 0, TWO_PI); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y - 15); ctx.lineTo(p.x, p.y - 7); ctx.stroke();
        ctx.strokeStyle = team.team.colors.socks || team.team.colors.primary; ctx.lineWidth = 2.5;
        const sw = Math.sin(this.animTime * 10 + p.x) * 4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 7); ctx.lineTo(p.x + sw, p.y);
        ctx.moveTo(p.x, p.y - 7); ctx.lineTo(p.x - sw, p.y);
        ctx.stroke();
        ctx.fillStyle = '#e8b98d';
        ctx.beginPath(); ctx.arc(p.x, p.y - 20, 4, 0, TWO_PI); ctx.fill();
      });
      const b = {
        x: lerp(f.ball.x, f2.ball.x, k), y: lerp(f.ball.y, f2.ball.y, k),
        z: lerp(f.ball.z, f2.ball.z, k), vx: 0, vy: 0, rot: lerp(f.ball.r, f2.ball.r, k)
      };
      this.drawBall(ctx, b, 1);
    },

    drawFieldFx(ctx) {
      const g = ctx.createRadialGradient(FIELD.cx, FIELD.cy, FIELD.w * .32, FIELD.cx, FIELD.cy, FIELD.w * .68);
      g.addColorStop(0, 'transparent'); g.addColorStop(1, 'rgba(0,0,0,.2)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },

    drawParticles(ctx) {
      this.particles.forEach(p => {
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = p.color;
        if (p.type === 'grass') ctx.fillRect(p.x, p.y, p.s, p.s * .7);
        else ctx.fillRect(p.x, p.y, p.s, p.s * 1.5);
      });
      ctx.globalAlpha = 1;
    },

    drawScreenFx(ctx, cw, ch) {
      const g = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * .3, cw / 2, ch / 2, Math.max(cw, ch) * .75);
      g.addColorStop(0, 'transparent'); g.addColorStop(1, 'rgba(0,0,0,.5)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
      const weather = this.config.weather;
      if (weather === 'chuva') {
        ctx.strokeStyle = 'rgba(190,225,245,.24)'; ctx.lineWidth = 1;
        ctx.beginPath();
        this.rain.forEach(r => {
          const x = r.x * cw, y = ((r.y + this.animTime * r.v) % 1) * ch;
          ctx.moveTo(x, y); ctx.lineTo(x - r.l * cw * .32, y + r.l * ch);
        });
        ctx.stroke();
      } else if (weather === 'neve') {
        ctx.fillStyle = 'rgba(240,250,255,.55)';
        this.rain.forEach(r => {
          const x = (r.x * cw + Math.sin(this.animTime + r.p) * 14 + cw) % cw;
          const y = ((r.y + this.animTime * .04 * r.v) % 1) * ch;
          ctx.beginPath(); ctx.arc(x, y, r.s * 1.2, 0, TWO_PI); ctx.fill();
        });
      } else if (weather === 'neblina') {
        ctx.fillStyle = 'rgba(190,215,230,.15)'; ctx.fillRect(0, 0, cw, ch);
      }
      if (this.config.timeOfDay === 'noite') { ctx.fillStyle = 'rgba(4,16,30,.12)'; ctx.fillRect(0, 0, cw, ch); }
      else if (this.config.timeOfDay === 'entardecer') { ctx.fillStyle = 'rgba(255,120,60,.07)'; ctx.fillRect(0, 0, cw, ch); }
      if (this.state === 'replay') { ctx.fillStyle = 'rgba(4,12,20,.18)'; ctx.fillRect(0, 0, cw, ch); }
    },

    drawMinimap() {
      if (!this.minimap) return;
      const c = this.minimap, ctx = c.getContext('2d');
      const dpr = this.dpr || 1;
      if (c.width !== Math.round(c.clientWidth * dpr)) { c.width = Math.round(c.clientWidth * dpr); c.height = Math.round(c.clientHeight * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = c.clientWidth, h = c.clientHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(7,26,38,.9)'; ctx.fillRect(0, 0, w, h);
      const sx = w / W, sy = h / H;
      ctx.strokeStyle = 'rgba(150,210,240,.35)'; ctx.lineWidth = 1;
      ctx.strokeRect(FIELD.x * sx, FIELD.y * sy, FIELD.w * sx, FIELD.h * sy);
      ctx.beginPath(); ctx.moveTo(FIELD.cx * sx, FIELD.y * sy); ctx.lineTo(FIELD.cx * sx, FIELD.b * sy); ctx.stroke();
      this.allPlayers().forEach(p => {
        ctx.fillStyle = p.side === 'home' ? '#c9ff3d' : '#35e6ff';
        ctx.fillRect(p.x * sx - 1, p.y * sy - 1, 2.3, 2.3);
      });
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(this.ball.x * sx, this.ball.y * sy, 1.8, 0, TWO_PI); ctx.fill();
    }
  };

  Object.assign(PES.Match.prototype, methods);
})();
