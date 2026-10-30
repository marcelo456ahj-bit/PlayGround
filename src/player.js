import * as THREE from 'three';
import { clamp, damp, radialTexture } from './util.js';

let glow = null;
function playerGlow() {
  if (!glow) {
    glow = radialTexture(128, [
      [0, 'rgba(255,255,255,1)'],
      [0.2, 'rgba(255,248,225,0.9)'],
      [0.5, 'rgba(255,214,150,0.28)'],
      [1, 'rgba(255,180,110,0)']
    ]);
  }
  return glow;
}

class Trail {
  constructor(scene, color) {
    this.count = 120;
    this.cursor = 0;
    this.positions = new Float32Array(this.count * 3);
    this.alphas = new Float32Array(this.count);
    this.sizes = new Float32Array(this.count);
    this.life = new Float32Array(this.count);
    this.maxLife = new Float32Array(this.count);
    this.velocity = new Float32Array(this.count * 3);
    this.accumulator = 0;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(color) } },
      vertexShader: `
        attribute float aAlpha;
        attribute float aSize;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (260.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          float a = smoothstep(0.5, 0.0, d);
          a *= a;
          gl_FragColor = vec4(uColor, a * vAlpha);
        }
      `
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  spawn(position, speed) {
    const index = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    const i3 = index * 3;
    this.positions[i3] = position.x + (Math.random() - 0.5) * 0.35;
    this.positions[i3 + 1] = position.y - 0.1 + (Math.random() - 0.5) * 0.25;
    this.positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.35;
    this.velocity[i3] = (Math.random() - 0.5) * 0.35;
    this.velocity[i3 + 1] = 0.12 + Math.random() * 0.3;
    this.velocity[i3 + 2] = (Math.random() - 0.5) * 0.35;
    this.sizes[index] = 0.32 + Math.random() * 0.35 + speed * 0.012;
    this.maxLife[index] = 0.5 + Math.random() * 0.65;
    this.life[index] = this.maxLife[index];
    this.alphas[index] = 0.55;
  }

  update(dt) {
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      const i3 = i * 3;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.alphas[i] = 0;
        continue;
      }
      this.positions[i3] += this.velocity[i3] * dt;
      this.positions[i3 + 1] += this.velocity[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocity[i3 + 2] * dt;
      const t = this.life[i] / this.maxLife[i];
      this.alphas[i] = t * t * 0.8;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aAlpha.needsUpdate = true;
    this.points.geometry.attributes.aSize.needsUpdate = true;
  }

  clear() {
    this.life.fill(0);
    this.alphas.fill(0);
    this.points.geometry.attributes.aAlpha.needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    this.points.material.dispose();
    this.points.removeFromParent();
  }
}

export class Player {
  constructor(scene, world, palette) {
    this.scene = scene;
    this.world = world;
    this.palette = palette;
    this.radius = 0.55;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.input = new THREE.Vector2();
    this.invulnerable = 0;
    this.edgeHit = false;
    this.speed = 0;

    this.group = new THREE.Group();
    this.group.name = 'iola';
    scene.add(this.group);

    this.roller = new THREE.Group();
    this.group.add(this.roller);

    this.coreMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff8e8,
      emissive: palette.spark,
      emissiveIntensity: 4.4,
      roughness: 0.12,
      metalness: 0.25
    });
    this.core = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 18), this.coreMaterial);
    this.core.castShadow = true;
    this.roller.add(this.core);

    this.shellMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      uniforms: {
        uColor: { value: new THREE.Color(palette.spark) },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        varying vec3 vPos;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          vPos = position;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vView;
        varying vec3 vPos;
        void main() {
          float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.2);
          float bands = 0.5 + 0.5 * sin(vPos.y * 9.0 + uTime * 2.2 + vPos.x * 3.0);
          vec3 col = mix(uColor, vec3(1.0, 0.98, 0.9), fres);
          gl_FragColor = vec4(col, fres * 0.7 + bands * 0.05);
        }
      `
    });
    this.shell = new THREE.Mesh(new THREE.SphereGeometry(0.64, 28, 20), this.shellMaterial);
    this.roller.add(this.shell);

    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: playerGlow(),
      color: palette.spark,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.85
    }));
    this.halo.scale.setScalar(2.9);
    this.group.add(this.halo);

    this.ringMaterial = new THREE.MeshBasicMaterial({
      color: palette.spark,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.rings = [];
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.82 + i * 0.12, 0.012, 6, 48), this.ringMaterial);
      ring.rotation.x = Math.PI / 2.2 + i * 0.5;
      ring.rotation.y = i * 0.8;
      this.group.add(ring);
      this.rings.push(ring);
    }

    this.light = new THREE.PointLight(palette.spark, 10, 11, 2);
    this.group.add(this.light);

    this.trail = new Trail(scene, palette.spark);
    this.reset();
  }

  reset() {
    const z = 10.5;
    const y = this.world.heightAt(0, z) + this.radius;
    this.position.set(0, y, z);
    this.velocity.set(0, 0, 0);
    this.input.set(0, 0);
    this.invulnerable = 0;
    this.edgeHit = false;
    this.speed = 0;
    this.group.position.copy(this.position);
    this.roller.quaternion.identity();
    this.trail.clear();
  }

  hit(source) {
    this.invulnerable = 1.8;
    const dx = this.position.x - source.x;
    const dz = this.position.z - source.z;
    const length = Math.hypot(dx, dz) || 1;
    this.velocity.x += (dx / length) * 8;
    this.velocity.z += (dz / length) * 8;
    this.position.x += (dx / length) * 0.35;
    this.position.z += (dz / length) * 0.35;
  }

  update(dt, move, time, active) {
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.shellMaterial.uniforms.uTime.value = time;

    const targetX = active ? move.x : 0;
    const targetY = active ? move.y : 0;
    this.input.x = damp(this.input.x, targetX, 13, dt);
    this.input.y = damp(this.input.y, targetY, 13, dt);

    if (active) {
      const acceleration = 27;
      this.velocity.x += this.input.x * acceleration * dt;
      this.velocity.z -= this.input.y * acceleration * dt;
    }

    const drag = Math.exp(-(active ? 2.05 : 4) * dt);
    this.velocity.x *= drag;
    this.velocity.z *= drag;

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    const maxSpeed = 9.6;
    if (speed > maxSpeed) {
      this.velocity.x = (this.velocity.x / speed) * maxSpeed;
      this.velocity.z = (this.velocity.z / speed) * maxSpeed;
    }
    this.speed = Math.min(speed, maxSpeed);

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    const distance = Math.hypot(this.position.x, this.position.z);
    this.edgeHit = false;
    if (distance > this.world.boundary) {
      const scale = this.world.boundary / distance;
      this.position.x *= scale;
      this.position.z *= scale;
      const nx = this.position.x / this.world.boundary;
      const nz = this.position.z / this.world.boundary;
      const outward = this.velocity.x * nx + this.velocity.z * nz;
      if (outward > 0) {
        this.velocity.x -= outward * nx * 1.35;
        this.velocity.z -= outward * nz * 1.35;
      }
      this.edgeHit = true;
    }

    const ground = this.world.heightAt(this.position.x, this.position.z) + this.radius;
    this.position.y = damp(this.position.y, ground, 20, dt);
    this.group.position.copy(this.position);

    if (this.speed > 0.15) {
      const axis = new THREE.Vector3(this.velocity.z, 0, -this.velocity.x).normalize();
      this.roller.rotateOnWorldAxis(axis, (this.speed * dt) / this.radius);
    }

    const bob = Math.sin(time * 2.4) * 0.035;
    this.core.position.y = bob;
    this.shell.position.y = bob;
    this.halo.position.y = bob;
    this.halo.material.opacity = 0.7 + Math.sin(time * 2.8) * 0.1;
    this.halo.scale.setScalar(2.75 + Math.sin(time * 1.9) * 0.12);

    this.rings.forEach((ring, index) => {
      ring.rotation.z += dt * (0.7 + index * 0.35);
      ring.rotation.x += dt * 0.18;
      ring.position.y = bob;
    });

    const flicker = this.invulnerable > 0 ? 0.55 + 0.45 * Math.sin(time * 26) : 1;
    this.coreMaterial.emissiveIntensity = 4.4 * flicker;
    this.shellMaterial.uniforms.uColor.value.set(this.palette.spark);
    this.light.intensity = 10 * flicker;

    if (active && this.speed > 0.6) {
      this.trail.accumulator += this.speed * dt * 13;
      while (this.trail.accumulator >= 1) {
        this.trail.accumulator -= 1;
        this.trail.spawn(this.position, this.speed);
      }
    }
    this.trail.update(dt);
  }

  dispose() {
    this.trail.dispose();
    this.scene.remove(this.group);
    this.group.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) object.material.dispose();
    });
  }
}
