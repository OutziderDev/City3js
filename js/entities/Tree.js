import * as THREE from 'three';
import {
  TREE_BARK_COLOR, TREE_FOLIAGE_COLORS, TREE_FOLIAGE_DETAIL,
  TREE_FOLIAGE_NOISE, TREE_TRUNK_SEGMENTS, TREE_BRANCH_SEGMENTS
} from '../utils/constants.js';

function createBarkRoughnessMap() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const w = 1 + Math.random() * 3;
    const h = 2 + Math.random() * 8;
    const val = 0.4 + Math.random() * 0.4;
    ctx.fillStyle = `rgb(${val * 255},${val * 255},${val * 255})`;
    ctx.fillRect(x, y, w, h);
  }

  for (let row = 0; row < size; row += 2) {
    const offset = Math.random() * 4 - 2;
    for (let col = 0; col < size; col++) {
      const imgData = ctx.getImageData(col, row, 1, 1);
      const v = imgData.data[0] / 255;
      const nv = Math.max(0, Math.min(1, v + (Math.random() - 0.5) * 0.15));
      ctx.fillStyle = `rgb(${nv * 255},${nv * 255},${nv * 255})`;
      ctx.fillRect(col + offset, row, 1, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

let cachedBarkRoughness = null;

function getBarkRoughnessMap() {
  if (!cachedBarkRoughness) {
    cachedBarkRoughness = createBarkRoughnessMap();
  }
  return cachedBarkRoughness;
}

let cachedBarkMaterial = null;

function getBarkMaterial() {
  if (!cachedBarkMaterial) {
    cachedBarkMaterial = new THREE.MeshStandardMaterial({
      color: TREE_BARK_COLOR,
      roughness: 0.95,
      roughnessMap: getBarkRoughnessMap(),
      flatShading: true
    });
  }
  return cachedBarkMaterial;
}

const foliageMaterials = new Map();

function getFoliageMaterial(hex) {
  if (!foliageMaterials.has(hex)) {
    foliageMaterials.set(hex, new THREE.MeshStandardMaterial({
      color: hex,
      roughness: 0.85,
      flatShading: true
    }));
  }
  return foliageMaterials.get(hex);
}

function hash3(x, y, z) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

export class Tree {
  constructor(scene, x, z) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);

    this.createTrunk();
    this.createBranches();
    this.createCanopy();

    scene.add(this.group);
  }

  createTrunk() {
    this.trunkHeight = 1.5 + Math.random() * 2.0;
    this.trunkRadius = 0.12 + Math.random() * 0.1;
    this.forkHeight = this.trunkHeight * (0.55 + Math.random() * 0.1);

    const geo = new THREE.CylinderGeometry(
      this.trunkRadius,
      this.trunkRadius * 1.6,
      this.trunkHeight,
      TREE_TRUNK_SEGMENTS
    );
    const trunk = new THREE.Mesh(geo, getBarkMaterial());
    trunk.position.y = this.trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    this.group.add(trunk);
  }

  createBranches() {
    const count = 2 + Math.floor(Math.random() * 2);
    const up = new THREE.Vector3(0, 1, 0);
    this.branchTips = [];

    for (let i = 0; i < count; i++) {
      const azimuth = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
      const tilt = 0.52 + Math.random() * 0.32;
      const length = this.trunkHeight * (0.35 + Math.random() * 0.2);

      const dir = new THREE.Vector3(
        Math.sin(tilt) * Math.cos(azimuth),
        Math.cos(tilt),
        Math.sin(tilt) * Math.sin(azimuth)
      ).normalize();

      const geo = new THREE.CylinderGeometry(
        this.trunkRadius * 0.3,
        this.trunkRadius * 0.55,
        length,
        TREE_BRANCH_SEGMENTS
      );
      geo.translate(0, length / 2, 0);
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir));
      geo.translate(0, this.forkHeight, 0);

      const branch = new THREE.Mesh(geo, getBarkMaterial());
      branch.castShadow = true;
      branch.receiveShadow = true;
      this.group.add(branch);

      this.branchTips.push({
        position: new THREE.Vector3(0, this.forkHeight, 0).addScaledVector(dir, length),
        dir
      });
    }
  }

  createCanopy() {
    const baseSize = 0.8 + Math.random() * 0.8;
    const hex = TREE_FOLIAGE_COLORS[Math.floor(Math.random() * TREE_FOLIAGE_COLORS.length)];
    const mat = getFoliageMaterial(hex);

    const crownRadius = baseSize * (0.85 + Math.random() * 0.25);
    this.addBlob(mat, crownRadius, 0, this.trunkHeight + crownRadius * 0.25, 0);

    for (const tip of this.branchTips) {
      const radius = baseSize * (0.55 + Math.random() * 0.2);
      const pos = tip.position.clone().addScaledVector(tip.dir, radius * 0.3);
      this.addBlob(mat, radius, pos.x, pos.y, pos.z);
    }
  }

  addBlob(mat, radius, x, y, z) {
    const geo = this.createBlobGeometry(radius);
    geo.computeBoundingBox();

    if (geo.boundingBox.min.y + y < 0) {
      y = -geo.boundingBox.min.y;
    }

    const blob = new THREE.Mesh(geo, mat);
    blob.position.set(x, y, z);
    blob.castShadow = true;
    blob.receiveShadow = true;
    this.group.add(blob);
  }

  createBlobGeometry(radius) {
    const geo = new THREE.IcosahedronGeometry(1, TREE_FOLIAGE_DETAIL);

    const pos = geo.attributes.position;
    const normal = new THREE.Vector3();
    const vertex = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      vertex.fromBufferAttribute(pos, i);
      const push = hash3(vertex.x, vertex.y, vertex.z) - 0.5;
      normal.copy(vertex).normalize();
      pos.setXYZ(
        i,
        vertex.x + normal.x * push * TREE_FOLIAGE_NOISE,
        vertex.y + normal.y * push * TREE_FOLIAGE_NOISE,
        vertex.z + normal.z * push * TREE_FOLIAGE_NOISE
      );
    }
    pos.needsUpdate = true;

    geo.scale(
      radius * (0.9 + Math.random() * 0.25),
      radius * (0.95 + Math.random() * 0.5),
      radius * (0.9 + Math.random() * 0.25)
    );
    geo.computeVertexNormals();

    return geo;
  }
}
