import * as THREE from 'three';
import {
  AMBULANCE_LENGTH, AMBULANCE_WIDTH, AMBULANCE_HEIGHT, AMBULANCE_SPEED,
  AMBULANCE_LIFETIME_MIN, AMBULANCE_LIFETIME_MAX,
  GRID_SIZE, BLOCK_SIZE, ROAD_WIDTH,
  DIR_POS_X, DIR_NEG_X, DIR_POS_Z, DIR_NEG_Z
} from '../utils/constants.js';

const TURN_SPEED = 6;
const REACH_THRESHOLD = 3;

export class Ambulance {
  constructor(scene, startX, startZ, direction) {
    this.scene = scene;
    this.direction = direction;
    this.speed = AMBULANCE_SPEED;
    this.age = 0;
    this.lifetime = AMBULANCE_LIFETIME_MIN + Math.random() * (AMBULANCE_LIFETIME_MAX - AMBULANCE_LIFETIME_MIN);
    this.alive = true;
    this.fading = false;
    this.fadeAlpha = 1;

    this.step = BLOCK_SIZE + ROAD_WIDTH;
    this.halfExtent = (GRID_SIZE * this.step) / 2;
    this.laneOffset = ROAD_WIDTH / 4;

    this.group = new THREE.Group();
    this.createBody();
    this.createSirenLights();
    this.createWheels();

    this.group.position.set(startX, 0.1, startZ);
    this.updateRotation();
    scene.add(this.group);

    this.targetX = startX;
    this.targetZ = startZ;
    this.pickNextTarget();
  }

  createBody() {
    const bodyGeo = new THREE.BoxGeometry(AMBULANCE_WIDTH, AMBULANCE_HEIGHT * 0.7, AMBULANCE_LENGTH);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.1 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = AMBULANCE_HEIGHT * 0.5;
    body.castShadow = true;
    this.group.add(body);

    const cabinGeo = new THREE.BoxGeometry(AMBULANCE_WIDTH * 0.9, AMBULANCE_HEIGHT * 0.35, AMBULANCE_LENGTH * 0.35);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, AMBULANCE_HEIGHT * 0.85, AMBULANCE_LENGTH * 0.2);
    cabin.castShadow = true;
    this.group.add(cabin);

    const stripeGeo = new THREE.BoxGeometry(AMBULANCE_WIDTH + 0.02, 0.3, AMBULANCE_LENGTH + 0.02);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.5 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = AMBULANCE_HEIGHT * 0.5;
    this.group.add(stripe);

    const crossSize = 0.6;
    const crossThick = 0.18;
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.5 });

    const crossH = new THREE.Mesh(new THREE.BoxGeometry(crossSize, crossThick, crossThick), crossMat);
    crossH.position.set(0, AMBULANCE_HEIGHT * 0.5, AMBULANCE_LENGTH / 2 + 0.02);
    this.group.add(crossH);

    const crossV = new THREE.Mesh(new THREE.BoxGeometry(crossThick, crossSize, crossThick), crossMat);
    crossV.position.set(0, AMBULANCE_HEIGHT * 0.5, AMBULANCE_LENGTH / 2 + 0.02);
    this.group.add(crossV);

    for (const side of [-1, 1]) {
      const ch = new THREE.Mesh(new THREE.BoxGeometry(crossSize, crossThick, crossThick), crossMat);
      ch.position.set(0, AMBULANCE_HEIGHT * 0.5, -AMBULANCE_LENGTH / 2 - 0.02);
      this.group.add(ch);

      const cv = new THREE.Mesh(new THREE.BoxGeometry(crossThick, crossSize, crossThick), crossMat);
      cv.position.set(0, AMBULANCE_HEIGHT * 0.5, -AMBULANCE_LENGTH / 2 - 0.02);
      this.group.add(cv);
    }

    const headlightGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffaa, emissiveIntensity: 0.8
    });
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(headlightGeo, headlightMat);
      hl.position.set(side * AMBULANCE_WIDTH * 0.35, AMBULANCE_HEIGHT * 0.35, AMBULANCE_LENGTH / 2 + 0.05);
      this.group.add(hl);
    }

    const tailGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.6
    });
    for (const side of [-1, 1]) {
      const tl = new THREE.Mesh(tailGeo, tailMat);
      tl.position.set(side * AMBULANCE_WIDTH * 0.35, AMBULANCE_HEIGHT * 0.35, -AMBULANCE_LENGTH / 2 - 0.05);
      this.group.add(tl);
    }
  }

  createSirenLights() {
    this.sirenRed = new THREE.PointLight(0xff0000, 0, 8);
    this.sirenRed.position.set(-AMBULANCE_WIDTH * 0.3, AMBULANCE_HEIGHT + 0.5, 0);
    this.group.add(this.sirenRed);

    this.sirenBlue = new THREE.PointLight(0x0044ff, 0, 8);
    this.sirenBlue.position.set(AMBULANCE_WIDTH * 0.3, AMBULANCE_HEIGHT + 0.5, 0);
    this.group.add(this.sirenBlue);

    const sirenGeo = new THREE.BoxGeometry(0.4, 0.25, 0.6);
    this.sirenRedMesh = new THREE.Mesh(sirenGeo, new THREE.MeshStandardMaterial({
      color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1
    }));
    this.sirenRedMesh.position.set(-AMBULANCE_WIDTH * 0.3, AMBULANCE_HEIGHT * 0.92, 0);
    this.group.add(this.sirenRedMesh);

    this.sirenBlueMesh = new THREE.Mesh(sirenGeo, new THREE.MeshStandardMaterial({
      color: 0x0044ff, emissive: 0x0044ff, emissiveIntensity: 1
    }));
    this.sirenBlueMesh.position.set(AMBULANCE_WIDTH * 0.3, AMBULANCE_HEIGHT * 0.92, 0);
    this.group.add(this.sirenBlueMesh);

    this.sirenPhase = 0;
  }

  createWheels() {
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.22, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });

    const positions = [
      [-AMBULANCE_WIDTH / 2 - 0.1, 0.3, AMBULANCE_LENGTH * 0.28],
      [AMBULANCE_WIDTH / 2 + 0.1, 0.3, AMBULANCE_LENGTH * 0.28],
      [-AMBULANCE_WIDTH / 2 - 0.1, 0.3, -AMBULANCE_LENGTH * 0.28],
      [AMBULANCE_WIDTH / 2 + 0.1, 0.3, -AMBULANCE_LENGTH * 0.28]
    ];

    for (const pos of positions) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(...pos);
      this.group.add(wheel);
    }
  }

  getAngleForDirection(dir) {
    switch (dir) {
      case DIR_POS_X: return -Math.PI / 2;
      case DIR_NEG_X: return Math.PI / 2;
      case DIR_POS_Z: return 0;
      case DIR_NEG_Z: return Math.PI;
    }
    return 0;
  }

  updateRotation() {
    this.group.rotation.y = this.getAngleForDirection(this.direction);
  }

  getRightHandOffset(dir) {
    switch (dir) {
      case DIR_POS_X: return { axis: 'z', sign: -1 };
      case DIR_NEG_X: return { axis: 'z', sign: 1 };
      case DIR_POS_Z: return { axis: 'x', sign: 1 };
      case DIR_NEG_Z: return { axis: 'x', sign: -1 };
    }
  }

  pickNextTarget() {
    const step = this.step;

    const roadX = Math.round(this.group.position.x / step) * step;
    const roadZ = Math.round(this.group.position.z / step) * step;

    const rand = Math.random();
    let newDir;

    if (rand < 0.5) {
      newDir = this.direction;
    } else if (rand < 0.75) {
      switch (this.direction) {
        case DIR_POS_X: newDir = DIR_POS_Z; break;
        case DIR_NEG_X: newDir = DIR_NEG_Z; break;
        case DIR_POS_Z: newDir = DIR_NEG_X; break;
        case DIR_NEG_Z: newDir = DIR_POS_X; break;
      }
    } else {
      switch (this.direction) {
        case DIR_POS_X: newDir = DIR_NEG_Z; break;
        case DIR_NEG_X: newDir = DIR_POS_Z; break;
        case DIR_POS_Z: newDir = DIR_POS_X; break;
        case DIR_NEG_Z: newDir = DIR_NEG_X; break;
      }
    }

    this.direction = newDir;

    const off = this.getRightHandOffset(newDir);
    const laneOff = this.laneOffset;
    let tx, tz;

    switch (newDir) {
      case DIR_POS_X:
        tx = roadX + step;
        tz = off.sign > 0 ? roadZ + laneOff : roadZ - laneOff;
        break;
      case DIR_NEG_X:
        tx = roadX - step;
        tz = off.sign > 0 ? roadZ + laneOff : roadZ - laneOff;
        break;
      case DIR_POS_Z:
        tz = roadZ + step;
        tx = off.sign > 0 ? roadX + laneOff : roadX - laneOff;
        break;
      case DIR_NEG_Z:
        tz = roadZ - step;
        tx = off.sign > 0 ? roadX + laneOff : roadX - laneOff;
        break;
    }

    this.targetX = tx;
    this.targetZ = tz;
  }

  update(deltaTime) {
    if (!this.alive) return;

    this.age += deltaTime;
    if (this.age >= this.lifetime && !this.fading) {
      this.fading = true;
    }

    if (this.fading) {
      this.fadeAlpha -= deltaTime * 0.8;
      this.group.traverse((child) => {
        if (child.material) {
          child.material.transparent = true;
          child.material.opacity = Math.max(0, this.fadeAlpha);
        }
      });
      if (this.fadeAlpha <= 0) {
        this.alive = false;
      }
      return;
    }

    this.sirenPhase += deltaTime * 8;
    const flash = Math.sin(this.sirenPhase) > 0;
    this.sirenRed.intensity = flash ? 3 : 0;
    this.sirenBlue.intensity = flash ? 0 : 3;
    this.sirenRedMesh.material.emissiveIntensity = flash ? 1 : 0.1;
    this.sirenBlueMesh.material.emissiveIntensity = flash ? 0.1 : 1;

    const targetAngle = this.getAngleForDirection(this.direction);
    let angleDiff = targetAngle - this.group.rotation.y;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const isTurning = Math.abs(angleDiff) > 0.1;
    const moveSpeed = isTurning ? this.speed * 0.5 : this.speed;

    if (Math.abs(angleDiff) > 0.01) {
      this.group.rotation.y += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), TURN_SPEED * deltaTime);
    } else {
      this.group.rotation.y = targetAngle;
    }


    const isOnXAxis = this.direction === DIR_POS_X || this.direction === DIR_NEG_X;

    switch (this.direction) {
      case DIR_POS_X: this.group.position.x += moveSpeed * deltaTime; break;
      case DIR_NEG_X: this.group.position.x -= moveSpeed * deltaTime; break;
      case DIR_POS_Z: this.group.position.z += moveSpeed * deltaTime; break;
      case DIR_NEG_Z: this.group.position.z -= moveSpeed * deltaTime; break;
    }

    if (isOnXAxis) {
      this.group.position.z += (this.targetZ - this.group.position.z) * Math.min(1, 6 * deltaTime);
    } else {
      this.group.position.x += (this.targetX - this.group.position.x) * Math.min(1, 6 * deltaTime);
    }

    const alongDist = isOnXAxis
      ? Math.abs(this.targetX - this.group.position.x)
      : Math.abs(this.targetZ - this.group.position.z);

    if (alongDist < REACH_THRESHOLD) {
      this.group.position.x = this.targetX;
      this.group.position.z = this.targetZ;
      this.pickNextTarget();
    }
  }

  destroy() {
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
