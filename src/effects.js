import * as THREE from 'three'
import { makeGlow, makeSmoke, makeSpark } from './textures.js'

function canvasRadial(size, inner, outer, color = '0,0,0') {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const x = c.getContext('2d')
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, `rgba(${color},${inner})`)
  g.addColorStop(0.6, `rgba(${color},${outer})`)
  g.addColorStop(1, `rgba(${color},0)`)
  x.fillStyle = g
  x.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  return tex
}

export class Effects {
  constructor(scene) {
    this.scene = scene
    this.items = []
    this.glow = makeGlow(128)
    this.softGlow = makeGlow(256, 0.01)
    this.spark = makeSpark(64)
    this.smoke = makeSmoke(128)
    this.scorchTex = canvasRadial(128, 0.55, 0.18)
    this.scorchGeo = new THREE.CircleGeometry(0.3, 16)
    this.decalMat = new THREE.MeshBasicMaterial({ map: this.scorchTex, transparent: true, depthWrite: false, color: 0x05070a, opacity: 0.0, polygonOffset: true, polygonOffsetFactor: -2 })
    this.debrisGeo = new THREE.BoxGeometry(1, 1, 1)
    this.debrisMat = new THREE.MeshStandardMaterial({ color: 0x1d242b, roughness: 0.45, metalness: 0.8 })
    this.shellGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.07, 8)
    this.shellMat = new THREE.MeshStandardMaterial({ color: 0xc99a52, roughness: 0.28, metalness: 0.95 })
    this.decals = []
    this.ringGeo = new THREE.RingGeometry(0.72, 0.82, 48)
    this.tracerGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6, 1, true)
    this.shellCount = 0
  }

  add(item) {
    this.items.push(item)
    return item
  }

  sparkBurst(pos, normal, color = 0xffb060, count = 10, power = 1) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.spark, color, transparent: true, opacity: 1,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
      })
      const s = new THREE.Sprite(mat)
      const size = (0.08 + Math.random() * 0.2) * power
      s.scale.setScalar(size)
      s.position.copy(pos).addScaledVector(normal, 0.03)
      this.scene.add(s)
      const v = normal.clone().multiplyScalar(2 + Math.random() * 5)
      v.x += (Math.random() - 0.5) * 7
      v.y += (Math.random() - 0.2) * 6
      v.z += (Math.random() - 0.5) * 7
      let life = 0, max = 0.25 + Math.random() * 0.55
      this.add({
        update: (dt) => {
          life += dt
          v.y -= 20 * dt
          s.position.addScaledVector(v, dt)
          s.material.opacity = Math.max(0, 1 - life / max)
          s.scale.setScalar(size * (1 - life / max * 0.6))
          if (life >= max) { this.scene.remove(s); s.material.dispose(); return false }
          return true
        }
      })
    }
  }

  impact(pos, normal, color = 0xffb060) {
    const flashMat = new THREE.SpriteMaterial({ map: this.softGlow, color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    const flash = new THREE.Sprite(flashMat)
    flash.position.copy(pos).addScaledVector(normal, 0.04)
    flash.scale.setScalar(0.35)
    this.scene.add(flash)
    let life = 0
    this.add({
      update: (dt) => {
        life += dt
        flash.scale.setScalar(0.35 + life * 5)
        flashMat.opacity = Math.max(0, 0.85 - life * 9)
        if (life > 0.1) { this.scene.remove(flash); flashMat.dispose(); return false }
        return true
      }
    })
    this.sparkBurst(pos, normal, color, 9, 0.9)
    this.decal(pos, normal)
  }

  decal(pos, normal) {
    const mat = this.decalMat.clone()
    mat.opacity = 0.9
    const d = new THREE.Mesh(this.scorchGeo, mat)
    d.position.copy(pos).addScaledVector(normal, 0.012)
    d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    d.rotateZ(Math.random() * Math.PI * 2)
    d.scale.setScalar(0.7 + Math.random() * 0.7)
    this.scene.add(d)
    this.decals.push(d)
    if (this.decals.length > 42) {
      const old = this.decals.shift()
      this.scene.remove(old)
      old.material.dispose()
    }
    let life = 0
    this.add({
      update: (dt) => {
        life += dt
        mat.opacity = Math.max(0, 0.9 * (1 - Math.max(0, life - 4) / 3))
        if (life > 7) {
          this.scene.remove(d)
          const i = this.decals.indexOf(d)
          if (i >= 0) this.decals.splice(i, 1)
          mat.dispose()
          return false
        }
        return true
      }
    })
  }

  tracer(from, to, color = 0xffd9a0) {
    const delta = to.clone().sub(from)
    const len = delta.length()
    if (len < 0.2) return
    const dir = delta.clone().normalize()
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    const m = new THREE.Mesh(this.tracerGeo, mat)
    m.scale.set(1, len, 1)
    m.position.copy(from).addScaledVector(delta, 0.5)
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    this.scene.add(m)
    let life = 0
    this.add({
      update: (dt) => {
        life += dt
        mat.opacity = Math.max(0, 0.9 - life * 16)
        if (life > 0.07) { this.scene.remove(m); mat.dispose(); return false }
        return true
      }
    })
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    const core = new THREE.Mesh(this.tracerGeo, coreMat)
    core.scale.set(0.4, len, 0.4)
    core.position.copy(from).addScaledVector(delta, 0.5)
    core.quaternion.copy(m.quaternion)
    this.scene.add(core)
    let life2 = 0
    this.add({
      update: (dt) => {
        life2 += dt
        coreMat.opacity = Math.max(0, 1 - life2 * 22)
        if (life2 > 0.06) { this.scene.remove(core); coreMat.dispose(); return false }
        return true
      }
    })
  }

  explosion(pos, color = 0xff7a32, scale = 1) {
    const mat = new THREE.SpriteMaterial({ map: this.softGlow, color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    const flash = new THREE.Sprite(mat)
    flash.position.copy(pos)
    flash.scale.setScalar(1.2 * scale)
    this.scene.add(flash)
    let life = 0
    this.add({
      update: (dt) => {
        life += dt
        flash.scale.setScalar((1.2 + life * 22) * scale)
        mat.opacity = Math.max(0, 1 - life * 4.5)
        if (life > 0.24) { this.scene.remove(flash); mat.dispose(); return false }
        return true
      }
    })

    for (let i = 0; i < 26; i++) {
      const sm = new THREE.SpriteMaterial({ map: this.smoke, color: i < 10 ? color : 0x2b3038, transparent: true, opacity: 0.34, blending: THREE.NormalBlending, depthWrite: false })
      const s = new THREE.Sprite(sm)
      s.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2).multiplyScalar(scale))
      s.scale.setScalar((0.5 + Math.random()) * scale)
      this.scene.add(s)
      const v = new THREE.Vector3((Math.random() - 0.5) * 3.2, (Math.random() * 1.6 + 0.2) * scale, (Math.random() - 0.5) * 3.2)
      let t = 0
      const max = 1.2 + Math.random() * 1.1
      this.add({
        update: (dt) => {
          t += dt
          v.multiplyScalar(1 - dt * 0.9)
          s.position.addScaledVector(v, dt)
          s.scale.setScalar((0.5 + t * 1.1) * scale)
          sm.opacity = Math.max(0, 0.34 * (1 - t / max))
          if (t >= max) { this.scene.remove(s); sm.dispose(); return false }
          return true
        }
      })
    }

    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe0b0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
    const ring = new THREE.Mesh(this.ringGeo, ringMat)
    ring.position.copy(pos)
    ring.rotation.x = -Math.PI / 2
    ring.scale.setScalar(scale)
    this.scene.add(ring)
    let rt = 0
    this.add({
      update: (dt) => {
        rt += dt
        ring.scale.setScalar((1 + rt * 15) * scale)
        ringMat.opacity = Math.max(0, 0.9 - rt * 2.8)
        if (rt > 0.34) { this.scene.remove(ring); ringMat.dispose(); return false }
        return true
      }
    })

    this.sparkBurst(pos, new THREE.Vector3(0, 1, 0), color, 34, 1.8)
    this.sparkBurst(pos, new THREE.Vector3(0, 1, 0), 0xffffff, 10, 1.2)

    for (let i = 0; i < 9 * scale; i++) {
      const d = new THREE.Mesh(this.debrisGeo, this.debrisMat)
      const sz = 0.09 + Math.random() * 0.25
      d.scale.set(sz * (1 + Math.random()), sz * 0.5, sz)
      d.position.copy(pos)
      d.castShadow = true
      this.scene.add(d)
      const v = new THREE.Vector3((Math.random() - 0.5) * 12, Math.random() * 9 + 2, (Math.random() - 0.5) * 12)
      const spin = new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12)
      let t = 0
      const max = 1.6 + Math.random()
      this.add({
        update: (dt) => {
          t += dt
          v.y -= 24 * dt
          d.position.addScaledVector(v, dt)
          d.rotation.x += spin.x * dt
          d.rotation.y += spin.y * dt
          d.rotation.z += spin.z * dt
          if (d.position.y < sz * 0.3) { d.position.y = sz * 0.3; v.y *= -0.34; v.x *= 0.7; v.z *= 0.7; spin.multiplyScalar(0.6) }
          if (t > max) { this.scene.remove(d); return false }
          return true
        }
      })
    }

    const light = new THREE.PointLight(color, 45 * scale, 9 * scale, 2)
    light.position.copy(pos)
    this.scene.add(light)
    let lt = 0
    this.add({
      update: (dt) => {
        lt += dt
        light.intensity = Math.max(0, 45 * scale * (1 - lt * 7))
        if (lt > 0.16) { this.scene.remove(light); return false }
        return true
      }
    })
  }

  shell(pos, direction) {
    if (this.shellCount > 55) return
    this.shellCount++
    const s = new THREE.Mesh(this.shellGeo, this.shellMat)
    s.position.copy(pos)
    s.castShadow = false
    s.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3)
    this.scene.add(s)
    const v = direction.clone().multiplyScalar(1.2)
    v.x += (Math.random() - 0.5) * 1.4
    v.y += 1.6 + Math.random()
    v.z += (Math.random() - 0.5) * 1.4
    let t = 0
    this.add({
      update: (dt) => {
        t += dt
        v.y -= 17 * dt
        s.position.addScaledVector(v, dt)
        s.rotation.x += dt * 14
        s.rotation.z += dt * 9
        if (s.position.y < 0.02) { s.position.y = 0.02; v.y = Math.abs(v.y) * 0.35; v.x *= 0.6; v.z *= 0.6 }
        if (t > 2.2) { this.scene.remove(s); this.shellCount--; return false }
        return true
      }
    })
  }

  portal(pos, color = 0xff4a5a) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 40), mat)
    ring.position.copy(pos)
    ring.lookAt(pos.clone().add(new THREE.Vector3(0, 0, 1)))
    this.scene.add(ring)
    let t = 0
    this.add({
      update: (dt) => {
        t += dt
        ring.scale.setScalar(1 + t * 4)
        mat.opacity = Math.max(0, 0.9 - t * 1.6)
        if (t > 0.7) { this.scene.remove(ring); ring.geometry.dispose(); mat.dispose(); return false }
        return true
      }
    })
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.softGlow, color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
    flash.position.copy(pos)
    flash.scale.setScalar(1.5)
    this.scene.add(flash)
    let ft = 0
    this.add({
      update: (dt) => {
        ft += dt
        flash.scale.setScalar(1.5 + ft * 10)
        flash.material.opacity = Math.max(0, 0.9 - ft * 3)
        if (ft > 0.3) { this.scene.remove(flash); flash.material.dispose(); return false }
        return true
      }
    })
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (!this.items[i].update(dt)) this.items.splice(i, 1)
    }
  }
}
