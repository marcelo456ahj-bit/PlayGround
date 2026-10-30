import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CHAPTERS, PALETTES, World } from './world.js';
import { Player } from './player.js';
import { InputController } from './input.js';
import { Soundscape } from './audio.js';
import { clamp, formatTime, formatScore, radialTexture, prefersReducedMotion } from './util.js';

const $ = (id) => document.getElementById(id);
const canvas = $('scene');
const mobile = window.matchMedia('(pointer: coarse)').matches;
const reducedMotion = prefersReducedMotion();

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
  stencil: false
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x2b2947, 0.0105);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 420);
camera.position.set(9, 11, 22);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  mobile ? 0.5 : 0.6,
  0.52,
  0.82
);
for (const target of [bloom.renderTargetBright, ...bloom.renderTargetsHorizontal, ...bloom.renderTargetsVertical]) {
  target.texture.type = THREE.UnsignedByteType;
  target.texture.colorSpace = THREE.NoColorSpace;
  target.dispose();
}
composer.addPass(bloom);
composer.addPass(new OutputPass());

const sunDirection = new THREE.Vector3(-0.42, 0.12, -1).normalize();

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(260, 48, 32),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x0b1030) },
      uMid: { value: new THREE.Color(0x443c6d) },
      uLow: { value: new THREE.Color(0xf0a071) },
      uSun: { value: new THREE.Color(0xffc58e) },
      uSunDir: { value: sunDirection },
      uTime: { value: 0 }
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uLow;
      uniform vec3 uSun;
      uniform vec3 uSunDir;
      uniform float uTime;
      varying vec3 vWorld;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      void main() {
        vec3 dir = normalize(vWorld);
        float h = dir.y;
        vec3 col = mix(uLow, uMid, smoothstep(-0.07, 0.42, h));
        col = mix(col, uTop, smoothstep(0.28, 0.95, h));

        float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
        float glow = pow(sunDot, 8.0) * 0.09 + pow(sunDot, 110.0) * 0.38 + pow(sunDot, 520.0) * 0.95;
        col += uSun * glow;

        vec3 cell = floor(dir * 360.0);
        float star = hash(cell);
        float starMask = smoothstep(0.9974, 0.9992, star);
        float twinkle = 0.55 + 0.45 * sin(uTime * 1.6 + star * 60.0);
        col += vec3(0.82, 0.88, 1.0) * starMask * smoothstep(0.04, 0.4, h) * twinkle * 0.8;

        gl_FragColor = vec4(col, 1.0);
      }
    `
  })
);
sky.frustumCulled = false;
scene.add(sky);

const cloudMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  fog: false,
  uniforms: {
    uLow: { value: new THREE.Color(0x2b2342) },
    uHigh: { value: new THREE.Color(0xf3a77d) },
    uTime: { value: 0 }
  },
  vertexShader: `
    varying vec3 vWorld;
    void main() {
      vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uLow;
    uniform vec3 uHigh;
    uniform float uTime;
    varying vec3 vWorld;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.55;
      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.03;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec2 uv = vWorld.xz * 0.032;
      float n = fbm(uv + vec2(uTime * 0.012, uTime * 0.004));
      float n2 = fbm(uv * 2.2 - vec2(uTime * 0.02, 0.0));
      float h = smoothstep(0.24, 0.86, n * 0.72 + n2 * 0.42);
      vec3 col = mix(uLow, uHigh, h * 0.9);
      float distanceFade = smoothstep(300.0, 70.0, length(vWorld.xz));
      gl_FragColor = vec4(col, (0.32 + 0.5 * h) * distanceFade * 0.9);
    }
  `
});
const cloudSea = new THREE.Mesh(new THREE.PlaneGeometry(620, 620, 1, 1), cloudMaterial);
cloudSea.rotation.x = -Math.PI / 2;
cloudSea.position.y = -12.5;
cloudSea.frustumCulled = false;
scene.add(cloudSea);

const sunGlowTexture = radialTexture(256, [
  [0, 'rgba(255,255,255,1)'],
  [0.18, 'rgba(255,242,214,0.92)'],
  [0.42, 'rgba(255,200,140,0.34)'],
  [1, 'rgba(255,170,100,0)']
]);
const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: sunGlowTexture,
  color: 0xffc58e,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  transparent: true,
  opacity: 0.62
}));
sunSprite.position.set(-90, 22, -210);
sunSprite.scale.setScalar(48);
sunSprite.material.opacity = 0.34;
scene.add(sunSprite);

const hemisphere = new THREE.HemisphereLight(0x443c6d, 0x0a1618, 0.75);
scene.add(hemisphere);

const sunLight = new THREE.DirectionalLight(0xffc58e, 2.8);
sunLight.position.set(-32, 36, -30);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
sunLight.shadow.camera.left = -42;
sunLight.shadow.camera.right = 42;
sunLight.shadow.camera.top = 42;
sunLight.shadow.camera.bottom = -42;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 120;
sunLight.shadow.bias = -0.0006;
sunLight.shadow.normalBias = 0.035;
scene.add(sunLight);
scene.add(sunLight.target);

const rimLight = new THREE.DirectionalLight(0x9d94ff, 1.15);
rimLight.position.set(34, 14, 28);
scene.add(rimLight);

const sound = new Soundscape();
sound.enabled = localStorage.getItem('iola-sound') !== '0';
let best = Number(localStorage.getItem('iola-best') || 0);

const input = new InputController(canvas, {
  joystick: $('joystick'),
  knob: $('joystickKnob'),
  onTiltChange: () => syncTiltUI()
});

const state = {
  mode: 'menu',
  chapter: 0,
  sparks: 0,
  total: CHAPTERS[0].sparks,
  hits: 0,
  timeLeft: CHAPTERS[0].time,
  totalScore: 0,
  resultAction: 'next',
  menuAngle: 0.42,
  hintTimer: null,
  cardTimer: null,
  toastTimer: null,
  flashTimer: null,
  tiltBusy: false,
  firstRun: true
};

let world = null;
let player = null;
let config = CHAPTERS[0];
let palette = PALETTES[0];

const refs = {
  hud: $('hud'),
  menu: $('menu'),
  pause: $('pause'),
  result: $('result'),
  intro: $('intro'),
  chapterTag: $('chapterTag'),
  chapterName: $('chapterName'),
  sparkCount: $('sparkCount'),
  sparkTotal: $('sparkTotal'),
  sparkBar: $('sparkBar'),
  timer: $('timer'),
  timerRing: $('timerRing'),
  timerText: $('timerText'),
  shrineBanner: $('shrineBanner'),
  hint: $('hint'),
  hintText: $('hintText'),
  tiltChip: $('tiltChip'),
  toast: $('toast'),
  flash: $('flash'),
  introNumber: $('introNumber'),
  introTitle: $('introTitle'),
  introObjective: $('introObjective'),
  resultEyebrow: $('resultEyebrow'),
  resultTitle: $('resultTitle'),
  resultText: $('resultText'),
  statSparks: $('statSparks'),
  statTime: $('statTime'),
  statScore: $('statScore'),
  resultPrimary: $('resultPrimary'),
  resultSecondary: $('resultSecondary'),
  menuSound: $('menuSound'),
  menuTilt: $('menuTilt'),
  pauseSound: $('pauseSound'),
  pauseTilt: $('pauseTilt'),
  recenterBtn: $('recenterBtn'),
  tiltNote: $('tiltNote'),
  bestLine: $('bestLine'),
  tiltCard: $('tiltCard')
};

function setPressed(button, value) {
  if (button) button.setAttribute('aria-pressed', value ? 'true' : 'false');
}

function syncSoundUI() {
  setPressed(refs.menuSound, sound.enabled);
  setPressed(refs.pauseSound, sound.enabled);
}

function syncTiltUI() {
  const enabled = input.tilt.enabled;
  setPressed(refs.menuTilt, enabled);
  setPressed(refs.pauseTilt, enabled);
  refs.recenterBtn.classList.toggle('is-hidden', !enabled);
  refs.tiltChip.classList.toggle('is-hidden', !(enabled && state.mode === 'playing'));
  refs.tiltNote.textContent = enabled ? 'Tilt is active. Hold your device comfortably.' : '';
}

function updateBestLine() {
  refs.bestLine.textContent = best > 0 ? `Best ${formatScore(best)}` : '';
}

function applyPalette(next) {
  sky.material.uniforms.uTop.value.set(next.skyTop);
  sky.material.uniforms.uMid.value.set(next.skyMid);
  sky.material.uniforms.uLow.value.set(next.skyLow);
  sky.material.uniforms.uSun.value.set(next.sun);
  cloudMaterial.uniforms.uLow.value.set(next.cloudLow);
  cloudMaterial.uniforms.uHigh.value.set(next.cloudHigh);
  sunSprite.material.color.set(next.sun);
  hemisphere.color.set(next.skyMid);
  hemisphere.groundColor.set(next.terrainLow);
  sunLight.color.set(next.sun);
  rimLight.color.set(next.floraA);
  scene.fog.color.set(next.fog);
}

function buildChapter(index, { menu = false } = {}) {
  if (player) player.dispose();
  if (world) world.dispose();
  player = null;
  world = null;

  state.chapter = index;
  config = CHAPTERS[index];
  palette = PALETTES[index % PALETTES.length];
  applyPalette(palette);

  world = new World(scene, config, palette);
  player = new Player(scene, world, palette);
  state.total = world.total;
  state.sparks = 0;
  state.hits = 0;
  state.timeLeft = config.time;
  state.mode = menu ? 'menu' : 'playing';
  state.menuAngle = 0.42;

  refs.chapterTag.textContent = config.number;
  refs.chapterName.textContent = config.name;
  refs.sparkTotal.textContent = String(world.total);
  refs.sparkCount.textContent = '0';
  refs.sparkBar.style.width = '0%';
  refs.timer.classList.remove('urgent');
  refs.shrineBanner.classList.add('is-hidden');
  refs.tiltChip.classList.add('is-hidden');
  updateHud();
  updateBestLine();
}

function updateHud() {
  if (!world) return;
  refs.sparkCount.textContent = String(state.sparks);
  refs.sparkTotal.textContent = String(state.total);
  refs.sparkBar.style.width = `${clamp((state.sparks / state.total) * 100, 0, 100)}%`;
  refs.timerText.textContent = formatTime(state.timeLeft);
  const percent = clamp((state.timeLeft / config.time) * 100, 0, 100);
  refs.timerRing.style.setProperty('--p', percent.toFixed(2));
  refs.timer.classList.toggle('urgent', state.mode === 'playing' && state.timeLeft <= 15);
  refs.tiltChip.classList.toggle('is-hidden', !(input.tilt.enabled && state.mode === 'playing'));
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.remove('is-hidden');
  requestAnimationFrame(() => refs.toast.classList.add('show'));
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    refs.toast.classList.remove('show');
    window.setTimeout(() => refs.toast.classList.add('is-hidden'), 340);
  }, 2400);
}

function triggerFlash(kind) {
  refs.flash.classList.remove('hit', 'gain');
  void refs.flash.offsetWidth;
  refs.flash.classList.add(kind);
  window.clearTimeout(state.flashTimer);
  state.flashTimer = window.setTimeout(() => refs.flash.classList.remove('hit', 'gain'), 180);
}

function showChapterCard() {
  refs.introNumber.textContent = config.number;
  refs.introTitle.textContent = config.name;
  refs.introObjective.textContent = config.objective;
  refs.intro.classList.add('is-active');
  window.clearTimeout(state.cardTimer);
  state.cardTimer = window.setTimeout(() => refs.intro.classList.remove('is-active'), 2400);
}

function showHint(text) {
  refs.hintText.textContent = text;
  refs.hint.classList.remove('is-hidden', 'fade');
  window.clearTimeout(state.hintTimer);
  state.hintTimer = window.setTimeout(() => refs.hint.classList.add('fade'), 5200);
  window.setTimeout(() => refs.hint.classList.add('is-hidden'), 6400);
}

function hideHint() {
  refs.hint.classList.add('is-hidden');
}

async function startRun() {
  if (state.mode !== 'menu') return;
  let tiltRequest = null;
  if (localStorage.getItem('iola-tilt') === '1' && input.tilt.supported && !input.tilt.enabled) {
    tiltRequest = input.enableTilt();
  }
  try {
    await sound.start();
  } catch {
    sound.enabled = false;
    syncSoundUI();
  }
  if (tiltRequest) {
    try {
      await tiltRequest;
    } catch {
      localStorage.setItem('iola-tilt', '0');
    }
  }
  sound.startJourney();
  state.totalScore = 0;
  buildChapter(0);
  state.mode = 'playing';
  refs.menu.classList.remove('is-active');
  refs.pause.classList.remove('is-active');
  refs.result.classList.remove('is-active');
  refs.hud.classList.remove('is-hidden');
  showChapterCard();
  showHint(input.tilt.enabled ? 'Tilt to guide Iola — or drag anywhere' : 'Drag anywhere to guide Iola');
  updateHud();
  syncTiltUI();
}

function beginChapter(index, { resetRun = false } = {}) {
  if (resetRun) state.totalScore = 0;
  buildChapter(index);
  state.mode = 'playing';
  refs.pause.classList.remove('is-active');
  refs.result.classList.remove('is-active');
  refs.hud.classList.remove('is-hidden');
  showChapterCard();
  showHint(input.tilt.enabled ? 'Tilt to guide Iola — or drag anywhere' : 'Drag anywhere to guide Iola');
  updateHud();
  syncTiltUI();
}

function pauseGame() {
  if (state.mode !== 'playing') return;
  state.mode = 'paused';
  input.resetJoystick();
  refs.pause.classList.add('is-active');
  hideHint();
  sound.ui();
  updateHud();
}

function resumeGame() {
  if (state.mode !== 'paused') return;
  state.mode = 'playing';
  refs.pause.classList.remove('is-active');
  sound.ui();
  updateHud();
}

function retryChapter() {
  refs.result.classList.remove('is-active');
  beginChapter(state.chapter);
  sound.ui();
}

function nextChapter() {
  refs.result.classList.remove('is-active');
  beginChapter(state.chapter + 1);
  sound.ui();
}

function playAgain() {
  refs.result.classList.remove('is-active');
  beginChapter(0, { resetRun: true });
  sound.ui();
}

function returnToTitle() {
  state.mode = 'menu';
  state.totalScore = 0;
  refs.result.classList.remove('is-active');
  refs.pause.classList.remove('is-active');
  refs.hud.classList.add('is-hidden');
  refs.menu.classList.add('is-active');
  hideHint();
  refs.shrineBanner.classList.add('is-hidden');
  buildChapter(0, { menu: true });
  updateBestLine();
  sound.ui();
}

function completeChapter() {
  if (state.mode !== 'playing') return;
  state.mode = 'complete';
  const last = state.chapter >= CHAPTERS.length - 1;
  const timeBonus = Math.ceil(state.timeLeft) * 10;
  const cleanBonus = state.hits === 0 ? 500 : 0;
  const chapterScore = state.sparks * 100 + timeBonus + cleanBonus;
  state.totalScore += chapterScore;

  sound.complete();
  input.resetJoystick();
  hideHint();
  refs.hud.classList.add('is-hidden');
  refs.shrineBanner.classList.add('is-hidden');
  refs.resultEyebrow.textContent = last ? 'The dawn returns' : 'Chapter complete';
  refs.resultTitle.textContent = last ? 'You carried the light' : 'The shrine answers';
  refs.resultText.textContent = last
    ? `Every spark found its way home. Your total light is ${formatScore(state.totalScore)}.`
    : 'The dark recedes, and a new stretch of twilight waits beyond.';
  refs.statSparks.textContent = String(state.sparks);
  refs.statTime.textContent = formatTime(state.timeLeft);
  refs.statScore.textContent = formatScore(chapterScore);
  refs.resultPrimary.querySelector('.btn-label').textContent = last ? 'Play again' : 'Continue';
  refs.resultSecondary.querySelector('.btn-label').textContent = 'Return to title';
  state.resultAction = last ? 'again' : 'next';

  if (last) {
    best = Math.max(best, state.totalScore);
    localStorage.setItem('iola-best', String(Math.round(best)));
    updateBestLine();
  }
  refs.result.classList.add('is-active');
}

function failChapter() {
  if (state.mode !== 'playing') return;
  state.mode = 'failed';
  sound.fail();
  input.resetJoystick();
  hideHint();
  refs.hud.classList.add('is-hidden');
  refs.shrineBanner.classList.add('is-hidden');
  refs.resultEyebrow.textContent = 'The light fades';
  refs.resultTitle.textContent = 'The dark closed in';
  refs.resultText.textContent = 'The sparks slip back into the twilight. Take a breath and try once more.';
  refs.statSparks.textContent = String(state.sparks);
  refs.statTime.textContent = '0:00';
  refs.statScore.textContent = formatScore(state.sparks * 100);
  refs.resultPrimary.querySelector('.btn-label').textContent = 'Try again';
  refs.resultSecondary.querySelector('.btn-label').textContent = 'Return to title';
  state.resultAction = 'retry';
  refs.result.classList.add('is-active');
}

async function toggleTilt() {
  if (state.tiltBusy) return;
  state.tiltBusy = true;
  try {
    if (input.tilt.enabled) {
      input.disableTilt();
      localStorage.setItem('iola-tilt', '0');
      showToast('Tilt off — drag to steer');
    } else {
      const request = input.enableTilt();
      await sound.start();
      await request;
      localStorage.setItem('iola-tilt', '1');
      showToast('Tilt on — hold your device naturally');
      window.setTimeout(() => {
        if (input.tilt.enabled && !input.tilt.lastEvent) {
          showToast('No motion data here — drag to steer');
        }
      }, 1800);
    }
  } catch (error) {
    localStorage.setItem('iola-tilt', '0');
    showToast(error.message || 'Tilt is unavailable');
  } finally {
    state.tiltBusy = false;
    syncTiltUI();
    updateHud();
  }
}

async function toggleSound() {
  const next = !sound.enabled;
  sound.setEnabled(next);
  if (next) {
    try {
      await sound.start();
    } catch {
      sound.setEnabled(false);
    }
  }
  localStorage.setItem('iola-sound', sound.enabled ? '1' : '0');
  syncSoundUI();
  if (sound.enabled) sound.ui();
}

function onResultPrimary() {
  if (state.resultAction === 'next') nextChapter();
  else if (state.resultAction === 'retry') retryChapter();
  else if (state.resultAction === 'again') playAgain();
}

function updateCamera(dt, time) {
  if (!player) return;
  if (state.mode === 'menu') {
    state.menuAngle += dt * (reducedMotion ? 0.015 : 0.055);
    const radius = window.innerHeight > window.innerWidth ? 28 : 26;
    const targetX = Math.sin(state.menuAngle) * radius;
    const targetZ = Math.cos(state.menuAngle) * radius;
    const targetY = 9.2 + Math.sin(time * 0.22) * 0.4;
    camera.position.x += (targetX - camera.position.x) * (1 - Math.exp(-1.2 * dt));
    camera.position.y += (targetY - camera.position.y) * (1 - Math.exp(-1.2 * dt));
    camera.position.z += (targetZ - camera.position.z) * (1 - Math.exp(-1.2 * dt));
    camera.lookAt(0, 2.8, 0);
    return;
  }

  const portrait = window.innerHeight > window.innerWidth;
  const offsetY = portrait ? 13.2 : 11.2;
  const offsetZ = portrait ? 23.5 : 20.5;
  const desiredX = player.position.x;
  const desiredY = player.position.y + offsetY;
  const desiredZ = player.position.z + offsetZ;
  const k = 1 - Math.exp(-3.4 * dt);
  camera.position.x += (desiredX - camera.position.x) * k;
  camera.position.y += (desiredY - camera.position.y) * k;
  camera.position.z += (desiredZ - camera.position.z) * k;

  const lookX = player.position.x + player.velocity.x * 0.09;
  const lookY = player.position.y + 2.0;
  const lookZ = player.position.z + player.velocity.z * 0.09 - 4.8;
  camera.lookAt(lookX, lookY, lookZ);
}

function update(dt, time) {
  sky.material.uniforms.uTime.value = time;
  cloudMaterial.uniforms.uTime.value = time;

  if (!world || !player) return;

  const active = state.mode === 'playing';
  const move = input.getMove();
  player.update(dt, move, time, active);
  world.update(dt, time, player.position, active);

  if (state.mode === 'playing') {
    state.timeLeft = Math.max(0, state.timeLeft - dt);

    const collected = world.collect(player.position);
    if (collected.length > 0) {
      for (let i = 0; i < collected.length; i++) {
        state.sparks++;
        sound.pickup(state.sparks - 1);
      }
      triggerFlash('gain');
      updateHud();
      if (state.sparks >= state.total && !world.shrineOpen) {
        world.openShrine();
        sound.portal();
        refs.shrineBanner.classList.remove('is-hidden');
        showToast('The shrine is awake');
      }
    }

    const wisp = world.checkWispCollision(player.position, player.invulnerable > 0);
    if (wisp) {
      player.hit(wisp.group.position);
      state.hits++;
      state.timeLeft = Math.max(0, state.timeLeft - 10);
      sound.hit();
      triggerFlash('hit');
      showToast('The dark takes ten seconds');
      world.burst.spawn(wisp.group.position, palette.wisp, 28, 3.4, 0.55, 0.6);
      updateHud();
    }

    if (player.edgeHit) world.pulseDome();

    if (world.shrineOpen && world.isNearShrine(player.position)) {
      completeChapter();
    } else if (state.timeLeft <= 0) {
      failChapter();
    }

    updateHud();
  }

  updateCamera(dt, time);
}

let lastTime = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  update(dt, now / 1000);
  composer.render();
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2));
  renderer.setSize(width, height);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(width, height);
  camera.aspect = width / height;
  camera.fov = height > width ? 62 : 55;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => window.setTimeout(resize, 120));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.mode === 'playing') pauseGame();
});

$('startBtn').addEventListener('click', startRun);
$('pauseBtn').addEventListener('click', pauseGame);
$('resumeBtn').addEventListener('click', resumeGame);
$('restartBtn').addEventListener('click', retryChapter);
$('quitBtn').addEventListener('click', returnToTitle);
refs.resultPrimary.addEventListener('click', onResultPrimary);
refs.resultSecondary.addEventListener('click', returnToTitle);
refs.menuSound.addEventListener('click', toggleSound);
refs.pauseSound.addEventListener('click', toggleSound);
refs.menuTilt.addEventListener('click', toggleTilt);
refs.pauseTilt.addEventListener('click', toggleTilt);
refs.recenterBtn.addEventListener('click', () => {
  input.recalibrate();
  showToast('Tilt recentered — hold naturally');
  sound.ui();
});

if (!input.tilt.supported) {
  refs.menuTilt.classList.add('is-hidden');
  refs.pauseTilt.classList.add('is-hidden');
  refs.tiltCard.classList.add('is-hidden');
  refs.recenterBtn.classList.add('is-hidden');
}

syncSoundUI();
syncTiltUI();
updateBestLine();
buildChapter(0, { menu: true });
resize();
requestAnimationFrame(frame);

window.__iola = {
  THREE,
  renderer,
  scene,
  camera,
  composer,
  state,
  input,
  sound,
  get world() { return world; },
  get player() { return player; },
  renderDirect() { renderer.render(scene, camera); }
};
