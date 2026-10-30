import { clamp, formatTime, lerp, rand, rectsOverlap, store, TAU } from './utils.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { ParticleSystem, Projectiles } from './effects.js';
import { WorldRenderer } from './world.js';
import { Player } from './player.js';
import { Boss } from './boss.js';

const hexToRgba = (hex, alpha) => {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const num = Number.parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export class Game {
  constructor() {
    this.app = document.getElementById('app');
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.audio = new AudioEngine();
    this.input = new Input({ onKey: (code) => this._onKey(code) });
    this.particles = new ParticleSystem();
    this.projectiles = new Projectiles(this);
    this.state = 'menu';
    this.app.dataset.state = 'menu';
    this.time = 0;
    this.fightTime = 0;
    this.timeScale = 1;
    this.hitstop = 0;
    this.trauma = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.flashColor = '#e8e2cf';
    this.flashAlpha = 0;
    this.flashDecay = 2.2;
    this.introTimer = 0;
    this.bannerTimer = 0;
    this.pendingDefeat = 0;
    this.cracks = [];
    this.soundTimer = 0;
    this.lastMaskHp = null;
    this.touchMode = false;
    this.pendingTilt = Boolean(store.get('warden-tilt', false));
    this.best = store.get('warden-best', null);
    this._lastFrame = 0;
    this._raf = 0;
    this._toastTimer = 0;
    this._rotateTimer = 0;
    this._shakeSeed = rand(0, 1000);

    this.ui = {
      menu: document.getElementById('menu'),
      pause: document.getElementById('pause'),
      result: document.getElementById('result'),
      hud: document.getElementById('hud'),
      intro: document.getElementById('intro'),
      start: document.getElementById('startBtn'),
      resume: document.getElementById('resumeBtn'),
      restart: document.getElementById('restartBtn'),
      quit: document.getElementById('quitBtn'),
      retry: document.getElementById('retryBtn'),
      menuBtn: document.getElementById('menuBtn'),
      pauseBtn: document.getElementById('pauseBtn'),
      soundBtn: document.getElementById('soundBtn'),
      menuSoundBtn: document.getElementById('menuSoundBtn'),
      pauseSoundBtn: document.getElementById('pauseSoundBtn'),
      tiltBtn: document.getElementById('tiltBtn'),
      menuTiltBtn: document.getElementById('menuTiltBtn'),
      pauseTiltBtn: document.getElementById('pauseTiltBtn'),
      bossFill: document.getElementById('bossFill'),
      bossGhost: document.getElementById('bossGhost'),
      bossBar: document.querySelector('.boss-bar'),
      phaseReadout: document.getElementById('phaseReadout'),
      masks: [...document.querySelectorAll('#masks .mask')],
      soulOrb: document.getElementById('soulOrb'),
      soulFill: document.getElementById('soulFill'),
      touch: document.getElementById('touchControls'),
      stickZone: document.getElementById('stickZone'),
      stickKnob: document.getElementById('stickKnob'),
      actionButtons: [...document.querySelectorAll('.action-btn')],
      dashButton: document.querySelector('.action-dash'),
      dashRing: document.querySelector('.action-dash .cooldown-ring'),
      focusButton: document.querySelector('.action-focus'),
      focusRing: document.querySelector('.action-focus .cooldown-ring'),
      toast: document.getElementById('toast'),
      rotateHint: document.getElementById('rotateHint'),
      bestTime: document.getElementById('bestTime'),
      resultTitle: document.getElementById('resultTitle'),
      resultKicker: document.getElementById('resultKicker'),
      resultCopy: document.getElementById('resultCopy'),
      resultTime: document.getElementById('resultTime'),
      resultHits: document.getElementById('resultHits'),
      resultSoul: document.getElementById('resultSoul'),
      recordLine: document.getElementById('recordLine'),
      resultCard: document.querySelector('.result-card'),
    };

    this.resize();
    this.player = new Player(this);
    this.boss = new Boss(this);
    this.world = new WorldRenderer(this);
    this.world.resize();
    this.player.y = this.groundY;
    this.boss.y = this.groundY;

    this._bindUi();
    this.input.attachKeyboard();
    this.input.attachTouch(this.ui.stickZone, this.ui.stickKnob, this.ui.actionButtons);
    this._applySoundUi();
    this._applyTiltUi();
    this._updateBestLabel();
    this._updateHud(true);

    this._onResize = () => this.resize();
    window.addEventListener('resize', () => this.resize());
    window.screen?.orientation?.addEventListener?.('change', () => setTimeout(() => this.resize(), 220));
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 220));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });

    this._loop = (now) => this._frame(now);
    this._raf = requestAnimationFrame(this._loop);
  }

  resize() {
    const w = Math.max(320, window.innerWidth);
    const h = Math.max(320, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const aspectFactor = Math.sqrt((w / 1440) * (h / 900));
    this.s = clamp(aspectFactor, w < 640 ? 0.46 : 0.5, 1.24);
    this.isPortrait = h > w;
    const margin = clamp(h * (this.isPortrait ? 0.26 : 0.155), 64, 200);
    this.groundY = h - margin;
    this.touchMode =
      window.matchMedia?.('(pointer: coarse)').matches ||
      (navigator.maxTouchPoints || 0) > 0 ||
      w < 900;
    this.app.classList.toggle('touch-mode', this.touchMode);

    if (this.player) {
      this.player.w = 38 * this.s;
      this.player.h = 79 * this.s;
      this.player.y = Math.min(this.player.y, this.groundY);
      if (this.player.grounded) this.player.y = this.groundY;
      this.player.x = clamp(this.player.x, 20 * this.s, w - 20 * this.s);
    }
    if (this.boss) {
      this.boss.w = 104 * this.s;
      this.boss.h = 190 * this.s;
      if (!this.boss.launched) this.boss.y = Math.min(this.boss.y, this.groundY);
      if (this.boss.y >= this.groundY - 1) this.boss.y = this.groundY;
      this.boss.x = clamp(this.boss.x, 30 * this.s, w - 30 * this.s);
    }
    if (this.world) this.world.resize();
    this._updateHud(true);
  }

  _bindUi() {
    this.ui.start.addEventListener('click', () => this.startFight());
    this.ui.resume.addEventListener('click', () => this.resume());
    this.ui.restart.addEventListener('click', () => {
      this.ui.pause.classList.remove('visible');
      this.startFight();
    });
    this.ui.quit.addEventListener('click', () => this.returnToMenu());
    this.ui.retry.addEventListener('click', () => this.startFight());
    this.ui.menuBtn.addEventListener('click', () => this.returnToMenu());
    this.ui.pauseBtn.addEventListener('click', () => {
      if (this.state === 'playing') this.pause();
    });
    this.ui.soundBtn.addEventListener('click', () => this.toggleSound());
    this.ui.menuSoundBtn.addEventListener('click', () => this.toggleSound());
    this.ui.pauseSoundBtn.addEventListener('click', () => this.toggleSound());
    this.ui.tiltBtn.addEventListener('click', () => this.toggleTilt());
    this.ui.menuTiltBtn.addEventListener('click', () => this.toggleTilt());
    this.ui.pauseTiltBtn.addEventListener('click', () => this.toggleTilt());
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Enter' || event.code === 'NumpadEnter') {
        event.preventDefault();
        if (this.state === 'menu') this.startFight();
        else if (this.state === 'victory' || this.state === 'defeat') this.startFight();
        else if (this.state === 'paused') this.resume();
      }
    });
  }

  _onKey(code) {
    if (code === 'Escape' || code === 'KeyP') {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
      return;
    }
    if (code === 'KeyM') {
      this.toggleSound();
      return;
    }
    if (code === 'KeyT') {
      this.toggleTilt();
      return;
    }
    if ((code === 'Space' || code === 'Enter' || code === 'NumpadEnter') && this.state === 'menu') {
      this.startFight();
    }
  }

  startFight() {
    this.audio.init();
    if (this.pendingTilt && !this.input.tiltEnabled) {
      this.toggleTilt(true);
    }
    this.audio.setIntensity(0.1);
    this.projectiles.clear();
    this.particles.clear();
    this.cracks.length = 0;
    this.player.reset(this.w * (this.isPortrait ? 0.3 : 0.28));
    this.boss.reset();
    this.app.classList.remove('is-enraged', 'is-phase-two');
    this.state = 'playing';
    this.app.dataset.state = 'playing';
    this.ui.menu.classList.remove('visible');
    this.ui.pause.classList.remove('visible');
    this.ui.result.classList.remove('visible');
    this.ui.result.setAttribute('aria-hidden', 'true');
    this.ui.pause.setAttribute('aria-hidden', 'true');
    this.ui.hud.setAttribute('aria-hidden', 'false');
    this.timeScale = 1;
    this.hitstop = 0;
    this.trauma = 0;
    this.flashAlpha = 0;
    this.pendingDefeat = 0;
    this.fightTime = 0;
    this.introTimer = 2.5;
    this.lastMaskHp = null;
    this.input.reset();
    this.showBanner('ARENA I  ·  THE SUNKEN COURT', 'THE HOLLOW WARDEN', 'KEEPER OF THE DYING LIGHT', 2.5);
    this._updateHud(true);
    this.ui.rotateHint.classList.remove('visible');
    this._rotateTimer = this.isPortrait && this.touchMode ? 2.8 : 0;
    this.audio.ui();
  }

  returnToMenu() {
    this.state = 'menu';
    this.app.dataset.state = 'menu';
    this.ui.menu.classList.add('visible');
    this.ui.pause.classList.remove('visible');
    this.ui.result.classList.remove('visible');
    this.ui.result.setAttribute('aria-hidden', 'true');
    this.ui.pause.setAttribute('aria-hidden', 'true');
    this.ui.intro.classList.remove('visible');
    this.ui.hud.setAttribute('aria-hidden', 'true');
    this.player.reset(this.w * 0.28);
    this.boss.reset();
    this.projectiles.clear();
    this.particles.clear();
    this.cracks.length = 0;
    this.app.classList.remove('is-enraged', 'is-phase-two');
    this.audio.setIntensity(0);
    this.audio.resume();
    this._updateHud(true);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.app.dataset.state = 'paused';
    this.ui.pause.classList.add('visible');
    this.ui.pause.setAttribute('aria-hidden', 'false');
    this.input.reset();
    this.audio.suspend();
    this.audio.ui();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.app.dataset.state = 'playing';
    this.ui.pause.classList.remove('visible');
    this.ui.pause.setAttribute('aria-hidden', 'true');
    this.input.reset();
    this.audio.resume();
    this.audio.ui();
  }

  toggleSound() {
    const muted = !this.audio.muted;
    this.audio.setMuted(muted);
    if (!muted) {
      this.audio.init();
      this.audio.ui();
    }
    this._applySoundUi();
  }

  async toggleTilt(fromStart = false) {
    if (fromStart && typeof document !== 'object') return;
    const result = await this.input.toggleTilt();
    if (result.ok) {
      this.pendingTilt = this.input.tiltEnabled;
      if (this.input.tiltEnabled) {
        this.toast('Tilt controls on. Hold your device level to re-center.');
      } else {
        this.toast('Tilt controls off.');
      }
    } else {
      this.pendingTilt = false;
      this.toast(result.reason || 'Tilt is unavailable.');
      this.audio.deny();
    }
    this._applyTiltUi();
    this._applySoundUi();
  }

  _applySoundUi() {
    const muted = this.audio.muted;
    for (const button of [this.ui.soundBtn, this.ui.menuSoundBtn, this.ui.pauseSoundBtn]) {
      if (!button) continue;
      button.setAttribute('aria-pressed', String(!muted));
      const stateEl = button.querySelector('.state');
      if (stateEl) stateEl.textContent = muted ? 'OFF' : 'ON';
    }
    if (this.ui.soundBtn) {
      this.ui.soundBtn.setAttribute('aria-label', muted ? 'Enable sound' : 'Mute sound');
    }
  }

  _applyTiltUi() {
    const on = this.input.tiltEnabled;
    for (const button of [this.ui.tiltBtn, this.ui.menuTiltBtn, this.ui.pauseTiltBtn]) {
      if (!button) continue;
      button.setAttribute('aria-pressed', String(on));
      const stateEl = button.querySelector('.state');
      if (stateEl) stateEl.textContent = on ? 'ON' : 'OFF';
    }
    if (this.ui.tiltBtn) this.ui.tiltBtn.setAttribute('aria-label', on ? 'Disable tilt controls' : 'Enable tilt controls');
    this.app.classList.toggle('tilt-active', on);
  }

  _updateBestLabel() {
    if (!this.ui.bestTime) return;
    if (this.best && Number.isFinite(this.best.time)) {
      this.ui.bestTime.innerHTML = `Best duel: <strong>${formatTime(this.best.time)}</strong> &nbsp;·&nbsp; ${this.best.hits} hit${this.best.hits === 1 ? '' : 's'} taken`;
    } else {
      this.ui.bestTime.textContent = 'No warden has fallen yet.';
    }
  }

  showBanner(kicker, title, sub, duration = 2.2) {
    const intro = this.ui.intro;
    if (!intro) return;
    const kickerEl = intro.querySelector('.intro-kicker');
    const titleEl = intro.querySelector('h2');
    const subEl = intro.querySelector('p:last-child');
    if (kickerEl) kickerEl.textContent = kicker;
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = sub;
    intro.classList.add('visible');
    this.bannerTimer = duration;
  }

  hideBanner() {
    this.ui.intro.classList.remove('visible');
    this.bannerTimer = 0;
  }

  toast(message, duration = 2800) {
    this.ui.toast.textContent = message;
    this.ui.toast.classList.add('visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.ui.toast.classList.remove('visible'), duration);
  }

  addTrauma(amount) {
    this.trauma = clamp(this.trauma + amount, 0, 1);
  }

  afterimage(x, y, face, life = 0.28, pose = 'dash') {
    this.player.afterimages.push({ x, y, face, life, maxLife: life, pose, vx: this.player.vx });
  }

  hitStop(seconds) {
    this.hitstop = Math.max(this.hitstop, seconds);
  }

  flash(color, alpha, decay = 2.4) {
    this.flashColor = color;
    this.flashAlpha = Math.max(this.flashAlpha, alpha);
    this.flashDecay = decay;
  }

  shakeGround(x, y) {
    const s = this.s;
    this.addTrauma(0.35);
    for (let i = 0; i < 26; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      this.particles.spawn({
        x: x + side * rand(10, 90) * s,
        y: y - rand(0, 4) * s,
        vx: side * rand(20, 190) * s,
        vy: rand(-210, -30) * s,
        life: rand(0.35, 1.1),
        size: rand(1, 4.2) * s,
        color: Math.random() < 0.22 ? '#e8e2cf' : '#6f877d',
        style: Math.random() < 0.4 ? 'spark' : 'dust',
        gravity: 300,
      });
    }
  }

  addCrack(x) {
    const s = this.s;
    const branches = [];
    for (let i = 0; i < 7; i++) {
      const angle = rand(Math.PI * 0.08, Math.PI * 0.92);
      const length = rand(25, 115) * s;
      const points = [];
      let px = 0;
      let py = 0;
      const segments = 3 + Math.floor(rand(0, 3));
      for (let j = 0; j < segments; j++) {
        px += Math.cos(angle) * (length / segments) + rand(-8, 8) * s;
        py += Math.sin(angle) * (length / segments) + rand(-2, 2) * s;
        points.push({ x: px, y: py });
      }
      branches.push(points);
    }
    this.cracks.push({ x, y: this.groundY, branches, life: 26, maxLife: 26 });
    if (this.cracks.length > 18) this.cracks.shift();
  }

  damagePlayer(amount, sourceX) {
    if (this.state !== 'playing' || this.introTimer > 0.8) return false;
    return this.player.takeDamage(amount, sourceX);
  }

  onPlayerHurt() {
    this.flash('#b85c58', 0.12, 3.2);
  }

  onPlayerDeath() {
    this.pendingDefeat = 2.15;
    this.timeScale = 0.32;
    this.player.invuln = 999;
    this.boss.state = 'idle';
    this.boss.attackName = null;
    this.boss.danger = false;
    this.boss.attackCooldown = 999;
    this.boss.vx = 0;
    this.projectiles.clear();
    this.showBanner('THE DUEL ENDS', 'THE KNIGHT FALLS', 'RISE AGAIN, LITTLE SHADE', 2.2);
    this.addTrauma(0.8);
    this.flash('#b85c58', 0.28, 1.5);
  }

  onBossDying() {
    this.timeScale = 0.5;
    this.player.invuln = 999;
    this.projectiles.clear();
    this.showBanner('THE DUEL ENDS', 'THE WARDEN FALLS', 'THE PALE COURT IS SILENT', 2.6);
  }

  onBossGone() {
    if (this.state !== 'playing') return;
    this.timeScale = 1;
    this.state = 'victory';
    this.app.dataset.state = 'victory';
    this.hideBanner();
    this.audio.victory();
    this._showResult(true);
  }

  _showResult(victory) {
    const result = this.ui.result;
    const time = this.fightTime;
    const hits = this.player.hitsTaken;
    const soul = this.player.soulSpent;
    const title = victory ? 'THE WARDEN FALLS' : 'THE KNIGHT FALLS';
    const kicker = victory ? 'THE DUEL ENDS' : 'THE DUEL ENDS';
    const copy = victory ? 'The pale court is silent once more.' : 'The court remembers every fallen shade.';
    this.ui.resultKicker.innerHTML = `<span></span> ${kicker} <span></span>`;
    this.ui.resultTitle.textContent = title;
    this.ui.resultCopy.textContent = copy;
    this.ui.resultTime.textContent = formatTime(time);
    this.ui.resultHits.textContent = String(hits);
    this.ui.resultSoul.textContent = String(Math.round(soul));
    this.ui.resultCard.classList.toggle('defeat', !victory);
    let record = '';
    if (victory) {
      const previous = this.best;
      if (!previous || time < previous.time) {
        this.best = { time, hits, date: new Date().toISOString() };
        store.set('warden-best', this.best);
        record = 'A new record. The court will remember.';
        this._updateBestLabel();
      } else {
        record = `Best duel: ${formatTime(previous.time)}`;
      }
    } else {
      record = this.best ? `Best duel: ${formatTime(this.best.time)}` : 'The warden is still waiting.';
    }
    this.ui.recordLine.textContent = record;
    this.ui.result.classList.add('visible');
    this.ui.result.setAttribute('aria-hidden', 'false');
    this.ui.pause.setAttribute('aria-hidden', 'true');
    this.ui.hud.setAttribute('aria-hidden', 'true');
    this.input.reset();
  }

  _updateHud(force = false) {
    const boss = this.boss;
    const player = this.player;
    if (!boss || !player) return;
    const ratio = clamp(boss.hp / boss.maxHp, 0, 1);
    if (this.ui.bossFill) {
      const clip = `inset(0 ${(1 - ratio) * 100}% 0 0)`;
      this.ui.bossFill.style.clipPath = clip;
      this.ui.bossGhost.style.clipPath = clip;
      this.ui.bossBar?.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    }
    const phaseText = boss.enraged ? 'ENRAGED' : boss.phase >= 2 ? 'PHASE II' : 'PHASE I';
    if (this.ui.phaseReadout) this.ui.phaseReadout.textContent = phaseText;

    if (this.lastMaskHp === null) this.lastMaskHp = player.hp;
    for (let i = 0; i < this.ui.masks.length; i++) {
      const mask = this.ui.masks[i];
      const lost = i >= player.hp;
      mask.classList.toggle('lost', lost);
      if (player.hp < this.lastMaskHp && i >= player.hp && i < this.lastMaskHp) {
        mask.classList.remove('hit');
        void mask.offsetWidth;
        mask.classList.add('hit');
      }
    }
    this.lastMaskHp = player.hp;

    const soulRatio = clamp(player.soul / player.maxSoul, 0, 1);
    if (this.ui.soulFill) {
      this.ui.soulFill.style.transform = `scale(${lerp(0.42, 1, soulRatio)})`;
      this.ui.soulFill.style.opacity = String(lerp(0.32, 1, soulRatio));
    }
    if (this.ui.soulOrb) {
      this.ui.soulOrb.classList.toggle('ready', player.soul >= 33);
      this.ui.soulOrb.setAttribute('aria-valuenow', String(player.soul));
    }

    if (this.ui.dashRing) {
      const cool = clamp(player.dashCooldown / 0.62, 0, 1);
      this.ui.dashRing.style.setProperty('--cool', `${cool * 360}deg`);
      this.ui.dashButton?.classList.toggle('is-cooling', player.dashCooldown > 0);
    }
    if (this.ui.focusRing) {
      const locked = player.soul < 33 || player.hp >= player.maxHp;
      const focusCd = clamp(player.focusCooldown / 0.25, 0, 1);
      this.ui.focusRing.style.setProperty('--cool', `${(locked ? 1 : focusCd) * 360}deg`);
      this.ui.focusButton?.classList.toggle('is-cooling', locked);
    }
  }

  _frame(now) {
    const raw = this._lastFrame ? (now - this._lastFrame) / 1000 : 1 / 60;
    this._lastFrame = now;
    const dt = clamp(raw, 0, 0.2);
    this.time += dt;

    if (this.state === 'playing') {
      let remaining = dt;
      while (remaining > 0.0001 && this.state === 'playing') {
        const step = Math.min(remaining, 1 / 60);
        this._update(step);
        remaining -= step;
      }
    } else if (this.state === 'menu') {
      this._updateMenu(dt);
    } else if (this.state === 'victory' || this.state === 'defeat') {
      this._updateEnd(dt);
    }

    this._render();
    this.input.endStep();
    this._raf = requestAnimationFrame(this._loop);
  }

  _updateMenu(dt) {
    if (this.trauma > 0) this.trauma = Math.max(0, this.trauma - dt * 1.5);
    this._decayFlash(dt);
    if (this._rotateTimer > 0) this._rotateTimer -= dt;
    this._updateShake(dt);
    this.particles.update(dt);
  }

  _updateEnd(dt) {
    this.particles.update(dt * 0.6);
    this._updateShake(dt);
    this._decayFlash(dt);
    if (this.cracks.length) {
      for (const crack of this.cracks) crack.life -= dt * 0.2;
      this.cracks = this.cracks.filter((crack) => crack.life > 0);
    }
  }

  _update(dt) {
    if (this._rotateTimer > 0) {
      this._rotateTimer -= dt;
      if (this._rotateTimer <= 0) {
        this.ui.rotateHint.classList.add('visible');
        setTimeout(() => this.ui.rotateHint.classList.remove('visible'), 5200);
      }
    }
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0.08) this.hideBanner();
    }
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this._updateShake(dt);
      this._decayFlash(dt);
      return;
    }

    const scaled = dt * this.timeScale;
    if (this.introTimer > 0) this.introTimer = Math.max(0, this.introTimer - dt);
    if (this.introTimer < 0.75) this.fightTime += scaled;

    this.player.update(scaled);
    this.boss.update(scaled);
    this.projectiles.update(scaled);
    this.particles.update(scaled);
    this._resolveNail();
    this._decayFlash(dt);
    this._updateShake(dt);

    if (this.cracks.length) {
      for (const crack of this.cracks) crack.life -= scaled * 0.22;
      this.cracks = this.cracks.filter((crack) => crack.life > 0);
    }

    if (this.pendingDefeat > 0) {
      this.pendingDefeat -= dt;
      if (this.pendingDefeat <= 0) {
        this.pendingDefeat = 0;
        this.timeScale = 1;
        this.state = 'defeat';
        this.app.dataset.state = 'defeat';
        this.hideBanner();
        this._showResult(false);
      }
    }

    this.soundTimer -= dt;
    if (this.soundTimer <= 0) {
      this.soundTimer = 0.4;
      const ratio = 1 - this.boss.hp / this.boss.maxHp;
      this.audio.setIntensity(clamp(ratio * 0.85 + (this.boss.enraged ? 0.15 : 0), 0, 1));
    }

    this._updateHud();
  }

  _resolveNail() {
    const hitbox = this.player.attackHitbox;
    if (!hitbox) return;
    if (!this.player.attackHitBoss && this.boss.state !== 'dying' && this.boss.state !== 'dead') {
      if (rectsOverlap(hitbox, this.boss.bodyRect)) {
        this.player.attackHitBoss = true;
        const damage = 9;
        const hitX = clamp(this.player.x + this.player.face * 34 * this.s, hitbox.x, hitbox.x + hitbox.w);
        const hitY = this.player.y - this.player.h * 0.52;
        const did = this.boss.takeDamage(damage, hitX, hitY);
        if (did) {
          this.player.gainSoul(11);
          this.addTrauma(0.16);
          this.hitStop(0.026);
          if (this.player.attackDir === 'down' && !this.player.grounded) {
            this.player.vy = -590 * this.s;
            this.player.grounded = false;
            this.particles.burst(this.player.x, this.player.y - 2 * this.s, 9, {
              angle: -Math.PI / 2,
              spread: Math.PI * 0.9,
              speedMin: 30,
              speedMax: 120,
              lifeMin: 0.2,
              lifeMax: 0.5,
              sizeMin: 1,
              sizeMax: 2.4,
              color: '#e8e2cf',
              style: 'spark',
              gravity: 220,
            });
          }
        }
      }
    }
    if (!this.player.attackHitProjectiles) {
      const hit = this.projectiles.checkNail(hitbox);
      if (hit) {
        this.player.attackHitProjectiles = true;
        this.player.gainSoul(4);
      }
    }
  }

  _decayFlash(dt) {
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dt * this.flashDecay);
  }

  _updateShake(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.35);
    const power = this.trauma * this.trauma * 25 * this.s;
    const t = this.time * 49 + this._shakeSeed;
    this.shakeX = (Math.sin(t * 1.7) + Math.sin(t * 2.9) * 0.45) * power;
    this.shakeY = (Math.cos(t * 2.1) + Math.sin(t * 3.4) * 0.35) * power * 0.7;
  }

  _render() {
    const ctx = this.ctx;
    const { w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#030708';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);
    this.world.drawBack(ctx, this.time);
    this._drawCracks(ctx);
    this.boss.draw(ctx, this.time);
    this.projectiles.draw(ctx);
    this.player.draw(ctx, this.time);
    this.particles.draw(ctx);
    this.world.drawForeground(ctx, this.time);
    ctx.restore();

    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.globalCompositeOperation = this.flashAlpha > 0.22 ? 'screen' : 'source-over';
      ctx.fillStyle = hexToRgba(this.flashColor, this.flashAlpha);
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    this._drawScreenMotes(ctx);
  }

  _drawCracks(ctx) {
    for (const crack of this.cracks) {
      const alpha = clamp(crack.life / crack.maxLife, 0, 1);
      ctx.save();
      ctx.translate(crack.x, crack.y);
      ctx.strokeStyle = `rgba(3, 7, 7, ${0.55 * alpha})`;
      ctx.lineWidth = 1.3 * this.s;
      for (const branch of crack.branches) {
        ctx.beginPath();
        ctx.moveTo(0, 2);
        for (const p of branch) ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(168, 240, 226, ${0.055 * alpha})`;
      ctx.lineWidth = 0.7 * this.s;
      for (const branch of crack.branches) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (const p of branch) ctx.lineTo(p.x, p.y - 1.2 * this.s);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _drawScreenMotes(ctx) {
    if (this.state === 'menu') return;
    const { w, h } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const count = 7;
    for (let i = 0; i < count; i++) {
      const t = (this.time * 0.02 + i / count) % 1;
      const x = ((i * 0.173 + 0.08) % 1) * w + Math.sin(this.time * 0.18 + i * 2.1) * 18;
      const y = h * (0.12 + t * 0.68);
      const alpha = Math.sin(t * Math.PI) * 0.1;
      ctx.fillStyle = `rgba(234, 215, 154, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, (0.8 + (i % 3) * 0.5) * this.s, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
