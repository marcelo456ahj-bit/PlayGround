import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { World } from './world.js';
import { formatTime } from './util.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
const audio = new AudioEngine();
const input = new Input({ onPause: () => togglePause() });

const els = {
  hud: document.getElementById('hud'),
  masks: document.getElementById('masks'),
  soulLiquid: document.getElementById('soul-liquid'),
  bossFill: document.getElementById('boss-fill'),
  phaseLabel: document.getElementById('phase-label'),
  pauseBtn: document.getElementById('pause-btn'),
  title: document.getElementById('title-screen'),
  pause: document.getElementById('pause-screen'),
  end: document.getElementById('end-screen'),
  startBtn: document.getElementById('start-btn'),
  tiltBtn: document.getElementById('tilt-btn'),
  soundBtn: document.getElementById('sound-btn'),
  pauseTiltBtn: document.getElementById('pause-tilt-btn'),
  pauseSoundBtn: document.getElementById('pause-sound-btn'),
  endSoundBtn: document.getElementById('end-sound-btn'),
  resumeBtn: document.getElementById('resume-btn'),
  restartBtn: document.getElementById('restart-btn'),
  retryBtn: document.getElementById('retry-btn'),
  tiltNote: document.getElementById('tilt-note'),
  bestTime: document.getElementById('best-time'),
  endKicker: document.getElementById('end-kicker'),
  endTitle: document.getElementById('end-title'),
  endSub: document.getElementById('end-sub'),
  endStats: document.getElementById('end-stats'),
  toast: document.getElementById('toast'),
  touch: document.getElementById('touch-controls'),
  hints: document.getElementById('desktop-hints'),
  joystick: document.getElementById('joystick'),
  stick: document.getElementById('stick'),
  btnJump: document.getElementById('btn-jump'),
  btnAttack: document.getElementById('btn-attack'),
  btnDash: document.getElementById('btn-dash'),
  btnFocus: document.getElementById('btn-focus')
};

const BEST_KEY = 'hollow-sentinel-best-v1';
let muted = false;
try { muted = localStorage.getItem('hollow-sentinel-muted') === '1'; } catch {}
audio.setMuted(muted);

function buildMasks() {
  const path = 'M12 2.1 L20.2 9.4 L12 22.2 L3.8 9.4 Z';
  els.masks.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const span = document.createElement('span');
    span.className = 'mask';
    span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
    els.masks.appendChild(span);
  }
}

let lastMasks = -1;
let lastSoul = -1;
let lastBoss = -1;
let lastPhase = 0;
let toastTimer = null;

function syncHud() {
  const p = world.player;
  const b = world.boss;
  if (p.masks !== lastMasks) {
    const previous = lastMasks;
    const nodes = els.masks.children;
    for (let i = 0; i < nodes.length; i++) {
      const spent = i >= p.masks;
      nodes[i].classList.toggle('spent', spent);
      if (previous >= 0 && spent && i >= p.masks && i < previous) {
        nodes[i].classList.remove('breaking');
        void nodes[i].offsetWidth;
        nodes[i].classList.add('breaking');
      }
      if (previous >= 0 && !spent && i >= previous && i < p.masks) {
        nodes[i].classList.remove('healing');
        void nodes[i].offsetWidth;
        nodes[i].classList.add('healing');
      }
    }
    lastMasks = p.masks;
  }
  const soul = Math.round(p.soul / p.maxSoul * 100);
  if (soul !== lastSoul) {
    els.soulLiquid.style.height = `${soul}%`;
    lastSoul = soul;
  }
  const boss = Math.round(b.ratio * 1000) / 10;
  if (boss !== lastBoss) {
    els.bossFill.style.width = `${boss}%`;
    lastBoss = boss;
  }
  if (b.phase !== lastPhase) {
    els.hud.classList.toggle('fury', b.phase === 2);
    els.phaseLabel.textContent = b.phase === 2 ? 'VESSEL UNBOUND' : 'VESSEL OF THE ABYSS';
    els.phaseLabel.classList.toggle('fury', b.phase === 2);
    lastPhase = b.phase;
  }
}

function resetHud() {
  lastMasks = -1;
  lastSoul = -1;
  lastBoss = -1;
  lastPhase = 0;
  for (const node of els.masks.children) node.className = 'mask';
  els.hud.classList.remove('fury');
  els.phaseLabel.textContent = 'VESSEL OF THE ABYSS';
  els.phaseLabel.classList.remove('fury');
  syncHud();
}

function showToast(message, duration = 2000) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), duration);
}

function syncSoundButtons() {
  const label = muted ? 'SOUND: OFF' : 'SOUND: ON';
  for (const button of [els.soundBtn, els.pauseSoundBtn, els.endSoundBtn]) {
    if (!button) continue;
    button.textContent = label;
    button.classList.toggle('on', !muted);
  }
}

function setMuted(value) {
  muted = value;
  audio.setMuted(muted);
  try { localStorage.setItem('hollow-sentinel-muted', muted ? '1' : '0'); } catch {}
  syncSoundButtons();
}

function syncTiltButtons() {
  const supported = input.tilt.supported;
  const enabled = input.tilt.enabled;
  const label = !supported ? 'TILT: N/A' : enabled ? 'TILT: ON' : 'TILT: OFF';
  for (const button of [els.tiltBtn, els.pauseTiltBtn]) {
    if (!button) continue;
    button.textContent = label;
    button.classList.toggle('on', enabled);
    button.disabled = !supported;
  }
  if (!supported) els.tiltNote.textContent = 'Tilt steering is unavailable on this device.';
  else if (!enabled) els.tiltNote.textContent = 'Optional tilt steering is available.';
  else els.tiltNote.textContent = 'Tilt steering active. Hold the device naturally to calibrate.';
}

async function toggleTilt() {
  const result = await input.toggleTilt();
  syncTiltButtons();
  if (result === 'on') {
    showToast('TILT STEERING ENABLED', 2200);
  } else if (result === 'denied') {
    showToast('MOTION ACCESS DENIED', 2400);
    els.tiltNote.textContent = 'Motion access was denied. You can change it in browser settings.';
  } else if (result === 'unsupported') {
    showToast('TILT NOT SUPPORTED', 2200);
  }
}

function hideOverlay(element, delay = 600) {
  element.classList.add('fade-out');
  setTimeout(() => element.classList.add('hidden'), delay);
}

function showOverlay(element) {
  element.classList.remove('hidden');
  void element.offsetWidth;
  element.classList.remove('fade-out');
}

function enterArena() {
  audio.start().catch(() => {});
  audio.setMuted(muted);
  document.activeElement?.blur?.();
  resetHud();
  world.startRun();
  els.hud.classList.remove('hidden');
  els.end.classList.add('hidden');
  els.end.classList.remove('fade-out');
  els.pause.classList.add('hidden');
  document.body.classList.remove('ended');
  els.touch.setAttribute('aria-hidden', 'false');
  if (!els.title.classList.contains('hidden')) hideOverlay(els.title);
  els.hints.style.opacity = '1';
  showToast('THE SENTINEL STIRS', 1900);
}

function openPause() {
  if (world.state !== 'playing') return;
  world.pause();
  syncTiltButtons();
  syncSoundButtons();
  showOverlay(els.pause);
  els.touch.setAttribute('aria-hidden', 'true');
}

function closePause() {
  if (world.state !== 'paused') return;
  els.pause.classList.add('hidden');
  world.resume();
  els.touch.setAttribute('aria-hidden', 'false');
}

function togglePause() {
  if (world.state === 'playing') openPause();
  else if (world.state === 'paused') closePause();
}

function bestTime() {
  try {
    const value = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch { return null; }
}

function updateBestTime() {
  const best = bestTime();
  els.bestTime.textContent = best ? `BEST ${formatTime(best)}` : 'BEST \u2014';
}

function saveBestTime(seconds) {
  const best = bestTime();
  if (!best || seconds < best) {
    try { localStorage.setItem(BEST_KEY, String(seconds)); } catch {}
    updateBestTime();
    return true;
  }
  return false;
}

function showEnd(victory, stats) {
  document.body.classList.add('ended');
  els.touch.setAttribute('aria-hidden', 'true');
  els.hints.style.opacity = '0';
  if (victory) {
    els.endKicker.textContent = 'THE VESSEL IS SILENT';
    els.endTitle.textContent = 'SENTINEL FELLED';
    els.endTitle.classList.add('victory');
    els.endSub.textContent = 'The arena exhales. Take your rest, little ghost.';
    const record = saveBestTime(stats.time);
    if (record) els.endSub.textContent = 'A new best. The arena remembers your name, little ghost.';
  } else {
    els.endKicker.textContent = 'THE ABYSS CLAIMS ANOTHER';
    els.endTitle.textContent = 'YOU DIED';
    els.endTitle.classList.remove('victory');
    els.endSub.textContent = 'The Sentinel remains. Rise, little ghost.';
  }
  els.endStats.innerHTML = `
    <div><span>TIME</span><strong>${formatTime(stats.time)}</strong></div>
    <div><span>HITS TAKEN</span><strong>${stats.hits}</strong></div>
    <div><span>FOCUS</span><strong>${stats.heals}</strong></div>
  `;
  showOverlay(els.end);
  syncSoundButtons();
}

function onDeath(stats) { showEnd(false, stats); }
function onVictory(stats) { showEnd(true, stats); }

const world = new World(canvas, input, audio, { onDeath, onVictory });
window.__hollow = { world, input, audio };

input.attachTouch({
  joystick: els.joystick,
  stick: els.stick,
  buttons: {
    jump: els.btnJump,
    attack: els.btnAttack,
    dash: els.btnDash,
    focus: els.btnFocus
  }
});

els.startBtn.addEventListener('click', enterArena);
els.retryBtn.addEventListener('click', enterArena);
els.pauseBtn.addEventListener('click', openPause);
els.resumeBtn.addEventListener('click', closePause);
els.restartBtn.addEventListener('click', () => {
  els.pause.classList.add('hidden');
  enterArena();
});
els.tiltBtn.addEventListener('click', toggleTilt);
els.pauseTiltBtn.addEventListener('click', toggleTilt);
for (const button of [els.soundBtn, els.pauseSoundBtn, els.endSoundBtn]) {
  button.addEventListener('click', () => setMuted(!muted));
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && world.state === 'playing') openPause();
});
window.addEventListener('blur', () => {
  if (world.state === 'playing') openPause();
});
document.addEventListener('contextmenu', (event) => event.preventDefault());
document.addEventListener('gesturestart', (event) => event.preventDefault());

let resizeTimer = null;
function scheduleResize() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => world.resize(), 140);
}
window.addEventListener('resize', scheduleResize);
window.addEventListener('orientationchange', scheduleResize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleResize);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (!document.hidden) world.update(dt);
  world.render(ctx);
  syncHud();
  requestAnimationFrame(frame);
}

buildMasks();
syncSoundButtons();
syncTiltButtons();
updateBestTime();
syncHud();
requestAnimationFrame(frame);
