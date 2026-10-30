/* Voxel Haven — a compact voxel survival world.
   Built with Three.js, procedural textures, and no external art assets. */
(function () {
  'use strict';

  const THREE = window.THREE;
  if (!THREE) {
    document.getElementById('boot').innerHTML = '<span>WebGL could not start.</span>';
    return;
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
  const rand = (a = 0, b = 1) => a + Math.random() * (b - a);

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── constants ────────────────────────────────────────────────────────────
  const WX = 80;
  const WY = 48;
  const WZ = 80;
  const CS = 16;
  const SEA = 11;
  const DAY_LENGTH = 600;
  const EYE = 1.62;
  const PW = 0.31;
  const PH = 1.78;

  const B = { AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, LOG: 5, LEAVES: 6, PLANKS: 7, COBBLE: 8, WATER: 9, COAL: 10, BEDROCK: 11, SNOW: 12 };

  const BLOCKS = {
    [B.GRASS]: { name: 'Grass Block', top: 0, bottom: 2, side: 1, hard: 0.8, drop: B.GRASS, color: 0x6fbf4a, particle: 0x6fbf4a },
    [B.DIRT]: { name: 'Dirt', top: 2, bottom: 2, side: 2, hard: 0.6, drop: B.DIRT, color: 0x795237, particle: 0x795237 },
    [B.STONE]: { name: 'Stone', top: 3, bottom: 3, side: 3, hard: 1.5, drop: B.STONE, color: 0x85898b, particle: 0x85898b },
    [B.SAND]: { name: 'Sand', top: 4, bottom: 4, side: 4, hard: 0.55, drop: B.SAND, color: 0xdfca8d, particle: 0xdfca8d },
    [B.LOG]: { name: 'Oak Log', top: 6, bottom: 6, side: 5, hard: 1.05, drop: B.LOG, color: 0x785335, particle: 0x785335 },
    [B.LEAVES]: { name: 'Oak Leaves', top: 7, bottom: 7, side: 7, hard: 0.33, drop: B.LEAVES, color: 0x3d8236, particle: 0x3d8236 },
    [B.PLANKS]: { name: 'Oak Planks', top: 8, bottom: 8, side: 8, hard: 0.85, drop: B.PLANKS, color: 0xb5854f, particle: 0xb5854f },
    [B.COBBLE]: { name: 'Cobblestone', top: 9, bottom: 9, side: 9, hard: 1.35, drop: B.COBBLE, color: 0x70736f, particle: 0x70736f },
    [B.WATER]: { name: 'Water', top: 11, bottom: 11, side: 11, hard: Infinity, drop: 0, color: 0x3589c7, liquid: true },
    [B.COAL]: { name: 'Coal Ore', top: 10, bottom: 10, side: 10, hard: 1.9, drop: B.STONE, color: 0x55585a, particle: 0x55585a },
    [B.BEDROCK]: { name: 'Bedrock', top: 12, bottom: 12, side: 12, hard: Infinity, drop: 0, color: 0x3d4140, particle: 0x3d4140 },
    [B.SNOW]: { name: 'Snow', top: 14, bottom: 14, side: 14, hard: 0.45, drop: B.DIRT, color: 0xdceff0, particle: 0xdceff0 }
  };

  const HOTBAR = [B.GRASS, B.DIRT, B.STONE, B.SAND, B.LOG, B.PLANKS, B.LEAVES, B.COBBLE];

  // ── tiny procedural audio ────────────────────────────────────────────────
  const audio = {
    ctx: null,
    master: null,
    windGain: null,
    noiseBuffer: null,
    enabled: true,
    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? 0.24 : 0;
        this.master.connect(this.ctx.destination);
        const len = Math.floor(this.ctx.sampleRate * 2.5);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          last = (last + 0.02 * w) / 1.02;
          data[i] = last * 2.2 + w * 0.25;
        }
        this.noiseBuffer = buf;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        this.windGain = this.ctx.createGain();
        this.windGain.gain.value = 0.012;
        src.connect(filter);
        filter.connect(this.windGain);
        this.windGain.connect(this.master);
        src.start();
      } catch (e) {
        this.ctx = null;
      }
    },
    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    },
    setEnabled(on) {
      this.enabled = on;
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(on ? 0.24 : 0.0001, this.ctx.currentTime, 0.04);
      }
    },
    ambience(nightness) {
      if (!this.windGain || !this.ctx) return;
      this.windGain.gain.setTargetAtTime(0.01 + nightness * 0.045, this.ctx.currentTime, 0.4);
    },
    tone(freq, dur, type, vol, slide) {
      if (!this.ctx || !this.enabled) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(24, freq + slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.08), t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.03);
    },
    noise(dur, vol, freq, q, type) {
      if (!this.ctx || !this.enabled || !this.noiseBuffer) return;
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filt = this.ctx.createBiquadFilter();
      filt.type = type || 'bandpass';
      filt.frequency.value = freq || 800;
      filt.Q.value = q == null ? 0.9 : q;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(Math.max(0.0002, vol || 0.07), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filt);
      filt.connect(g);
      g.connect(this.master);
      src.start(t);
      src.stop(t + dur + 0.02);
    },
    footstep() {
      this.noise(0.075, 0.035, rand(380, 680), 0.7, 'bandpass');
      this.tone(rand(68, 92), 0.075, 'triangle', 0.032, -20);
    },
    dig() {
      this.noise(0.045, 0.026, rand(1400, 2300), 1.2, 'bandpass');
    },
    breakBlock() {
      this.noise(0.19, 0.11, rand(420, 760), 0.8, 'bandpass');
      this.tone(108, 0.15, 'triangle', 0.06, -45);
    },
    place() {
      this.tone(168, 0.12, 'triangle', 0.07, -58);
      this.noise(0.055, 0.045, 700, 0.8, 'bandpass');
    },
    hurt() {
      this.tone(215, 0.25, 'sawtooth', 0.085, -125);
      this.noise(0.16, 0.08, 360, 0.7, 'lowpass');
    },
    eat() {
      this.noise(0.16, 0.06, 1800, 0.7, 'bandpass');
      this.tone(320, 0.1, 'sine', 0.045, 60);
    },
    swing() {
      this.noise(0.075, 0.045, 2600, 0.7, 'highpass');
    },
    hit() {
      this.tone(135, 0.1, 'square', 0.055, -40);
      this.noise(0.07, 0.05, 900, 0.8, 'bandpass');
    },
    zombie() {
      this.tone(rand(72, 105), rand(0.45, 0.8), 'sawtooth', 0.026, -18);
    },
    cue(up) {
      this.tone(up ? 392 : 196, 0.35, 'sine', 0.045, up ? 80 : -40);
      setTimeout(() => this.tone(up ? 523 : 147, 0.4, 'sine', 0.035, up ? 40 : -20), 130);
    }
  };

  // ── procedural texture atlas ─────────────────────────────────────────────
  const TILE = 64;
  const ATLAS = 256;
  let atlasTexture = null;
  let atlasTiles = [];
  let terrainMaterial = null;
  let waterMaterial = null;

  function tileCanvas(draw) {
    const c = document.createElement('canvas');
    c.width = TILE;
    c.height = TILE;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    draw(g, mulberry32(Math.floor(Math.random() * 2147483647)));
    return c;
  }

  function makeAtlas() {
    atlasTiles = [];
    const px = (g, x, y, w, h, color) => {
      g.fillStyle = color;
      g.fillRect(x * 4, y * 4, w * 4, h * 4);
    };
    const speck = (g, r, colors, count, y0, y1) => {
      const a = y0 == null ? 0 : y0;
      const b = y1 == null ? 16 : y1;
      for (let i = 0; i < count; i++) {
        px(g, Math.floor(r() * 16), a + Math.floor(r() * (b - a)), 1, 1, colors[Math.floor(r() * colors.length)]);
      }
    };

    atlasTiles[0] = tileCanvas((g, r) => {
      px(g, 0, 0, 16, 16, '#6fbf4a');
      speck(g, r, ['#78ca51', '#66b443', '#82d45a', '#5da93c', '#71c34b'], 150);
      for (let i = 0; i < 12; i++) {
        const x = Math.floor(r() * 15), y = Math.floor(r() * 14);
        px(g, x, y, 1, 2, r() > 0.5 ? '#8ade62' : '#4f9a35');
      }
    });
    atlasTiles[1] = tileCanvas((g, r) => {
      px(g, 0, 0, 16, 16, '#7b5438');
      speck(g, r, ['#865d3e', '#6d492f', '#906546', '#5d3f29'], 120);
      px(g, 0, 0, 16, 4, '#6fbf4a');
      speck(g, r, ['#78ca51', '#66b443', '#5da93c'], 55, 0, 3);
      for (let x = 0; x < 16; x++) {
        const edge = r();
        if (edge > 0.5) px(g, x, 3 + (edge > 0.82 ? 1 : 0), 1, 1, edge > 0.82 ? '#6fbf4a' : '#6b4730');
      }
      for (let i = 0; i < 7; i++) {
        px(g, Math.floor(r() * 16), 4 + Math.floor(r() * 3), 1, 1, '#6fbf4a');
      }
    });
    atlasTiles[2] = tileCanvas((g, r) => {
      px(g, 0, 0, 16, 16, '#7b5438');
      speck(g, r, ['#8a6040', '#6a462e', '#916846', '#5c3c27', '#825a3b'], 190);
      for (let i = 0; i < 9; i++) {
        px(g, Math.floor(r() * 16), Math.floor(r() * 16), 2, 1, r() > 0.5 ? '#603f28' : '#956b48');
      }
    });
    atlasTiles[3] = tileCanvas((g, r) => {
      px(g, 0, 0, 16, 16, '#85898b');
      speck(g, r, ['#909497', '#7a7e81', '#9ca0a2', '#6f7376', '#8b8f92'], 160);
      for (let i = 0; i < 5; i++) {
        let x = Math.floor(r() * 13) + 1, y = Math.floor(r() * 13) + 1;
        for (let j = 0; j < 3; j++) {
          px(g, x, y, 2, 1, '#676b6e');
          x += r() > 0.5 ? 2 : 1;
          y += r() > 0.6 ? 1 : 0;
          if (x > 14) x = 14;
        }
      }
    });
    atlasTiles[4] = tileCanvas((g, r) => {
      px(g, 0, 0, 16, 16, '#dfca8d');
      speck(g, r, ['#e8d59c', '#d4bc7c', '#eddca8', '#cbb472', '#e4cf93'], 150);
      for (let i = 0; i < 8; i++) px(g, Math.floor(r() * 15), Math.floor(r() * 16), 1, 1, '#bda466');
    });
    atlasTiles[5] = tileCanvas((g, r) => {
      px(g, 0, 0, 16, 16, '#6d4a2e');
      for (let x = 0; x < 16; x++) {
        const shade = Math.floor(r() * 24);
        px(g, x, 0, 1, 16, shade % 2 === 0 ? '#65442a' : '#734e31');
      }
      for (let i = 0; i < 8; i++) {
        px(g, Math.floor(r() * 16), Math.floor(r() * 12), 1, 2 + Math.floor(r() * 3), r() > 0.5 ? '#533621' : '#7d5535');
      }
      px(g, 4, 5, 2, 3, '#4b301e');
      px(g, 11, 10, 2, 2, '#4b301e');
    });
    atlasTiles[6] = tileCanvas((g, r) => {
      px(g, 0, 0, 16, 16, '#b38a52');
      g.strokeStyle = '#7b5932';
      g.lineWidth = 4;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.ellipse(32, 32, 6 + i * 6, 5 + i * 6, 0, 0, Math.PI * 2);
        g.stroke();
      }
      px(g, 7, 7, 2, 2, '#6e4e2b');
      speck(g, r, ['#c49a60', '#a87e49'], 40);
    });
    atlasTiles[7] = tileCanvas((g, r) => {
      px(g, 0, 0, 16, 16, '#3d7f35');
      speck(g, r, ['#34722e', '#478e3b', '#2c6527', '#529b42', '#3a7a31'], 210);
      for (let i = 0; i < 18; i++) {
        px(g, Math.floor(r() * 15), Math.floor(r() * 15), 2, 1, r() > 0.55 ? '#2a5e26' : '#5ca54a');
      }
    });
    atlasTiles[8] = tileCanvas((g, r) => {
      px(g, 0, 0, 16, 16, '#b5854f');
      for (let y = 0; y < 16; y += 4) {
        px(g, 0, y, 16, 1, '#8e6337');
        px(g, 0, y + 1, 16, 1, '#c29159');
        const seam = y === 0 || y === 8 ? 4 : 11;
        px(g, seam, y, 1, 4, '#7c5530');
      }
      speck(g, r, ['#bd8d55', '#a97a46', '#c99a62'], 70);
      for (let i = 0; i < 5; i++) px(g, Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, '#7c5530');
    });
    atlasTiles[9] = tileCanvas((g, r) => {
      px(g, 0, 0, 16, 16, '#676a66');
      const stones = [[0, 0, 6, 5], [6, 0, 5, 4], [11, 0, 5, 6], [0, 5, 4, 6], [4, 4, 6, 5], [10, 4, 6, 5], [0, 11, 5, 5], [5, 9, 6, 7], [11, 9, 5, 7]];
      for (const [x, y, w, h] of stones) {
        px(g, x + 1, y + 1, w - 2, h - 2, r() > 0.5 ? '#7d807b' : '#737670');
        px(g, x + 1, y + 1, w - 2, 1, '#92958f');
        px(g, x + 1, y + h - 2, w - 2, 1, '#575a56');
      }
      speck(g, r, ['#898c86', '#5d605c', '#80837d'], 80);
    });
    atlasTiles[10] = tileCanvas((g, r) => {
      px(g, 0, 0, 16, 16, '#85898b');
      speck(g, r, ['#909497', '#7a7e81', '#9ca0a2', '#6f7376'], 100);
      const spots = [[2, 2, 3, 3], [10, 3, 3, 2], [4, 9, 2, 3], [11, 10, 3, 3], [7, 12, 2, 2]];
      for (const [x, y, w, h] of spots) {
        px(g, x, y, w, h, '#303234');
        px(g, x, y, w - 1, 1, '#45484a');
        px(g, x + 1, y + 1, 1, 1, '#1c1e20');
      }
    });
    atlasTiles[11] = tileCanvas((g, r) => {
      px(g, 0, 0, 16, 16, '#2f7fc1');
      for (let y = 0; y < 16; y += 4) {
        px(g, 0, y, 16, 1, '#3b91d4');
        for (let i = 0; i < 5; i++) px(g, Math.floor(r() * 15), y + 1, 2, 1, '#4da3e0');
      }
      speck(g, r, ['#2b74b2', '#388acb', '#2470ad'], 55);
    });
    atlasTiles[12] = tileCanvas((g, r) => {
      px(g, 0, 0, 16, 16, '#3d4140');
      speck(g, r, ['#4b4f4e', '#333635', '#565a58', '#2a2d2c'], 150);
      for (let i = 0; i < 12; i++) px(g, Math.floor(r() * 15), Math.floor(r() * 15), 2, 2, r() > 0.5 ? '#2a2d2c' : '#5b5f5d');
    });
    atlasTiles[13] = tileCanvas((g, r) => {
      px(g, 0, 0, 16, 16, '#a95542');
      for (let y = 0; y < 16; y += 4) {
        px(g, 0, y, 16, 1, '#d8c7ad');
        const off = (y / 4) % 2 === 0 ? 0 : 4;
        for (let x = off; x < 16; x += 8) px(g, x, y, 1, 4, '#d8c7ad');
      }
      speck(g, r, ['#b45f4a', '#984936', '#bd6b55'], 50);
    });
    atlasTiles[14] = tileCanvas((g, r) => {
      px(g, 0, 0, 16, 16, '#e2f1f2');
      speck(g, r, ['#effafa', '#d3e6e8', '#ffffff', '#c6dde0'], 140);
      for (let i = 0; i < 6; i++) px(g, Math.floor(r() * 15), Math.floor(r() * 15), 2, 1, '#bcd8dc');
    });

    const atlas = document.createElement('canvas');
    atlas.width = ATLAS;
    atlas.height = ATLAS;
    const g = atlas.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let i = 0; i < 16; i++) {
      g.drawImage(atlasTiles[i], (i % 4) * TILE, Math.floor(i / 4) * TILE);
    }
    atlasTexture = new THREE.CanvasTexture(atlas);
    atlasTexture.magFilter = THREE.NearestFilter;
    atlasTexture.minFilter = THREE.NearestMipmapLinearFilter;
    atlasTexture.generateMipmaps = true;
    atlasTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    atlasTexture.colorSpace = THREE.SRGBColorSpace;
    atlasTexture.needsUpdate = true;

    terrainMaterial = new THREE.MeshLambertMaterial({ map: atlasTexture, vertexColors: true });
    waterMaterial = new THREE.MeshLambertMaterial({
      map: atlasTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }

  // ── world data & generation ──────────────────────────────────────────────
  let worldSeed = (Math.random() * 2000000000) | 0;
  let blocks = new Uint8Array(WX * WY * WZ);

  const idx = (x, y, z) => (y * WZ + z) * WX + x;

  function getBlock(x, y, z) {
    if (y < 0) return B.BEDROCK;
    if (y >= WY) return B.AIR;
    if (x < 0 || x >= WX || z < 0 || z >= WZ) return B.BEDROCK;
    return blocks[idx(x, y, z)];
  }

  function setRaw(x, y, z, type) {
    if (x < 0 || x >= WX || y < 0 || y >= WY || z < 0 || z >= WZ) return;
    blocks[idx(x, y, z)] = type;
  }

  function hash2(x, y, salt = 0) {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(worldSeed + salt * 7919, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function vnoise(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi, 1);
    const b = hash2(xi + 1, yi, 1);
    const c = hash2(xi, yi + 1, 1);
    const d = hash2(xi + 1, yi + 1, 1);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }

  function fbm(x, y, octaves) {
    let amp = 0.5;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += vnoise(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  }

  function terrainHeight(x, z) {
    const continent = fbm(x * 0.021 + 13.2, z * 0.021 - 4.7, 4);
    const hills = fbm(x * 0.058 - 2.1, z * 0.058 + 7.3, 3);
    const detail = fbm(x * 0.16 + 9.1, z * 0.16 - 3.2, 2);
    let h = 7.5 + continent * 12 + hills * 6.5 + detail * 2.2;
    const d = Math.hypot(x - 40, z - 40);
    const flat = smoothstep(0, 15, d);
    h = lerp(14.6, h, 0.12 + 0.88 * flat);
    const pd = Math.hypot(x - 23, z - 60);
    if (pd < 8.5) h -= (1 - pd / 8.5) * 6.8;
    const ridge = Math.max(0, fbm(x * 0.045 - 20, z * 0.045 + 30, 3) - 0.62);
    h += ridge * 18;
    return Math.floor(clamp(h, 2, WY - 10));
  }

  function generateWorld() {
    blocks = new Uint8Array(WX * WY * WZ);
    for (let x = 0; x < WX; x++) {
      for (let z = 0; z < WZ; z++) {
        const h = terrainHeight(x, z);
        for (let y = 0; y < h; y++) {
          if (y === 0) setRaw(x, y, z, B.BEDROCK);
          else if (y < h - 3) setRaw(x, y, z, hash2(x * 7 + y, z * 5 - y, 3) < 0.026 ? B.COAL : B.STONE);
          else if (y < h - 1) setRaw(x, y, z, B.DIRT);
          else {
            if (h <= SEA + 1) setRaw(x, y, z, B.SAND);
            else if (h >= 22) setRaw(x, y, z, B.SNOW);
            else setRaw(x, y, z, B.GRASS);
          }
        }
        for (let y = h + 1; y <= SEA; y++) setRaw(x, y, z, B.WATER);
      }
    }

    // Trees, kept clear of the spawn clearing.
    for (let x = 3; x < WX - 3; x++) {
      for (let z = 3; z < WZ - 3; z++) {
        const top = getBlock(x, terrainHeight(x, z), z);
        if (top !== B.GRASS) continue;
        if (Math.hypot(x - 40, z - 40) < 7) continue;
        if (hash2(x + 910, z - 421, 8) > 0.017) continue;
        plantTree(x, terrainHeight(x, z) + 1, z);
      }
    }
  }

  function plantTree(x, baseY, z) {
    const h = 4 + Math.floor(hash2(x, z, 9) * 3);
    const topY = baseY + h;
    for (let y = baseY; y < topY; y++) setRaw(x, y, z, B.LOG);
    for (let dy = -2; dy <= 1; dy++) {
      const radius = dy <= -1 ? 2 : 1;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.abs(dx) === radius && Math.abs(dz) === radius && dy >= 0) continue;
          if (dx === 0 && dz === 0 && dy <= 0) continue;
          const yy = topY + dy;
          if (yy >= WY) continue;
          if (getBlock(x + dx, yy, z + dz) === B.AIR) setRaw(x + dx, yy, z + dz, B.LEAVES);
        }
      }
    }
    if (topY < WY - 1) setRaw(x, topY, z, B.LEAVES);
  }

  function groundAt(x, z) {
    for (let y = WY - 1; y >= 0; y--) {
      const b = getBlock(x, y, z);
      if (b && b !== B.WATER) return { y: y + 1, type: b, water: false };
    }
    return { y: 1, type: B.BEDROCK, water: true };
  }

  function findSpawn() {
    for (let r = 0; r < 15; r++) {
      const steps = r === 0 ? 1 : 18;
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const x = Math.round(40 + Math.cos(a) * r);
        const z = Math.round(40 + Math.sin(a) * r);
        if (x < 3 || x >= WX - 3 || z < 3 || z >= WZ - 3) continue;
        const g = groundAt(x, z);
        if (!g.water && g.y > SEA + 1 && g.type !== B.LEAVES) return { x: x + 0.5, z: z + 0.5, y: g.y };
      }
    }
    return { x: 40.5, z: 40.5, y: groundAt(40, 40).y };
  }

  // ── renderer / scene ─────────────────────────────────────────────────────
  const canvas = $('#game');
  const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const lowPower = isCoarse || Math.min(window.innerWidth, window.innerHeight) < 600;
  let renderer, scene, camera, hemi, sunLight, sunTarget;
  let skyMesh, skyMat, stars, sunSprite, moonSprite, cloudGroup, cloudMat;
  let highlight;
  let particleGeo;
  const particleMats = new Map();
  const chunks = new Map();
  const mobs = [];
  const particles = [];
  const tmpV1 = new THREE.Vector3();
  const tmpV2 = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();
  const tmpColA = new THREE.Color();
  const tmpColB = new THREE.Color();
  const tmpColC = new THREE.Color();

  const SKY = {
    dayTop: new THREE.Color(0x4f9fe0),
    dayHorizon: new THREE.Color(0xceeaf5),
    nightTop: new THREE.Color(0x040b19),
    nightHorizon: new THREE.Color(0x0c2132),
    duskTop: new THREE.Color(0x5b547e),
    duskHorizon: new THREE.Color(0xff8c5a)
  };

  function makeGlowTexture(inner, mid, outer) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, inner);
    grad.addColorStop(0.18, mid);
    grad.addColorStop(0.46, outer);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeStars() {
    const count = 650;
    const pos = new Float32Array(count * 3);
    const rng = mulberry32(1234);
    for (let i = 0; i < count; i++) {
      const u = rng() * 2 - 1;
      const a = rng() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = 150;
      pos[i * 3] = Math.cos(a) * s * r;
      pos[i * 3 + 1] = u * r;
      pos[i * 3 + 2] = Math.sin(a) * s * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.15, transparent: true, opacity: 0, depthWrite: false, fog: false, sizeAttenuation: true });
    return new THREE.Points(geo, mat);
  }

  function initThree() {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.6 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x8ecfe7, 1);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xcbe9f3, 34, 94);

    camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 300);
    camera.rotation.order = 'YXZ';

    hemi = new THREE.HemisphereLight(0xc6ecff, 0x395b38, 1.2);
    scene.add(hemi);

    sunLight = new THREE.DirectionalLight(0xfff0cd, 2.4);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
    sunLight.shadow.camera.left = -34;
    sunLight.shadow.camera.right = 34;
    sunLight.shadow.camera.top = 34;
    sunLight.shadow.camera.bottom = -34;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.bias = -0.0007;
    sunLight.shadow.normalBias = 0.025;
    sunLight.shadow.radius = 2.2;
    sunTarget = new THREE.Object3D();
    scene.add(sunTarget);
    sunLight.target = sunTarget;
    scene.add(sunLight);

    skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x4f9fe0) },
        bottomColor: { value: new THREE.Color(0xceeaf5) },
        offset: { value: 42 },
        exponent: { value: 0.72 }
      },
      vertexShader: 'varying vec3 vWorldPosition; void main(){ vec4 worldPosition = modelMatrix * vec4(position,1.0); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vWorldPosition; void main(){ float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y; float f = pow(max(h, 0.0), exponent); gl_FragColor = vec4(mix(bottomColor, topColor, f), 1.0); }',
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    skyMesh = new THREE.Mesh(new THREE.SphereGeometry(170, 32, 18), skyMat);
    skyMesh.renderOrder = -20;
    scene.add(skyMesh);

    stars = makeStars();
    scene.add(stars);

    const sunTexture = makeGlowTexture('#fff8ce', '#ffc85c', '#ff9d2f');
    const moonTexture = makeGlowTexture('#ffffff', '#d9e8ef', '#94b8cc');
    sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sunSprite.scale.set(26, 26, 1);
    scene.add(sunSprite);
    moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    moonSprite.scale.set(14, 14, 1);
    scene.add(moonSprite);

    cloudGroup = new THREE.Group();
    cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.82, depthWrite: false, fog: true });
    const cloudGeo = new THREE.BoxGeometry(1, 1, 1);
    const rng = mulberry32(90123);
    for (let i = 0; i < 22; i++) {
      const cluster = new THREE.Group();
      const bx = rand(-78, 78), bz = rand(-78, 78), by = rand(32, 42);
      const pieces = 3 + Math.floor(rng() * 4);
      for (let j = 0; j < pieces; j++) {
        const mesh = new THREE.Mesh(cloudGeo, cloudMat);
        mesh.position.set(rand(-8, 8), rand(-1.2, 1.2), rand(-6, 6));
        mesh.scale.set(rand(5, 13), rand(1.4, 3.1), rand(4, 10));
        cluster.add(mesh);
      }
      cluster.position.set(bx + 40, by, bz + 40);
      cluster.userData.wind = rand(0.35, 0.9);
      cloudGroup.add(cluster);
    }
    scene.add(cloudGroup);

    particleGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13);

    highlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.012, 1.012, 1.012)),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.78, depthTest: true })
    );
    highlight.visible = false;
    scene.add(highlight);
  }
