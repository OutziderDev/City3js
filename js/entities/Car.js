import * as THREE from 'three';
import {
  CAR_LENGTH, CAR_WIDTH, CAR_HEIGHT, CAR_SPEEDS, CAR_COLORS,
  ROAD_WIDTH, DIR_POS_X, DIR_NEG_X, DIR_POS_Z, DIR_NEG_Z
} from '../utils/constants.js';

export class Car {
  constructor(scene, startX, startZ, direction, speed) {
    this.scene = scene;
    this.direction = direction;
    this.speed = speed || CAR_SPEEDS[Math.floor(Math.random() * CAR_SPEEDS.length)];

    this.group = new THREE.Group();
    this.createBody();
    this.createWheels();

    this.group.rotation.y = this.getAngle();
    this.group.position.set(startX, 0.1, startZ);
    scene.add(this.group);
  }

  createBody() {
    const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];

    const bodyGeo = new THREE.BoxGeometry(CAR_WIDTH, CAR_HEIGHT * 0.6, CAR_LENGTH);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = CAR_HEIGHT * 0.4;
    body.castShadow = true;
    this.group.add(body);

    const cabinGeo = new THREE.BoxGeometry(CAR_WIDTH * 0.8, CAR_HEIGHT * 0.45, CAR_LENGTH * 0.5);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff, transparent: true, opacity: 0.6, roughness: 0.1, metalness: 0.8
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.y = CAR_HEIGHT * 0.85;
    cabin.position.z = -CAR_LENGTH * 0.08;
    this.group.add(cabin);

    const headlightGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffaa, emissiveIntensity: 0.5
    });
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(headlightGeo, headlightMat);
      hl.position.set(side * CAR_WIDTH * 0.35, CAR_HEIGHT * 0.35, CAR_LENGTH / 2);
      this.group.add(hl);
    }

    const tailGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.3
    });
    for (const side of [-1, 1]) {
      const tl = new THREE.Mesh(tailGeo, tailMat);
      tl.position.set(side * CAR_WIDTH * 0.35, CAR_HEIGHT * 0.35, -CAR_LENGTH / 2);
      this.group.add(tl);
    }
  }

  createWheels() {
    const wheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });

    const positions = [
      [-CAR_WIDTH / 2 - 0.05, 0.25, CAR_LENGTH * 0.3],
      [CAR_WIDTH / 2 + 0.05, 0.25, CAR_LENGTH * 0.3],
      [-CAR_WIDTH / 2 - 0.05, 0.25, -CAR_LENGTH * 0.3],
      [CAR_WIDTH / 2 + 0.05, 0.25, -CAR_LENGTH * 0.3]
    ];

    for (const pos of positions) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(...pos);
      this.group.add(wheel);
    }
  }

  getAngle() {
    switch (this.direction) {
      case DIR_POS_X: return -Math.PI / 2;
      case DIR_NEG_X: return Math.PI / 2;
      case DIR_POS_Z: return 0;
      case DIR_NEG_Z: return Math.PI;
    }
  }

  update(deltaTime, trafficLights, cityBounds) {
    const shouldStop = this.checkTrafficLights(trafficLights);
    if (shouldStop) return;

    const dist = this.speed * deltaTime;

    switch (this.direction) {
      case DIR_POS_X: this.group.position.x += dist; break;
      case DIR_NEG_X: this.group.position.x -= dist; break;
      case DIR_POS_Z: this.group.position.z += dist; break;
      case DIR_NEG_Z: this.group.position.z -= dist; break;
    }

    this.wrapAround(cityBounds);
  }

  checkTrafficLights(trafficLights) {
    const myX = this.group.position.x;
    const myZ = this.group.position.z;

    for (const tl of trafficLights) {
      if (!tl.shouldStop(this.direction)) continue;
      if (!tl.isBeforeIntersection(myX, myZ, this.direction)) continue;

      const dist = tl.getDistanceTo(myX, myZ);
      if (dist < ROAD_WIDTH / 2 + 5) {
        return true;
      }
    }
    return false;
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
}
