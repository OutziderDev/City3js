import * as THREE from 'three';

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
    const height = 0.8 + Math.random() * 1.2;
    const radius = 0.08 + Math.random() * 0.08;
    const geo = new THREE.CylinderGeometry(radius, radius * 1.4, height, 6);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
    const trunk = new THREE.Mesh(geo, mat);
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    this.group.add(trunk);
  }

  createFoliage() {
    const size = 0.8 + Math.random() * 0.8;
    const geo = new THREE.SphereGeometry(size, 8, 6);
    const green = 0x228b22 + Math.floor(Math.random() * 0x003300);
    const mat = new THREE.MeshStandardMaterial({ color: green, roughness: 0.85 });
    const foliage = new THREE.Mesh(geo, mat);
    foliage.position.y = 1.4 + Math.random() * 0.8;
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    this.group.add(foliage);
  }
}
