import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import {
  makeConcreteMaps, makeMetalMaps, makeHazard, makeSkyline, makeSign,
  makeGlow, makePadDecal, makeStarfield, makeHoloGrid
} from './textures.js'

const ARENA = 23

function mesh(geo, mat, x = 0, y = 0, z = 0, ry = 0) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, y, z)
  m.rotation.y = ry
  return m
}

function addBox(parent, w, h, d, mat, x, y, z, ry = 0, shadows = true) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, ry)
  m.castShadow = shadows
  m.receiveShadow = shadows
  parent.add(m)
  return m
}

function colliderFrom(object, padding = 0.1) {
  object.updateWorldMatrix(true, true)
  return new THREE.Box3().setFromObject(object).expandByScalar(padding)
}

export function buildWorld(scene, renderer) {
  const world = {
    solids: [],
    colliders: [],
    spawnPoints: [],
    playerStart: new THREE.Vector3(0, 1.72, 12),
    bounds: ARENA - 1.5,
    update: () => {}
  }

  scene.fog = new THREE.FogExp2(0x0a101b, 0.014)
  scene.environment = null

  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new RoomEnvironment()
  const envRT = pmrem.fromScene(envScene, 0.04)
  scene.environment = envRT.texture
  scene.environmentIntensity = 0.42
  envScene.dispose?.()
  pmrem.dispose()

  const concrete = makeConcreteMaps(7)
  const metal = makeMetalMaps(22)
  const hazard = makeHazard(5)
  const glowTex = makeGlow(128)
  const softGlow = makeGlow(256, 0.01)

  // ---------------------------------------------------------------- sky
  const skyGeo = new THREE.SphereGeometry(260, 48, 24)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      uniform float uTime;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
        return v;
      }
      void main() {
        vec3 dir = normalize(vPos);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 horizon = vec3(0.135, 0.095, 0.145);
        vec3 zenith = vec3(0.008, 0.014, 0.038);
        vec3 col = mix(horizon, zenith, pow(h, 0.42));
        float sunDot = max(dot(dir, normalize(vec3(-0.68, 0.115, -0.72))), 0.0);
        col += vec3(1.0, 0.34, 0.09) * pow(sunDot, 7.0) * 0.42;
        col += vec3(1.0, 0.62, 0.22) * pow(sunDot, 160.0) * 1.5;
        col += vec3(0.22, 0.1, 0.24) * pow(1.0 - h, 5.0) * 0.55;
        vec2 cuv = dir.xz / (dir.y + 0.25) * 1.4;
        float cloud = fbm(cuv + vec2(uTime * 0.006, 0.0));
        cloud = smoothstep(0.48, 0.86, cloud) * smoothstep(0.01, 0.16, dir.y) * step(dir.y, 0.5);
        col += vec3(0.18, 0.13, 0.19) * cloud * 0.55;
        float star = step(0.9985, hash(floor(dir.xz * 720.0 + dir.y * 311.0)));
        col += vec3(0.6, 0.78, 1.0) * star * smoothstep(0.12, 0.45, h) * (0.45 + 0.55 * sin(uTime * 2.0 + hash(dir.xz) * 30.0));
        gl_FragColor = vec4(col, 1.0);
      }
    `
  })
  const sky = new THREE.Mesh(skyGeo, skyMat)
  sky.frustumCulled = false
  scene.add(sky)

  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(
      Array.from({ length: 700 }, () => {
        const a = Math.random() * Math.PI * 2
        const y = 0.15 + Math.random() * 0.85
        const r = Math.sqrt(1 - y * y)
        return [Math.cos(a) * r * 190, y * 190, Math.sin(a) * r * 190]
      }).flat(), 3)),
    new THREE.PointsMaterial({ map: makeStarfield(), size: 1.1, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xaad4ff, fog: false })
  )
  scene.add(stars)

  // ------------------------------------------------------------ skyline
  const skyline = makeSkyline(5, 2048, 640, false)
  const skylineWarm = makeSkyline(9, 2048, 640, true)
  const cityMat = new THREE.MeshBasicMaterial({ map: skyline, transparent: true, depthWrite: false, fog: true, color: 0x9fb4c8 })
  const cityMatWarm = new THREE.MeshBasicMaterial({ map: skylineWarm, transparent: true, depthWrite: false, fog: true, color: 0xc7a08c })
  const cityGroup = new THREE.Group()
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2
    const p = new THREE.Mesh(new THREE.PlaneGeometry(150, 34), i % 2 ? cityMatWarm : cityMat)
    p.position.set(Math.sin(angle) * 78, 11, Math.cos(angle) * 78)
    p.rotation.y = angle + Math.PI
    cityGroup.add(p)
  }
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(98, 26), i === 1 ? cityMatWarm : cityMat)
    const angle = Math.PI + (i - 1) * 0.42
    p.position.set(Math.sin(angle) * 48, 8, Math.cos(angle) * 48)
    p.rotation.y = angle + Math.PI
    cityGroup.add(p)
  }
  scene.add(cityGroup)

  // ------------------------------------------------------------- lighting
  const hemi = new THREE.HemisphereLight(0x6b87a8, 0x0a0b12, 0.85)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight(0xffb478, 2.15)
  sun.position.set(-20, 26, 14)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -28
  sun.shadow.camera.right = 28
  sun.shadow.camera.top = 28
  sun.shadow.camera.bottom = -28
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 70
  sun.shadow.bias = -0.0006
  sun.shadow.normalBias = 0.035
  scene.add(sun)
  scene.add(sun.target)
  sun.target.position.set(0, 0, -4)

  const fill = new THREE.DirectionalLight(0x335f8f, 0.75)
  fill.position.set(14, 10, -18)
  scene.add(fill)

  // ---------------------------------------------------------------- floor
  const floorMat = new THREE.MeshStandardMaterial({
    map: concrete.color,
    roughnessMap: concrete.rough,
    normalMap: concrete.normal,
    normalScale: new THREE.Vector2(0.6, 0.6),
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.18,
    envMapIntensity: 0.6
  })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(96, 96, 1, 1), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  world.solids.push(floor)

  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(21, 21),
    new THREE.MeshBasicMaterial({ map: makePadDecal(), transparent: true, depthWrite: false, opacity: 0.9, toneMapped: false })
  )
  pad.rotation.x = -Math.PI / 2
  pad.position.set(0, 0.015, -2)
  scene.add(pad)

  const stainMat = new THREE.MeshBasicMaterial({ color: 0x05080b, transparent: true, opacity: 0.32, depthWrite: false, toneMapped: false })
  for (const [x, z, s] of [[-7, 4, 3.4], [8, -4, 2.6], [-12, -9, 2.2], [13, 9, 3.8], [2, 14, 2.8]]) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(s, 24), stainMat)
    p.rotation.x = -Math.PI / 2
    p.rotation.z = Math.random() * 3
    p.scale.set(1.8, 1, 1)
    p.position.set(x, 0.018, z)
    scene.add(p)
  }

  const stripMat = new THREE.MeshStandardMaterial({ color: 0x0a1418, emissive: 0x37e0d0, emissiveIntensity: 2.2, roughness: 0.4, metalness: 0.4, toneMapped: false })
  for (const side of [-1, 1]) {
    const strip1 = addBox(scene, 44, 0.06, 0.14, stripMat, 0, 0.03, side * 21.4, 0, false)
    const strip2 = addBox(scene, 0.14, 0.06, 44, stripMat, side * 21.4, 0.03, 0, 0, false)
    strip1.receiveShadow = false; strip2.receiveShadow = false
  }

  // ---------------------------------------------------------------- walls
  const wallMat = new THREE.MeshStandardMaterial({
    map: concrete.color, roughnessMap: concrete.rough, normalMap: concrete.normal,
    normalScale: new THREE.Vector2(0.8, 0.8), color: 0x8f9298, roughness: 0.82, metalness: 0.25
  })
  const wallTopMat = new THREE.MeshStandardMaterial({ color: 0x171c22, roughness: 0.4, metalness: 0.8 })
  const wallDefs = [
    [0, -ARENA, 48, 0], [0, ARENA, 48, 0]
  ]
  for (const [x, z, width, ry] of wallDefs) {
    const w = addBox(scene, width, 3.7, 0.7, wallMat, x, 1.85, z, ry)
    addBox(scene, width + 0.3, 0.22, 1.0, wallTopMat, x, 3.76, z, ry)
    world.solids.push(w)
    world.colliders.push(colliderFrom(w))
  }
  for (const x of [-ARENA, ARENA]) {
    const w = addBox(scene, 0.7, 3.7, 48, wallMat, x, 1.85, 0, 0)
    addBox(scene, 1.0, 0.22, 48.3, wallTopMat, x, 3.76, 0, 0)
    world.solids.push(w)
    world.colliders.push(colliderFrom(w))
  }

  const wallStripe = new THREE.MeshStandardMaterial({ color: 0x0b1116, emissive: 0xff8a3c, emissiveIntensity: 1.6, roughness: 0.5 })
  for (const z of [-ARENA + 0.36, ARENA - 0.36]) addBox(scene, 37, 0.05, 0.02, wallStripe, 0, 2.9, z, 0, false)
  for (const x of [-ARENA + 0.36, ARENA - 0.36]) addBox(scene, 0.02, 0.05, 37, wallStripe, x, 2.9, 0, 0, false)

  // wall panel details
  const panelMat = new THREE.MeshStandardMaterial({
    map: metal.color, roughnessMap: metal.rough, normalMap: metal.normal,
    color: 0x929aa4, roughness: 0.46, metalness: 0.82, envMapIntensity: 1.1
  })
  const panelGeo = new THREE.BoxGeometry(4.6, 2.6, 0.18)
  for (let i = -4; i <= 4; i++) {
    if (Math.abs(i) < 2) continue
    const p = new THREE.Mesh(panelGeo, panelMat)
    p.position.set(i * 4.9, 1.7, -ARENA + 0.48)
    p.receiveShadow = true
    scene.add(p)
  }

  // --------------------------------------------------------- neon signage
  const signs = []
  function addSign(text, sub, color, position, rotation, scale = 1, float = false) {
    const tex = makeSign(text, color, sub)
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, blending: THREE.AdditiveBlending, opacity: 0.95 })
    const p = new THREE.Mesh(new THREE.PlaneGeometry(5 * scale, 1.875 * scale), mat)
    p.position.copy(position)
    p.rotation.copy(rotation)
    scene.add(p)
    signs.push({ mesh: p, mat, base: 0.95, seed: Math.random() * 10, float })
    if (float) {
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(5.4 * scale, 2.2 * scale), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))
      frame.position.copy(position)
      frame.rotation.copy(rotation)
      frame.position.z -= 0.02
      scene.add(frame)
    }
    return p
  }
  const rot0 = new THREE.Euler(0, 0, 0)
  addSign('OUTPOST 9', 'PERIMETER DEFENSE NETWORK', '#ff9a4a', new THREE.Vector3(0, 3.1, -ARENA + 0.52), rot0, 1.4, true)
  addSign('SECTOR 09', 'AUTHORIZED PERSONNEL ONLY', '#7ff3ff', new THREE.Vector3(-ARENA + 0.52, 2.8, -7), new THREE.Euler(0, Math.PI / 2, 0), 0.9)
  addSign('DANGER', 'LIVE VOLTAGE', '#ff3b50', new THREE.Vector3(ARENA - 0.53, 3.0, 8), new THREE.Euler(0, -Math.PI / 2, 0), 0.8)
  addSign('RELAY', 'UPLINK ACTIVE', '#37e0d0', new THREE.Vector3(9, 3.1, ARENA - 0.52), new THREE.Euler(0, Math.PI, 0), 0.85)

  // vertical light frames at corners
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x10151b, roughness: 0.4, metalness: 0.85 })
  for (const [x, z] of [[-20, -20], [20, -20], [-20, 20], [20, 20]]) {
    addBox(scene, 0.26, 6.5, 0.26, frameMat, x, 3.25, z)
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 5.4, 0.07), new THREE.MeshStandardMaterial({ color: 0x0a1418, emissive: 0xff8a3c, emissiveIntensity: 3, toneMapped: false }))
    strip.position.set(x + (x > 0 ? -0.16 : 0.16), 3.4, z)
    scene.add(strip)
  }

  // --------------------------------------------------------- crates / props
  const crateEdgeMat = new THREE.MeshStandardMaterial({ color: 0x1a2027, roughness: 0.38, metalness: 0.75 })
  const crateMat = new THREE.MeshStandardMaterial({
    map: metal.color, roughnessMap: metal.rough, normalMap: metal.normal,
    color: 0x7f8a93, roughness: 0.48, metalness: 0.68, envMapIntensity: 1.15
  })
  function crate(x, z, w = 2.4, h = 2.2, d = 2.4, ry = 0, stack = 0) {
    const yBase = stack * (h + 0.04)
    const p = addBox(scene, w, h, d, crateMat, x, h / 2 + yBase, z, ry)
    const trim = addBox(scene, w + 0.06, 0.12, d + 0.06, crateEdgeMat, x, h + yBase - 0.02, z, ry, false)
    trim.receiveShadow = false
    const sx = Math.sin(ry), cz = Math.cos(ry)
    const glow = addBox(scene, w * 0.38, 0.04, 0.022, wallStripe, x + sx * (d / 2 + 0.01), h * 0.74 + yBase, z + cz * (d / 2 + 0.01), ry, false)
    glow.receiveShadow = false
    const glow2 = addBox(scene, 0.022, 0.04, d * 0.34, wallStripe, x + cz * (w / 2 + 0.01), h * 0.4 + yBase, z - sx * (w / 2 + 0.01), ry, false)
    glow2.receiveShadow = false
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(p.geometry, 24),
      new THREE.LineBasicMaterial({ color: 0x4f7079, transparent: true, opacity: 0.45 })
    )
    edges.position.copy(p.position)
    edges.rotation.copy(p.rotation)
    scene.add(edges)
    world.solids.push(p)
    world.colliders.push(colliderFrom(p))
    return p
  }
  crate(-13, -7, 3.2, 2.6, 3.2, 0.18)
  crate(-13, -7, 2.4, 2.0, 2.4, -0.2, 1)
  crate(-10.2, -8.6, 2.1, 1.7, 2.1, 0.5)
  crate(12.5, -10.5, 3.4, 2.9, 3.0, -0.32)
  crate(15.7, -8.3, 2.2, 2.2, 2.2, 0.2)
  crate(-17.5, 3.5, 2.6, 2.3, 2.6, 0.9)
  crate(-15.5, 5.2, 1.8, 1.6, 1.8, 0.2)
  crate(14.8, 8.2, 2.8, 2.4, 2.8, -0.15)
  crate(17.7, 5.6, 2.0, 1.8, 2.0, 0.4)
  crate(-6.8, 5.2, 2.6, 2.1, 2.4, 0.24)
  crate(-8.6, 6.9, 1.7, 1.5, 1.7, -0.4)
  crate(7.4, 5.8, 2.3, 1.9, 2.1, 0.5)
  crate(9.1, 7.0, 1.5, 1.35, 1.5, -0.15)

  // shipping containers
  function container(x, z, ry, color = 0x33454c) {
    const mat = new THREE.MeshStandardMaterial({
      map: metal.color, roughnessMap: metal.rough, normalMap: metal.normal,
      color, roughness: 0.5, metalness: 0.68, envMapIntensity: 1.1
    })
    const c = addBox(scene, 8.2, 3.1, 3.1, mat, x, 1.55, z, ry)
    for (let i = -8; i <= 8; i++) {
      const rib = addBox(scene, 0.12, 3.0, 0.08, crateEdgeMat, x + Math.cos(ry) * i * 0.48, 1.55, z - Math.sin(ry) * i * 0.48, ry, false)
      rib.receiveShadow = false
    }
    const stripe = addBox(scene, 6.6, 0.09, 0.04, wallStripe, x, 2.4, z + 1.58 * Math.cos(ry), ry, false)
    stripe.receiveShadow = false
    world.solids.push(c)
    world.colliders.push(colliderFrom(c))
  }
  container(-17.6, -15.2, 0.08)
  container(17.3, 15.6, -1.48, 0x5a5648)
  container(18.6, -17.4, 0.9, 0x465862)

  // barrels
  const barrelMat = new THREE.MeshStandardMaterial({ map: metal.color, roughness: 0.42, metalness: 0.85, color: 0x5c6a70 })
  const barrelGlow = new THREE.MeshStandardMaterial({ color: 0x160b05, emissive: 0xff6a20, emissiveIntensity: 2.4, toneMapped: false })
  for (const [x, z] of [[-8.4, 8.8], [-9.5, 9.8], [9.2, 13.4], [10.2, 12.2], [-19.1, -2.2], [20.2, 1.2]]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.56, 1.5, 18), barrelMat)
    b.position.set(x, 0.75, z)
    b.castShadow = b.receiveShadow = true
    scene.add(b)
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.09, 18), barrelGlow)
    ring.position.set(x, 0.92, z)
    scene.add(ring)
    world.solids.push(b)
    world.colliders.push(colliderFrom(b, 0.05))
  }

  // debris
  const debrisMat = new THREE.MeshStandardMaterial({ color: 0x2a3037, roughness: 0.65, metalness: 0.5 })
  for (let i = 0; i < 30; i++) {
    const s = 0.08 + Math.random() * 0.26
    const d = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.4, s * (0.5 + Math.random())), debrisMat)
    const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 16
    d.position.set(Math.cos(a) * r, s * 0.2, Math.sin(a) * r)
    d.rotation.set(Math.random() * 3, Math.random() * 6, Math.random() * 3)
    d.castShadow = true
    scene.add(d)
  }

  // -------------------------------------------------------- central relay
  const relay = new THREE.Group()
  relay.position.set(0, 0, -16.5)
  scene.add(relay)
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.2, 0.7, 8), panelMat)
  pedestal.position.y = 0.35
  pedestal.castShadow = pedestal.receiveShadow = true
  relay.add(pedestal)
  const relayMat = new THREE.MeshStandardMaterial({ color: 0x141b22, roughness: 0.3, metalness: 0.9, envMapIntensity: 1.4 })
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.72, 7.8, 8), relayMat)
  core.position.y = 4.2
  core.castShadow = true
  relay.add(core)
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x7ff3ff, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.32, 18, 10, 1, true), beamMat)
  beam.position.y = 10
  relay.add(beam)
  const rings = []
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(
      new THREE.TorusGeometry(1.35 + i * 0.38, 0.035, 8, 64),
      new THREE.MeshStandardMaterial({ color: 0x0b1a1e, emissive: i === 1 ? 0xff8a3c : 0x37e0d0, emissiveIntensity: 2.6, toneMapped: false })
    )
    r.position.y = 3.4 + i * 1.45
    r.rotation.x = Math.PI / 2 + (i - 1) * 0.18
    relay.add(r)
    rings.push(r)
  }
  const holo = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 5.4),
    new THREE.MeshBasicMaterial({ map: makeHoloGrid(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.32, side: THREE.DoubleSide, toneMapped: false })
  )
  holo.position.set(0, 5.4, 0.1)
  relay.add(holo)
  const holoGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softGlow, color: 0x2fd6e0, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  holoGlow.scale.set(7, 7, 1)
  holoGlow.position.y = 5.4
  relay.add(holoGlow)
  const relayLight = new THREE.PointLight(0x55e6f0, 28, 24, 2)
  relayLight.position.set(0, 5.5, 0)
  relay.add(relayLight)
  world.colliders.push(colliderFrom(pedestal, 0.15))
  world.solids.push(pedestal)
  relay.userData.rings = rings
  world.relay = relay
  world.holo = holo
  world.relayLight = relayLight

  // --------------------------------------------------------- catwalk / mast
  const catwalk = new THREE.Group()
  catwalk.position.set(0, 8.4, -21.2)
  scene.add(catwalk)
  const walk = new THREE.Mesh(new THREE.BoxGeometry(44, 0.28, 2.8), panelMat)
  walk.castShadow = walk.receiveShadow = true
  catwalk.add(walk)
  const railMat = new THREE.MeshStandardMaterial({ color: 0x1b2129, roughness: 0.35, metalness: 0.9 })
  for (const z of [-1.35, 1.35]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(44, 0.08, 0.08), railMat)
    rail.position.set(0, 1.15, z)
    catwalk.add(rail)
    for (let i = -21; i <= 21; i += 2) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.15, 0.06), railMat)
      p.position.set(i, 0.58, z)
      catwalk.add(p)
    }
  }

  const mastGroup = new THREE.Group()
  mastGroup.position.set(19.5, 0, -19.5)
  scene.add(mastGroup)
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.5, 17, 8), relayMat)
  mast.position.y = 8.5
  mast.castShadow = true
  mastGroup.add(mast)
  const mastTip = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), new THREE.MeshStandardMaterial({ color: 0x220606, emissive: 0xff2a38, emissiveIntensity: 4, toneMapped: false }))
  mastTip.position.y = 17.1
  mastGroup.add(mastTip)
  const mastLight = new THREE.PointLight(0xff3548, 16, 26, 2)
  mastLight.position.y = 17
  mastGroup.add(mastLight)
  const mastGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff3548, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  mastGlow.scale.set(3, 3, 1)
  mastGlow.position.y = 17.05
  mastGroup.add(mastGlow)

  // cables
  const cableMat = new THREE.MeshBasicMaterial({ color: 0x080b0e })
  function cable(a, b, sag = 2.2) {
    const mid = a.clone().add(b).multiplyScalar(0.5)
    mid.y -= sag
    const curve = new THREE.CatmullRomCurve3([a, mid, b])
    const geo = new THREE.TubeGeometry(curve, 24, 0.025, 5, false)
    scene.add(new THREE.Mesh(geo, cableMat))
  }
  cable(new THREE.Vector3(-19.5, 15, -19.5), new THREE.Vector3(19.5, 16.8, -19.5), 3)
  cable(new THREE.Vector3(-19.5, 15, -19.5), new THREE.Vector3(-22, 4, -10), 1.4)
  cable(new THREE.Vector3(19.5, 16.8, -19.5), new THREE.Vector3(22, 4, 6), 1.8)
  cable(new THREE.Vector3(-22, 5, 18), new THREE.Vector3(22, 5, 18), 2.8)

  // --------------------------------------------------------- light towers
  const towers = [
    { x: -19, z: -18, color: 0x6ee7ff, target: new THREE.Vector3(-4, 0, -2) },
    { x: 19, z: -17, color: 0xff9b52, target: new THREE.Vector3(5, 0, -4) },
    { x: -20, z: 19, color: 0xff6a76, target: new THREE.Vector3(-6, 0, 6) },
    { x: 20, z: 19, color: 0x66f0dc, target: new THREE.Vector3(6, 0, 7) }
  ]
  const towerLights = []
  for (const t of towers) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 9, 8), relayMat)
    pole.position.set(t.x, 4.5, t.z)
    pole.castShadow = true
    scene.add(pole)
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.36, 0.66), panelMat)
    head.position.set(t.x, 9.1, t.z)
    scene.add(head)
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0x101010, emissive: t.color, emissiveIntensity: 4, toneMapped: false })
    for (let i = -1; i <= 1; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.42), bulbMat)
      b.position.set(t.x + i * 0.34, 8.9, t.z)
      scene.add(b)
    }
    const light = new THREE.SpotLight(t.color, 95, 36, Math.PI / 5.2, 0.55, 1.25)
    light.position.set(t.x, 9, t.z)
    light.target.position.copy(t.target)
    scene.add(light)
    scene.add(light.target)
    towerLights.push(light)

    // Physically lit pools only; avoid flat additive cone geometry.
  }

  // ------------------------------------------------------------ consoles
  function consoleAt(x, z, ry) {
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    g.rotation.y = ry
    scene.add(g)
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.05, 1.0), panelMat)
    base.position.y = 0.55
    base.castShadow = base.receiveShadow = true
    g.add(base)
    const screenMat = new THREE.MeshBasicMaterial({ map: makeSign('RELAY', 'UPLINK 98%', '#58e8d8'), transparent: true, toneMapped: false, opacity: 0.85 })
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.8), screenMat)
    screen.position.set(0, 1.05, 0.04)
    screen.rotation.x = -0.42
    g.add(screen)
    const l = new THREE.PointLight(0x42e0d0, 6, 6, 2)
    l.position.set(0, 1.2, 0.5)
    g.add(l)
    world.colliders.push(colliderFrom(base, 0.06))
    world.solids.push(base)
  }
  consoleAt(-6, -21.2, 0)
  consoleAt(6.5, -21.2, 0)
  consoleAt(-21.2, 12, Math.PI / 2)

  // ------------------------------------------------------------- dust
  const dustCount = 1500
  const dustPos = new Float32Array(dustCount * 3)
  const dustSeed = new Float32Array(dustCount)
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 46
    dustPos[i * 3 + 1] = Math.random() * 16
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 46
    dustSeed[i] = Math.random() * Math.PI * 2
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    map: softGlow, size: 0.13, transparent: true, opacity: 0.45, depthWrite: false,
    color: 0x9fd7ea, blending: THREE.AdditiveBlending, sizeAttenuation: true
  }))
  scene.add(dust)

  const emberCount = 260
  const emberPos = new Float32Array(emberCount * 3)
  for (let i = 0; i < emberCount; i++) {
    emberPos[i * 3] = (Math.random() - 0.5) * 30
    emberPos[i * 3 + 1] = Math.random() * 7
    emberPos[i * 3 + 2] = (Math.random() - 0.5) * 30
  }
  const emberGeo = new THREE.BufferGeometry()
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3))
  const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({
    map: glowTex, size: 0.1, transparent: true, opacity: 0.55, depthWrite: false,
    color: 0xff8a3c, blending: THREE.AdditiveBlending
  }))
  scene.add(embers)

  // ---------------------------------------------------------- spawn markers
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2
    world.spawnPoints.push(new THREE.Vector3(Math.cos(a) * 17.5, 2.6 + Math.random() * 0.8, Math.sin(a) * 17.5))
  }

  const clock = { t: 0 }
  world.update = (dt) => {
    clock.t += dt
    skyMat.uniforms.uTime.value = clock.t
    stars.rotation.y += dt * 0.003
    holo.rotation.y += dt * 0.45
    holo.material.opacity = 0.26 + Math.sin(clock.t * 7.5) * 0.05 + Math.random() * 0.015
    holoGlow.material.opacity = 0.5 + Math.sin(clock.t * 3.2) * 0.14
    rings.forEach((r, i) => {
      r.rotation.z += dt * (0.32 + i * 0.13) * (i % 2 ? -1 : 1)
      r.position.y = 3.4 + i * 1.45 + Math.sin(clock.t * 1.4 + i) * 0.12
    })
    relayLight.intensity = 24 + Math.sin(clock.t * 6.3) * 5
    mastTip.material.emissiveIntensity = 3 + Math.sin(clock.t * 3.4) * 1.6
    mastGlow.material.opacity = 0.55 + Math.sin(clock.t * 3.4) * 0.22
    for (const s of signs) {
      s.mat.opacity = s.base * (0.82 + Math.sin(clock.t * 11 + s.seed) * 0.05 + (Math.random() > 0.994 ? -0.4 : 0))
      if (s.float) s.mesh.position.y += Math.sin(clock.t * 0.7 + s.seed) * 0.0009
    }
    const pos = dustGeo.attributes.position.array
    for (let i = 0; i < dustCount; i++) {
      pos[i * 3 + 1] += dt * (0.06 + (i % 7) * 0.012)
      pos[i * 3] += Math.sin(clock.t * 0.25 + dustSeed[i]) * dt * 0.06
      if (pos[i * 3 + 1] > 16) pos[i * 3 + 1] = 0
    }
    dustGeo.attributes.position.needsUpdate = true
    const ep = emberGeo.attributes.position.array
    for (let i = 0; i < emberCount; i++) {
      ep[i * 3 + 1] += dt * (0.35 + (i % 5) * 0.1)
      if (ep[i * 3 + 1] > 8) { ep[i * 3 + 1] = 0; ep[i * 3] = (Math.random() - 0.5) * 30; ep[i * 3 + 2] = (Math.random() - 0.5) * 30 }
    }
    emberGeo.attributes.position.needsUpdate = true
    towerLights.forEach((l, i) => { l.intensity = 90 + Math.sin(clock.t * 2.1 + i) * 8 })
  }

  return world
}
