import * as THREE from 'three';
import {
  GRID_SIZE, BLOCK_SIZE, ROAD_WIDTH, SIDEWALK_WIDTH, SIDEWALK_HEIGHT,
  LAMP_HEIGHT, LAMP_ARM_LENGTH, LAMP_POLE_RADIUS, LAMP_BULB_RADIUS,
  LAMP_COLOR, LAMP_BULB_EMISSIVE, LAMP_POOL_RADIUS, LAMP_POOL_OPACITY,
  LAMP_ON_HOUR, LAMP_OFF_HOUR, LAMP_FADE_HOURS,
  LAMP_LIGHT_COUNT, LAMP_LIGHT_INTENSITY, LAMP_LIGHT_DISTANCE, LAMP_LIGHT_ANCHORS
} from '../utils/constants.js';

function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function getNightFactor(hour) {
  const nightLength = (LAMP_OFF_HOUR - LAMP_ON_HOUR + 24) % 24;
  const since = (hour - LAMP_ON_HOUR + 24) % 24;

  if (since >= nightLength) return 0;

  if (since < LAMP_FADE_HOURS) return smoothstep(since / LAMP_FADE_HOURS);
  if (since > nightLength - LAMP_FADE_HOURS) return smoothstep((nightLength - since) / LAMP_FADE_HOURS);

  return 1;
}

function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

let cachedGlowTexture = null;
let cachedPoleMaterial = null;
let cachedBulbMaterial = null;
let cachedPoolMaterial = null;

function getGlowTexture() {
  if (!cachedGlowTexture) cachedGlowTexture = createGlowTexture();
  return cachedGlowTexture;
}

function getPoleMaterial() {
  if (!cachedPoleMaterial) {
    cachedPoleMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.85,
      roughness: 0.35
    });
  }
  return cachedPoleMaterial;
}

function getBulbMaterial() {
  if (!cachedBulbMaterial) {
    cachedBulbMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      emissive: LAMP_COLOR,
      emissiveIntensity: 0,
      roughness: 0.4
    });
  }
  return cachedBulbMaterial;
}

function getPoolMaterial() {
  if (!cachedPoolMaterial) {
    cachedPoolMaterial = new THREE.MeshBasicMaterial({
      map: getGlowTexture(),
      color: LAMP_COLOR,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }
  return cachedPoolMaterial;
}

export class StreetLampManager {
  constructor(scene, dayNight) {
    this.scene = scene;
    this.dayNight = dayNight;
    this.lamps = [];
    this.lights = [];

    this.poleMaterial = getPoleMaterial();
    this.bulbMaterial = getBulbMaterial();
    this.poolMaterial = getPoolMaterial();

    this.createLamps();
    this.createRealLights();
    this.update();
  }

  createLamps() {
    const step = BLOCK_SIZE + ROAD_WIDTH;
    const halfExtent = GRID_SIZE * step / 2;
    const swCenter = BLOCK_SIZE / 2 - SIDEWALK_WIDTH / 2;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const bx = -halfExtent + r * step + ROAD_WIDTH / 2 + BLOCK_SIZE / 2;
        const bz = -halfExtent + c * step + ROAD_WIDTH / 2 + BLOCK_SIZE / 2;

        if ((r + c) % 2 === 0) {
          this.addLamp(bx, bz - swCenter, 0, -1);
          this.addLamp(bx, bz + swCenter, 0, 1);
        } else {
          this.addLamp(bx - swCenter, bz, -1, 0);
          this.addLamp(bx + swCenter, bz, 1, 0);
        }
      }
    }

    this.buildInstancedMeshes();
  }

  addLamp(x, z, dirX, dirZ) {
    this.lamps.push({
      x,
      z,
      dirX,
      dirZ,
      bulbX: x + dirX * LAMP_ARM_LENGTH,
      bulbZ: z + dirZ * LAMP_ARM_LENGTH,
      bulbY: SIDEWALK_HEIGHT + LAMP_HEIGHT
    });
  }

  buildInstancedMeshes() {
    const count = this.lamps.length;
    const baseY = SIDEWALK_HEIGHT + LAMP_HEIGHT / 2;
    const topY = SIDEWALK_HEIGHT + LAMP_HEIGHT;

    const poleGeo = new THREE.CylinderGeometry(LAMP_POLE_RADIUS, LAMP_POLE_RADIUS * 1.4, LAMP_HEIGHT, 8);

    const armGeo = new THREE.CylinderGeometry(0.055, 0.07, LAMP_ARM_LENGTH, 6);
    armGeo.rotateZ(-Math.PI / 2);
    armGeo.translate(LAMP_ARM_LENGTH / 2, 0, 0);

    const bulbGeo = new THREE.SphereGeometry(LAMP_BULB_RADIUS, 12, 8);
    const poolGeo = new THREE.PlaneGeometry(LAMP_POOL_RADIUS * 2, LAMP_POOL_RADIUS * 2);

    const poleMesh = new THREE.InstancedMesh(poleGeo, this.poleMaterial, count);
    const armMesh = new THREE.InstancedMesh(armGeo, this.poleMaterial, count);
    const bulbMesh = new THREE.InstancedMesh(bulbGeo, this.bulbMaterial, count);
    const poolMesh = new THREE.InstancedMesh(poolGeo, this.poolMaterial, count);

    poleMesh.castShadow = true;
    armMesh.castShadow = true;
    this.poolMesh = poolMesh;

    const dummy = new THREE.Object3D();
    const identity = new THREE.Quaternion();
    const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const fromX = new THREE.Vector3(1, 0, 0);
    const dir = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const lamp = this.lamps[i];

      dummy.position.set(lamp.x, baseY, lamp.z);
      dummy.quaternion.copy(identity);
      dummy.updateMatrix();
      poleMesh.setMatrixAt(i, dummy.matrix);

      dir.set(lamp.dirX, 0, lamp.dirZ);
      dummy.position.set(lamp.x, topY, lamp.z);
      dummy.quaternion.setFromUnitVectors(fromX, dir);
      dummy.updateMatrix();
      armMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(lamp.bulbX, lamp.bulbY, lamp.bulbZ);
      dummy.quaternion.copy(identity);
      dummy.updateMatrix();
      bulbMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(lamp.bulbX, SIDEWALK_HEIGHT + 0.01, lamp.bulbZ);
      dummy.quaternion.copy(flat);
      dummy.updateMatrix();
      poolMesh.setMatrixAt(i, dummy.matrix);
    }

    for (const mesh of [poleMesh, armMesh, bulbMesh, poolMesh]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      this.scene.add(mesh);
    }
  }

  createRealLights() {
    const used = new Set();

    for (let i = 0; i < LAMP_LIGHT_COUNT; i++) {
      const anchor = LAMP_LIGHT_ANCHORS[i % LAMP_LIGHT_ANCHORS.length];
      const lamp = this.getNearestLamp(anchor.x, anchor.z, used);
      used.add(lamp);

      const light = new THREE.PointLight(LAMP_COLOR, 0, LAMP_LIGHT_DISTANCE, 2);
      light.position.set(lamp.bulbX, lamp.bulbY, lamp.bulbZ);
      this.scene.add(light);
      this.lights.push(light);
    }
  }

  getNearestLamp(x, z, used) {
    let best = null;
    let bestDist = Infinity;

    for (const lamp of this.lamps) {
      if (used.has(lamp)) continue;
      const dx = lamp.x - x;
      const dz = lamp.z - z;
      const dist = dx * dx + dz * dz;
      if (dist < bestDist) {
        bestDist = dist;
        best = lamp;
      }
    }

    return best ?? this.lamps[0];
  }

  update() {
    const visualTime = (this.dayNight.time + this.dayNight.dayOffset) % 1;
    const hour = visualTime * 24;
    const factor = getNightFactor(hour);

    this.bulbMaterial.emissiveIntensity = factor * LAMP_BULB_EMISSIVE;
    this.poolMaterial.opacity = factor * LAMP_POOL_OPACITY;
    this.poolMesh.visible = factor > 0;

    for (const light of this.lights) {
      light.intensity = factor * LAMP_LIGHT_INTENSITY;
    }
  }
}
