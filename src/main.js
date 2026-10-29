import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { buildWorld } from './world.js'
import { Effects } from './effects.js'
import { createWeapon } from './weapon.js'
import { EnemySystem } from './enemies.js'
import { AudioEngine } from './audio.js'

const $ = (id) => document.getElementById(id)
const clamp = THREE.MathUtils.clamp
const isTouchDevice = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
const mobileUI = isTouchDevice || innerWidth <= 900

// ---------------------------------------------------------------- renderer
const canvas = $('game')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false })
const dpr = Math.min(devicePixelRatio || 1, mobileUI ? 1.55 : 2)
renderer.setPixelRatio(dpr)
renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.14
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.045, 320)
camera.rotation.order = 'YXZ'
scene.add(camera)

const world = buildWorld(scene, renderer)
const effects = new Effects(scene)
const audio = new AudioEngine()
const weapon = createWeapon(camera)
weapon.group.visible = false

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), mobileUI ? 0.55 : 0.68, 0.7, 0.82)
composer.addPass(bloom)
composer.addPass(new OutputPass())

// ---------------------------------------------------------------- state
const game = {
  mode: 'menu',
  time: 0,
  wave: 1,
  score: 0,
  best: 0,
  health: 100,
  maxHealth: 100,
  shield: 50,
  maxShield: 50,
  ammo: 30,
  magSize: 30,
  reserve: 240,
  kills: 0,
  shots: 0,
  hits: 0,
  combo: 1,
  comboTimer: 0,
  streak: 0,
  reloading: false,
  reloadT: 0,
  reloadDuration: 1.55,
  fireCooldown: 0,
  fireRate: 0.094,
  lastDamage: -99,
  damageFlash: 0,
  shake: 0,
  betweenWaves: false,
  waveTimer: 0,
  dead: false,
  tilt: false,
  audioOn: true
}

try { game.best = Number(localStorage.getItem('nightfall-best') || 0) || 0 } catch {}
$('best-score').textContent = String(game.best).padStart(6, '0')

const player = {
  pos: world.playerStart.clone(),
  vel: new THREE.Vector3(),
  vy: 0,
  grounded: true,
  yaw: 0,
  pitch: -0.03,
  recoilPitch: 0,
  recoilYaw: 0,
  bobT: 0,
  stepT: 0,
  fov: 72
}

const touch = {
  show: false,
  joy: { id: null, x: 0, y: 0, mag: 0 },
  look: { id: null, x: 0, y: 0 },
  firing: false
}

const keys = new Set()
let lookDX = 0
let lookDY = 0
let pointerLocked = false
let toastTimer = 0
let lastHud = {}

const enemySystem = new EnemySystem(scene, effects, audio, world, {
  onKill: (enemy, headshot) => {
    game.kills++
    game.streak++
    game.combo = Math.min(4, 1 + Math.floor(game.streak / 3) * 0.25 + (headshot ? 0.25 : 0))
    game.comboTimer = 4.5
    const base = enemy.elite ? 320 : 110
    game.score += Math.round(base * game.combo + (headshot ? 55 : 0))
    addKillFeed(enemy, headshot)
    showHit(true)
    if (headshot) flashHeadshot()
    audio.kill()
  },
  onWaveComplete: () => {
    game.betweenWaves = true
    game.waveTimer = 4.6
    game.score += 350 * game.wave
    game.health = Math.min(game.maxHealth, game.health + 22)
    game.reserve = Math.min(400, game.reserve + 70)
    banner('SECTOR CLEAR', `WAVE ${String(game.wave).padStart(2, '0')}`, 'REDEPLOYING IN 4 SECONDS')
    audio.wave()
  },
  onPlayerHit: (damage, point) => {
    if (game.mode !== 'playing') return
    const absorb = Math.min(game.shield, damage * 0.65)
    game.shield -= absorb
    game.health -= damage * 0.35 + Math.max(0, damage * 0.65 - absorb)
    game.lastDamage = game.time
    game.damageFlash = 1
    game.shake = Math.min(1.4, game.shake + 0.55)
    audio.hurt()
    if (game.health <= 0) endGame()
  }
})

// ---------------------------------------------------------------- helpers
function padScore(n) { return String(Math.max(0, Math.round(n))).padStart(6, '0') }
function setText(el, value) { if (el && lastHud[el.id] !== value) { el.textContent = value; lastHud[el.id] = value } }

function banner(kicker, main, sub) {
  const el = $('wave-banner')
  el.querySelector('.wb-kicker').textContent = kicker
  el.querySelector('.wb-main').textContent = main
  el.querySelector('.wb-sub').textContent = sub
  el.classList.remove('show')
  void el.offsetWidth
  el.classList.add('show')
}

function toast(text) {
  const el = $('toast')
  el.textContent = text
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600)
}

function addKillFeed(enemy, headshot) {
  const feed = $('killfeed')
  const line = document.createElement('div')
  line.className = 'kill-line' + (headshot ? ' head' : '')
  line.innerHTML = `VOSS-07 <b>✦</b> ${enemy.elite ? 'ELITE SENTINEL' : 'SENTINEL'}${headshot ? ' // HEADSHOT' : ''}`
  feed.prepend(line)
  while (feed.children.length > 5) feed.lastElementChild.remove()
  setTimeout(() => line.remove(), 2900)
}

let hitTimer = 0
function showHit(kill = false) {
  const el = $('hitmarker')
  el.classList.remove('on')
  el.classList.toggle('kill', kill)
  void el.offsetWidth
  el.classList.add('on')
  clearTimeout(hitTimer)
  hitTimer = setTimeout(() => el.classList.remove('on'), 170)
}

let headTimer = 0
function flashHeadshot() {
  const el = $('headshot-label')
  el.classList.add('on')
  clearTimeout(headTimer)
  headTimer = setTimeout(() => el.classList.remove('on'), 700)
}

function updatePips() {
  const pips = $('ammo-pips')
  if (!pips.children.length) for (let i = 0; i < 12; i++) pips.appendChild(document.createElement('i'))
  const filled = Math.ceil(game.ammo / game.magSize * 12)
  for (let i = 0; i < 12; i++) pips.children[i].classList.toggle('spent', i >= filled)
}
updatePips()

function updateHUD() {
  setText($('wave-num'), String(game.wave).padStart(2, '0'))
  setText($('hostiles-left'), String(enemySystem.activeCount()).padStart(2, '0'))
  setText($('score'), padScore(game.score))
  setText($('multiplier'), `x${game.combo.toFixed(2)}`)
  setText($('health-value'), String(Math.max(0, Math.ceil(game.health))))
  setText($('shield-value'), String(Math.max(0, Math.ceil(game.shield))))
  setText($('ammo'), String(game.ammo).padStart(2, '0'))
  setText($('reserve'), String(game.reserve).padStart(3, '0'))
  setText($('reload-state'), game.reloading ? 'RELOADING' : '')
  $('health-fill').style.width = `${clamp(game.health / game.maxHealth * 100, 0, 100)}%`
  $('shield-fill').style.width = `${clamp(game.shield / game.maxShield * 100, 0, 100)}%`
  $('damage-vignette').style.opacity = game.health < 55 ? String((1 - game.health / 55) * 0.85) : '0'
  $('damage-flash').style.opacity = String(game.damageFlash * 0.85)
  $('streak').textContent = game.streak >= 3 ? `${game.streak} STREAK` : ''
  $('streak').classList.toggle('on', game.streak >= 3)
  const pips = $('ammo-pips')
  if (pips.children.length) {
    const filled = Math.ceil(game.ammo / game.magSize * 12)
    for (let i = 0; i < pips.children.length; i++) pips.children[i].classList.toggle('spent', i >= filled)
  }
}

function syncTiltUI() {
  const on = game.tilt
  $('btn-tilt').classList.toggle('active', on)
  $('btn-tilt').querySelector('.touch-label').textContent = on ? 'TILT ON' : 'TILT OFF'
  $('btn-tilt').setAttribute('aria-pressed', String(on))
  $('menu-tilt').setAttribute('aria-pressed', String(on))
  $('menu-tilt').querySelector('.mt-state').textContent = on ? 'ON' : 'OFF'
}

// ---------------------------------------------------------------- controls
const tilt = { enabled: false, neutral: null, data: null, listening: false }

async function toggleTilt() {
  if (game.tilt) {
    game.tilt = false
    tilt.neutral = null
    syncTiltUI()
    toast('TILT AIM DISABLED')
    return
  }
  try {
    const DOE = window.DeviceOrientationEvent
    if (!DOE) { toast('MOTION SENSORS NOT AVAILABLE'); return }
    if (typeof DOE.requestPermission === 'function') {
      const granted = await DOE.requestPermission()
      if (granted !== 'granted') { toast('MOTION PERMISSION DENIED'); return }
    }
    if (!tilt.listening) {
      tilt.listening = true
      window.addEventListener('deviceorientation', (event) => {
        if (event.beta == null || event.gamma == null) return
        tilt.data = { beta: event.beta, gamma: event.gamma }
      })
    }
    tilt.neutral = null
    game.tilt = true
    syncTiltUI()
    toast('TILT AIM ONLINE — HOLD DEVICE STEADY')
  } catch {
    toast('MOTION PERMISSION UNAVAILABLE')
  }
}

function isUIElement(target) {
  return target.closest('button, #stick-base, #btn-fire, #btn-reload, #btn-jump, #btn-tilt, .overlay')
}

function setupTouch() {
  $('btn-fire').addEventListener('pointerdown', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (game.mode !== 'playing') return
    touch.firing = true
    e.currentTarget.classList.add('active')
  })
  const endFire = (e) => { touch.firing = false; $('btn-fire').classList.remove('active') }
  $('btn-fire').addEventListener('pointerup', endFire)
  $('btn-fire').addEventListener('pointercancel', endFire)
  $('btn-fire').addEventListener('pointerleave', (e) => { if (e.buttons === 0) endFire(e) })

  $('btn-reload').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); startReload() })
  $('btn-jump').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); jump() })
  $('btn-tilt').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); toggleTilt() })

  const stick = $('stick-base')
  const knob = $('stick-knob')
  const stickRect = () => stick.getBoundingClientRect()
  function moveStick(e) {
    const r = stickRect()
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    let dx = e.clientX - cx, dy = e.clientY - cy
    const max = r.width * 0.34
    const mag = Math.hypot(dx, dy)
    if (mag > max) { dx = dx / mag * max; dy = dy / mag * max }
    knob.style.transform = `translate(${dx}px, ${dy}px)`
    touch.joy.x = dx / max
    touch.joy.y = dy / max
    touch.joy.mag = Math.min(1, mag / max)
  }
  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (touch.joy.id !== null) return
    touch.joy.id = e.pointerId
    stick.setPointerCapture(e.pointerId)
    moveStick(e)
  })
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === touch.joy.id) moveStick(e) })
  const endStick = (e) => {
    if (e.pointerId !== touch.joy.id) return
    touch.joy.id = null
    touch.joy.x = touch.joy.y = touch.joy.mag = 0
    knob.style.transform = 'translate(0, 0)'
  }
  stick.addEventListener('pointerup', endStick)
  stick.addEventListener('pointercancel', endStick)

  const look = $('look-zone')
  look.addEventListener('pointerdown', (e) => {
    if (game.mode !== 'playing') return
    e.preventDefault()
    if (touch.look.id !== null) return
    touch.look.id = e.pointerId
    touch.look.x = e.clientX
    touch.look.y = e.clientY
    look.setPointerCapture(e.pointerId)
  })
  look.addEventListener('pointermove', (e) => {
    if (e.pointerId !== touch.look.id) return
    const dx = e.clientX - touch.look.x
    const dy = e.clientY - touch.look.y
    touch.look.x = e.clientX
    touch.look.y = e.clientY
    const sens = 2.9
    lookDX += dx * sens
    lookDY += dy * sens
  })
  const endLook = (e) => { if (e.pointerId === touch.look.id) touch.look.id = null }
  look.addEventListener('pointerup', endLook)
  look.addEventListener('pointercancel', endLook)
}

function setupDesktop() {
  addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase()
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) e.preventDefault()
    if (key === 'escape') {
      if (game.mode === 'playing') pauseGame()
      else if (game.mode === 'paused') resumeGame()
      return
    }
    if (key === 'p') { if (game.mode === 'playing') pauseGame(); else if (game.mode === 'paused') resumeGame(); return }
    if (key === 'r') startReload()
    if (key === 'm') toggleAudio()
    keys.add(key)
  })
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()))
  addEventListener('blur', () => { keys.clear(); touch.firing = false })
  canvas.addEventListener('click', () => {
    if (game.mode === 'playing' && !isTouchDevice) requestLock()
  })
  addEventListener('mousemove', (e) => {
    if (game.mode !== 'playing') return
    if (pointerLocked) {
      lookDX += e.movementX * 1.6
      lookDY += e.movementY * 1.6
    }
  })
  addEventListener('mousedown', (e) => {
    if (e.button === 0 && game.mode === 'playing' && !isUIElement(e.target)) touch.firing = true
  })
  addEventListener('mouseup', (e) => { if (e.button === 0) touch.firing = false })
  addEventListener('contextmenu', (e) => e.preventDefault())
  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === canvas
    if (!pointerLocked && game.mode === 'playing' && !isTouchDevice) {
      // Pointer lock can be refused without leaving gameplay; show a reminder only once.
      if (!game.lockHintShown) { game.lockHintShown = true; toast('CLICK TO CAPTURE MOUSE') }
    }
  })
}

function requestLock() {
  try {
    const p = canvas.requestPointerLock?.()
    if (p?.catch) p.catch(() => {})
  } catch {}
}

function jump() {
  if (game.mode !== 'playing' || !player.grounded) return
  player.vy = 5.2
  player.grounded = false
  audio.noiseBurst(0.12, 0.03, 'lowpass', 300, 1)
}

function startReload() {
  if (game.mode !== 'playing' || game.reloading || game.ammo >= game.magSize || game.reserve <= 0) return
  game.reloading = true
  game.reloadT = 0
  weapon.setReloading(true)
  weapon.reloadProgress = 0
  audio.reload()
}

function toggleAudio() {
  game.audioOn = !game.audioOn
  audio.setEnabled(game.audioOn)
  $('btn-audio').textContent = game.audioOn ? 'SOUND ON' : 'SOUND OFF'
}

// ---------------------------------------------------------------- game flow
function resetGame() {
  Object.assign(game, {
    wave: 1, score: 0, health: 100, shield: 50, ammo: 30, reserve: 240,
    kills: 0, shots: 0, hits: 0, combo: 1, comboTimer: 0, streak: 0,
    reloading: false, reloadT: 0, fireCooldown: 0, lastDamage: -99,
    damageFlash: 0, shake: 0, betweenWaves: false, waveTimer: 0, dead: false,
    lockHintShown: false
  })
  player.pos.copy(world.playerStart)
  player.vel.set(0, 0, 0)
  player.vy = 0
  player.grounded = true
  player.yaw = 0
  player.pitch = -0.03
  player.recoilPitch = player.recoilYaw = 0
  player.bobT = 0
  camera.fov = player.fov = 72
  camera.updateProjectionMatrix()
  weapon.setReloading(false)
  weapon.reloadProgress = 0
  weapon.setAmmo(30, 30)
  enemySystem.clear()
  $('killfeed').innerHTML = ''
  setText($('final-score'), '0')
  updateHUD()
}

function startGame() {
  audio.init()
  audio.resume()
  audio.ui()
  if (game.tilt) { /* already enabled */ } else { /* leave off by default */ }
  resetGame()
  qualityWindowStart = performance.now()
  qualityFrames = 0
  game.mode = 'playing'
  $('menu').classList.add('hidden')
  $('gameover').classList.add('hidden')
  $('pause').classList.add('hidden')
  const appRoot = document.getElementById('app')
  if (appRoot) appRoot.scrollTop = 0
  window.scrollTo(0, 0)
  $('hud').classList.remove('hidden')
  if (mobileUI) { $('touch-ui').classList.remove('hidden'); touch.show = true }
  weapon.group.visible = true
  weapon.setAspect(camera.aspect)
  camera.position.copy(player.pos)
  camera.rotation.set(player.pitch, player.yaw, 0)
  setTimeout(() => {
    enemySystem.startWave(1)
    banner('INCOMING', 'WAVE 01', 'SENTINEL SWARM DETECTED')
    audio.wave()
  }, 80)
  if (mobileUI) toast('MOVE · AIM · HOLD FIRE')
  else setTimeout(() => toast(isTouchDevice ? 'MOVE · AIM · HOLD FIRE' : 'CLICK THE VIEW TO CAPTURE THE MOUSE'), 900)
}

function pauseGame() {
  if (game.mode !== 'playing') return
  game.mode = 'paused'
  $('pause').classList.remove('hidden')
  touch.firing = false
  keys.clear()
  if (document.pointerLockElement) document.exitPointerLock()
}

function resumeGame() {
  if (game.mode !== 'paused') return
  game.mode = 'playing'
  $('pause').classList.add('hidden')
  audio.resume()
}

function endGame() {
  if (game.dead) return
  game.dead = true
  game.deadAt = game.time
  game.mode = 'gameover'
  game.health = 0
  touch.firing = false
  touch.joy.x = touch.joy.y = 0
  $('touch-ui').classList.add('hidden')
  if (document.pointerLockElement) document.exitPointerLock()
  const acc = game.shots ? Math.round(game.hits / game.shots * 100) : 0
  $('final-wave').textContent = String(game.wave).padStart(2, '0')
  $('final-score').textContent = String(game.score)
  $('final-kills').textContent = String(game.kills)
  $('final-acc').textContent = `${acc}%`
  if (game.score > game.best) {
    game.best = game.score
    try { localStorage.setItem('nightfall-best', String(game.best)) } catch {}
  }
  $('best-score').textContent = String(game.best).padStart(6, '0')
  setTimeout(() => $('gameover').classList.remove('hidden'), 650)
  audio.explosion()
}

function backToMenu() {
  game.mode = 'menu'
  game.dead = false
  $('gameover').classList.add('hidden')
  $('pause').classList.add('hidden')
  $('hud').classList.add('hidden')
  $('touch-ui').classList.add('hidden')
  $('menu').classList.remove('hidden')
  weapon.group.visible = false
  enemySystem.clear()
  effects.update(0.016)
}

// ---------------------------------------------------------------- shooting
const raycaster = new THREE.Raycaster()
raycaster.far = 180
const tmpDir = new THREE.Vector3()
const tmpWorld = new THREE.Vector3()

function shoot() {
  game.ammo--
  game.shots++
  game.fireCooldown = game.fireRate * (0.94 + Math.random() * 0.12)
  weapon.fire()
  audio.shot()
  game.shake = Math.min(1.2, game.shake + 0.1)
  player.recoilPitch += 0.0065 + Math.random() * 0.0045
  player.recoilYaw += (Math.random() - 0.5) * 0.006
  game.comboTimer = Math.max(game.comboTimer, 0.2)

  camera.updateMatrixWorld(true)
  camera.getWorldDirection(tmpDir)
  const spread = 0.0018 + (player.vel.length() > 1 ? 0.0035 : 0) + (player.grounded ? 0 : 0.004)
  const dir = tmpDir.clone()
  dir.x += (Math.random() - 0.5) * spread
  dir.y += (Math.random() - 0.5) * spread
  dir.z += (Math.random() - 0.5) * spread
  dir.normalize()

  // subtle magnetism for touch aiming
  if (mobileUI) {
    const origin = camera.position
    let best = null, bestDot = 0.996
    for (const e of enemySystem.enemies) {
      const to = e.group.position.clone().sub(origin).normalize()
      const d = to.dot(dir)
      if (d > bestDot) { bestDot = d; best = e }
    }
    if (best) {
      const to = best.group.position.clone().sub(camera.position).normalize()
      dir.lerp(to, 0.35 + (1 - bestDot) * 30).normalize()
    }
  }

  raycaster.set(camera.position, dir)
  const enemyHit = enemySystem.intersect(raycaster)
  const worldHits = raycaster.intersectObjects(world.solids, false)
  const worldHit = worldHits[0]
  const muzzlePos = weapon.muzzle.getWorldPosition(new THREE.Vector3())
  let endPoint = camera.position.clone().addScaledVector(dir, 90)

  if (enemyHit && (!worldHit || enemyHit.distance < worldHit.distance)) {
    const enemy = enemyHit.object.userData.enemy
    const headshot = Boolean(enemyHit.object.userData.head)
    let damage = headshot ? 58 : 25
    if (enemyHit.object === enemy.shield) damage *= 0.4
    game.hits++
    enemySystem.damage(enemy, damage, enemyHit.point, enemyHit.face?.normal.clone().transformDirection(enemyHit.object.matrixWorld) || dir.clone().negate(), headshot)
    showHit(enemy.hp <= 0)
    audio.hit()
    endPoint.copy(enemyHit.point)
  } else if (worldHit) {
    const normal = worldHit.face ? worldHit.face.normal.clone().transformDirection(worldHit.object.matrixWorld) : dir.clone().negate()
    effects.impact(worldHit.point, normal, 0xffc582)
    endPoint.copy(worldHit.point)
  }
  effects.tracer(muzzlePos, endPoint)
  const shellDir = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
  const shellPos = camera.localToWorld(new THREE.Vector3(0.46, -0.18, 0.18))
  effects.shell(shellPos, shellDir)

  weapon.setAmmo(game.ammo, game.magSize)
  if (game.ammo === 0 && game.reserve > 0) setTimeout(() => startReload(), 260)
  updateHUD()
}

// ---------------------------------------------------------------- physics
function resolveCollisions(pos) {
  const feet = pos.y - 1.72
  for (const box of world.colliders) {
    if (box.max.y < feet + 0.15 || box.min.y > feet + 1.75) continue
    const minX = box.min.x - 0.42, maxX = box.max.x + 0.42
    const minZ = box.min.z - 0.42, maxZ = box.max.z + 0.42
    if (pos.x <= minX || pos.x >= maxX || pos.z <= minZ || pos.z >= maxZ) continue
    const dl = pos.x - minX, dr = maxX - pos.x, db = pos.z - minZ, df = maxZ - pos.z
    const m = Math.min(dl, dr, db, df)
    if (m === dl) pos.x = minX
    else if (m === dr) pos.x = maxX
    else if (m === db) pos.z = minZ
    else pos.z = maxZ
  }
  pos.x = clamp(pos.x, -world.bounds, world.bounds)
  pos.z = clamp(pos.z, -world.bounds, world.bounds)
}

function updatePlayer(dt) {
  const yaw = player.yaw
  let strafe = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0) + touch.joy.x
  let forward = (keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0) - touch.joy.y
  const inputMag = Math.min(1, Math.hypot(strafe, forward))
  if (inputMag > 1) { strafe /= inputMag; forward /= inputMag }
  const sprint = keys.has('shift') || touch.joy.mag > 0.92 || inputMag > 1.01
  const speed = sprint ? 8.7 : 5.35
  const sin = Math.sin(yaw), cos = Math.cos(yaw)
  const wishX = (-sin * forward + cos * strafe)
  const wishZ = (-cos * forward - sin * strafe)
  const targetMag = inputMag * speed
  const tx = wishX * targetMag
  const tz = wishZ * targetMag
  const accel = player.grounded ? 13 : 4.5
  player.vel.x += (tx - player.vel.x) * Math.min(1, dt * accel)
  player.vel.z += (tz - player.vel.z) * Math.min(1, dt * accel)
  if (inputMag < 0.02) {
    player.vel.x *= Math.max(0, 1 - dt * 11)
    player.vel.z *= Math.max(0, 1 - dt * 11)
  }
  player.pos.x += player.vel.x * dt
  player.pos.z += player.vel.z * dt

  if (keys.has(' ') || keys.has('space')) jump()

  player.vy -= 18 * dt
  player.pos.y += player.vy * dt
  const eyeGround = 1.72
  if (player.pos.y <= eyeGround) {
    player.pos.y = eyeGround
    player.vy = 0
    player.grounded = true
  }
  resolveCollisions(player.pos)

  // head bob & footsteps
  const horizSpeed = Math.hypot(player.vel.x, player.vel.z)
  const moveAmount = Math.min(1, horizSpeed / 5.4)
  if (player.grounded && moveAmount > 0.1) {
    player.bobT += dt * (7.2 + horizSpeed * 0.8)
    player.stepT += dt * (1.4 + horizSpeed * 0.45)
    if (player.stepT > 1) { player.stepT = 0; audio.footstep() }
  }
  const bobY = Math.sin(player.bobT * 2) * 0.028 * moveAmount
  const bobRoll = Math.cos(player.bobT) * 0.011 * moveAmount

  player.recoilPitch *= Math.exp(-dt * 8.5)
  player.recoilYaw *= Math.exp(-dt * 8.5)
  game.shake = Math.max(0, game.shake - dt * 3.4)
  game.damageFlash = Math.max(0, game.damageFlash - dt * 4)

  const lookSens = 0.0017
  player.yaw -= lookDX * lookSens
  player.pitch -= lookDY * lookSens
  player.pitch = clamp(player.pitch, -1.32, 1.3)

  // tilt aim
  if (game.tilt && tilt.data) {
    if (!tilt.neutral) tilt.neutral = { beta: tilt.data.beta, gamma: tilt.data.gamma }
    const dz = 0.08
    let g = clamp((tilt.data.gamma - tilt.neutral.gamma) / 22, -1, 1)
    let b = clamp((tilt.data.beta - tilt.neutral.beta) / 22, -1, 1)
    g = Math.abs(g) < dz ? 0 : (g - Math.sign(g) * dz) / (1 - dz)
    b = Math.abs(b) < dz ? 0 : (b - Math.sign(b) * dz) / (1 - dz)
    player.yaw -= g * dt * 1.5
    player.pitch -= b * dt * 1.0
  }

  const sh = game.shake
  const shakeX = sh * 0.013 * Math.sin(game.time * 73)
  const shakeY = sh * 0.011 * Math.sin(game.time * 61 + 1.7)
  const roll = -strafe * 0.017 * inputMag + bobRoll + shakeX * 0.7
  camera.position.set(player.pos.x, player.pos.y + bobY, player.pos.z)
  camera.rotation.set(
    clamp(player.pitch + player.recoilPitch + shakeY, -1.35, 1.35),
    player.yaw + player.recoilYaw + shakeX,
    roll
  )
  const sprintTarget = sprint ? 6.5 : 0
  player.fov += (72 + sprintTarget - player.fov) * Math.min(1, dt * 4)
  camera.fov += (player.fov - camera.fov) * Math.min(1, dt * 7)
  camera.updateProjectionMatrix()

  weapon.update(dt, game.time, horizSpeed, lookDX, lookDY, player.grounded)
  weapon.reloadProgress = game.reloading ? clamp(game.reloadT / game.reloadDuration, 0, 1) : 0
  lookDX = 0
  lookDY = 0
}

// ---------------------------------------------------------------- combat loop
function updateCombat(dt) {
  game.fireCooldown -= dt
  if (game.reloading) {
    game.reloadT += dt
    if (game.reloadT >= game.reloadDuration) {
      const need = game.magSize - game.ammo
      const take = Math.min(need, game.reserve)
      game.ammo += take
      game.reserve -= take
      game.reloading = false
      weapon.setReloading(false)
      weapon.setAmmo(game.ammo, game.magSize)
      audio.tone('triangle', 760, 1100, 0.07, 0.05)
      updateHUD()
    }
  }

  if (touch.firing && game.fireCooldown <= 0 && !game.reloading && game.mode === 'playing') {
    if (game.ammo > 0) {
      shoot()
    } else {
      audio.empty()
      game.fireCooldown = 0.24
      if (game.reserve > 0) startReload()
    }
  }

  if (game.comboTimer > 0) {
    game.comboTimer -= dt
    if (game.comboTimer <= 0) { game.combo = 1; game.streak = 0 }
  }

  if (game.time - game.lastDamage > 4.5) {
    game.shield = Math.min(game.maxShield, game.shield + dt * 9)
  }
  if (game.time - game.lastDamage > 9 && game.health < game.maxHealth) {
    game.health = Math.min(game.maxHealth, game.health + dt * 1.8)
  }

  if (game.betweenWaves) {
    game.waveTimer -= dt
    if (game.waveTimer <= 0) {
      game.betweenWaves = false
      game.wave++
      enemySystem.startWave(game.wave)
      banner('INCOMING', `WAVE ${String(game.wave).padStart(2, '0')}`, game.wave >= 3 ? 'ELITE SIGNATURES DETECTED' : 'SENTINEL SWARM DETECTED')
      audio.wave()
    }
  }
}

// ---------------------------------------------------------------- minimap
const mini = $('minimap')
const mctx = mini.getContext('2d')
function drawMinimap(time) {
  const w = mini.width, h = mini.height, cx = w / 2, cy = h / 2
  mctx.clearRect(0, 0, w, h)
  mctx.save()
  mctx.translate(cx, cy)
  const scale = w / 44
  mctx.strokeStyle = 'rgba(127,243,255,0.13)'
  mctx.lineWidth = 1
  for (const r of [w * 0.18, w * 0.32, w * 0.46]) {
    mctx.beginPath(); mctx.arc(0, 0, r, 0, Math.PI * 2); mctx.stroke()
  }
  mctx.beginPath(); mctx.moveTo(-cx, 0); mctx.lineTo(cx, 0); mctx.moveTo(0, -cy); mctx.lineTo(0, cy); mctx.stroke()

  const sweep = (time * 1.3) % (Math.PI * 2)
  const grad = mctx.createLinearGradient(0, 0, Math.cos(sweep) * cx, Math.sin(sweep) * cy)
  grad.addColorStop(0, 'rgba(90,240,230,0.22)')
  grad.addColorStop(1, 'rgba(90,240,230,0)')
  mctx.fillStyle = grad
  mctx.beginPath(); mctx.moveTo(0, 0); mctx.arc(0, 0, cx, sweep - 0.55, sweep); mctx.closePath(); mctx.fill()

  const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw)
  for (const e of enemySystem.enemies) {
    const dx = e.group.position.x - player.pos.x
    const dz = e.group.position.z - player.pos.z
    const right = dx * cos - dz * sin
    const fwd = -(dx * sin + dz * cos)
    const ex = right * scale, ey = -fwd * scale
    if (Math.hypot(ex, ey) > cx - 4) continue
    mctx.fillStyle = e.elite ? '#ffb45c' : '#ff4055'
    mctx.shadowColor = e.elite ? '#ffb45c' : '#ff4055'
    mctx.shadowBlur = 8
    mctx.beginPath(); mctx.arc(ex, ey, e.elite ? 4 : 2.8, 0, 6.3); mctx.fill()
  }
  mctx.shadowBlur = 0
  mctx.fillStyle = '#eaffff'
  mctx.beginPath(); mctx.moveTo(0, -7); mctx.lineTo(5, 6); mctx.lineTo(0, 3); mctx.lineTo(-5, 6); mctx.closePath(); mctx.fill()
  mctx.restore()
}

// ---------------------------------------------------------------- menu camera
let menuAngle = 0.7
function updateMenuCamera(dt) {
  menuAngle += dt * 0.055
  const r = 13.5
  camera.position.set(Math.cos(menuAngle) * r, 3.2 + Math.sin(menuAngle * 0.7) * 0.8, Math.sin(menuAngle) * r - 2)
  camera.lookAt(0, 2.5, -4)
  camera.fov += (58 - camera.fov) * Math.min(1, dt * 2)
  camera.updateProjectionMatrix()
}

// ---------------------------------------------------------------- resize / loop
addEventListener('resize', () => {
  const w = innerWidth, h = innerHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobileUI ? 1.55 : 2))
  renderer.setSize(w, h)
  composer.setSize(w, h)
  bloom.resolution.set(w / 2, h / 2)
  weapon.setAspect(w / h)
})

let last = performance.now()
let qualityWindowStart = performance.now()
let qualityFrames = 0
let qualityReduced = false

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  game.time += dt
  world.update(dt)
  effects.update(dt)

  if (game.mode === 'menu') {
    updateMenuCamera(dt)
    enemySystem.update(dt, game.time, camera.position, false)
    if (game.tilt) { /* menu tilt can preview aim; not applied */ }
  } else if (game.mode === 'playing') {
    updatePlayer(dt)
    updateCombat(dt)
    enemySystem.update(dt, game.time, camera.position, true)
    updateHUD()
    camera.updateMatrixWorld(true)
  } else if (game.mode === 'paused') {
    weapon.update(dt, game.time, 0, 0, 0, true)
  } else if (game.mode === 'gameover') {
    const t = Math.min(1, (game.time - game.deadAt || 1) * 0.4)
    player.pitch += (0.25 - player.pitch) * Math.min(1, dt * 1.2)
    camera.rotation.set(player.pitch, player.yaw, 0.16)
  }

  if (game.mode === 'playing' || game.mode === 'menu') drawMinimap(game.time)

  composer.render(dt)

  // adaptive quality for low-powered devices
  if (!qualityReduced && game.mode === 'playing') {
    qualityFrames++
    const elapsed = now - qualityWindowStart
    if (elapsed > 1500) {
      const fps = qualityFrames / (elapsed / 1000)
      if (fps < 42) {
        qualityReduced = true
        const low = fps < 26
        renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio || 1, 1.5))
        renderer.setSize(innerWidth, innerHeight)
        composer.setSize(innerWidth, innerHeight)
        bloom.strength = low ? 0.22 : 0.42
        if (low) {
          bloom.enabled = false
          renderer.shadowMap.enabled = false
        }
      }
      qualityWindowStart = now
      qualityFrames = 0
    }
  }
}

// ---------------------------------------------------------------- boot
function boot() {
  setupTouch()
  setupDesktop()
  $('start-btn').addEventListener('click', startGame)
  $('restart-btn').addEventListener('click', startGame)
  $('restart-btn-pause').addEventListener('click', startGame)
  $('resume-btn').addEventListener('click', resumeGame)
  $('btn-audio').addEventListener('click', toggleAudio)
  $('menu-tilt').addEventListener('click', toggleTilt)
  document.addEventListener('visibilitychange', () => { if (document.hidden && game.mode === 'playing') pauseGame() })
  addEventListener('pointerdown', () => audio.resume(), { once: true })
  syncTiltUI()
  updateHUD()
  camera.position.set(10, 3.4, 9)
  camera.lookAt(0, 2.5, -4)
  if (mobileUI) document.documentElement.classList.add('mobile')
  game.deadAt = 0
  requestAnimationFrame((t) => { last = t; frame(t) })
}

try {
  boot()
  window.__nightfall = { game, player, enemySystem, weapon, world, startGame, toggleTilt, renderer }
} catch (error) {
  console.error(error)
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;background:#05070d;color:#ffb45c;font:14px monospace;z-index:9999;padding:24px;text-align:center'
  el.textContent = 'Renderer initialization failed: ' + error.message
  document.body.appendChild(el)
}
