(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (min, max) => min + Math.random() * (max - min);
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CFG = {
    gravity: 2750,
    jump: 1390,
    springJump: 1860,
    maxSpeed: 430,
    platformHeight: 16,
    meterPixels: 10
  };

  const storage = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, String(value));
      } catch {
        /* private mode */
      }
    }
  };

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  const els = {
    startScreen: document.getElementById('startScreen'),
    pauseScreen: document.getElementById('pauseScreen'),
    overScreen: document.getElementById('overScreen'),
    bestStart: document.getElementById('bestStart'),
    heightValue: document.getElementById('heightValue'),
    starValue: document.getElementById('starValue'),
    playBtn: document.getElementById('playBtn'),
    tiltBtn: document.getElementById('tiltBtn'),
    tiltState: document.getElementById('tiltState'),
    tiltHint: document.getElementById('tiltHint'),
    helpBtn: document.getElementById('helpBtn'),
    instructions: document.getElementById('instructions'),
    soundBtnStart: document.getElementById('soundBtnStart'),
    soundState: document.getElementById('soundState'),
    hudSoundBtn: document.getElementById('hudSoundBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resumeBtn: document.getElementById('resumeBtn'),
    restartBtn: document.getElementById('restartBtn'),
    homeBtn: document.getElementById('homeBtn'),
    againBtn: document.getElementById('againBtn'),
    overHomeBtn: document.getElementById('overHomeBtn'),
    overHeight: document.getElementById('overHeight'),
    overStars: document.getElementById('overStars'),
    bestResult: document.getElementById('bestResult'),
    newBestBadge: document.getElementById('newBestBadge'),
    overEyebrow: document.getElementById('overEyebrow'),
    toast: document.getElementById('toast'),
    playTip: document.getElementById('playTip'),
    touchControls: document.getElementById('touchControls')
  };

  const app = {
    mode: 'menu',
    time: 0,
    w: 0,
    h: 0,
    dpr: 1,
    needsRender: true,
    cameraY: 0,
    startY: 0,
    heightM: 0,
    stars: 0,
    best: Number(storage.get('jelly.best', 0)) || 0,
    newBest: false,
    tipShown: false,
    tipTimer: null,
    milestone: 100,
    shake: 0,
    flash: 0,
    platforms: [],
    starItems: [],
    particles: [],
    rings: [],
    popups: [],
    trail: [],
    trailTimer: 0,
    nextPlatformY: 0,
    lastPlatformX: 0,
    lastBounce: -10,
    bounceCombo: 0,
    hudHeight: -1,
    hudStars: -1,
    player: null,
    input: { keysLeft: false, keysRight: false, pads: new Map(), pointers: new Map() },
    tilt: {
      enabled: false,
      value: 0,
      target: 0,
      baseline: null,
      listening: false
    },
    soundOn: storage.get('jelly.sound', 'on') !== 'off',
    newBestTimer: null
  };

  const skyStars = Array.from({ length: 86 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: rand(0.5, 1.9),
    depth: rand(0.2, 1),
    twinkle: rand(0.6, 2.2),
    phase: rand(0, TAU),
    warm: Math.random() < 0.18
  }));

  const nebulae = Array.from({ length: 6 }, () => ({
    x: rand(0.02, 0.98),
    y: rand(0.04, 0.92),
    r: rand(0.18, 0.42),
    depth: rand(0.02, 0.1),
    alpha: rand(0.035, 0.085),
    color: Math.random() < 0.45 ? '123,247,208' : Math.random() < 0.5 ? '155,140,255' : '99,211,255'
  }));

  const menuOrbs = [
    { x: 0.13, y: 0.7, r: 0.055, speed: 0.36, phase: 1.2, color: 'rgba(123,247,208,0.14)' },
    { x: 0.85, y: 0.62, r: 0.07, speed: 0.28, phase: 3.4, color: 'rgba(99,211,255,0.13)' },
    { x: 0.74, y: 0.84, r: 0.042, speed: 0.44, phase: 5.1, color: 'rgba(255,147,117,0.12)' },
    { x: 0.2, y: 0.86, r: 0.034, speed: 0.5, phase: 2.2, color: 'rgba(255,209,102,0.11)' },
    { x: 0.52, y: 0.16, r: 0.03, speed: 0.32, phase: 4.6, color: 'rgba(155,140,255,0.12)' }
  ];

  const PALETTES = [
    { top: [7, 10, 28], mid: [27, 21, 63], bottom: [76, 33, 96], glow: [255, 126, 166] },
    { top: [9, 16, 47], mid: [48, 29, 94], bottom: [133, 50, 112], glow: [255, 150, 130] },
    { top: [25, 14, 64], mid: [92, 32, 106], bottom: [199, 78, 104], glow: [255, 182, 120] },
    { top: [48, 18, 78], mid: [141, 44, 102], bottom: [241, 121, 98], glow: [255, 220, 158] }
  ];

  const PLATFORM_STYLE = {
    normal: { a: '#bcffef', b: '#2fc6ad', glow: 'rgba(75,240,204,0.55)' },
    moving: { a: '#e5d9ff', b: '#7a5cff', glow: 'rgba(155,120,255,0.55)' },
    spring: { a: '#fff3ba', b: '#ffae1f', glow: 'rgba(255,200,80,0.7)' },
    fragile: { a: '#ffd7cc', b: '#ff7767', glow: 'rgba(255,135,115,0.55)' }
  };

  /* ---------------------------------------------------------------- audio */

  const AudioKit = {
    ctx: null,
    master: null,
    on: true,
    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.55;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    },
    tone(freq, type, duration, volume, slide = 0, delay = 0) {
      if (!this.on || !this.ctx) return;
      const start = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), start + duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(start);
      osc.stop(start + duration + 0.04);
    },
    bounce(step = 0) {
      const freq = 330 * Math.pow(2, Math.min(step, 14) / 12);
      this.tone(freq, 'triangle', 0.17, 0.16, -55);
      this.tone(freq * 2, 'sine', 0.1, 0.055);
    },
    spring() {
      [523, 659, 784, 1046].forEach((freq, i) => this.tone(freq, 'triangle', 0.18, 0.1, 0, i * 0.045));
    },
    star() {
      [880, 1174, 1568].forEach((freq, i) => this.tone(freq, 'sine', 0.2, 0.085, 0, i * 0.04));
    },
    milestone() {
      [659, 880, 1318].forEach((freq, i) => this.tone(freq, 'sine', 0.28, 0.09, 0, i * 0.08));
    },
    click() {
      this.tone(540, 'sine', 0.075, 0.07);
      this.tone(760, 'sine', 0.06, 0.035, 0, 0.02);
    },
    over() {
      [440, 349, 262, 196].forEach((freq, i) => this.tone(freq, 'sine', 0.32, 0.11, 0, i * 0.1));
    },
    best() {
      [523, 659, 784, 1046, 1318].forEach((freq, i) => this.tone(freq, 'triangle', 0.3, 0.09, 0, i * 0.09));
    }
  };

  AudioKit.on = app.soundOn;

  /* --------------------------------------------------------------- helpers */

  function mixColor(a, b, t) {
    return a.map((value, index) => Math.round(value + (b[index] - value) * t));
  }

  function paletteAt(altitude) {
    const t = clamp(altitude, 0, 1) * (PALETTES.length - 1);
    const index = Math.min(Math.floor(t), PALETTES.length - 2);
    const f = t - index;
    const a = PALETTES[index];
    const b = PALETTES[index + 1];
    return {
      top: mixColor(a.top, b.top, f),
      mid: mixColor(a.mid, b.mid, f),
      bottom: mixColor(a.bottom, b.bottom, f),
      glow: mixColor(a.glow, b.glow, f)
    };
  }

  function rgb(c) {
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  function rgba(c, a) {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function starPath(cx, cy, outer, inner, points = 5, rotation = -Math.PI / 2) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = rotation + (i * Math.PI) / points;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('is-visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove('is-visible'), 2600);
  }

  function setScreen(name) {
    [els.startScreen, els.pauseScreen, els.overScreen].forEach((screen) => {
      screen.classList.toggle('is-active', screen.id === name);
    });
  }

  function setState(state) {
    app.mode = state;
    document.body.dataset.state = state;
  }

  /* --------------------------------------------------------------- physics */

  function resetRun() {
    const w = app.w;
    const h = app.h;
    const size = clamp(w * 0.135, 52, 86);
    const platformWidth = clamp(w * 0.35, 118, 190);
    const startPlatformY = size * 0.47;

    app.player = {
      x: w / 2,
      y: 0,
      vx: 0,
      vy: -680,
      w: size,
      h: size * 0.94,
      sx: 1,
      sy: 1,
      maxSpeed: clamp(w * 0.95, 340, 520)
    };
    app.startY = 0;
    app.cameraY = -h * 0.63;
    app.heightM = 0;
    app.stars = 0;
    app.shake = 0;
    app.flash = 0;
    app.milestone = 100;
    app.lastBounce = -10;
    app.bounceCombo = 0;
    app.hudHeight = -1;
    app.hudStars = -1;
    app.platforms = [];
    app.starItems = [];
    app.particles = [];
    app.rings = [];
    app.popups = [];
    app.trail = [];
    app.trailTimer = 0;
    app.tilt.value = 0;
    app.tilt.target = 0;
    app.tilt.baseline = null;

    app.platforms.push({
      x: w / 2,
      y: startPlatformY,
      w: platformWidth,
      h: CFG.platformHeight,
      type: 'normal',
      vx: 0,
      alpha: 1,
      dead: false,
      phase: Math.random() * TAU
    });
    app.lastPlatformX = w / 2;
    app.nextPlatformY = startPlatformY - rand(150, 185);
    ensurePlatforms();
    updateHud();
  }

  function gapForHeight() {
    const difficulty = clamp(app.heightM / 900, 0, 1);
    return rand(138, 178) + difficulty * 54;
  }

  function ensurePlatforms() {
    let guard = 0;
    while (app.nextPlatformY > app.cameraY - app.h * 0.42 && guard < 40) {
      spawnPlatform(app.nextPlatformY);
      app.nextPlatformY -= gapForHeight();
      guard++;
    }
  }

  function spawnPlatform(y) {
    const w = app.w;
    const platformWidth = clamp(w * 0.21, 78, 132);
    const maxStep = Math.min(w * 0.42, 270);
    let x = app.lastPlatformX + rand(-maxStep, maxStep);
    const margin = platformWidth / 2 + 12;
    x = clamp(x, margin, w - margin);

    const roll = Math.random();
    let type = 'normal';
    if (app.heightM > 300 && roll < 0.09) type = 'spring';
    else if (app.heightM > 700 && roll < 0.2) type = 'fragile';
    else if (app.heightM > 140 && roll < 0.36) type = 'moving';

    const platform = {
      x,
      y,
      w: platformWidth,
      h: CFG.platformHeight,
      type,
      vx: type === 'moving' ? rand(38, 78) * (Math.random() < 0.5 ? -1 : 1) : 0,
      alpha: 1,
      dead: false,
      phase: Math.random() * TAU
    };
    app.platforms.push(platform);
    app.lastPlatformX = x;

    if (Math.random() < 0.42) {
      app.starItems.push({
        x: x + rand(-platformWidth * 0.26, platformWidth * 0.26),
        y: y - rand(46, 66),
        r: clamp(w * 0.021, 9, 14),
        phase: Math.random() * TAU,
        taken: false
      });
    }
  }

  function land(platform) {
    const spring = platform.type === 'spring';
    const player = app.player;
    player.y = platform.y - player.h / 2;
    player.vy = spring ? -CFG.springJump : -CFG.jump;
    player.sx = spring ? 1.34 : 1.24;
    player.sy = spring ? 0.68 : 0.74;

    if (app.time - app.lastBounce < 1.5) app.bounceCombo = Math.min(app.bounceCombo + 1, 14);
    else app.bounceCombo = 0;
    app.lastBounce = app.time;

    const color = spring ? '255,209,102' : '123,247,208';
    burst(player.x, platform.y, color, spring ? 18 : 10, spring ? 260 : 170);

    app.rings.push({
      x: player.x,
      y: platform.y,
      life: 0,
      max: 0.55,
      radius: platform.w * 0.2,
      color: spring ? '255,209,102' : '123,247,208'
    });

    if (spring) {
      app.shake = Math.max(app.shake, REDUCED ? 2 : 9);
      app.flash = 0.35;
      AudioKit.spring();
    } else {
      AudioKit.bounce(app.bounceCombo);
    }

    if (platform.type === 'fragile') {
      platform.dead = true;
      burst(platform.x, platform.y + platform.h / 2, '255,135,115', 14, 190);
    }
  }

  function burst(x, y, color, count, speed) {
    const total = REDUCED ? Math.ceil(count * 0.4) : count;
    for (let i = 0; i < total; i++) {
      const angle = rand(0, TAU);
      const magnitude = rand(speed * 0.25, speed);
      app.particles.push({
        x,
        y,
        vx: Math.cos(angle) * magnitude,
        vy: Math.sin(angle) * magnitude - speed * 0.28,
        life: rand(0.28, 0.65),
        max: 0.65,
        size: rand(1.5, 4),
        color,
        gravity: rand(360, 680)
      });
    }
  }

  function popup(text, x, y, color, big = false) {
    app.popups.push({ text, x, y, color, big, life: 0, max: big ? 1.3 : 0.9 });
  }

  /* ---------------------------------------------------------------- update */

  function steerInput() {
    let direction = 0;
    if (app.input.keysLeft) direction -= 1;
    if (app.input.keysRight) direction += 1;
    for (const dir of app.input.pads.values()) direction += dir;
    for (const dir of app.input.pointers.values()) direction += dir;
    return clamp(direction, -1, 1);
  }

  function updateTilt(dt) {
    const easing = 1 - Math.exp(-dt * 13);
    app.tilt.value = lerp(app.tilt.value, app.tilt.target, easing);
  }

  function updateGame(dt) {
    const player = app.player;
    if (!player) return;

    updateTilt(dt);

    const direct = steerInput();
    const tilt = app.tilt.enabled ? app.tilt.value : 0;
    const targetSpeed = clamp(direct + tilt, -1, 1) * player.maxSpeed;
    const response = 1 - Math.exp(-dt * 11);
    player.vx = lerp(player.vx, targetSpeed, response);

    const prevY = player.y;
    player.vy += CFG.gravity * dt;
    player.y += player.vy * dt;
    player.x += player.vx * dt;

    const half = player.w / 2;
    if (player.x < half) {
      player.x = half;
      if (player.vx < 0) player.vx *= -0.22;
    } else if (player.x > app.w - half) {
      player.x = app.w - half;
      if (player.vx > 0) player.vx *= -0.22;
    }

    for (const platform of app.platforms) {
      if (platform.type !== 'moving' || platform.dead) continue;
      platform.x += platform.vx * dt;
      const margin = platform.w / 2 + 10;
      if (platform.x < margin) {
        platform.x = margin;
        platform.vx = Math.abs(platform.vx);
      } else if (platform.x > app.w - margin) {
        platform.x = app.w - margin;
        platform.vx = -Math.abs(platform.vx);
      }
    }

    const prevBottom = prevY + player.h / 2;
    const bottom = player.y + player.h / 2;
    if (player.vy > 0) {
      for (const platform of app.platforms) {
        if (platform.dead) continue;
        if (prevBottom > platform.y + 3) continue;
        if (bottom < platform.y) continue;
        if (Math.abs(player.x - platform.x) > platform.w / 2 + player.w / 2 - 9) continue;
        land(platform);
        break;
      }
    }

    const targetCamera = player.y - app.h * 0.63;
    if (targetCamera < app.cameraY) {
      app.cameraY += (targetCamera - app.cameraY) * (1 - Math.exp(-dt * 7.5));
    }

    const climbed = (app.startY - player.y) / CFG.meterPixels;
    if (climbed > app.heightM) app.heightM = climbed;
    if (app.heightM >= app.milestone) {
      popup(`${app.milestone}m`, player.x, player.y - 90, '#d8fff5', true);
      AudioKit.milestone();
      app.milestone += 100;
    }

    for (const item of app.starItems) {
      if (item.taken) continue;
      const dx = item.x - player.x;
      const dy = item.y - player.y;
      const threshold = player.w * 0.58 + item.r + 4;
      if (dx * dx + dy * dy < threshold * threshold) {
        item.taken = true;
        app.stars++;
        player.sx = 1.16;
        player.sy = 0.84;
        burst(item.x, item.y, '255,209,102', 16, 230);
        popup('+1 star', item.x, item.y - 10, '#ffe39c', false);
        AudioKit.star();
      }
    }

    app.trailTimer -= dt;
    if (app.trailTimer <= 0 && (Math.abs(player.vx) > 30 || Math.abs(player.vy) > 260)) {
      app.trailTimer = 0.05;
      app.trail.push({ x: player.x, y: player.y, life: 0.32, max: 0.32 });
    }
    for (let i = app.trail.length - 1; i >= 0; i--) {
      app.trail[i].life -= dt;
      if (app.trail[i].life <= 0) app.trail.splice(i, 1);
    }

    for (const platform of app.platforms) {
      if (platform.dead && platform.alpha > 0) platform.alpha = Math.max(0, platform.alpha - dt * 2.4);
    }

    app.platforms = app.platforms.filter((p) => p.y < app.cameraY + app.h + 320 && !(p.dead && p.alpha <= 0));
    app.starItems = app.starItems.filter((s) => !s.taken && s.y < app.cameraY + app.h + 200);
    ensurePlatforms();

    updateEffects(dt);

    app.shake *= Math.exp(-dt * 5.5);
    if (app.shake < 0.15) app.shake = 0;
    app.flash = Math.max(0, app.flash - dt * 1.8);

    const playerScreenY = player.y - app.cameraY;
    if (playerScreenY > app.h + player.h * 0.75) endRun();

    updateHud();
  }

  function updateEffects(dt) {
    for (let i = app.particles.length - 1; i >= 0; i--) {
      const particle = app.particles[i];
      particle.life -= dt;
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.life <= 0) app.particles.splice(i, 1);
    }
    for (let i = app.rings.length - 1; i >= 0; i--) {
      const ring = app.rings[i];
      ring.life += dt;
      if (ring.life >= ring.max) app.rings.splice(i, 1);
    }
    for (let i = app.popups.length - 1; i >= 0; i--) {
      const item = app.popups[i];
      item.life += dt;
      if (item.life >= item.max) app.popups.splice(i, 1);
    }
  }

  function updateHud() {
    const height = Math.floor(app.heightM);
    if (height !== app.hudHeight) {
      app.hudHeight = height;
      els.heightValue.textContent = String(height);
    }
    if (app.stars !== app.hudStars) {
      app.hudStars = app.stars;
      els.starValue.textContent = String(app.stars);
    }
  }

  /* ---------------------------------------------------------------- render */

  function drawBackground(altitude) {
    const { w, h } = app;
    const palette = paletteAt(altitude);
    const camera = app.mode === 'menu' ? -app.time * 7 : app.cameraY;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, rgb(palette.top));
    gradient.addColorStop(0.56, rgb(palette.mid));
    gradient.addColorStop(1, rgb(palette.bottom));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    const horizon = ctx.createRadialGradient(w * 0.5, h * 0.72, 0, w * 0.5, h * 0.72, Math.max(w, h) * 0.78);
    horizon.addColorStop(0, rgba(palette.glow, 0.24));
    horizon.addColorStop(0.5, rgba(palette.glow, 0.07));
    horizon.addColorStop(1, rgba(palette.glow, 0));
    ctx.fillStyle = horizon;
    ctx.fillRect(0, 0, w, h);

    for (const star of skyStars) {
      const parallax = 0.025 + star.depth * 0.065;
      let y = (star.y * h + -camera * parallax) % h;
      if (y < 0) y += h;
      const alpha = 0.26 + 0.6 * (0.5 + 0.5 * Math.sin(app.time * star.twinkle + star.phase));
      ctx.fillStyle = star.warm ? `rgba(255,224,190,${alpha})` : `rgba(222,240,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x * w, y, star.r, 0, TAU);
      ctx.fill();
    }

    for (const nebula of nebulae) {
      const parallax = 0.03 + nebula.depth;
      let y = (nebula.y * h + -camera * parallax) % (h * 1.4);
      if (y < -h * 0.3) y += h * 1.4;
      const radius = Math.min(w, h) * nebula.r;
      const blob = ctx.createRadialGradient(nebula.x * w, y, 0, nebula.x * w, y, radius);
      blob.addColorStop(0, `rgba(${nebula.color},${nebula.alpha})`);
      blob.addColorStop(0.55, `rgba(${nebula.color},${nebula.alpha * 0.45})`);
      blob.addColorStop(1, `rgba(${nebula.color},0)`);
      ctx.fillStyle = blob;
      ctx.beginPath();
      ctx.arc(nebula.x * w, y, radius, 0, TAU);
      ctx.fill();
    }

    drawMoon(palette);
  }

  function drawMoon(palette) {
    const { w, h } = app;
    const radius = clamp(Math.min(w, h) * 0.075, 26, 58);
    const x = w * 0.79;
    const drift = app.mode === 'menu' ? 0 : clamp(-app.cameraY * 0.002, 0, 26);
    const y = h * 0.17 + drift + Math.sin(app.time * 0.06) * 4;

    const halo = ctx.createRadialGradient(x, y, radius * 0.4, x, y, radius * 3.4);
    halo.addColorStop(0, rgba(palette.glow, 0.16));
    halo.addColorStop(0.45, rgba(palette.glow, 0.05));
    halo.addColorStop(1, rgba(palette.glow, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, radius * 3.4, 0, TAU);
    ctx.fill();

    const disc = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.35, radius * 0.1, x, y, radius);
    disc.addColorStop(0, '#fff8e9');
    disc.addColorStop(0.6, '#ffe9cd');
    disc.addColorStop(1, '#f3c9a5');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();

    ctx.fillStyle = 'rgba(184,132,112,0.16)';
    const craters = [
      [-0.28, -0.16, 0.2],
      [0.18, 0.06, 0.28],
      [0.04, 0.38, 0.14],
      [-0.42, 0.3, 0.11],
      [0.34, -0.34, 0.12]
    ];
    for (const crater of craters) {
      ctx.beginPath();
      ctx.arc(x + crater[0] * radius, y + crater[1] * radius, crater[2] * radius, 0, TAU);
      ctx.fill();
    }
  }

  function drawMenuScene() {
    const { w, h } = app;
    for (const orb of menuOrbs) {
      const x = orb.x * w + Math.sin(app.time * orb.speed + orb.phase) * 16;
      const y = orb.y * h + Math.cos(app.time * orb.speed * 0.8 + orb.phase) * 20;
      const radius = Math.min(w, h) * orb.r * (1 + Math.sin(app.time * 0.7 + orb.phase) * 0.04);
      const glow = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
      glow.addColorStop(0, orb.color.replace(/[\d.]+\)$/, '0.3)'));
      glow.addColorStop(0.55, orb.color);
      glow.addColorStop(1, orb.color.replace(/[\d.]+\)$/, '0)'));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fill();
    }

    ctx.save();
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 3; i++) {
      const x = [0.12, 0.78, 0.46][i] * w + Math.sin(app.time * 0.25 + i) * 8;
      const y = [0.9, 0.82, 0.94][i] * h;
      const pw = clamp(w * 0.2, 74, 120);
      const g = ctx.createLinearGradient(0, y, 0, y + 12);
      g.addColorStop(0, '#b6ffec');
      g.addColorStop(1, '#2fc7ad');
      ctx.fillStyle = g;
      roundRect(x - pw / 2, y, pw, 12, 6);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlatform(platform) {
    const screenY = platform.y - app.cameraY;
    if (screenY < -60 || screenY > app.h + 80) return;
    const style = PLATFORM_STYLE[platform.type] || PLATFORM_STYLE.normal;
    const x = platform.x - platform.w / 2;
    const h = platform.h;
    const r = h / 2;

    ctx.save();
    ctx.globalAlpha = platform.alpha;
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = 16;
    const gradient = ctx.createLinearGradient(0, screenY, 0, screenY + h);
    gradient.addColorStop(0, style.a);
    gradient.addColorStop(1, style.b);
    ctx.fillStyle = gradient;
    roundRect(x, screenY, platform.w, h, r);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.52)';
    roundRect(x + h * 0.6, screenY + 2.5, platform.w - h * 1.2, 2.6, 1.3);
    ctx.fill();

    if (platform.type === 'moving') {
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.beginPath();
      ctx.arc(x + h * 0.9, screenY + h / 2, 1.8, 0, TAU);
      ctx.arc(x + platform.w - h * 0.9, screenY + h / 2, 1.8, 0, TAU);
      ctx.fill();
    } else if (platform.type === 'spring') {
      ctx.fillStyle = 'rgba(70,38,0,0.42)';
      ctx.beginPath();
      ctx.moveTo(platform.x, screenY + 3.5);
      ctx.lineTo(platform.x + 7, screenY + h - 4);
      ctx.lineTo(platform.x - 7, screenY + h - 4);
      ctx.closePath();
      ctx.fill();
    } else if (platform.type === 'fragile') {
      ctx.strokeStyle = 'rgba(90,24,30,0.28)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(platform.x - platform.w * 0.25, screenY + 3);
      ctx.lineTo(platform.x - platform.w * 0.16, screenY + 8);
      ctx.lineTo(platform.x - platform.w * 0.23, screenY + 12);
      ctx.moveTo(platform.x + platform.w * 0.2, screenY + 3);
      ctx.lineTo(platform.x + platform.w * 0.12, screenY + 9);
      ctx.lineTo(platform.x + platform.w * 0.18, screenY + 13);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawStarItem(item) {
    const screenY = item.y - app.cameraY + Math.sin(app.time * 2.2 + item.phase) * 3;
    if (screenY < -40 || screenY > app.h + 40) return;
    ctx.save();
    ctx.translate(item.x, screenY);
    ctx.rotate(Math.sin(app.time * 1.2 + item.phase) * 0.18 - 0.1);
    ctx.shadowColor = 'rgba(255,209,102,0.85)';
    ctx.shadowBlur = 18;
    const gradient = ctx.createLinearGradient(0, -item.r, 0, item.r);
    gradient.addColorStop(0, '#fff6cf');
    gradient.addColorStop(1, '#ffc74f');
    ctx.fillStyle = gradient;
    starPath(0, 0, item.r, item.r * 0.46);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(-item.r * 0.16, -item.r * 0.28, item.r * 0.14, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawRings() {
    for (const ring of app.rings) {
      const progress = ring.life / ring.max;
      const alpha = (1 - progress) * 0.5;
      const radius = ring.radius + progress * 125;
      ctx.strokeStyle = `rgba(${ring.color},${alpha})`;
      ctx.lineWidth = Math.max(1.2, 3 * (1 - progress));
      ctx.beginPath();
      ctx.ellipse(ring.x, ring.y - app.cameraY, radius, radius * 0.32, 0, 0, TAU);
      ctx.stroke();
    }
  }

  function drawParticles() {
    for (const particle of app.particles) {
      const alpha = clamp(particle.life / particle.max, 0, 1);
      ctx.fillStyle = `rgba(${particle.color},${alpha})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y - app.cameraY, particle.size * (0.5 + alpha * 0.6), 0, TAU);
      ctx.fill();
    }
  }

  function drawTrail() {
    for (const ghost of app.trail) {
      const alpha = (ghost.life / ghost.max) * 0.1;
      const radius = app.player.w * (0.18 + (ghost.life / ghost.max) * 0.1);
      ctx.fillStyle = `rgba(123,247,208,${alpha})`;
      ctx.beginPath();
      ctx.arc(ghost.x, ghost.y - app.cameraY, radius, 0, TAU);
      ctx.fill();
    }
  }

  function drawPlayer() {
    const player = app.player;
    if (!player) return;
    const screenY = player.y - app.cameraY;
    const w = player.w;
    const h = player.h;
    const blink = app.time % 4.4 < 0.12;

    ctx.save();
    ctx.translate(player.x, screenY);
    ctx.rotate(clamp(player.vx / 4200, -0.08, 0.08));
    ctx.scale(player.sx, player.sy);

    ctx.shadowColor = 'rgba(99,211,255,0.6)';
    ctx.shadowBlur = 26;
    const body = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    body.addColorStop(0, '#c8fff4');
    body.addColorStop(0.42, '#67dcff');
    body.addColorStop(1, '#6577ff');
    ctx.fillStyle = body;
    roundRect(-w / 2, -h / 2, w, h, w * 0.36);
    ctx.fill();
    ctx.shadowBlur = 0;

    const shine = ctx.createRadialGradient(-w * 0.2, -h * 0.26, 0, -w * 0.2, -h * 0.26, w * 0.34);
    shine.addColorStop(0, 'rgba(255,255,255,0.55)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.ellipse(-w * 0.18, -h * 0.23, w * 0.26, h * 0.16, -0.4, 0, TAU);
    ctx.fill();

    const eyeY = -h * 0.1;
    const eyeX = w * 0.2;
    const pupilShift = clamp(player.vx / 900, -1, 1) * w * 0.032;
    const tiltShift = app.tilt.enabled ? app.tilt.value * w * 0.028 : 0;

    if (blink) {
      ctx.strokeStyle = '#0a1736';
      ctx.lineWidth = Math.max(1.5, w * 0.032);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-eyeX - w * 0.055, eyeY);
      ctx.lineTo(-eyeX + w * 0.055, eyeY);
      ctx.moveTo(eyeX - w * 0.055, eyeY);
      ctx.lineTo(eyeX + w * 0.055, eyeY);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#0a1736';
      ctx.beginPath();
      ctx.arc(-eyeX, eyeY, w * 0.052, 0, TAU);
      ctx.arc(eyeX, eyeY, w * 0.052, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(-eyeX + pupilShift + tiltShift - w * 0.013, eyeY - w * 0.018, w * 0.018, 0, TAU);
      ctx.arc(eyeX + pupilShift + tiltShift - w * 0.013, eyeY - w * 0.018, w * 0.018, 0, TAU);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,130,150,0.34)';
    ctx.beginPath();
    ctx.ellipse(-w * 0.32, h * 0.055, w * 0.08, h * 0.045, 0, 0, TAU);
    ctx.ellipse(w * 0.32, h * 0.055, w * 0.08, h * 0.045, 0, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = '#0a1736';
    ctx.lineWidth = Math.max(1.4, w * 0.026);
    ctx.lineCap = 'round';
    if (player.vy < -520) {
      ctx.fillStyle = '#0a1736';
      ctx.beginPath();
      ctx.ellipse(0, h * 0.075, w * 0.05, h * 0.058, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, h * 0.045, w * 0.085, 0.18, Math.PI - 0.18);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(8,22,54,0.36)';
    ctx.font = `900 ${Math.round(w * 0.24)}px "Arial Black", "Trebuchet MS", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('J', 0, h * 0.29);

    ctx.restore();
  }

  function drawPopups() {
    for (const item of app.popups) {
      const progress = item.life / item.max;
      const alpha = progress < 0.15 ? progress / 0.15 : 1 - Math.max(0, (progress - 0.55) / 0.45);
      const rise = progress * (item.big ? 56 : 38);
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (item.big) {
        ctx.font = '900 clamp(30px, 8vw, 44px) "Arial Black", "Trebuchet MS", sans-serif';
        ctx.shadowColor = 'rgba(123,247,208,0.55)';
        ctx.shadowBlur = 24;
      } else {
        ctx.font = '800 15px ui-rounded, "Segoe UI", system-ui, sans-serif';
        ctx.shadowColor = 'rgba(255,209,102,0.5)';
        ctx.shadowBlur = 12;
      }
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, item.x, item.y - app.cameraY - rise);
      ctx.restore();
    }
  }

  function drawDanger() {
    if (app.mode !== 'playing' || !app.player) return;
    const screenY = app.player.y - app.cameraY;
    const start = app.h * 0.8;
    if (screenY < start) return;
    const intensity = clamp((screenY - start) / (app.h * 0.28), 0, 1);
    const pulse = 0.72 + Math.sin(app.time * 12) * 0.28;
    const gradient = ctx.createLinearGradient(0, app.h, 0, app.h * 0.45);
    gradient.addColorStop(0, `rgba(255,70,100,${0.34 * intensity * pulse})`);
    gradient.addColorStop(1, 'rgba(255,70,100,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, app.w, app.h);
  }

  function drawFlash() {
    if (app.flash <= 0) return;
    ctx.fillStyle = `rgba(255,246,210,${app.flash * 0.12})`;
    ctx.fillRect(0, 0, app.w, app.h);
  }

  function drawVignette() {
    const { w, h } = app;
    const gradient = ctx.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.26, w / 2, h * 0.5, Math.max(w, h) * 0.8);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(3,5,14,0.52)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  function render() {
    const { w, h } = app;
    ctx.setTransform(app.dpr, 0, 0, app.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const altitude = app.mode === 'menu' ? 0.1 + Math.sin(app.time * 0.07) * 0.05 : clamp(app.heightM / 700, 0, 1);
    drawBackground(altitude);

    if (app.mode === 'menu') {
      drawMenuScene();
      drawVignette();
      return;
    }

    ctx.save();
    if (app.shake > 0.2) {
      ctx.translate((Math.random() * 2 - 1) * app.shake, (Math.random() * 2 - 1) * app.shake);
    }

    for (const platform of app.platforms) drawPlatform(platform);
    for (const item of app.starItems) drawStarItem(item);
    drawRings();
    drawParticles();
    drawTrail();
    drawPlayer();
    drawPopups();
    ctx.restore();

    drawDanger();
    drawFlash();
    drawVignette();
  }

  /* ------------------------------------------------------------------ loop */

  let lastTime = performance.now();

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;

    if (app.mode !== 'paused') {
      app.time += dt;
      if (app.mode === 'playing') updateGame(dt);
      else if (app.mode === 'over') {
        updateEffects(dt);
        app.shake *= Math.exp(-dt * 5.5);
        if (app.shake < 0.15) app.shake = 0;
        app.flash = Math.max(0, app.flash - dt * 1.8);
      }
    }

    const live = app.mode === 'playing' || app.mode === 'over';
    if (live || app.needsRender) {
      render();
      app.needsRender = false;
    }
    requestAnimationFrame(frame);
  }

  /* --------------------------------------------------------------- screens */

  function hideTip() {
    if (app.tipTimer) {
      clearTimeout(app.tipTimer);
      app.tipTimer = null;
    }
    els.playTip.classList.remove('is-visible');
  }

  function showTip() {
    if (app.tipShown) return;
    app.tipShown = true;
    els.playTip.textContent = app.tilt.enabled
      ? 'Tilt or tap left / right to steer'
      : 'Tap left / right to steer';
    els.playTip.classList.add('is-visible');
    app.tipTimer = setTimeout(hideTip, 4200);
  }

  function startRun() {
    AudioKit.init();
    if (app.soundOn) AudioKit.click();
    if (app.newBestTimer) {
      clearTimeout(app.newBestTimer);
      app.newBestTimer = null;
    }
    resize();
    resetRun();
    setState('playing');
    setScreen(null);
    hideTip();
    els.instructions.hidden = true;
    els.tiltHint.hidden = true;
    if (app.tilt.enabled) {
      app.tilt.baseline = null;
      app.tilt.value = 0;
      app.tilt.target = 0;
    }
    showTip();
  }

  function pauseRun() {
    if (app.mode !== 'playing') return;
    hideTip();
    setState('paused');
    setScreen('pauseScreen');
    AudioKit.click();
  }

  function resumeRun() {
    if (app.mode !== 'paused') return;
    setState('playing');
    setScreen(null);
    AudioKit.click();
  }

  function goHome() {
    if (app.newBestTimer) {
      clearTimeout(app.newBestTimer);
      app.newBestTimer = null;
    }
    hideTip();
    setState('menu');
    setScreen('startScreen');
    app.needsRender = true;
    els.bestStart.textContent = String(Math.floor(app.best));
    AudioKit.click();
  }

  function endRun() {
    if (app.mode !== 'playing') return;
    hideTip();
    setState('over');
    AudioKit.over();
    app.shake = Math.max(app.shake, REDUCED ? 3 : 11);
    const height = Math.floor(app.heightM);
    app.newBest = height > app.best;
    if (app.newBest) {
      app.best = height;
      storage.set('jelly.best', height);
      els.bestStart.textContent = String(height);
      app.newBestTimer = setTimeout(() => AudioKit.best(), 420);
    }

    els.overHeight.textContent = String(height);
    els.overStars.textContent = String(app.stars);
    els.bestResult.textContent = `Best ${Math.floor(app.best)}m`;
    els.newBestBadge.hidden = !app.newBest;
    els.overEyebrow.textContent = app.newBest ? 'Personal record' : 'Run complete';
    setScreen('overScreen');
    updateHud();
  }

  /* ----------------------------------------------------------------- input */

  function updateTiltUi() {
    els.tiltBtn.classList.toggle('is-on', app.tilt.enabled);
    els.tiltBtn.setAttribute('aria-pressed', String(app.tilt.enabled));
    els.tiltState.textContent = app.tilt.enabled ? 'On' : 'Off';
  }

  function updateSoundUi() {
    document.body.classList.toggle('sound-off', !app.soundOn);
    els.soundState.textContent = app.soundOn ? 'Sound on' : 'Sound off';
    els.soundBtnStart.classList.toggle('is-on', app.soundOn);
    els.hudSoundBtn.setAttribute('aria-label', app.soundOn ? 'Mute sound' : 'Unmute sound');
  }

  function toggleSound() {
    app.soundOn = !app.soundOn;
    AudioKit.on = app.soundOn;
    storage.set('jelly.sound', app.soundOn ? 'on' : 'off');
    updateSoundUi();
    AudioKit.init();
    if (app.soundOn) AudioKit.click();
  }

  function orientationAxis(event) {
    const angle = (screen.orientation && typeof screen.orientation.angle === 'number')
      ? screen.orientation.angle
      : (typeof window.orientation === 'number' ? window.orientation : 0);
    let value;
    if (angle === 90) value = event.beta;
    else if (angle === -90 || angle === 270) value = typeof event.beta === 'number' ? -event.beta : null;
    else if (angle === 180) value = typeof event.gamma === 'number' ? -event.gamma : null;
    else value = event.gamma;
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  function onOrientation(event) {
    if (!app.tilt.enabled) return;
    const value = orientationAxis(event);
    if (value === null) return;
    if (app.tilt.baseline === null) app.tilt.baseline = value;
    const delta = value - app.tilt.baseline;
    const deadzone = 2.4;
    if (Math.abs(delta) <= deadzone) {
      app.tilt.target = 0;
      return;
    }
    const magnitude = clamp((Math.abs(delta) - deadzone) / 20, 0, 1);
    app.tilt.target = magnitude * Math.sign(delta);
  }

  async function enableTilt(fromGesture) {
    if (app.tilt.listening) return true;
    if (!window.DeviceOrientationEvent) {
      toast('This device does not report tilt.');
      return false;
    }

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      if (!fromGesture) return false;
      let permission;
      try {
        permission = await DeviceOrientationEvent.requestPermission();
      } catch {
        toast('Motion access needs a tap on a secure (https) page.');
        return false;
      }
      if (permission !== 'granted') {
        toast('Motion access was not allowed. Touch controls are ready.');
        return false;
      }
    }

    app.tilt.enabled = true;
    app.tilt.baseline = null;
    app.tilt.value = 0;
    app.tilt.target = 0;
    window.addEventListener('deviceorientation', onOrientation, true);
    app.tilt.listening = true;
    storage.set('jelly.tilt', '1');
    updateTiltUi();
    return true;
  }

  function disableTilt() {
    app.tilt.enabled = false;
    app.tilt.value = 0;
    app.tilt.target = 0;
    app.tilt.baseline = null;
    if (app.tilt.listening) {
      window.removeEventListener('deviceorientation', onOrientation, true);
      app.tilt.listening = false;
    }
    storage.set('jelly.tilt', '0');
    updateTiltUi();
  }

  async function toggleTilt() {
    AudioKit.init();
    AudioKit.click();
    if (app.tilt.enabled) {
      disableTilt();
      toast('Tilt steering off. Touch controls stay active.');
      return;
    }
    const enabled = await enableTilt(true);
    if (enabled) toast('Tilt steering on. Hold your device naturally to calibrate.');
  }

  function bindPads() {
    const pads = Array.from(els.touchControls.querySelectorAll('.pad'));
    for (const pad of pads) {
      const direction = Number(pad.dataset.dir);
      const release = (event) => {
        app.input.pads.delete(event.pointerId);
        pad.classList.remove('active');
      };
      pad.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        AudioKit.init();
        app.input.pads.set(event.pointerId, direction);
        pad.classList.add('active');
        try {
          pad.setPointerCapture(event.pointerId);
        } catch {
          /* ignore */
        }
      });
      pad.addEventListener('pointerup', release);
      pad.addEventListener('pointercancel', release);
      pad.addEventListener('lostpointercapture', release);
    }
  }

  function bindCanvasSteering() {
    canvas.addEventListener('pointerdown', (event) => {
      if (app.mode !== 'playing') return;
      event.preventDefault();
      AudioKit.init();
      app.input.pointers.set(event.pointerId, event.clientX < app.w / 2 ? -1 : 1);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!app.input.pointers.has(event.pointerId)) return;
      app.input.pointers.set(event.pointerId, event.clientX < app.w / 2 ? -1 : 1);
    });
    const release = (event) => app.input.pointers.delete(event.pointerId);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', () => {
      app.input.pointers.clear();
      app.input.pads.clear();
    });
  }

  function bindKeys() {
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (key === 'escape' || key === 'p') {
        if (app.mode === 'playing') {
          event.preventDefault();
          pauseRun();
        } else if (app.mode === 'paused') {
          event.preventDefault();
          resumeRun();
        }
        return;
      }
      if (key === 'arrowleft' || key === 'a') {
        app.input.keysLeft = true;
        if (app.mode === 'playing') event.preventDefault();
      } else if (key === 'arrowright' || key === 'd') {
        app.input.keysRight = true;
        if (app.mode === 'playing') event.preventDefault();
      } else if ((key === 'enter' || key === ' ') && event.target === document.body) {
        if (app.mode === 'menu') {
          event.preventDefault();
          startRun();
        } else if (app.mode === 'over') {
          event.preventDefault();
          startRun();
        }
      }
    });
    window.addEventListener('keyup', (event) => {
      const key = event.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') app.input.keysLeft = false;
      if (key === 'arrowright' || key === 'd') app.input.keysRight = false;
    });
    window.addEventListener('blur', () => {
      app.input.keysLeft = false;
      app.input.keysRight = false;
    });
  }

  function bindUi() {
    els.playBtn.addEventListener('click', startRun);
    els.againBtn.addEventListener('click', startRun);
    els.restartBtn.addEventListener('click', startRun);
    els.resumeBtn.addEventListener('click', resumeRun);
    els.homeBtn.addEventListener('click', goHome);
    els.overHomeBtn.addEventListener('click', goHome);
    els.pauseBtn.addEventListener('click', () => {
      if (app.mode === 'playing') pauseRun();
    });
    els.soundBtnStart.addEventListener('click', toggleSound);
    els.hudSoundBtn.addEventListener('click', toggleSound);
    els.tiltBtn.addEventListener('click', toggleTilt);
    els.helpBtn.addEventListener('click', () => {
      const willShow = els.instructions.hidden;
      els.instructions.hidden = !willShow;
      els.helpBtn.textContent = willShow ? 'Hide help' : 'How to play';
      els.helpBtn.setAttribute('aria-expanded', String(willShow));
      if (willShow) els.tiltHint.hidden = true;
      AudioKit.click();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && app.mode === 'playing') pauseRun();
    });
  }

  /* ------------------------------------------------------------------ boot */

  function resize() {
    app.w = Math.max(1, window.innerWidth);
    app.h = Math.max(1, window.innerHeight);
    const pixelBudget = Math.sqrt(2200000 / (app.w * app.h));
    app.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, pixelBudget, 2.2));
    canvas.width = Math.round(app.w * app.dpr);
    canvas.height = Math.round(app.h * app.dpr);
    canvas.style.width = `${app.w}px`;
    canvas.style.height = `${app.h}px`;
    ctx.setTransform(app.dpr, 0, 0, app.dpr, 0, 0);

    if (app.player) {
      app.player.x = clamp(app.player.x, app.player.w / 2, app.w - app.player.w / 2);
      app.player.maxSpeed = clamp(app.w * 0.95, 340, 520);
    }
    if (app.mode === 'playing') {
      app.cameraY = Math.min(app.cameraY, app.player.y - app.h * 0.63);
      ensurePlatforms();
    }
    app.needsRender = true;
  }

  function boot() {
    resize();
    bindUi();
    bindPads();
    bindCanvasSteering();
    bindKeys();
    updateHud();
    updateSoundUi();
    updateTiltUi();
    els.bestStart.textContent = String(Math.floor(app.best));

    if (storage.get('jelly.tilt', '0') === '1' && window.DeviceOrientationEvent && window.matchMedia('(pointer: coarse)').matches) {
      const needsGesture = typeof DeviceOrientationEvent.requestPermission === 'function';
      if (!needsGesture) {
        enableTilt(false).catch(() => {});
      } else {
        els.tiltHint.hidden = false;
      }
    }

    let resizeTimer = 0;
    const scheduleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 80);
    };
    window.addEventListener('resize', scheduleResize);
    window.addEventListener('orientationchange', scheduleResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleResize);

    requestAnimationFrame(frame);
  }

  boot();
})();
