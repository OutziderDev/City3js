import * as THREE from 'three';
import { GREEN_DURATION, YELLOW_DURATION, RED_DURATION, ROAD_WIDTH, DIR_POS_X, DIR_NEG_X, DIR_POS_Z, DIR_NEG_Z } from '../utils/constants.js';

export class TrafficLight {
  constructor(scene, x, z, orientation) {
    this.scene = scene;
    this.x = x;
    this.z = z;
    this.orientation = orientation;

    this.state = 'green';
    this.timer = 0;
    this.greenDuration = GREEN_DURATION + Math.random() * 2;
    this.redDuration = RED_DURATION + Math.random() * 2;
    this.pulsePhase = 0;

    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);

    this.createPole();
    this.createLights();

    scene.add(this.group);
  }

  createPole() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.15 });

    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 5.5, 8);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2.75;
    pole.castShadow = true;
    this.group.add(pole);

    const armLen = 3.5;
    const armGeo = new THREE.CylinderGeometry(0.05, 0.05, armLen, 8);
    const arm = new THREE.Mesh(armGeo, poleMat);

    if (this.orientation === 'horizontal') {
      arm.position.set(armLen / 2, 5.5, 0);
      arm.rotation.z = Math.PI / 2;
    } else {
      arm.position.set(0, 5.5, armLen / 2);
      arm.rotation.x = Math.PI / 2;
    }
    this.group.add(arm);
  }

  createLights() {
    const lightOffset = 3;
    const ox = this.orientation === 'horizontal' ? lightOffset : 0;
    const oz = this.orientation === 'horizontal' ? 0 : lightOffset;

    const backGeo = new THREE.BoxGeometry(1.0, 2.8, 0.15);
    const backMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.3, metalness: 0.6 });
    const back = new THREE.Mesh(backGeo, backMat);
    back.position.set(ox, 5.25, oz);
    this.group.add(back);

    const topGeo = new THREE.BoxGeometry(1.2, 0.1, 0.8);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.6 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.set(ox, 6.7, oz);
    this.group.add(top);

    const visorGeo = new THREE.CylinderGeometry(0.35, 0.3, 0.3, 16, 1, true);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide });

    const lightGeo = new THREE.SphereGeometry(0.28, 16, 16);

    this.redLightMat = new THREE.MeshStandardMaterial({ color: 0x660000, emissive: 0x660000, emissiveIntensity: 0.4, roughness: 0.2 });
    this.yellowLightMat = new THREE.MeshStandardMaterial({ color: 0x664400, emissive: 0x664400, emissiveIntensity: 0.4, roughness: 0.2 });
    this.greenLightMat = new THREE.MeshStandardMaterial({ color: 0x006600, emissive: 0x006600, emissiveIntensity: 0.4, roughness: 0.2 });

    this.redLight = new THREE.Mesh(lightGeo, this.redLightMat);
    this.yellowLight = new THREE.Mesh(lightGeo, this.yellowLightMat);
    this.greenLight = new THREE.Mesh(lightGeo, this.greenLightMat);

    const faceDir = this.orientation === 'horizontal' ? 1 : 1;
    const faceX = this.orientation === 'horizontal' ? 0.15 : 0;
    const faceZ = this.orientation === 'horizontal' ? 0 : 0.15;

    this.redLight.position.set(ox + faceX, 5.95, oz + faceZ);
    this.yellowLight.position.set(ox + faceX, 5.25, oz + faceZ);
    this.greenLight.position.set(ox + faceX, 4.55, oz + faceZ);

    this.group.add(this.redLight);
    this.group.add(this.yellowLight);
    this.group.add(this.greenLight);

    const visorPositions = [
      { y: 5.95 },
      { y: 5.25 },
      { y: 4.55 }
    ];

    for (const vp of visorPositions) {
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(ox + faceX * 0.5, vp.y, oz + faceZ * 0.5);
      if (this.orientation === 'horizontal') {
        visor.rotation.z = Math.PI / 2;
      } else {
        visor.rotation.x = Math.PI / 2;
      }
      this.group.add(visor);
    }
  }

  update(deltaTime) {
    this.timer += deltaTime;
    this.pulsePhase += deltaTime * 4;

    const pulse = 0.8 + Math.sin(this.pulsePhase) * 0.2;

    this.redLightMat.emissiveIntensity = 0.3;
    this.yellowLightMat.emissiveIntensity = 0.3;
    this.greenLightMat.emissiveIntensity = 0.3;

    switch (this.state) {
      case 'green':
        this.greenLightMat.emissive.set(0x00ff00);
        this.greenLightMat.emissiveIntensity = 3 * pulse;
        this.greenLightMat.color.set(0x00ff00);
        if (this.timer >= this.greenDuration) {
          this.state = 'yellow';
          this.timer = 0;
        }
        break;
      case 'yellow':
        this.yellowLightMat.emissive.set(0xffaa00);
        this.yellowLightMat.emissiveIntensity = 3 * pulse;
        this.yellowLightMat.color.set(0xffaa00);
        if (this.timer >= YELLOW_DURATION) {
          this.state = 'red';
          this.timer = 0;
        }
        break;
      case 'red':
        this.redLightMat.emissive.set(0xff0000);
        this.redLightMat.emissiveIntensity = 3 * pulse;
        this.redLightMat.color.set(0xff0000);
        if (this.timer >= this.redDuration) {
          this.state = 'green';
          this.timer = 0;
        }
        break;
    }
  }

  shouldStop(direction) {
    if (this.state === 'green') return false;

    const isHorizontalDir = direction === DIR_POS_X || direction === DIR_NEG_X;
    if (this.orientation === 'horizontal' && !isHorizontalDir) return false;
    if (this.orientation === 'vertical' && isHorizontalDir) return false;

    return true;
  }

  getDistanceTo(carX, carZ) {
    const dx = this.x - carX;
    const dz = this.z - carZ;
    return Math.sqrt(dx * dx + dz * dz);
  }

  isBeforeIntersection(carX, carZ, direction) {
    const threshold = ROAD_WIDTH / 2 + 4;

    switch (direction) {
      case DIR_POS_X: return carX < this.x && (this.x - carX) < threshold;
      case DIR_NEG_X: return carX > this.x && (carX - this.x) < threshold;
      case DIR_POS_Z: return carZ < this.z && (this.z - carZ) < threshold;
      case DIR_NEG_Z: return carZ > this.z && (carZ - this.z) < threshold;
    }
    return false;
  }
}
