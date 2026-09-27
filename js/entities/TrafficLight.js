import * as THREE from 'three';
import { GREEN_DURATION, YELLOW_DURATION, RED_DURATION, ROAD_WIDTH, DIR_POS_X, DIR_NEG_X, DIR_POS_Z, DIR_NEG_Z, LIGHT_OFFSET, LIGHT_HEAD_WIDTH, LIGHT_HEAD_HEIGHT, LIGHT_HEAD_DEPTH, LIGHT_RADIUS, LIGHT_FACE_OFFSET, LIGHT_OFF_INTENSITY, LIGHT_ON_INTENSITY, LIGHT_BASE_COLORS } from '../utils/constants.js';

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

    const armLen = LIGHT_OFFSET - LIGHT_HEAD_DEPTH / 2;
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
    const isH = this.orientation === 'horizontal';
    const ox = isH ? LIGHT_OFFSET : 0;
    const oz = isH ? 0 : LIGHT_OFFSET;

    const headGeo = isH
      ? new THREE.BoxGeometry(LIGHT_HEAD_DEPTH, LIGHT_HEAD_HEIGHT, LIGHT_HEAD_WIDTH)
      : new THREE.BoxGeometry(LIGHT_HEAD_WIDTH, LIGHT_HEAD_HEIGHT, LIGHT_HEAD_DEPTH);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.3, metalness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(ox, 5.25, oz);
    this.group.add(head);

    const capAlong = (isH ? LIGHT_HEAD_DEPTH : LIGHT_HEAD_WIDTH) + 0.2;
    const capAcross = (isH ? LIGHT_HEAD_WIDTH : LIGHT_HEAD_DEPTH) + 0.2;
    const topGeo = new THREE.BoxGeometry(capAlong, 0.1, capAcross);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.6 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.set(ox, 6.7, oz);
    this.group.add(top);

    this.redLightMat = new THREE.MeshStandardMaterial({ color: LIGHT_BASE_COLORS.red, emissive: LIGHT_BASE_COLORS.red, emissiveIntensity: LIGHT_OFF_INTENSITY, roughness: 0.2 });
    this.yellowLightMat = new THREE.MeshStandardMaterial({ color: LIGHT_BASE_COLORS.yellow, emissive: LIGHT_BASE_COLORS.yellow, emissiveIntensity: LIGHT_OFF_INTENSITY, roughness: 0.2 });
    this.greenLightMat = new THREE.MeshStandardMaterial({ color: LIGHT_BASE_COLORS.green, emissive: LIGHT_BASE_COLORS.green, emissiveIntensity: LIGHT_OFF_INTENSITY, roughness: 0.2 });

    const lightGeo = new THREE.SphereGeometry(LIGHT_RADIUS, 16, 16);
    const visorGeo = new THREE.CylinderGeometry(0.35, 0.3, 0.3, 16, 1, true);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide });

    this.createFace(1, lightGeo, visorGeo, visorMat);
    this.createFace(-1, lightGeo, visorGeo, visorMat);
  }

  createFace(sign, lightGeo, visorGeo, visorMat) {
    const isH = this.orientation === 'horizontal';
    const ox = isH ? LIGHT_OFFSET : 0;
    const oz = isH ? 0 : LIGHT_OFFSET;

    const lampOffset = sign * LIGHT_FACE_OFFSET;
    const planeOffset = sign * (LIGHT_HEAD_DEPTH / 2);

    const lampX = isH ? lampOffset : 0;
    const lampZ = isH ? 0 : lampOffset;
    const planeX = isH ? planeOffset : 0;
    const planeZ = isH ? 0 : planeOffset;

    const lampY = [5.95, 5.25, 4.55];
    const mats = [this.redLightMat, this.yellowLightMat, this.greenLightMat];

    for (let i = 0; i < lampY.length; i++) {
      const y = lampY[i];

      const lamp = new THREE.Mesh(lightGeo, mats[i]);
      lamp.position.set(ox + lampX, y, oz + lampZ);
      this.group.add(lamp);

      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(ox + planeX, y, oz + planeZ);
      if (isH) {
        visor.rotation.z = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
      } else {
        visor.rotation.x = sign > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      this.group.add(visor);
    }
  }

  update(deltaTime) {
    this.timer += deltaTime;
    this.pulsePhase += deltaTime * 4;

    const pulse = 0.8 + Math.sin(this.pulsePhase) * 0.2;

    this.redLightMat.color.set(LIGHT_BASE_COLORS.red);
    this.redLightMat.emissive.set(LIGHT_BASE_COLORS.red);
    this.redLightMat.emissiveIntensity = LIGHT_OFF_INTENSITY;

    this.yellowLightMat.color.set(LIGHT_BASE_COLORS.yellow);
    this.yellowLightMat.emissive.set(LIGHT_BASE_COLORS.yellow);
    this.yellowLightMat.emissiveIntensity = LIGHT_OFF_INTENSITY;

    this.greenLightMat.color.set(LIGHT_BASE_COLORS.green);
    this.greenLightMat.emissive.set(LIGHT_BASE_COLORS.green);
    this.greenLightMat.emissiveIntensity = LIGHT_OFF_INTENSITY;

    switch (this.state) {
      case 'green':
        this.greenLightMat.emissive.set(0x00ff00);
        this.greenLightMat.emissiveIntensity = LIGHT_ON_INTENSITY * pulse;
        this.greenLightMat.color.set(0x00ff00);
        if (this.timer >= this.greenDuration) {
          this.state = 'yellow';
          this.timer = 0;
        }
        break;
      case 'yellow':
        this.yellowLightMat.emissive.set(0xffaa00);
        this.yellowLightMat.emissiveIntensity = LIGHT_ON_INTENSITY * pulse;
        this.yellowLightMat.color.set(0xffaa00);
        if (this.timer >= YELLOW_DURATION) {
          this.state = 'red';
          this.timer = 0;
        }
        break;
      case 'red':
        this.redLightMat.emissive.set(0xff0000);
        this.redLightMat.emissiveIntensity = LIGHT_ON_INTENSITY * pulse;
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
