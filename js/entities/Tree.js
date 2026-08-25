import * as THREE from 'three';

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

    this.createTrunk();
    this.createFoliage();

    scene.add(this.group);
  }

  createTrunk() {
    const height = 1.5 + Math.random() * 2.0;
    const radius = 0.12 + Math.random() * 0.1;
    const geo = new THREE.CylinderGeometry(radius, radius * 1.5, height, 8);
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
    const numSpheres = 2 + Math.floor(Math.random() * 4);
    const baseSize = 0.8 + Math.random() * 0.8;
    const baseGreen = Math.floor(Math.random() * 0x004400);
    const baseColor = 0x228b22 + baseGreen;

    for (let i = 0; i < numSpheres; i++) {
      const size = baseSize * (0.5 + Math.random() * 0.6);
      const segments = 8 + Math.floor(Math.random() * 4);
      const geo = new THREE.SphereGeometry(size, segments, segments);

      const greenShift = Math.floor(Math.random() * 0x003300);
      const color = baseColor + greenShift;
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
      const sphere = new THREE.Mesh(geo, mat);

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * baseSize * 0.5;
      const yOffset = i * baseSize * 0.4;

      sphere.position.set(
        Math.cos(angle) * dist,
        this.trunkHeight + size * 0.3 + yOffset,
        Math.sin(angle) * dist
      );

      sphere.castShadow = true;
      sphere.receiveShadow = true;
      this.group.add(sphere);
    }
  }
}
