import * as THREE from 'three';
import {
  PERSON_HEIGHT, PERSON_SPEEDS, PERSON_COLORS,
  SIDEWALK_HEIGHT, ROAD_WIDTH, BLOCK_SIZE, GRID_SIZE
} from '../utils/constants.js';

export class Person {
  constructor(scene, startX, startZ, direction, speed) {
    this.scene = scene;
    this.direction = direction;
    this.speed = speed || PERSON_SPEEDS[Math.floor(Math.random() * PERSON_SPEEDS.length)];
    this.walkPhase = Math.random() * Math.PI * 2;
    this.turnTimer = 0;
    this.turnInterval = 5 + Math.random() * 10;
    this.alive = true;
    this.previousPosition = new THREE.Vector3(startX, SIDEWALK_HEIGHT, startZ);

    this.group = new THREE.Group();
    this.createBody();

    this.group.position.set(startX, SIDEWALK_HEIGHT, startZ);
    scene.add(this.group);
  }

  createBody() {
    const skinColor = 0xf5c6a0;
    const clothesColor = PERSON_COLORS[Math.floor(Math.random() * PERSON_COLORS.length)];

    const torsoGeo = new THREE.BoxGeometry(0.4, 0.6, 0.25);
    const torsoMat = new THREE.MeshStandardMaterial({ color: clothesColor, roughness: 0.7 });
    this.torso = new THREE.Mesh(torsoGeo, torsoMat);
    this.torso.position.y = PERSON_HEIGHT * 0.55;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    const headGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = PERSON_HEIGHT * 0.88;
    this.head.castShadow = true;
    this.group.add(this.head);

    const legGeo = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x333366, roughness: 0.8 });

    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.1, PERSON_HEIGHT * 0.22, 0);
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, legMat);
    this.rightLeg.position.set(0.1, PERSON_HEIGHT * 0.22, 0);
    this.group.add(this.rightLeg);

    const armGeo = new THREE.BoxGeometry(0.12, 0.45, 0.12);
    const armMat = new THREE.MeshStandardMaterial({ color: clothesColor, roughness: 0.7 });

    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.position.set(-0.28, PERSON_HEIGHT * 0.55, 0);
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, armMat);
    this.rightArm.position.set(0.28, PERSON_HEIGHT * 0.55, 0);
    this.group.add(this.rightArm);
  }

  update(deltaTime, cityBounds) {
    this.previousPosition.copy(this.group.position);
    this.walkPhase += deltaTime * this.speed * 3;

    const legSwing = Math.sin(this.walkPhase) * 0.4;
    this.leftLeg.rotation.x = legSwing;
    this.rightLeg.rotation.x = -legSwing;
    this.leftArm.rotation.x = -legSwing * 0.6;
    this.rightArm.rotation.x = legSwing * 0.6;

    this.group.position.y = SIDEWALK_HEIGHT + Math.abs(Math.sin(this.walkPhase * 2)) * 0.05;

    const dist = this.speed * deltaTime;
    switch (this.direction) {
      case 0: this.group.position.x += dist; break;
      case 1: this.group.position.x -= dist; break;
      case 2: this.group.position.z += dist; break;
      case 3: this.group.position.z -= dist; break;
    }

    const angle = this.direction === 0 ? -Math.PI / 2
      : this.direction === 1 ? Math.PI / 2
      : this.direction === 2 ? Math.PI : 0;
    this.group.rotation.y = angle;

    this.turnTimer += deltaTime;
    if (this.turnTimer >= this.turnInterval) {
      this.turnTimer = 0;
      this.turnInterval = 5 + Math.random() * 10;
      if (Math.random() > 0.5) {
        this.direction = (this.direction + (Math.random() > 0.5 ? 1 : 3)) % 4;
      }
    }

    this.wrapAround(cityBounds);
  }

  wrapAround(bounds) {
    const margin = 5;
    const x = this.group.position.x;
    const z = this.group.position.z;

    if (x > bounds.maxX + margin) this.group.position.x = bounds.minX - margin;
    if (x < bounds.minX - margin) this.group.position.x = bounds.maxX + margin;
    if (z > bounds.maxZ + margin) this.group.position.z = bounds.minZ - margin;
    if (z < bounds.minZ - margin) this.group.position.z = bounds.maxZ + margin;
  }

  destroy() {
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
