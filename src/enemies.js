import * as THREE from 'three'
import { makeGlow, makeSoftGlow } from './textures.js'

const _v = new THREE.Vector3()
const _v2 = new THREE.Vector3()
const _q = new THREE.Quaternion()

function standard(color, metalness, roughness, emissive = 0x000000, emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity, envMapIntensity: 1.1 })
}

export class EnemySystem {
  constructor(scene, effects, audio, world, callbacks = {}) {
    this.scene = scene
    this.effects = effects
    this.audio = audio
    this.world = world
    this.callbacks = callbacks
    this.enemies = []
    this.projectiles = []
    this.meshes = []
    this.wave = 0
    this.queue = []
    this.spawnTimer = 0
    this.cleared = false
    this.clearTimer = 0
    this.glow = makeGlow(128)
    this.softGlow = makeSoftGlow(128)
    this.coreGeo = new THREE.IcosahedronGeometry(0.16, 1)
    this.bodyGeo = new THREE.IcosahedronGeometry(0.54, 1)
    this.shellGeo = new THREE.SphereGeometry(0.62, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.62)
    this.ringGeo = new THREE.TorusGeometry(0.74, 0.035, 6, 48)
    this.finGeo = new THREE.BoxGeometry(0.1, 0.5, 0.3)
    this.thrusterGeo = new THREE.CylinderGeometry(0.07, 0.11, 0.22, 8)
    this.eyeGeo = new THREE.SphereGeometry(0.115, 14, 10)
    this.shieldGeo = new THREE.SphereGeometry(0.92, 20, 14)
    this.projGeo = new THREE.SphereGeometry(0.13, 10, 8)
    this.projMat = new THREE.MeshBasicMaterial({ color: 0xff5a4a, toneMapped: false })
  }

  startWave(n) {
    this.wave = n
    this.cleared = false
    this.clearTimer = 0
    const count = 3 + (n - 1) * 2
    this.queue = []
    for (let i = 0; i < count; i++) {
      this.queue.push({ elite: n >= 3 && i % 4 === 3, delay: 0.35 })
    }
    this.spawnTimer = 0.05
    this.points = this.world.spawnPoints
    this.spawnIndex = 0
  }

  spawn(elite) {
    const points = this.world.spawnPoints
    const front = points.filter((point) => point.z < -2).sort((a, b) => Math.abs(a.x) - Math.abs(b.x))
    const useFront = this.spawnIndex % 3 !== 2
    const pool = useFront ? front : points
    const p = useFront ? front[this.spawnIndex % front.length].clone() : points[Math.floor(Math.random() * points.length)].clone()
    this.spawnIndex++
    p.x += (Math.random() - 0.5) * 2.5
    p.z += (Math.random() - 0.5) * 2.5
    p.y = 2.45 + Math.random() * 0.8
    this.effects.portal(p, elite ? 0xffa040 : 0xff4050)

    const group = new THREE.Group()
    group.position.copy(p)
    const s = elite ? 1.46 : 1.12
    group.scale.setScalar(0.01)
    this.scene.add(group)

    const armorMat = standard(elite ? 0x4a332c : 0x3c454f, 0.9, 0.26)
    const darkMat = standard(0x161d24, 0.85, 0.38)
    const coreMat = standard(elite ? 0x331006 : 0x2a0808, 0.3, 0.3, elite ? 0xffa030 : 0xff2438, 3.4)
    const eyeMat = standard(0x220505, 0.15, 0.25, 0xff5050, 4.2)
    const finMat = standard(elite ? 0x5c4034 : 0x46515b, 0.9, 0.3)
    const mats = [armorMat, darkMat, coreMat, eyeMat, finMat]
    for (const m of mats) {
      m.userData.baseEmissive = m.emissive.getHex()
      m.userData.baseIntensity = m.emissiveIntensity
    }

    const body = new THREE.Mesh(this.bodyGeo, armorMat)
    body.scale.set(1, 1.05, 1.15)
    body.castShadow = true
    group.add(body)

    const shell = new THREE.Mesh(this.shellGeo, darkMat)
    shell.position.y = 0.1
    shell.rotation.x = 0.1
    shell.castShadow = true
    group.add(shell)

    const core = new THREE.Mesh(this.coreGeo, coreMat)
    core.position.set(0, -0.02, 0.24)
    core.scale.setScalar(elite ? 1.4 : 1)
    group.add(core)

    const eye = new THREE.Mesh(this.eyeGeo, eyeMat)
    eye.position.set(0, 0.02, 0.53)
    eye.scale.set(1.35, 0.8, 0.55)
    group.add(eye)

    const ring = new THREE.Mesh(this.ringGeo, new THREE.MeshStandardMaterial({ color: 0x0c1418, emissive: elite ? 0xffa040 : 0xff4a30, emissiveIntensity: 2.6, metalness: 0.7, roughness: 0.3, toneMapped: false }))
    ring.rotation.x = Math.PI / 2.3
    ring.rotation.z = 0.3
    group.add(ring)

    const ring2 = new THREE.Mesh(this.ringGeo, new THREE.MeshStandardMaterial({ color: 0x0a1418, emissive: 0x36d9e0, emissiveIntensity: 2.1, metalness: 0.7, roughness: 0.3, toneMapped: false }))
    ring2.scale.setScalar(0.82)
    ring2.rotation.x = -Math.PI / 2.1
    ring2.rotation.z = -0.5
    group.add(ring2)

    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(this.finGeo, finMat)
      const a = (i / 3) * Math.PI * 2
      fin.position.set(Math.cos(a) * 0.5, -0.22, Math.sin(a) * 0.5)
      fin.rotation.y = -a + Math.PI / 2
      fin.rotation.z = 0.5
      group.add(fin)
    }

    const markerMat = new THREE.MeshStandardMaterial({ color: 0x051417, emissive: 0x46e6ef, emissiveIntensity: 3.4, toneMapped: false })
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.78
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.02, 0.12), markerMat)
      mark.position.set(Math.cos(a) * 0.56, 0.06 + (i % 2) * 0.08, Math.sin(a) * 0.56)
      mark.rotation.y = -a
      mark.userData.enemy = true
      group.add(mark)
    }
    const thrusters = []
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5
      const t = new THREE.Mesh(this.thrusterGeo, darkMat)
      t.position.set(Math.cos(a) * 0.3, -0.42, Math.sin(a) * 0.3)
      group.add(t)
      const flameMat = new THREE.MeshBasicMaterial({ color: 0x63f4ff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.26, 8), flameMat)
      flame.position.set(Math.cos(a) * 0.3, -0.62, Math.sin(a) * 0.3)
      flame.rotation.x = Math.PI
      group.add(flame)
      thrusters.push(flame)
    }

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: elite ? 0xff9a3c : 0xff3344, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
    halo.scale.setScalar(elite ? 2.6 : 1.9)
    halo.position.z = 0.25
    group.add(halo)

    let shield = null
    if (elite) {
      shield = new THREE.Mesh(this.shieldGeo, new THREE.MeshBasicMaterial({ color: 0x53eaff, transparent: true, opacity: 0.12, wireframe: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
      group.add(shield)
    }

    const enemy = {
      group, body, core, eye, ring, ring2, shield, halo, thrusters, mats,
      hp: (elite ? 230 : 92) * (1 + (this.wave - 1) * 0.075),
      maxHp: (elite ? 230 : 92) * (1 + (this.wave - 1) * 0.075),
      elite,
      radius: elite ? 0.95 : 0.7,
      phase: Math.random() * Math.PI * 2,
      orbit: Math.random() > 0.5 ? 1 : -1,
      orbitRadius: 8.5 + Math.random() * 5,
      fireTimer: 1.6 + Math.random() * 2.2,
      spawnT: 0,
      alive: true,
      flash: 0,
      scaleTarget: s,
      speed: (elite ? 2.3 : 3.1) + Math.random() * 0.7,
      strafe: 0.32 + Math.random() * 0.24,
      baseY: p.y,
      mats,
      headMeshes: [core, eye]
    }
    for (const m of [body, shell, core, eye, ring, ring2, ...group.children]) if (m.isMesh) {
      m.userData.enemy = enemy
    }
    core.userData.head = true
    eye.userData.head = true
    if (shield) shield.userData.enemy = enemy

    this.enemies.push(enemy)
    this.refreshMeshes()
    this.audio.tone('sawtooth', 90, 240, 0.55, 0.06, { filter: 500, reverb: 0.4 })
  }

  refreshMeshes() {
    this.meshes = []
    for (const e of this.enemies) {
      e.group.traverse((o) => { if (o.isMesh && o.userData.enemy === e) this.meshes.push(o) })
    }
  }

  intersect(raycaster) {
    const hits = raycaster.intersectObjects(this.meshes, false)
    return hits[0] || null
  }

  damage(enemy, amount, point, normal, headshot = false) {
    if (!enemy || !enemy.alive) return
    enemy.hp -= amount
    enemy.flash = 1
    if (enemy.shield && !headshot) enemy.hp += amount * 0.35
    this.effects.impact(point, normal || new THREE.Vector3(0, 0, 1), enemy.elite ? 0xffa050 : 0xff6040)
    if (enemy.hp <= 0) this.kill(enemy, headshot)
    else if (headshot) this.audio.kill()
  }

  kill(enemy, headshot = false) {
    if (!enemy.alive) return
    enemy.alive = false
    enemy.spawnT = -999
    enemy.group.visible = false
    const pos = enemy.group.position.clone()
    this.effects.explosion(pos, enemy.elite ? 0xffa040 : 0xff5a30, enemy.elite ? 1.6 : 1)
    this.audio.explosion()
    this.callbacks.onKill?.(enemy, headshot)
    const idx = this.enemies.indexOf(enemy)
    if (idx >= 0) this.enemies.splice(idx, 1)
    this.scene.remove(enemy.group)
    for (const m of enemy.mats) m.dispose()
    this.refreshMeshes()
  }

  fireProjectile(enemy, playerPos, spread = 0) {
    const origin = enemy.core.getWorldPosition(new THREE.Vector3())
    const target = playerPos.clone()
    target.x += (Math.random() - 0.5) * spread
    target.y += (Math.random() - 0.5) * spread * 0.5
    target.z += (Math.random() - 0.5) * spread
    const dir = target.sub(origin).normalize()
    const mesh = new THREE.Mesh(this.projGeo, this.projMat)
    mesh.position.copy(origin)
    mesh.scale.setScalar(enemy.elite ? 1.45 : 1)
    this.scene.add(mesh)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: enemy.elite ? 0xffa040 : 0xff3a42, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
    halo.scale.setScalar(enemy.elite ? 1.15 : 0.8)
    halo.position.copy(mesh.position)
    this.scene.add(halo)
    const trail = []
    this.projectiles.push({ mesh, halo, dir, speed: enemy.elite ? 14 : 11, life: 0, max: 4.2, damage: enemy.elite ? 14 : 9, trail })
    this.audio.tone('sawtooth', 820, 230, 0.22, 0.045, { filter: 1800, reverb: 0.3 })
  }

  update(dt, time, playerPos, playerActive = true) {
    if (this.queue.length) {
      this.spawnTimer -= dt
      if (this.spawnTimer <= 0) {
        const next = this.queue.shift()
        this.spawn(next.elite)
        this.spawnTimer = (this.queue.length % 3 === 0 ? 0.55 : 0.26) + Math.random() * 0.16
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]
      if (!e.alive) continue
      e.spawnT += dt
      e.flash = Math.max(0, e.flash - dt * 4)
      for (const m of e.mats) {
        if (m.userData.baseEmissive) {
          m.emissive.setHex(e.flash > 0.25 ? 0xff6a40 : m.userData.baseEmissive)
          m.emissiveIntensity = (m.userData.baseIntensity || 0) + e.flash * 0.9
        }
      }

      if (e.spawnT < 0.42) {
        const t = e.spawnT / 0.42
        const sc = THREE.MathUtils.lerp(0.05, e.scaleTarget, 1 - Math.pow(1 - t, 3))
        e.group.scale.setScalar(sc * (1 + Math.sin(t * Math.PI * 3) * 0.1))
        e.group.rotation.y += dt * 3
        continue
      }
      e.group.scale.setScalar(e.scaleTarget)

      if (!playerActive) continue

      const toPlayer = _v.copy(playerPos).sub(e.group.position)
      const dist = Math.hypot(toPlayer.x, toPlayer.z)
      const desired = new THREE.Vector3(
        playerPos.x + Math.cos(time * e.strafe + e.phase) * e.orbitRadius,
        e.baseY + Math.sin(time * 1.3 + e.phase) * 0.6,
        playerPos.z + Math.sin(time * e.strafe + e.phase) * e.orbitRadius * e.orbit
      )
      const pull = dist > 17 ? 1.6 : dist < 7 ? -1.1 : 0.4
      desired.x += toPlayer.x / Math.max(1, dist) * pull * 2
      desired.z += toPlayer.z / Math.max(1, dist) * pull * 2
      _v2.copy(desired).sub(e.group.position)
      const step = Math.min(1, dt * e.speed * 0.6)
      e.group.position.addScaledVector(_v2, step)
      e.group.position.y += (desired.y - e.group.position.y) * Math.min(1, dt * 2)
      e.group.position.x = THREE.MathUtils.clamp(e.group.position.x, -21, 21)
      e.group.position.z = THREE.MathUtils.clamp(e.group.position.z, -21, 21)

      _v.copy(playerPos)
      _v.y += 0.2
      e.group.lookAt(_v)
      e.group.rotateZ(Math.sin(time * 1.1 + e.phase) * 0.16)

      e.ring.rotation.z += dt * (e.orbit > 0 ? 1.5 : -1.5) * (e.elite ? 1.3 : 1)
      e.ring2.rotation.z -= dt * 1.1
      e.core.scale.setScalar((e.elite ? 1.4 : 1) * (1 + Math.sin(time * 5 + e.phase) * 0.08))
      e.halo.material.opacity = 0.48 + Math.sin(time * 4 + e.phase) * 0.14
      for (let t = 0; t < e.thrusters.length; t++) {
        e.thrusters[t].scale.y = 0.8 + Math.sin(time * 18 + t * 2.1 + e.phase) * 0.25
      }
      if (e.shield) {
        e.shield.rotation.y += dt * 0.8
        e.shield.rotation.x += dt * 0.3
        e.shield.material.opacity = 0.09 + Math.sin(time * 3 + e.phase) * 0.04
      }

      e.fireTimer -= dt
      const distance = e.group.position.distanceTo(playerPos)
      if (e.fireTimer < 0 && distance < 30) {
        if (e.elite) {
          for (let k = -1; k <= 1; k++) {
            setTimeout(() => { if (e.alive) this.fireProjectile(e, playerPos, 0.6 + k * 1.1) }, (k + 1) * 110)
          }
          e.fireTimer = 3.1 + Math.random() * 1.4
        } else {
          this.fireProjectile(e, playerPos, 0.35)
          e.fireTimer = 2.1 + Math.random() * 2
        }
        e.core.userData.fire = 1
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      p.life += dt
      p.mesh.position.addScaledVector(p.dir, p.speed * dt)
      p.halo.position.copy(p.mesh.position)
      p.halo.scale.setScalar((p.damage > 10 ? 1.1 : 0.8) * (1 + Math.sin(p.life * 22) * 0.1))
      const dist = p.mesh.position.distanceTo(playerPos)
      let remove = p.life > p.max
      if (playerActive && dist < 0.62) {
        this.callbacks.onPlayerHit?.(p.damage, p.mesh.position.clone())
        this.effects.impact(p.mesh.position.clone(), cameraNormal(p.dir, playerPos), 0xff4050)
        remove = true
      } else if (p.mesh.position.y < 0.1) {
        this.effects.impact(p.mesh.position.clone(), new THREE.Vector3(0, 1, 0), 0xff4050)
        remove = true
      }
      if (remove) {
        this.scene.remove(p.mesh)
        this.scene.remove(p.halo)
        p.halo.material.dispose()
        this.projectiles.splice(i, 1)
      }
    }

    if (playerActive && !this.cleared && this.wave > 0 && this.queue.length === 0 && this.enemies.length === 0) {
      this.clearTimer += dt
      if (this.clearTimer > 1.6) {
        this.cleared = true
        this.callbacks.onWaveComplete?.(this.wave)
      }
    } else if (this.enemies.length > 0) {
      this.clearTimer = 0
    }
  }

  activeCount() {
    return this.enemies.length + this.queue.length
  }

  clear() {
    for (const e of [...this.enemies]) {
      this.scene.remove(e.group)
      for (const m of e.mats) m.dispose()
    }
    this.enemies = []
    this.queue = []
    this.meshes = []
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh)
      this.scene.remove(p.halo)
      p.halo.material.dispose()
    }
    this.projectiles = []
    this.cleared = false
    this.clearTimer = 0
    this.wave = 0
  }
}

function cameraNormal(dir, playerPos) {
  return dir.clone().multiplyScalar(-1)
}
