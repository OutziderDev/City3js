import * as THREE from 'three';
import {
  CAR_LENGTH, CAR_WIDTH, CAR_HEIGHT, CAR_SPEEDS, CAR_COLORS,
  CAR_LIFETIME_MIN, CAR_LIFETIME_MAX,
  BLOCK_SIZE, ROAD_WIDTH,
  DIR_POS_X, DIR_NEG_X, DIR_POS_Z, DIR_NEG_Z
} from '../utils/constants.js';

const TURN_SPEED = 6;
const REACH_THRESHOLD = 3;

export class Car {
  constructor(scene, startX, startZ, direction, route, pathfinding) {
    this.scene = scene;
    this.direction = direction;
    this.speed = CAR_SPEEDS[Math.floor(Math.random() * CAR_SPEEDS.length)];

    this.step = BLOCK_SIZE + ROAD_WIDTH;
    this.laneOffset = ROAD_WIDTH / 4;

    this.route = route;
    this.pathfinding = pathfinding;
    this.age = 0;
    this.lifetime = CAR_LIFETIME_MIN + Math.random() * (CAR_LIFETIME_MAX - CAR_LIFETIME_MIN);
    this.alive = true;
    this.fading = false;
    this.fadeAlpha = 1;

    this.group = new THREE.Group();
    this.createBody();
    this.createWheels();

    this.group.position.set(startX, 0.1, startZ);
    this.updateRotation();
    scene.add(this.group);

    this.targetX = startX;
    this.targetZ = startZ;
    this.pickNextTarget();
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

  renewRoute() {
    if (!this.pathfinding) return false;

    const grid = this.pathfinding.worldToGrid(this.group.position.x, this.group.position.z);
    const route = this.pathfinding.createRoute(grid.row, grid.col);

    if (!route) return false;

    this.route = route;
    return true;
  }

  ensureRoute() {
    if (this.route && this.route.currentIndex < this.route.directions.length) {
      return true;
    }

    if (this.age >= this.lifetime || !this.renewRoute()) {
      this.fading = true;
      return false;
    }

    return true;
  }

  computeTarget(dir) {
    const roadX = Math.round(this.group.position.x / this.step) * this.step;
    const roadZ = Math.round(this.group.position.z / this.step) * this.step;

    const off = this.getRightHandOffset(dir);
    const laneOff = this.laneOffset;
    let tx, tz;

    switch (dir) {
      case DIR_POS_X:
        tx = roadX + this.step;
        tz = roadZ + (off.sign * laneOff);
        break;
      case DIR_NEG_X:
        tx = roadX - this.step;
        tz = roadZ + (off.sign * laneOff);
        break;
      case DIR_POS_Z:
        tz = roadZ + this.step;
        tx = roadX + (off.sign * laneOff);
        break;
      case DIR_NEG_Z:
        tz = roadZ - this.step;
        tx = roadX + (off.sign * laneOff);
        break;
    }

    this.targetX = tx;
    this.targetZ = tz;
  }

  pickNextTarget() {
    if (!this.ensureRoute()) return;

    const nextDir = this.route.directions[this.route.currentIndex];
    this.direction = nextDir;
    this.route.currentIndex++;

    this.computeTarget(nextDir);
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

  update(deltaTime, trafficLights, cityBounds, blocked) {
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

    if (blocked) return;

    const shouldStop = this.checkTrafficLights(trafficLights);
    if (shouldStop) return;

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
