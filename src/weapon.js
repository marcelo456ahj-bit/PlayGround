import * as THREE from 'three'
import { makeGlow, makeSpark, makeSmoke, makeMetalMaps } from './textures.js'

function mat(color, metalness = 0.85, roughness = 0.35, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, envMapIntensity: 1.25, ...extra })
}

function cylinderBetween(a, b, radius, material, radial = 10) {
  const dir = b.clone().sub(a)
  const len = dir.length()
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, radial), material)
  m.position.copy(a).add(b).multiplyScalar(0.5)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
  return m
}

export function createWeapon(camera) {
  const group = new THREE.Group()
  const basePos = new THREE.Vector3(0.33, -0.265, -0.62)
  group.position.copy(basePos)
  group.rotation.set(0.015, -0.018, 0)
  group.scale.setScalar(0.9)
  camera.add(group)

  const gunMaps = makeMetalMaps(37)
  const gunmetal = mat(0x4a555e, 0.92, 0.3, { map: gunMaps.color, normalMap: gunMaps.normal, roughnessMap: gunMaps.rough, normalScale: new THREE.Vector2(0.55, 0.55) })
  const darkMetal = mat(0x1e252c, 0.9, 0.38, { normalMap: gunMaps.normal, roughnessMap: gunMaps.rough, normalScale: new THREE.Vector2(0.7, 0.7) })
  const polymer = mat(0x161c22, 0.22, 0.6)
  const accent = new THREE.MeshStandardMaterial({ color: 0x0b1a1c, emissive: 0x37e0d0, emissiveIntensity: 2.1, metalness: 0.5, roughness: 0.35, toneMapped: false })
  const hot = new THREE.MeshStandardMaterial({ color: 0x1a0b05, emissive: 0xff7a2e, emissiveIntensity: 2.4, metalness: 0.4, roughness: 0.4, toneMapped: false })
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x051012, emissive: 0x63ffe4, emissiveIntensity: 2.4, metalness: 0.9, roughness: 0.08, toneMapped: false })
  const glove = mat(0x1b2027, 0.1, 0.78)
  const gloveAccent = new THREE.MeshStandardMaterial({ color: 0x0f1e24, emissive: 0x2fbfc9, emissiveIntensity: 1.1, roughness: 0.55 })

  const add = (geo, material, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, material)
    m.position.set(x, y, z)
    m.rotation.set(rx, ry, rz)
    group.add(m)
    return m
  }

  // receiver + upper
  add(new THREE.BoxGeometry(0.105, 0.145, 0.48), gunmetal, 0, 0, -0.08)
  add(new THREE.BoxGeometry(0.112, 0.035, 0.5), darkMetal, 0, 0.086, -0.1)
  add(new THREE.BoxGeometry(0.08, 0.028, 0.56), gunmetal, 0, 0.112, -0.14)
  for (let i = 0; i < 9; i++) add(new THREE.BoxGeometry(0.086, 0.008, 0.018), darkMetal, 0, 0.129, -0.36 + i * 0.052)
  add(new THREE.BoxGeometry(0.09, 0.02, 0.19), polymer, 0, -0.085, 0.07)

  // handguard
  add(new THREE.BoxGeometry(0.098, 0.104, 0.36), darkMetal, 0, -0.003, -0.46)
  add(new THREE.BoxGeometry(0.106, 0.018, 0.36), gunmetal, 0, 0.056, -0.46)
  for (let i = 0; i < 5; i++) {
    add(new THREE.BoxGeometry(0.104, 0.012, 0.03), polymer, 0, 0.008, -0.6 + i * 0.07)
    add(new THREE.BoxGeometry(0.012, 0.06, 0.024), hot, 0.052, -0.01, -0.6 + i * 0.07)
    add(new THREE.BoxGeometry(0.012, 0.06, 0.024), hot, -0.052, -0.01, -0.6 + i * 0.07)
  }
  add(new THREE.BoxGeometry(0.12, 0.016, 0.13), accent, 0, 0.045, -0.44)

  // barrel
  add(new THREE.CylinderGeometry(0.023, 0.023, 0.5, 14), gunmetal, 0, 0.018, -0.79, Math.PI / 2)
  add(new THREE.CylinderGeometry(0.034, 0.03, 0.14, 12), darkMetal, 0, 0.018, -1.02, Math.PI / 2)
  for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(0.082, 0.012, 0.02), polymer, 0, 0.018, -1.07 + i * 0.038)
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8), darkMetal, 0, -0.05, -0.72, Math.PI / 2)

  // stock
  add(new THREE.BoxGeometry(0.085, 0.11, 0.3), polymer, 0, -0.012, 0.27)
  add(new THREE.BoxGeometry(0.095, 0.16, 0.06), darkMetal, 0, -0.025, 0.44)
  add(new THREE.BoxGeometry(0.06, 0.03, 0.22), gunmetal, 0, 0.07, 0.26)
  add(new THREE.BoxGeometry(0.09, 0.02, 0.05), accent, 0, 0.045, 0.43)

  // magazine
  const mag = new THREE.Group()
  mag.position.set(0, -0.19, -0.055)
  mag.rotation.x = 0.2
  group.add(mag)
  const magBody = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.23, 0.13), polymer)
  magBody.position.y = -0.06
  mag.add(magBody)
  const magGlow = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.02, 0.132), hot)
  magGlow.position.y = -0.12
  mag.add(magGlow)
  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.016), darkMetal)
    rib.position.set(0, -0.01 - i * 0.04, 0.06)
    mag.add(rib)
  }

  // grip
  add(new THREE.BoxGeometry(0.064, 0.16, 0.085), polymer, 0, -0.145, 0.11, 0.24)
  add(new THREE.BoxGeometry(0.068, 0.03, 0.09), accent, 0, -0.212, 0.095, 0.24)

  // optic
  const optic = new THREE.Group()
  optic.position.set(0, 0.156, -0.13)
  group.add(optic)
  const opticBase = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 0.22), darkMetal)
  optic.add(opticBase)
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.2, 16), gunmetal)
  tube.rotation.x = Math.PI / 2
  tube.position.set(0, 0.055, -0.01)
  optic.add(tube)
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.046, 0.05, 16), darkMetal)
  hood.rotation.x = Math.PI / 2
  hood.position.set(0, 0.055, -0.12)
  optic.add(hood)
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.035, 20), lensMat)
  lens.position.set(0, 0.055, -0.147)
  optic.add(lens)
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.004, 8), new THREE.MeshBasicMaterial({ color: 0xff2b2b, toneMapped: false }))
  dot.position.set(0, 0.055, -0.149)
  optic.add(dot)
  const rearLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.028, 20),
    new THREE.MeshStandardMaterial({ color: 0x041012, emissive: 0x2fb9c2, emissiveIntensity: 0.85, metalness: 0.9, roughness: 0.12, toneMapped: false })
  )
  rearLens.position.set(0, 0.055, 0.0906)
  optic.add(rearLens)
  const rearRim = new THREE.Mesh(new THREE.RingGeometry(0.031, 0.043, 20), darkMetal)
  rearRim.position.set(0, 0.055, 0.0904)
  optic.add(rearRim)
  const opticGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlow(64), color: 0x49f6df, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  opticGlow.scale.set(0.12, 0.12, 1)
  opticGlow.position.set(0, 0.055, -0.155)
  optic.add(opticGlow)
  for (const x of [-0.042, 0.042]) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.045, 10), gunmetal)
    knob.position.set(x, 0.06, 0.0)
    knob.rotation.z = Math.PI / 2
    optic.add(knob)
  }
  add(new THREE.BoxGeometry(0.06, 0.02, 0.06), darkMetal, 0, 0.132, -0.01)

  // side flashlight / laser
  add(new THREE.CylinderGeometry(0.022, 0.026, 0.17, 10), darkMetal, 0.07, 0.006, -0.4, Math.PI / 2)
  add(new THREE.CylinderGeometry(0.027, 0.027, 0.026, 10), accent, 0.07, 0.006, -0.49, Math.PI / 2)

  // charging handle + bolt
  add(new THREE.BoxGeometry(0.05, 0.018, 0.11), gunmetal, 0.075, 0.075, 0.02)
  add(new THREE.CylinderGeometry(0.017, 0.017, 0.09, 8), darkMetal, -0.065, 0.05, -0.03, 0, 0, Math.PI / 2)
  add(new THREE.BoxGeometry(0.03, 0.03, 0.03), hot, -0.095, 0.05, -0.03)

  // hands / arms
  const rightHand = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.075, 4, 10), glove)
  rightHand.position.set(0.015, -0.19, 0.095)
  rightHand.rotation.set(0.35, 0, 0.05)
  rightHand.scale.set(1.0, 1.0, 0.9)
  group.add(rightHand)
  const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.02, 0.055), gloveAccent)
  knuckle.position.set(0.015, -0.158, 0.075)
  knuckle.rotation.x = 0.35
  group.add(knuckle)
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.045, 3, 7), glove)
    f.position.set(-0.022 + i * 0.026, -0.17, 0.035)
    f.rotation.set(0.35, 0, 0.1)
    group.add(f)
  }
  const rightForearm = cylinderBetween(new THREE.Vector3(0.1, -0.52, 0.32), new THREE.Vector3(0.035, -0.22, 0.14), 0.056, glove, 10)
  rightForearm.scale.set(1, 1, 0.85)
  group.add(rightForearm)
  const rightSleeve = cylinderBetween(new THREE.Vector3(0.16, -0.7, 0.5), new THREE.Vector3(0.11, -0.5, 0.32), 0.07, mat(0x222b32, 0.05, 0.85), 10)
  group.add(rightSleeve)

  const leftHand = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.08, 4, 10), glove)
  leftHand.position.set(-0.005, -0.095, -0.43)
  leftHand.rotation.set(1.15, 0, 0)
  group.add(leftHand)
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.045, 3, 7), glove)
    f.position.set(-0.035 + i * 0.03, -0.113, -0.405)
    f.rotation.set(1.2, 0, 0)
    group.add(f)
  }
  const leftForearm = cylinderBetween(new THREE.Vector3(-0.13, -0.52, 0.08), new THREE.Vector3(-0.02, -0.13, -0.3), 0.052, glove, 10)
  group.add(leftForearm)
  const leftSleeve = cylinderBetween(new THREE.Vector3(-0.2, -0.72, 0.2), new THREE.Vector3(-0.14, -0.52, 0.09), 0.066, mat(0x222b32, 0.05, 0.85), 10)
  group.add(leftSleeve)


  // side ammo display
  const displayCanvas = document.createElement('canvas')
  displayCanvas.width = 256
  displayCanvas.height = 64
  const displayCtx = displayCanvas.getContext('2d')
  const displayTex = new THREE.CanvasTexture(displayCanvas)
  displayTex.colorSpace = THREE.SRGBColorSpace
  const drawDisplay = (ammo = 30, mag = 30) => {
    displayCtx.clearRect(0, 0, 256, 64)
    displayCtx.fillStyle = 'rgba(2,12,14,0.9)'
    displayCtx.fillRect(0, 0, 256, 64)
    displayCtx.strokeStyle = 'rgba(90,245,230,0.5)'
    displayCtx.lineWidth = 3
    displayCtx.strokeRect(3, 3, 250, 58)
    displayCtx.font = '700 38px monospace'
    displayCtx.textBaseline = 'middle'
    displayCtx.shadowColor = '#5af5e6'
    displayCtx.shadowBlur = 12
    displayCtx.fillStyle = '#d8fffb'
    displayCtx.fillText(String(ammo).padStart(2, '0'), 16, 34)
    displayCtx.font = '500 13px monospace'
    displayCtx.fillStyle = 'rgba(120,246,232,0.85)'
    displayCtx.fillText('/' + String(mag).padStart(2, '0'), 80, 36)
    displayCtx.font = '500 11px monospace'
    displayCtx.fillStyle = '#ffb45c'
    displayCtx.fillText('VK-9  AUTO', 144, 36)
    displayTex.needsUpdate = true
  }
  drawDisplay()
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.048), new THREE.MeshBasicMaterial({ map: displayTex, transparent: true, toneMapped: false, depthWrite: false }))
  display.position.set(-0.0565, 0.028, -0.055)
  display.rotation.y = -Math.PI / 2
  group.add(display)

  // muzzle anchor + flash
  const muzzle = new THREE.Object3D()
  muzzle.position.set(0, 0.018, -1.1)
  group.add(muzzle)

  const flashGroup = new THREE.Group()
  muzzle.add(flashGroup)
  const flashTex = makeSpark(96)
  const flashCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: 0xffe0a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  flashCore.scale.set(0.55, 0.55, 1)
  flashGroup.add(flashCore)
  const flashSide = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlow(128), color: 0xff9a3c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  flashSide.scale.set(1.1, 0.65, 1)
  flashSide.position.z = -0.1
  flashGroup.add(flashSide)
  const flashCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.55, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
  )
  flashCone.rotation.x = -Math.PI / 2
  flashCone.position.z = -0.24
  flashGroup.add(flashCone)
  const flashLight = new THREE.PointLight(0xffa050, 0, 7, 2)
  muzzle.add(flashLight)
  const muzzleSmokeTex = makeSmoke(96)
  let smokeTimer = 0

  group.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false } })

  const state = {
    group,
    muzzle,
    flashGroup,
    flashLight,
    mag,
    basePos,
    baseRot: group.rotation.clone(),
    kick: 0,
    flash: 0,
    reload: 0,
    reloading: false,
    swayX: 0,
    swayY: 0,
    bob: 0,
    sprintBlend: 0,
    heat: 0
  }

  state.fire = () => {
    state.kick = Math.min(1.35, state.kick + 0.62)
    state.flash = 1
    state.heat = Math.min(1, state.heat + 0.2)
    flashGroup.rotation.z = Math.random() * Math.PI * 2
    flashGroup.rotation.x = (Math.random() - 0.5) * 0.35
    const s = 0.75 + Math.random() * 0.55
    flashCore.scale.set(0.55 * s, 0.55 * s, 1)
  }

  state.setAspect = (aspect) => {
    if (aspect < 0.82) {
      state.basePos.set(0.145, -0.43, -0.82)
      group.scale.setScalar(0.5)
    } else if (aspect < 1.2) {
      state.basePos.set(0.26, -0.305, -0.7)
      group.scale.setScalar(0.85)
    } else {
      state.basePos.set(0.31, -0.29, -0.68)
      group.scale.setScalar(0.9)
    }
    group.position.copy(state.basePos)
  }
  state.setReloading = (on) => { state.reloading = on }
  state.setAmmo = (ammo, mag) => drawDisplay(ammo, mag)
  state.kickback = () => state.kick

  state.update = (dt, time, moveSpeed, lookDX, lookDY, grounded) => {
    state.flash = Math.max(0, state.flash - dt * 18)
    state.kick = Math.max(0, state.kick - dt * 6.4)
    state.heat = Math.max(0, state.heat - dt * 1.7)
    const f = state.flash
    flashCore.material.opacity = f
    flashSide.material.opacity = f * 0.85
    flashCone.material.opacity = f * 0.55
    flashLight.intensity = f * 36
    flashGroup.scale.setScalar(0.8 + f * 0.3)
    flashSide.material.rotation = time * 2

    state.swayX += (THREE.MathUtils.clamp(lookDX * 0.0009, -0.035, 0.035) - state.swayX) * Math.min(1, dt * 9)
    state.swayY += (THREE.MathUtils.clamp(lookDY * 0.0009, -0.035, 0.035) - state.swayY) * Math.min(1, dt * 9)

    const sprintTarget = moveSpeed > 7.5 ? 1 : 0
    state.sprintBlend += (sprintTarget - state.sprintBlend) * Math.min(1, dt * 5)
    state.bob += dt * (4.4 + moveSpeed * 0.45)
    const bobAmt = Math.min(1, moveSpeed / 5.5) * (grounded ? 1 : 0.35)
    const bx = Math.sin(state.bob) * 0.009 * bobAmt
    const by = Math.abs(Math.cos(state.bob)) * -0.011 * bobAmt

    const reloadT = state.reloading ? 1 : 0
    const rl = state.reloadProgress || 0
    const reloadDip = state.reloading ? Math.sin(Math.min(1, rl) * Math.PI) : 0
    const reloadRot = state.reloading ? Math.sin(Math.min(1, rl) * Math.PI) : 0
    const magDrop = state.reloading ? THREE.MathUtils.smoothstep(rl, 0.08, 0.36) * (1 - THREE.MathUtils.smoothstep(rl, 0.45, 0.72)) : 0

    const targetX = basePos.x + bx - state.swayX * 1.3 + state.sprintBlend * 0.055 + reloadDip * 0.055
    const targetY = basePos.y + by - state.swayY * 1.1 - state.sprintBlend * 0.07 - reloadDip * 0.1
    const targetZ = basePos.z + state.kick * 0.055 + reloadDip * 0.04
    group.position.x += (targetX - group.position.x) * Math.min(1, dt * 13)
    group.position.y += (targetY - group.position.y) * Math.min(1, dt * 13)
    group.position.z += (targetZ - group.position.z) * Math.min(1, dt * 17)

    const targetRotX = state.baseRot.x + state.kick * 0.12 - state.swayY * 0.55 - reloadRot * 0.32
    const targetRotY = state.baseRot.y + state.swayX * 0.7 + state.sprintBlend * 0.16
    const targetRotZ = state.baseRot.z - state.swayX * 0.28 + state.sprintBlend * 0.22 + reloadDip * 0.1
    group.rotation.x += (targetRotX - group.rotation.x) * Math.min(1, dt * 15)
    group.rotation.y += (targetRotY - group.rotation.y) * Math.min(1, dt * 15)
    group.rotation.z += (targetRotZ - group.rotation.z) * Math.min(1, dt * 15)

    mag.position.y = -0.19 - magDrop * 0.24
    mag.rotation.x = 0.2 + magDrop * 0.45

    // barrel heat shimmer glow
    hot.emissiveIntensity = 2.0 + state.heat * 3.2

    smokeTimer -= dt
    if (f > 0.5 && smokeTimer <= 0) {
      smokeTimer = 0.045
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: muzzleSmokeTex, color: 0x9fa8ad, transparent: true, opacity: 0.1, depthWrite: false }))
      s.scale.setScalar(0.1)
      s.position.set((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, -0.1)
      muzzle.add(s)
      let t = 0
      const life = 0.4
      const upd = () => {
        t += dt
        s.position.z -= dt * 0.7
        s.position.y += dt * 0.22
        s.scale.setScalar(0.1 + t * 0.5)
        s.material.opacity = Math.max(0, 0.1 * (1 - t / life))
        if (t > life) { muzzle.remove(s); s.material.dispose(); return true }
        return false
      }
      // smoke sprites are updated by the main weapon update via a small list
      state.smoke = state.smoke || []
      state.smoke.push({ s, upd })
    }
    if (state.smoke) {
      for (let i = state.smoke.length - 1; i >= 0; i--) {
        if (state.smoke[i].upd()) state.smoke.splice(i, 1)
      }
    }
  }

  return state
}
