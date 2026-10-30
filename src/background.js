import { TAU, rand, seeded, hexRgba, clamp } from './util.js';

export function windowPath(ctx, win) {
  const { cx, top, w, h, archTop } = win;
  const half = w / 2;
  ctx.beginPath();
  ctx.moveTo(cx - half, top + h);
  ctx.lineTo(cx - half, top + archTop);
  ctx.bezierCurveTo(cx - half, top + archTop * 0.2, cx - half * 0.56, top, cx, top);
  ctx.bezierCurveTo(cx + half * 0.56, top, cx + half, top + archTop * 0.2, cx + half, top + archTop);
  ctx.lineTo(cx + half, top + h);
  ctx.closePath();
}

function drawWindow(ctx, win, index) {
  const { cx, top, w, h, archTop } = win;
  const bottom = top + h;
  ctx.save();
  windowPath(ctx, win);
  const fill = ctx.createLinearGradient(0, top, 0, bottom);
  fill.addColorStop(0, '#122a3c');
  fill.addColorStop(0.35, '#16374d');
  fill.addColorStop(0.68, '#0b1d2c');
  fill.addColorStop(1, '#060e18');
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.save();
  windowPath(ctx, win);
  ctx.clip();

  const halo = ctx.createRadialGradient(cx, top + h * 0.36, 2, cx, top + h * 0.36, w * 1.35);
  halo.addColorStop(0, 'rgba(196,238,250,.20)');
  halo.addColorStop(0.34, 'rgba(118,190,218,.10)');
  halo.addColorStop(0.7, 'rgba(38,86,110,.05)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - w, top, w * 2, h);

  const rnd = seeded(771 + index * 139);
  const baseY = top + h * 0.88;
  ctx.fillStyle = 'rgba(4,10,17,.72)';
  let x = cx - w / 2;
  while (x < cx + w / 2) {
    const tw = rand(5, 18) + w * 0.025;
    const th = h * rand(0.09, 0.34);
    ctx.fillRect(x, baseY - th, tw, th);
    if (rnd() < 0.5) {
      ctx.beginPath();
      ctx.moveTo(x, baseY - th);
      ctx.lineTo(x + tw / 2, baseY - th - h * rand(0.02, 0.07));
      ctx.lineTo(x + tw, baseY - th);
      ctx.closePath();
      ctx.fill();
    }
    const lights = Math.floor(tw / 5);
    for (let i = 0; i < lights; i++) {
      if (rnd() < 0.42) {
        const lx = x + 1.5 + (i + 0.5) * (tw - 3) / Math.max(1, lights);
        const ly = baseY - th + 3 + rnd() * Math.max(2, th - 6);
        ctx.fillStyle = `rgba(184,230,244,${0.18 + rnd() * 0.36})`;
        ctx.fillRect(lx, ly, 1.2, 1.8);
      }
    }
    x += tw + rand(1, 5);
  }

  const mist = ctx.createLinearGradient(0, top + h * 0.58, 0, bottom);
  mist.addColorStop(0, 'rgba(130,190,212,0)');
  mist.addColorStop(0.6, 'rgba(110,170,195,.07)');
  mist.addColorStop(1, 'rgba(20,50,70,.22)');
  ctx.fillStyle = mist;
  ctx.fillRect(cx - w / 2, top + h * 0.55, w, h * 0.45);

  ctx.restore();

  windowPath(ctx, win);
  ctx.strokeStyle = '#1b2a39';
  ctx.lineWidth = clamp(w * 0.035, 4, 10);
  ctx.stroke();
  windowPath(ctx, win);
  ctx.strokeStyle = 'rgba(180,224,240,.18)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const bars = windowBarLayout(win);
  ctx.save();
  windowPath(ctx, win);
  ctx.clip();
  for (const bar of bars) {
    ctx.fillStyle = 'rgba(10,18,28,.82)';
    if (bar.vertical) ctx.fillRect(bar.x - bar.w / 2, bar.top, bar.w, bar.bottom - bar.top);
    else ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
    ctx.fillStyle = 'rgba(158,204,222,.10)';
    if (bar.vertical) ctx.fillRect(bar.x - bar.w / 2, bar.top, 1, bar.bottom - bar.top);
    else ctx.fillRect(bar.x, bar.y, bar.w, 0.8);
  }
  ctx.restore();

  if (index === 0) {
    const roseY = top + h * 0.235;
    const roseR = Math.min(w * 0.23, h * 0.09);
    ctx.save();
    ctx.translate(cx, roseY);
    ctx.strokeStyle = 'rgba(10,18,28,.78)';
    ctx.lineWidth = Math.max(2, roseR * 0.1);
    ctx.beginPath();
    ctx.arc(0, 0, roseR, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(178,224,242,.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, roseR * 0.88, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      ctx.strokeStyle = 'rgba(10,18,28,.6)';
      ctx.lineWidth = Math.max(1.4, roseR * 0.055);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * roseR * 0.18, Math.sin(a) * roseR * 0.18);
      ctx.lineTo(Math.cos(a) * roseR, Math.sin(a) * roseR);
      ctx.stroke();
    }
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, roseR);
    rg.addColorStop(0, 'rgba(206,244,255,.18)');
    rg.addColorStop(1, 'rgba(206,244,255,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(0, 0, roseR, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function windowBarLayout(win) {
  const { cx, top, w, h, archTop } = win;
  const left = cx - w / 2;
  const right = cx + w / 2;
  const bottom = top + h;
  const bars = [];
  const vw = clamp(w * 0.024, 2, 5);
  bars.push({ vertical: true, x: cx, w: vw, top: top + archTop * 0.45, bottom });
  bars.push({ vertical: true, x: left + w * 0.24, w: vw * 0.75, top: top + archTop * 0.72, bottom });
  bars.push({ vertical: true, x: right - w * 0.24, w: vw * 0.75, top: top + archTop * 0.72, bottom });
  const hh = clamp(h * 0.012, 2.5, 5);
  for (const t of [0.5, 0.69, 0.855]) {
    const y = top + h * t;
    bars.push({ vertical: false, x: left, y, w, h: hh });
  }
  return bars;
}

function drawPillar(ctx, cx, top, bottom, width, index) {
  const rnd = seeded(401 + index * 73);
  const grad = ctx.createLinearGradient(cx - width / 2, 0, cx + width / 2, 0);
  grad.addColorStop(0, '#050a11');
  grad.addColorStop(0.25, '#111b27');
  grad.addColorStop(0.55, '#1a2836');
  grad.addColorStop(0.8, '#0c141e');
  grad.addColorStop(1, '#04070c');
  ctx.fillStyle = grad;
  ctx.fillRect(cx - width / 2, top, width, bottom - top);
  ctx.fillStyle = 'rgba(170,214,232,.10)';
  ctx.fillRect(cx - width / 2 + width * 0.18, top, 1, bottom - top);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fillRect(cx + width * 0.24, top, 1.2, bottom - top);
  for (let i = 0; i < 14; i++) {
    const x = cx - width / 2 + rnd() * width;
    const y = top + rnd() * (bottom - top) * 0.75;
    ctx.strokeStyle = `rgba(0,0,0,${0.12 + rnd() * 0.2})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rnd() * 3 - 1.5, y + 4 + rnd() * 10);
    ctx.stroke();
  }
  const capW = width * 1.6;
  const capH = clamp(width * 0.55, 6, 14);
  ctx.fillStyle = '#101a26';
  ctx.fillRect(cx - capW / 2, top, capW, capH);
  ctx.fillStyle = 'rgba(176,220,238,.13)';
  ctx.fillRect(cx - capW / 2, top, capW, 1);
  ctx.fillStyle = '#0a111a';
  ctx.fillRect(cx - capW * 0.6, top + capH, capW * 1.2, capH * 0.34);
  ctx.fillStyle = 'rgba(176,220,238,.08)';
  ctx.fillRect(cx - capW * 0.6, top + capH, capW * 1.2, 1);
  const baseY = bottom - capH * 1.5;
  ctx.fillStyle = '#0b131d';
  ctx.fillRect(cx - capW * 0.55, baseY, capW * 1.1, capH * 1.5);
  ctx.fillStyle = 'rgba(176,220,238,.07)';
  ctx.fillRect(cx - capW * 0.55, baseY, capW * 1.1, 1);
}

function drawChain(ctx, x, top, bottom, rnd) {
  const links = Math.floor((bottom - top) / 11);
  for (let i = 0; i < links; i++) {
    const y = top + i * 11;
    ctx.strokeStyle = i % 2 ? 'rgba(28,42,54,.9)' : 'rgba(15,24,34,.9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(x + Math.sin(i * 0.8) * 0.8, y, i % 2 ? 2.4 : 1.5, 5, 0, 0, TAU);
    ctx.stroke();
  }
  const lg = ctx.createRadialGradient(x, bottom, 1, x, bottom, 42);
  lg.addColorStop(0, 'rgba(206,244,255,.16)');
  lg.addColorStop(0.2, 'rgba(150,220,240,.10)');
  lg.addColorStop(1, 'rgba(100,190,220,0)');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.arc(x, bottom, 42, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(196,240,252,.85)';
  ctx.beginPath();
  ctx.arc(x, bottom, 2.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,46,58,.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 5, bottom - 7);
  ctx.lineTo(x, bottom - 13);
  ctx.lineTo(x + 5, bottom - 7);
  ctx.lineTo(x, bottom - 1);
  ctx.closePath();
  ctx.stroke();
}

function drawVine(ctx, x, length, rnd, side) {
  ctx.strokeStyle = 'rgba(14,26,30,.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  const c1x = x + (rnd() - 0.5) * 40;
  const c1y = length * 0.4;
  const ex = x + side * (6 + rnd() * 16);
  ctx.quadraticCurveTo(c1x, c1y, ex, length);
  ctx.stroke();
  const leaves = Math.floor(length / 26);
  for (let i = 1; i < leaves; i++) {
    const t = i / leaves;
    const lx = x + (c1x - x) * 2 * t * (1 - t) + (ex - x) * t * t;
    const ly = length * t;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(22,42,44,.92)' : 'rgba(12,28,32,.92)';
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate((i % 2 ? 1 : -1) * (0.5 + rnd() * 0.5));
    ctx.beginPath();
    ctx.ellipse(4, 0, 5 + rnd() * 3, 1.6, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawMushrooms(ctx, x, y, size, rnd) {
  for (let i = 0; i < 5; i++) {
    const mx = x + (rnd() - 0.5) * size * 2.6;
    const my = y - rnd() * size * 0.4;
    const h = 3 + rnd() * 8;
    const r = 2 + rnd() * 4.5;
    ctx.strokeStyle = 'rgba(120,175,180,.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx + (rnd() - 0.5) * 2, my - h);
    ctx.stroke();
    const g = ctx.createRadialGradient(mx, my - h, 0, mx, my - h, r * 4);
    g.addColorStop(0, 'rgba(170,240,248,.35)');
    g.addColorStop(0.4, 'rgba(80,180,200,.12)');
    g.addColorStop(1, 'rgba(80,180,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mx, my - h, r * 4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(140,220,230,.55)';
    ctx.beginPath();
    ctx.ellipse(mx, my - h, r, r * 0.42, 0, Math.PI, TAU);
    ctx.fill();
  }
}

function drawFloor(ctx, world) {
  const { W, H, groundY, platforms } = world;
  const rnd = seeded(911);
  const front = ctx.createLinearGradient(0, groundY, 0, H);
  front.addColorStop(0, '#0c151f');
  front.addColorStop(0.28, '#080e16');
  front.addColorStop(1, '#030509');
  ctx.fillStyle = front;
  ctx.fillRect(0, groundY, W, H - groundY);

  const top = ctx.createLinearGradient(0, groundY - 12, 0, groundY + 10);
  top.addColorStop(0, 'rgba(32,52,66,.6)');
  top.addColorStop(0.4, 'rgba(17,29,40,.95)');
  top.addColorStop(1, 'rgba(5,9,14,1)');
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 8);
  for (let x = 0; x <= W; x += 34) {
    ctx.lineTo(x, groundY - (rnd() * 2.4));
  }
  ctx.lineTo(W, groundY + 8);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(158,214,232,.20)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 44) {
    const y = groundY - rnd() * 1.8;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const win of world.windows || []) {
    const g = ctx.createLinearGradient(0, groundY, 0, H);
    g.addColorStop(0, 'rgba(132,198,222,.075)');
    g.addColorStop(0.4, 'rgba(80,150,180,.025)');
    g.addColorStop(1, 'rgba(40,90,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(win.cx - win.w * 0.3, groundY, win.w * 0.6, H - groundY);
  }
  ctx.restore();

  for (let i = 0; i < 7; i++) {
    const x = rnd() * W;
    const len = 20 + rnd() * 80;
    ctx.strokeStyle = `rgba(130,190,210,${0.025 + rnd() * 0.04})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, groundY + 6);
    ctx.lineTo(x + (rnd() - 0.5) * 12, groundY + 6 + len);
    ctx.stroke();
  }

  for (let i = 0; i < 5; i++) {
    const x = W * (0.12 + rnd() * 0.76);
    const rx = 16 + rnd() * 50;
    ctx.fillStyle = 'rgba(3,6,10,.5)';
    ctx.beginPath();
    ctx.ellipse(x, groundY + 9, rx, 2.5, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,210,230,.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, groundY + 9, rx, 2.5, 0, Math.PI, TAU);
    ctx.stroke();
  }

  const blockH = clamp(H * 0.065, 22, 46);
  ctx.strokeStyle = 'rgba(150,200,220,.045)';
  ctx.lineWidth = 1;
  for (let y = groundY + blockH; y < H; y += blockH) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let x = 0; x < W; x += blockH * 2.2) {
    ctx.beginPath();
    ctx.moveTo(x + (rnd() - 0.5) * 20, groundY + blockH * 0.4);
    ctx.lineTo(x + (rnd() - 0.5) * 20, H);
    ctx.stroke();
  }

  for (const platform of platforms) {
    const x = platform.x - platform.w / 2;
    const y = platform.y;
    const grad = ctx.createLinearGradient(0, y, 0, y + platform.h);
    grad.addColorStop(0, '#17222f');
    grad.addColorStop(0.5, '#0d1620');
    grad.addColorStop(1, '#05090f');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x, y + 5);
    ctx.quadraticCurveTo(x + platform.w * 0.08, y - 2, x + platform.w * 0.2, y);
    ctx.lineTo(x + platform.w * 0.8, y);
    ctx.quadraticCurveTo(x + platform.w * 0.94, y - 2, x + platform.w, y + 4);
    ctx.lineTo(x + platform.w, y + platform.h);
    ctx.lineTo(x, y + platform.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(166,220,238,.24)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 1);
    ctx.lineTo(x + platform.w - 2, y + 1);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    for (let i = 0; i < 5; i++) {
      const vx = x + rnd() * platform.w;
      const len = 2 + rnd() * 10;
      ctx.fillRect(vx, y + platform.h - 1, 1, len);
    }
    const moss = ctx.createRadialGradient(x + platform.w * 0.5, y, 0, x + platform.w * 0.5, y, platform.w * 0.45);
    moss.addColorStop(0, 'rgba(120,220,220,.08)');
    moss.addColorStop(1, 'rgba(120,220,220,0)');
    ctx.fillStyle = moss;
    ctx.fillRect(x, y - 12, platform.w, 20);
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const mist = ctx.createLinearGradient(0, groundY - 40, 0, groundY + 12);
  mist.addColorStop(0, 'rgba(110,190,220,0)');
  mist.addColorStop(0.7, 'rgba(110,190,220,.045)');
  mist.addColorStop(1, 'rgba(110,190,220,.09)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, groundY - 40, W, 52);
  ctx.restore();
}

export function buildBackground(world) {
  const { W, H, groundY } = world;
  const dpr = world.dpr;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(W * dpr));
  canvas.height = Math.max(1, Math.round(H * dpr));
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const rnd = seeded(20261030);

  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#050810');
  base.addColorStop(0.36, '#08111d');
  base.addColorStop(0.7, '#060c15');
  base.addColorStop(1, '#030508');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  const ambient = ctx.createRadialGradient(W * 0.5, H * 0.4, 10, W * 0.5, H * 0.4, W * 0.62);
  ambient.addColorStop(0, 'rgba(64,132,162,.10)');
  ambient.addColorStop(0.5, 'rgba(30,74,102,.04)');
  ambient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ambient;
  ctx.fillRect(0, 0, W, H);

  const bottom = groundY - H * 0.035;
  const centralTop = H * 0.075;
  const sideTop = H * 0.17;
  const centralW = Math.min(W * 0.30, Math.min(430, W - 180));
  const sideW = Math.min(W * 0.165, 240);
  const windows = [
    { cx: W * 0.5, top: centralTop, w: centralW, h: bottom - centralTop, archTop: (bottom - centralTop) * 0.34, seed: 1 },
    { cx: W * 0.17, top: sideTop, w: sideW, h: bottom - sideTop, archTop: (bottom - sideTop) * 0.34, seed: 2 },
    { cx: W * 0.83, top: sideTop, w: sideW, h: bottom - sideTop, archTop: (bottom - sideTop) * 0.34, seed: 3 }
  ];

  for (const win of windows) {
    const glow = ctx.createRadialGradient(win.cx, win.top + win.h * 0.42, 2, win.cx, win.top + win.h * 0.42, win.w * 1.7);
    glow.addColorStop(0, 'rgba(104,180,210,.12)');
    glow.addColorStop(0.45, 'rgba(60,124,154,.05)');
    glow.addColorStop(1, 'rgba(20,50,74,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(win.cx - win.w * 1.7, win.top - win.h * 0.1, win.w * 3.4, win.h * 1.3);
  }

  drawWindow(ctx, windows[1], 1);
  drawWindow(ctx, windows[2], 2);
  drawWindow(ctx, windows[0], 0);

  const vault = ctx.createLinearGradient(0, 0, 0, H * 0.32);
  vault.addColorStop(0, 'rgba(2,4,8,.9)');
  vault.addColorStop(1, 'rgba(2,4,8,0)');
  ctx.fillStyle = vault;
  ctx.fillRect(0, 0, W, H * 0.32);

  ctx.strokeStyle = 'rgba(20,32,44,.75)';
  ctx.lineWidth = Math.max(2, W * 0.003);
  for (let i = 0; i < 4; i++) {
    const x0 = W * (i / 3);
    const x1 = W * 0.5;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.quadraticCurveTo((x0 + x1) / 2, H * 0.13, x1, H * 0.34);
    ctx.stroke();
  }

  drawPillar(ctx, W * 0.335, H * 0.02, groundY, Math.max(12, W * 0.016), 1);
  drawPillar(ctx, W * 0.665, H * 0.02, groundY, Math.max(12, W * 0.016), 2);

  ctx.strokeStyle = 'rgba(24,38,52,.5)';
  ctx.lineWidth = Math.max(1.5, W * 0.0022);
  ctx.beginPath();
  ctx.moveTo(W * 0.335, H * 0.11);
  ctx.quadraticCurveTo(W * 0.5, H * -0.02, W * 0.665, H * 0.11);
  ctx.stroke();

  const chainXs = [W * 0.075, W * 0.28, W * 0.72, W * 0.925];
  chainXs.forEach((x, i) => drawChain(ctx, x, 0, H * (0.14 + i * 0.045), rnd));

  for (let i = 0; i < 9; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side < 0 ? rnd() * W * 0.14 : W - rnd() * W * 0.14;
    drawVine(ctx, x, H * (0.12 + rnd() * 0.28), rnd, side);
  }

  const sideRock = (side) => {
    ctx.fillStyle = '#04070c';
    ctx.beginPath();
    const baseX = side < 0 ? 0 : W;
    ctx.moveTo(baseX, groundY + 6);
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const x = baseX + side * (W * 0.03 + t * W * 0.055);
      const y = groundY + 6 - Math.sin(t * Math.PI) * (10 + rnd() * 18) - rnd() * 10;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(baseX + side * W * 0.09, groundY + 40);
    ctx.lineTo(baseX, groundY + 52);
    ctx.closePath();
    ctx.fill();
  };
  sideRock(-1);
  sideRock(1);

  drawFloor(ctx, { ...world, windows });

  for (let i = 0; i < 2; i++) {
    drawMushrooms(ctx, W * (0.06 + i * 0.87), groundY - 2, Math.min(34, W * 0.04), rnd);
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 220; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const a = rnd() * 0.035;
    ctx.fillStyle = `rgba(190,235,245,${a})`;
    ctx.fillRect(x, y, rnd() < 0.8 ? 1 : 1.6, 1);
  }
  ctx.restore();

  return { canvas, windows };
}
