import * as THREE from 'three';
import { clamp, lerp, smoothstep, mulberry32, radialTexture } from './util.js';

export const CHAPTERS = [
  { number: 'Chapter I', name: 'First Light', objective: 'Gather the scattered sparks', radius: 26, sparks: 8, wisps: 3, time: 85, seed: 1171 },
  { number: 'Chapter II', name: 'The Long Dusk', objective: 'Wake the shrine before the light fades', radius: 29, sparks: 10, wisps: 5, time: 95, seed: 4417 },
  { number: 'Chapter III', name: 'Before the Dawn', objective: 'Carry every last spark home', radius: 32, sparks: 12, wisps: 7, time: 110, seed: 9029 }
];

export const PALETTES = [
  {
    skyTop: 0x080c24,
    skyMid: 0x2f2a58,
    skyLow: 0xd97a5e,
    sun: 0xffb878,
    fog: 0x241f3a,
    cloudLow: 0x201a36,
    cloudHigh: 0xd77a6a,
    terrainLow: 0x092a2a,
    terrainMid: 0x1f5548,
    terrainHigh: 0x7fa35f,
    terrainSand: 0x9c7a4f,
    rock: 0x1a2b30,
    floraA: 0x5fe0c0,
    floraB: 0xf2c07a,
    spark: 0xffd98a,
    shrine: 0xffd08a,
    wisp: 0x6a3cff
  },
  {
    skyTop: 0x070a22,
    skyMid: 0x2b234d,
    skyLow: 0xc96676,
    sun: 0xffa08e,
    fog: 0x211a35,
    cloudLow: 0x1c1730,
    cloudHigh: 0xc2667a,
    terrainLow: 0x0c2830,
    terrainMid: 0x254b59,
    terrainHigh: 0x7e9a8e,
    terrainSand: 0x8c6d64,
    rock: 0x1b2830,
    floraA: 0xe88bb8,
    floraB: 0x7fd4e8,
    spark: 0xffb8d4,
    shrine: 0xffb8d4,
    wisp: 0x8a3cff
  },
  {
    skyTop: 0x051126,
    skyMid: 0x163a52,
    skyLow: 0xe9b47e,
    sun: 0xffe0ae,
    fog: 0x162a3d,
    cloudLow: 0x14283a,
    cloudHigh: 0xd9a878,
    terrainLow: 0x092a28,
    terrainMid: 0x205245,
    terrainHigh: 0x96ad72,
    terrainSand: 0x9c8258,
    rock: 0x1a2a30,
    floraA: 0x7fe8d4,
    floraB: 0xf2cf86,
    spark: 0xffe6a8,
    shrine: 0xffe6a8,
    wisp: 0x5e4ce0
  }
];

export function heightAt(x, z, seed, radius) {
  const r = Math.hypot(x, z);
  const base =
    Math.sin(x * 0.19 + seed * 2.7) * Math.cos(z * 0.16 - seed * 1.9) * 0.85 +
    Math.sin(x * 0.37 - z * 0.31 + seed * 4.3) * 0.35 +
    Math.cos(x * 0.09 + z * 0.11 + seed * 0.7) * 0.55;
  const plateau = 1.15;
  const blend = smoothstep(5.5, 10.5, r);
  let h = lerp(plateau, base + 0.55, blend);
  h += Math.pow(Math.max(0, (r - (radius - 6)) / 6), 2) * 1.8;
  h -= smoothstep(radius - 1.5, radius + 2, r) * 2.6;
  return h;
}

function createIslandGeometry(radius, seed, palette) {
  const SEGMENTS = 144;
  const RINGS = 48;
  const SKIRT = 7;
  const positions = [];
  const colors = [];
  const indices = [];
  const rand = mulberry32(seed);

  const cLow = new THREE.Color(palette.terrainLow);
  const cMid = new THREE.Color(palette.terrainMid);
  const cHigh = new THREE.Color(palette.terrainHigh);
  const cSand = new THREE.Color(palette.terrainSand);
  const cUnderA = new THREE.Color(0x182a32);
  const cUnderB = new THREE.Color(0x050a10);
  const tmp = new THREE.Color();

  const add = (x, y, z, color) => {
    positions.push(x, y, z);
    colors.push(color.r, color.g, color.b);
    return positions.length / 3 - 1;
  };

  const centerHeight = heightAt(0, 0, seed, radius);
  tmp.copy(cHigh).lerp(cMid, 0.35).multiplyScalar(1.06);
  add(0, centerHeight, 0, tmp);

  const ringStart = [];
  for (let ring = 1; ring <= RINGS; ring++) {
    const t = ring / RINGS;
    const rr = radius * t;
    const start = positions.length / 3;
    for (let segment = 0; segment < SEGMENTS; segment++) {
      const angle = (segment / SEGMENTS) * Math.PI * 2;
      const jitter = 1 + 0.045 * Math.sin(angle * 7 + seed * 1.7) + 0.02 * Math.sin(angle * 17 - seed * 3.1);
      const r = ring === RINGS ? rr * jitter : rr;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = heightAt(x, z, seed, radius);
      const hN = smoothstep(-0.6, 2.2, y);
      tmp.copy(cLow)
        .lerp(cMid, smoothstep(0.02, 0.5, hN))
        .lerp(cHigh, smoothstep(0.52, 0.95, hN));
      const rim = smoothstep(radius * 0.87, radius, r);
      tmp.lerp(cSand, rim * 0.34);
      const variation = 0.9 + 0.18 * Math.sin(angle * 23 + r * 1.7 + seed);
      tmp.multiplyScalar(variation);
      add(x, y, z, tmp);
    }
    ringStart.push(start);
  }

  for (let segment = 0; segment < SEGMENTS; segment++) {
    const next = (segment + 1) % SEGMENTS;
    indices.push(0, ringStart[0] + next, ringStart[0] + segment);
  }

  for (let ring = 0; ring < RINGS - 1; ring++) {
    const a = ringStart[ring];
    const b = ringStart[ring + 1];
    for (let segment = 0; segment < SEGMENTS; segment++) {
      const next = (segment + 1) % SEGMENTS;
      indices.push(a + segment, a + next, b + segment);
      indices.push(a + next, b + next, b + segment);
    }
  }

  let previousRing = ringStart[RINGS - 1];
  const outerStart = previousRing;
  const skirtStarts = [];
  for (let skirt = 1; skirt <= SKIRT; skirt++) {
    const t = skirt / SKIRT;
    const start = positions.length / 3;
    for (let segment = 0; segment < SEGMENTS; segment++) {
      const angle = (segment / SEGMENTS) * Math.PI * 2;
      const outerIndex = outerStart + segment;
      const outerY = positions[outerIndex * 3 + 1];
      const r = radius * (1 - 0.52 * t) * (1 + 0.055 * Math.sin(angle * 9 + seed * 2.3));
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = outerY - (0.5 + 8.2 * Math.pow(t, 1.25)) - rand() * 0.4 * t;
      tmp.copy(cUnderA).lerp(cUnderB, smoothstep(0.1, 0.95, t));
      tmp.multiplyScalar(0.9 + rand() * 0.2);
      add(x, y, z, tmp);
    }
    skirtStarts.push(start);
  }

  for (let segment = 0; segment < SEGMENTS; segment++) {
    const next = (segment + 1) % SEGMENTS;
    indices.push(previousRing + segment, previousRing + next, skirtStarts[0] + segment);
    indices.push(previousRing + next, skirtStarts[0] + next, skirtStarts[0] + segment);
  }

  for (let skirt = 0; skirt < SKIRT - 1; skirt++) {
    const a = skirtStarts[skirt];
    const b = skirtStarts[skirt + 1];
    for (let segment = 0; segment < SEGMENTS; segment++) {
      const next = (segment + 1) % SEGMENTS;
      indices.push(a + segment, b + segment, a + next);
      indices.push(a + next, b + segment, b + next);
    }
  }

  const lastRing = skirtStarts[SKIRT - 1];
  const tipY = positions[lastRing * 3 + 1] - 1.2;
  const tip = add(0, tipY, 0, cUnderB);
  for (let segment = 0; segment < SEGMENTS; segment++) {
    const next = (segment + 1) % SEGMENTS;
    indices.push(lastRing + segment, tip, lastRing + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

let glowTexture = null;
let softTexture = null;

function getGlowTexture() {
  if (!glowTexture) {
    glowTexture = radialTexture(128, [
      [0, 'rgba(255,255,255,1)'],
      [0.22, 'rgba(255,255,255,0.85)'],
      [0.48, 'rgba(255,255,255,0.28)'],
      [1, 'rgba(255,255,255,0)']
    ]);
  }
  return glowTexture;
}

function getSoftTexture() {
  if (!softTexture) {
    softTexture = radialTexture(128, [
      [0, 'rgba(255,255,255,0.95)'],
      [0.5, 'rgba(255,255,255,0.35)'],
      [1, 'rgba(255,255,255,0)']
    ]);
  }
  return softTexture;
}

class BurstSystem {
  constructor(scene) {
    this.count = 320;
    this.cursor = 0;
    this.positions = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);
    this.alphas = new Float32Array(this.count);
    this.sizes = new Float32Array(this.count);
    this.velocities = new Float32Array(this.count * 3);
    this.life = new Float32Array(this.count);
    this.maxLife = new Float32Array(this.count);
    this.gravity = new Float32Array(this.count);
    this.drag = new Float32Array(this.count);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec3 aColor;
        attribute float aAlpha;
        attribute float aSize;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (260.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          float a = smoothstep(0.5, 0.0, d);
          a *= a;
          gl_FragColor = vec4(vColor, a * vAlpha);
        }
      `
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  spawn(position, color, amount = 18, speed = 3.2, size = 0.5, gravity = 1.4) {
    const c = new THREE.Color(color);
    for (let i = 0; i < amount; i++) {
      const index = this.cursor;
      this.cursor = (this.cursor + 1) % this.count;
      const i3 = index * 3;
      this.positions[i3] = position.x + (Math.random() - 0.5) * 0.3;
      this.positions[i3 + 1] = position.y + (Math.random() - 0.5) * 0.3;
      this.positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const v = speed * (0.35 + Math.random() * 0.65);
      this.velocities[i3] = Math.sin(phi) * Math.cos(theta) * v;
      this.velocities[i3 + 1] = Math.abs(Math.cos(phi)) * v * 0.9 + 0.6;
      this.velocities[i3 + 2] = Math.sin(phi) * Math.sin(theta) * v;
      this.colors[i3] = c.r;
      this.colors[i3 + 1] = c.g;
      this.colors[i3 + 2] = c.b;
      this.alphas[index] = 1;
      this.sizes[index] = size * (0.6 + Math.random() * 0.8);
      this.maxLife[index] = 0.7 + Math.random() * 0.9;
      this.life[index] = this.maxLife[index];
      this.gravity[index] = gravity;
      this.drag[index] = 1.8 + Math.random();
    }
    this.points.geometry.attributes.aColor.needsUpdate = true;
    this.points.geometry.attributes.aSize.needsUpdate = true;
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
      const drag = Math.exp(-this.drag[i] * dt);
      this.velocities[i3] *= drag;
      this.velocities[i3 + 1] = this.velocities[i3 + 1] * drag - this.gravity[i] * dt;
      this.velocities[i3 + 2] *= drag;
      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;
      this.alphas[i] = clamp(this.life[i] / this.maxLife[i], 0, 1);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aAlpha.needsUpdate = true;
  }
}

export class World {
  constructor(scene, config, palette) {
    this.scene = scene;
    this.config = config;
    this.palette = palette;
    this.seed = config.seed;
    this.radius = config.radius;
    this.group = new THREE.Group();
    this.group.name = 'world';
    scene.add(this.group);

    this.sparks = [];
    this.wisps = [];
    this.floating = [];
    this.collected = 0;
    this.total = config.sparks;
    this.shrineOpen = false;
    this.shrinePulse = 0;
    this.domePulse = 0;
    this.time = 0;
    this.boundary = this.radius - 1.4;

    this.heightAt = (x, z) => heightAt(x, z, this.seed, this.radius);
    this.buildTerrain();
    this.buildFlora();
    this.buildBoundary();
    this.buildShrine();
    this.buildSparks();
    this.total = this.sparks.length;
    this.buildWisps();
    this.buildFloatingIslands();
    this.buildFireflies();
    this.burst = new BurstSystem(this.group);
  }

  buildTerrain() {
    const geometry = createIslandGeometry(this.radius, this.seed, this.palette);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.04,
      flatShading: true,
      side: THREE.DoubleSide
    });
    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.name = 'terrain';
    this.terrain.receiveShadow = true;
    this.terrain.castShadow = true;
    this.group.add(this.terrain);
  }

  buildFlora() {
    const rand = mulberry32(this.seed + 71);
    const colorA = new THREE.Color(this.palette.floraA);
    const colorB = new THREE.Color(this.palette.floraB);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    const grassGeometry = new THREE.ConeGeometry(0.042, 0.46, 3);
    grassGeometry.translate(0, 0.23, 0);
    const grassMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.75,
      metalness: 0.02,
      flatShading: true,
      emissive: 0x061a16,
      emissiveIntensity: 0.3
    });
    const grass = new THREE.InstancedMesh(grassGeometry, grassMaterial, 380);
    grass.name = 'grass';
    for (let i = 0; i < 380; i++) {
      const angle = rand() * Math.PI * 2;
      const r = 3.4 + Math.sqrt(rand()) * (this.radius - 6.2);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = this.heightAt(x, z);
      dummy.position.set(x, y, z);
      dummy.rotation.set((rand() - 0.5) * 0.18, rand() * Math.PI * 2, (rand() - 0.5) * 0.18);
      const scale = 0.6 + rand() * 1.2;
      dummy.scale.set(scale, scale * (0.7 + rand() * 0.9), scale);
      dummy.updateMatrix();
      grass.setMatrixAt(i, dummy.matrix);
      color.copy(colorA).lerp(colorB, rand() * 0.35);
      color.multiplyScalar(0.22 + rand() * 0.42);
      grass.setColorAt(i, color);
    }
    grass.instanceMatrix.needsUpdate = true;
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
    grass.receiveShadow = true;
    this.group.add(grass);

    const stemGeometry = new THREE.CylinderGeometry(0.035, 0.055, 0.5, 5);
    stemGeometry.translate(0, 0.25, 0);
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      emissive: 0x102b24,
      emissiveIntensity: 0.4,
      flatShading: true
    });
    const stems = new THREE.InstancedMesh(stemGeometry, stemMaterial, 42);
    stems.name = 'mushroomStems';
    const capGeometry = new THREE.SphereGeometry(0.17, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    capGeometry.scale(1, 0.62, 1);
    capGeometry.translate(0, 0.5, 0);
    const capMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.05,
      emissive: 0xffffff,
      emissiveIntensity: 0.5,
      flatShading: true
    });
    const caps = new THREE.InstancedMesh(capGeometry, capMaterial, 42);
    caps.name = 'mushroomCaps';
    for (let i = 0; i < 42; i++) {
      const angle = rand() * Math.PI * 2;
      const r = 5 + Math.sqrt(rand()) * (this.radius - 8.5);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = this.heightAt(x, z);
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rand() * Math.PI * 2, 0);
      const scale = 0.6 + rand() * 1.35;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      stems.setMatrixAt(i, dummy.matrix);
      caps.setMatrixAt(i, dummy.matrix);
      color.copy(rand() > 0.4 ? colorA : colorB).multiplyScalar(0.35 + rand() * 0.4);
      stems.setColorAt(i, color.clone().multiplyScalar(0.5));
      caps.setColorAt(i, color);
    }
    stems.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    if (stems.instanceColor) stems.instanceColor.needsUpdate = true;
    if (caps.instanceColor) caps.instanceColor.needsUpdate = true;
    caps.castShadow = true;
    this.capMaterial = capMaterial;
    this.group.add(stems);
    this.group.add(caps);

    const flowerGeometry = new THREE.OctahedronGeometry(0.075, 0);
    const flowerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true });
    const flowers = new THREE.InstancedMesh(flowerGeometry, flowerMaterial, 170);
    flowers.name = 'flowers';
    for (let i = 0; i < 170; i++) {
      const angle = rand() * Math.PI * 2;
      const r = 3.8 + Math.sqrt(rand()) * (this.radius - 7);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = this.heightAt(x, z);
      dummy.position.set(x, y + 0.16 + rand() * 0.18, z);
      dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
      const scale = 0.55 + rand() * 1.5;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      flowers.setMatrixAt(i, dummy.matrix);
      color.copy(rand() > 0.35 ? colorA : colorB).multiplyScalar(0.7 + rand() * 0.5);
      flowers.setColorAt(i, color);
    }
    flowers.instanceMatrix.needsUpdate = true;
    if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
    this.group.add(flowers);

    const rockGeometry = new THREE.DodecahedronGeometry(0.4, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: this.palette.rock,
      roughness: 0.95,
      metalness: 0.02,
      flatShading: true
    });
    const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, 46);
    rocks.name = 'rocks';
    for (let i = 0; i < 46; i++) {
      const angle = rand() * Math.PI * 2;
      const r = 4 + Math.sqrt(rand()) * (this.radius - 5);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = this.heightAt(x, z);
      dummy.position.set(x, y + 0.05, z);
      dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
      const scale = 0.25 + rand() * 0.75;
      dummy.scale.set(scale * (1 + rand() * 0.6), scale * (0.6 + rand() * 0.5), scale);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
    }
    rocks.instanceMatrix.needsUpdate = true;
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    this.group.add(rocks);
  }

  buildBoundary() {
    const rand = mulberry32(this.seed + 313);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color(this.palette.floraA);
    const geometry = new THREE.ConeGeometry(0.16, 1.5, 4);
    geometry.translate(0, 0.75, 0);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: true
    });
    const stones = new THREE.InstancedMesh(geometry, material, 30);
    stones.name = 'boundaryStones';
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2 + rand() * 0.08;
      const r = this.radius - 0.7 + rand() * 0.5;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = this.heightAt(x, z);
      dummy.position.set(x, y - 0.1, z);
      dummy.rotation.set((rand() - 0.5) * 0.25, rand() * Math.PI, (rand() - 0.5) * 0.25);
      const scale = 0.7 + rand() * 1.2;
      dummy.scale.set(scale, scale * (0.8 + rand() * 0.7), scale);
      dummy.updateMatrix();
      stones.setMatrixAt(i, dummy.matrix);
      color.copy(this.palette.floraA).lerp(new THREE.Color(this.palette.floraB), rand() * 0.45);
      color.multiplyScalar(0.4 + rand() * 0.45);
      stones.setColorAt(i, color);
    }
    stones.instanceMatrix.needsUpdate = true;
    if (stones.instanceColor) stones.instanceColor.needsUpdate = true;
    this.group.add(stones);

    const domeGeometry = new THREE.SphereGeometry(this.radius - 0.25, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    this.domeMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(this.palette.floraA) },
        uOpacity: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 3.0);
          gl_FragColor = vec4(uColor, f * uOpacity);
        }
      `
    });
    this.dome = new THREE.Mesh(domeGeometry, this.domeMaterial);
    this.dome.name = 'dome';
    this.dome.position.y = this.heightAt(0, 0) - 0.2;
    this.group.add(this.dome);
  }

  buildShrine() {
    const ground = this.heightAt(0, 0);
    const shrine = new THREE.Group();
    shrine.position.y = ground;
    this.shrine = shrine;
    this.group.add(shrine);

    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a3a3d,
      roughness: 0.82,
      metalness: 0.12,
      flatShading: true
    });
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(4.7, 5.1, 0.22, 48), stoneMaterial);
    platform.name = 'shrinePlatform';
    platform.position.y = 0.11;
    platform.receiveShadow = true;
    shrine.add(platform);

    const inner = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.55, 0.12, 40), new THREE.MeshStandardMaterial({
      color: 0x1b2c30,
      roughness: 0.7,
      metalness: 0.2
    }));
    inner.position.y = 0.24;
    shrine.add(inner);

    this.ringMaterial = new THREE.MeshStandardMaterial({
      color: this.palette.shrine,
      emissive: this.palette.shrine,
      emissiveIntensity: 1.3,
      roughness: 0.3,
      metalness: 0.4,
      transparent: true,
      opacity: 0.85
    });
    const ringGeometry = new THREE.TorusGeometry(3.75, 0.045, 8, 96);
    this.rings = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(ringGeometry, this.ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.34 + i * 0.012;
      ring.scale.setScalar(1 - i * 0.16);
      shrine.add(ring);
      this.rings.push(ring);
    }

    const runeGeometry = new THREE.BoxGeometry(0.16, 0.5, 0.12);
    const runeMaterial = new THREE.MeshStandardMaterial({
      color: this.palette.shrine,
      emissive: this.palette.shrine,
      emissiveIntensity: 1.6,
      roughness: 0.4
    });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rune = new THREE.Mesh(runeGeometry, runeMaterial);
      rune.position.set(Math.cos(angle) * 4.15, 0.4, Math.sin(angle) * 4.15);
      rune.rotation.y = -angle;
      shrine.add(rune);
    }

    const pillarMaterial = new THREE.MeshStandardMaterial({
      color: 0x27383b,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true
    });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 1.7, 6), pillarMaterial);
      pillar.name = 'shrinePillar';
      pillar.position.set(Math.cos(angle) * 4.3, 0.95, Math.sin(angle) * 4.3);
      pillar.castShadow = true;
      shrine.add(pillar);
      const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), runeMaterial);
      cap.position.set(Math.cos(angle) * 4.3, 1.95, Math.sin(angle) * 4.3);
      shrine.add(cap);
    }

    this.crystalMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff4dc,
      emissive: this.palette.shrine,
      emissiveIntensity: 2.2,
      roughness: 0.12,
      metalness: 0.35
    });
    this.crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 0), this.crystalMaterial);
    this.crystal.position.y = 3.4;
    shrine.add(this.crystal);

    const innerCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), new THREE.MeshBasicMaterial({
      color: 0xfff9ea,
      transparent: true,
      opacity: 0.95
    }));
    innerCrystal.position.y = 3.4;
    this.innerCrystal = innerCrystal;
    shrine.add(innerCrystal);

    this.crystalGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color: this.palette.shrine,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.75
    }));
    this.crystalGlow.scale.setScalar(5.4);
    this.crystalGlow.position.y = 3.4;
    shrine.add(this.crystalGlow);

    this.shrineLight = new THREE.PointLight(this.palette.shrine, 18, 26, 2);
    this.shrineLight.position.y = 3.4;
    shrine.add(this.shrineLight);

    this.beamMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(this.palette.shrine) },
        uOpacity: { value: 0.0 },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float edge = pow(abs(dot(normalize(vNormal), normalize(vView))), 1.4);
          float fade = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
          float shimmer = 0.72 + 0.28 * sin(vUv.y * 26.0 - uTime * 1.6);
          gl_FragColor = vec4(uColor, edge * fade * shimmer * uOpacity);
        }
      `
    });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.42, 17, 32, 1, true), this.beamMaterial);
    this.beam.position.y = 8.7;
    shrine.add(this.beam);

    this.shrineAura = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getSoftTexture(),
      color: this.palette.shrine,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.18
    }));
    this.shrineAura.scale.setScalar(15);
    this.shrineAura.position.y = 0.8;
    shrine.add(this.shrineAura);
  }

  buildSparks() {
    const rand = mulberry32(this.seed + 977);
    const sparkColor = new THREE.Color(this.palette.spark);
    const coreGeometry = new THREE.OctahedronGeometry(0.23, 0);
    const ringGeometry = new THREE.TorusGeometry(0.38, 0.012, 6, 28);
    const positions = [];
    let attempts = 0;

    while (positions.length < this.total && attempts < 2000) {
      attempts++;
      const angle = rand() * Math.PI * 2;
      const r = 7.2 + Math.sqrt(rand()) * (this.radius - 11);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      if (Math.hypot(x, z - 10) < 4.5) continue;
      let tooClose = false;
      for (const p of positions) {
        if (Math.hypot(p.x - x, p.z - z) < 4.2) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;
      positions.push({ x, z });
    }

    for (const p of positions) {
      const ground = this.heightAt(p.x, p.z);
      const group = new THREE.Group();
      group.position.set(p.x, ground + 0.95, p.z);
      const phase = rand() * Math.PI * 2;

      const coreMaterial = new THREE.MeshStandardMaterial({
        color: 0xfffaf0,
        emissive: sparkColor,
        emissiveIntensity: 4.2,
        roughness: 0.1,
        metalness: 0.3
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      group.add(core);

      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: sparkColor,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.9
      }));
      halo.scale.setScalar(1.9);
      group.add(halo);

      const ringMaterial = new THREE.MeshBasicMaterial({
        color: sparkColor,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2.4;
      group.add(ring);

      this.group.add(group);
      this.sparks.push({
        group,
        core,
        halo,
        ring,
        baseY: ground + 0.95,
        phase,
        collected: false,
        position: new THREE.Vector3(p.x, ground + 0.95, p.z)
      });
    }
  }

  buildWisps() {
    const rand = mulberry32(this.seed + 1901);
    const wispColor = new THREE.Color(this.palette.wisp);
    const coreGeometry = new THREE.IcosahedronGeometry(0.48, 1);

    for (let i = 0; i < this.config.wisps; i++) {
      let angle = rand() * Math.PI * 2;
      let r = 10 + rand() * (this.radius - 15);
      let x = Math.cos(angle) * r;
      let z = Math.sin(angle) * r;
      let attempts = 0;
      while (Math.hypot(x, z - 10.5) < 12 && attempts < 40) {
        attempts++;
        angle = rand() * Math.PI * 2;
        r = 10 + rand() * (this.radius - 15);
        x = Math.cos(angle) * r;
        z = Math.sin(angle) * r;
      }
      const group = new THREE.Group();
      const ground = this.heightAt(x, z);
      group.position.set(x, ground + 1.1, z);

      const coreMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a0610,
        emissive: wispColor,
        emissiveIntensity: 0.8,
        roughness: 0.5,
        metalness: 0.2,
        flatShading: true
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      group.add(core);

      const smoke = new THREE.Sprite(new THREE.SpriteMaterial({
        map: getSoftTexture(),
        color: wispColor,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.42
      }));
      smoke.scale.setScalar(2.7);
      group.add(smoke);

      const shardMaterial = new THREE.MeshBasicMaterial({
        color: wispColor,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const shards = [];
      for (let s = 0; s < 3; s++) {
        const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.12, 0), shardMaterial);
        shard.userData.angle = (s / 3) * Math.PI * 2;
        shard.userData.radius = 0.9;
        group.add(shard);
        shards.push(shard);
      }

      this.group.add(group);
      this.wisps.push({
        group,
        core,
        smoke,
        shards,
        velocity: new THREE.Vector3((rand() - 0.5) * 0.6, 0, (rand() - 0.5) * 0.6),
        wander: rand() * Math.PI * 2,
        phase: rand() * Math.PI * 2,
        speed: 1.5 + rand() * 0.7,
        scale: 1,
        fleeing: false
      });
    }
  }

  buildFloatingIslands() {
    const rand = mulberry32(this.seed + 4409);
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: this.palette.rock,
      roughness: 0.9,
      metalness: 0.05,
      emissive: 0x0a1e22,
      emissiveIntensity: 0.45,
      flatShading: true
    });
    const treeMaterial = new THREE.MeshStandardMaterial({
      color: this.palette.floraA,
      emissive: this.palette.floraA,
      emissiveIntensity: 0.7,
      roughness: 0.6,
      flatShading: true
    });
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a2a2c,
      roughness: 0.9,
      flatShading: true
    });

    for (let i = 0; i < 9; i++) {
      const angle = rand() * Math.PI * 2;
      const distance = this.radius + 14 + rand() * 24;
      const group = new THREE.Group();
      const scale = 1.0 + rand() * 2.2;
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(scale, 0), rockMaterial);
      rock.scale.set(1 + rand() * 0.7, 0.6 + rand() * 0.5, 1 + rand() * 0.7);
      rock.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
      group.add(rock);

      if (rand() > 0.25) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, scale * 0.5, 4), trunkMaterial);
        trunk.position.y = scale * 0.45;
        group.add(trunk);
        const canopy = new THREE.Mesh(new THREE.ConeGeometry(scale * 0.28, scale * 0.9, 5), treeMaterial);
        canopy.position.y = scale * 0.9;
        group.add(canopy);
      }

      const height = -2 + rand() * 8;
      group.position.set(Math.cos(angle) * distance, height, Math.sin(angle) * distance);
      group.userData.baseY = height;
      group.userData.phase = rand() * Math.PI * 2;
      group.userData.speed = 0.18 + rand() * 0.22;
      this.group.add(group);
      this.floating.push(group);
    }
  }

  buildFireflies() {
    const rand = mulberry32(this.seed + 8117);
    const count = 230;
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const colorA = new THREE.Color(this.palette.floraA);
    const colorB = new THREE.Color(this.palette.floraB);

    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * (this.radius - 1.5);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      positions[i * 3] = x;
      positions[i * 3 + 1] = this.heightAt(x, z) + 0.5 + rand() * 4.5;
      positions[i * 3 + 2] = z;
      phases[i] = rand() * Math.PI * 2;
      sizes[i] = 0.05 + rand() * 0.14;
      const color = colorA.clone().lerp(colorB, rand() * 0.7);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    this.fireflyMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: `
        attribute float aPhase;
        attribute float aSize;
        attribute vec3 aColor;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vColor = aColor;
          vec3 p = position;
          p.y += sin(uTime * 0.65 + aPhase) * 0.42;
          p.x += cos(uTime * 0.38 + aPhase * 1.3) * 0.28;
          p.z += sin(uTime * 0.31 + aPhase * 0.7) * 0.28;
          vAlpha = 0.2 + 0.55 * pow(0.5 + 0.5 * sin(uTime * 1.9 + aPhase * 2.1), 2.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = min(13.0, aSize * uPixelRatio * (240.0 / max(1.0, -mv.z)));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          float a = smoothstep(0.5, 0.0, d);
          a *= a;
          gl_FragColor = vec4(vColor, a * vAlpha);
        }
      `
    });

    this.fireflies = new THREE.Points(geometry, this.fireflyMaterial);
    this.fireflies.frustumCulled = false;
    this.group.add(this.fireflies);
  }

  collect(playerPosition) {
    const collected = [];
    for (const spark of this.sparks) {
      if (spark.collected) continue;
      const dx = spark.position.x - playerPosition.x;
      const dz = spark.position.z - playerPosition.z;
      const dy = spark.position.y - playerPosition.y;
      if (dx * dx + dy * dy + dz * dz < 2.3) {
        spark.collected = true;
        spark.group.visible = false;
        this.collected++;
        this.burst.spawn(spark.position, this.palette.spark, 26, 4.2, 0.62, 0.8);
        collected.push(spark);
      }
    }
    return collected;
  }

  checkWispCollision(playerPosition, invulnerable) {
    if (invulnerable) return null;
    for (const wisp of this.wisps) {
      if (!wisp.group.visible) continue;
      const dx = wisp.group.position.x - playerPosition.x;
      const dz = wisp.group.position.z - playerPosition.z;
      const dy = wisp.group.position.y - playerPosition.y;
      if (dx * dx + dy * dy + dz * dz < 2.4) return wisp;
    }
    return null;
  }

  openShrine() {
    if (this.shrineOpen) return;
    this.shrineOpen = true;
    this.shrinePulse = 1;
    for (const wisp of this.wisps) wisp.fleeing = true;
    const position = new THREE.Vector3(0, this.heightAt(0, 0) + 2.2, 0);
    this.burst.spawn(position, this.palette.shrine, 90, 7, 0.9, 0.4);
    this.burst.spawn(position, this.palette.spark, 60, 4, 0.7, 0.8);
  }

  isNearShrine(position, distance = 2.8) {
    return Math.hypot(position.x, position.z) < distance;
  }

  pulseDome() {
    this.domePulse = 1;
  }

  update(dt, time, playerPosition, active) {
    this.time = time;
    const ground = this.heightAt(0, 0);

    this.crystal.rotation.y += dt * 0.5;
    this.innerCrystal.rotation.y -= dt * 0.8;
    this.crystal.position.y = 3.4 + Math.sin(time * 1.3) * 0.16;
    this.innerCrystal.position.y = this.crystal.position.y;
    this.crystalGlow.position.y = this.crystal.position.y;
    this.crystalGlow.material.opacity = 0.55 + Math.sin(time * 2.1) * 0.12 + (this.shrineOpen ? 0.35 : 0);
    this.crystalGlow.scale.setScalar(this.shrineOpen ? 8.5 : 5.4);
    this.crystalMaterial.emissiveIntensity = this.shrineOpen ? 5.5 : 2.2;
    this.shrineLight.intensity = this.shrineOpen ? 55 : 18;
    this.shrineLight.position.y = this.crystal.position.y;

    this.rings.forEach((ring, i) => {
      ring.rotation.z += dt * (this.shrineOpen ? 0.9 : 0.18) * (i % 2 === 0 ? 1 : -1);
    });

    const targetBeam = this.shrineOpen ? 0.42 : 0.0;
    this.beamMaterial.uniforms.uOpacity.value = lerp(this.beamMaterial.uniforms.uOpacity.value, targetBeam, 1 - Math.exp(-2 * dt));
    this.beamMaterial.uniforms.uTime.value = time;
    this.shrineAura.material.opacity = (this.shrineOpen ? 0.42 : 0.18) + Math.sin(time * 1.7) * 0.03;

    if (this.capMaterial) this.capMaterial.emissiveIntensity = 0.42 + Math.sin(time * 1.6) * 0.08;

    for (const spark of this.sparks) {
      if (spark.collected) continue;
      spark.group.position.y = spark.baseY + Math.sin(time * 1.7 + spark.phase) * 0.18;
      spark.position.y = spark.group.position.y;
      spark.core.rotation.y += dt * 1.2;
      spark.core.rotation.x += dt * 0.4;
      spark.ring.rotation.z += dt * 1.4;
      spark.halo.material.opacity = 0.7 + Math.sin(time * 2.4 + spark.phase) * 0.18;
      const pulse = 1 + Math.sin(time * 2.2 + spark.phase) * 0.08;
      spark.halo.scale.setScalar(1.9 * pulse);
    }

    for (const island of this.floating) {
      island.position.y = island.userData.baseY + Math.sin(time * island.userData.speed + island.userData.phase) * 0.55;
      island.rotation.y += dt * 0.02;
    }

    if (this.fireflyMaterial) this.fireflyMaterial.uniforms.uTime.value = time;

    const edgeDistance = Math.hypot(playerPosition.x, playerPosition.z);
    const proximity = smoothstep(this.radius - 7, this.radius - 0.8, edgeDistance);
    this.domePulse = Math.max(0, this.domePulse - dt * 2.4);
    const domeOpacity = proximity * 0.16 + this.domePulse * 0.45;
    this.domeMaterial.uniforms.uOpacity.value = lerp(this.domeMaterial.uniforms.uOpacity.value, domeOpacity, 1 - Math.exp(-6 * dt));

    for (const wisp of this.wisps) {
      if (!wisp.group.visible) continue;
      const wispPosition = wisp.group.position;
      if (wisp.fleeing) {
        wisp.scale = Math.max(0, wisp.scale - dt * 0.7);
        wisp.group.scale.setScalar(wisp.scale);
        const away = new THREE.Vector3(wispPosition.x, 0, wispPosition.z);
        if (away.lengthSq() < 0.01) away.set(0, 0, 1);
        away.normalize();
        wispPosition.addScaledVector(away, dt * 3.2);
        wispPosition.y += dt * 1.4;
        if (wisp.scale <= 0.02) wisp.group.visible = false;
        continue;
      }

      const toPlayerX = playerPosition.x - wispPosition.x;
      const toPlayerZ = playerPosition.z - wispPosition.z;
      const distanceToPlayer = Math.hypot(toPlayerX, toPlayerZ);
      if (active && distanceToPlayer < 15 && distanceToPlayer > 0.01) {
        const desiredX = (toPlayerX / distanceToPlayer) * wisp.speed;
        const desiredZ = (toPlayerZ / distanceToPlayer) * wisp.speed;
        wisp.velocity.x = lerp(wisp.velocity.x, desiredX, 1 - Math.exp(-1.4 * dt));
        wisp.velocity.z = lerp(wisp.velocity.z, desiredZ, 1 - Math.exp(-1.4 * dt));
      } else {
        wisp.wander += (Math.random() - 0.5) * dt * 1.4;
        const desiredX = Math.cos(wisp.wander) * 0.65;
        const desiredZ = Math.sin(wisp.wander) * 0.65;
        wisp.velocity.x = lerp(wisp.velocity.x, desiredX, 1 - Math.exp(-0.7 * dt));
        wisp.velocity.z = lerp(wisp.velocity.z, desiredZ, 1 - Math.exp(-0.7 * dt));
      }

      wispPosition.x += wisp.velocity.x * dt;
      wispPosition.z += wisp.velocity.z * dt;
      const r = Math.hypot(wispPosition.x, wispPosition.z);
      if (r > this.boundary - 1.5) {
        const scale = (this.boundary - 1.5) / r;
        wispPosition.x *= scale;
        wispPosition.z *= scale;
        wisp.velocity.multiplyScalar(-0.4);
      }
      wispPosition.y = this.heightAt(wispPosition.x, wispPosition.z) + 1.15 + Math.sin(time * 2 + wisp.phase) * 0.18;
      wisp.core.rotation.y += dt * 0.7;
      wisp.core.rotation.x += dt * 0.3;
      wisp.smoke.material.opacity = 0.32 + Math.sin(time * 3 + wisp.phase) * 0.08;
      for (const shard of wisp.shards) {
        const angle = shard.userData.angle + time * 0.9;
        shard.position.set(
          Math.cos(angle) * shard.userData.radius,
          Math.sin(time * 2.3 + shard.userData.angle) * 0.35,
          Math.sin(angle) * shard.userData.radius
        );
        shard.rotation.y += dt * 2;
        shard.rotation.x += dt * 1.3;
      }
    }

    this.burst.update(dt);
  }

  dispose() {
    this.scene.remove(this.group);
    const materials = new Set();
    this.group.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      const material = object.material;
      if (Array.isArray(material)) material.forEach((m) => materials.add(m));
      else if (material) materials.add(material);
    });
    for (const material of materials) {
      for (const key of Object.keys(material)) {
        const value = material[key];
        if (value && value.isTexture && value !== glowTexture && value !== softTexture) value.dispose();
      }
      material.dispose();
    }
  }
}
