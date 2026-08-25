import * as THREE from 'three';
import { createFoliageMaterial } from '../shaders/WindFoliage.js';

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

export class Tree {
  constructor(scene, x, z) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);

    this.treeType = Math.random();
    this.createTrunk();
    this.createFoliage();

    scene.add(this.group);
  }

  createTrunk() {
    const height = 1.2 + Math.random() * 1.5;
    const radius = 0.08 + Math.random() * 0.08;
    const geo = new THREE.CylinderGeometry(radius, radius * 1.4, height, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x6b4226,
      roughness: 0.95,
      roughnessMap: getBarkRoughnessMap()
    });
    const trunk = new THREE.Mesh(geo, mat);
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    this.group.add(trunk);
    this.trunkHeight = height;
  }

  createFoliage() {
    if (this.treeType < 0.35) {
      this.createBushyFoliage();
    } else if (this.treeType < 0.65) {
      this.createLayeredFoliage();
    } else {
      this.createSphericalFoliage();
    }
  }

  addLeafCard(x, y, z, size, rotY, rotX, color) {
    const leafGeo = new THREE.PlaneGeometry(size, size * 1.2);
    const mat = createFoliageMaterial(color);
    const card = new THREE.Mesh(leafGeo, mat);
    card.position.set(x, y, z);
    card.rotation.y = rotY;
    card.rotation.x = rotX;
    card.castShadow = true;
    card.receiveShadow = true;
    this.group.add(card);
    return card;
  }

  createBushyFoliage() {
    const baseSize = 0.35 + Math.random() * 0.3;
    const numClusters = 3 + Math.floor(Math.random() * 3);
    const baseGreen = Math.floor(Math.random() * 0x004400);
    const baseColor = 0x228b22 + baseGreen;

    for (let i = 0; i < numClusters; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * baseSize * 0.8;
      const cx = Math.cos(angle) * dist;
      const cz = Math.sin(angle) * dist;
      const cy = this.trunkHeight + Math.random() * baseSize * 0.5;
      const clusterSize = baseSize * (0.6 + Math.random() * 0.6);

      const cardsInCluster = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < cardsInCluster; j++) {
        const cardAngle = (j / cardsInCluster) * Math.PI + Math.random() * 0.4;
        const cardDist = Math.random() * clusterSize * 0.3;
        const greenShift = Math.floor(Math.random() * 0x003300);
        const cardColor = baseColor + greenShift;

        this.addLeafCard(
          cx + Math.cos(cardAngle) * cardDist,
          cy + Math.random() * clusterSize * 0.3,
          cz + Math.sin(cardAngle) * cardDist,
          clusterSize * (0.5 + Math.random() * 0.5),
          cardAngle + Math.random() * 0.3,
          (Math.random() - 0.5) * 0.4,
          cardColor
        );
      }
    }
  }

  createLayeredFoliage() {
    const layers = 2 + Math.floor(Math.random() * 2);
    const baseGreen = Math.floor(Math.random() * 0x004400);
    const baseColor = 0x228b22 + baseGreen;

    for (let i = 0; i < layers; i++) {
      const layerSize = (0.5 + Math.random() * 0.4) * (1 - i * 0.1);
      const cardsPerLayer = 4 + Math.floor(Math.random() * 3);
      const yBase = this.trunkHeight + i * layerSize * 0.9;

      for (let j = 0; j < cardsPerLayer; j++) {
        const a = (j / cardsPerLayer) * Math.PI * 2 + Math.random() * 0.3;
        const r = layerSize * 0.2 + Math.random() * layerSize * 0.3;
        const greenShift = Math.floor(Math.random() * 0x003300);

        this.addLeafCard(
          Math.cos(a) * r,
          yBase + Math.random() * layerSize * 0.3,
          Math.sin(a) * r,
          layerSize * (0.5 + Math.random() * 0.4),
          a,
          (Math.random() - 0.5) * 0.3,
          baseColor + greenShift
        );
      }
    }
  }

  createSphericalFoliage() {
    const size = 0.5 + Math.random() * 0.5;
    const cardsCount = 5 + Math.floor(Math.random() * 4);
    const baseGreen = Math.floor(Math.random() * 0x004400);
    const baseColor = 0x228b22 + baseGreen;

    for (let i = 0; i < cardsCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = size * (0.5 + Math.random() * 0.5);

      const x = Math.sin(phi) * Math.cos(theta) * r;
      const y = Math.cos(phi) * r * 0.7;
      const z = Math.sin(phi) * Math.sin(theta) * r;

      const greenShift = Math.floor(Math.random() * 0x003300);
      const cardAngle = theta + Math.PI / 2;

      this.addLeafCard(
        x,
        this.trunkHeight + size * 0.3 + y,
        z,
        size * (0.4 + Math.random() * 0.3),
        cardAngle,
        (Math.random() - 0.5) * 0.5,
        baseColor + greenShift
      );
    }
  }
}
