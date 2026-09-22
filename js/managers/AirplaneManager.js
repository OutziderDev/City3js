import { Plane } from '../entities/Plane.js';
import {
  PLANE_SPAWN_INTERVAL_MIN, PLANE_SPAWN_INTERVAL_MAX, PLANE_MAX_ACTIVE,
  PLANE_HIGH_HEIGHT_MIN, PLANE_HIGH_HEIGHT_MAX,
  PLANE_LOW_HEIGHT_MIN, PLANE_LOW_HEIGHT_MAX,
  PLANE_HIGH_SPEED_MIN, PLANE_HIGH_SPEED_MAX,
  PLANE_LOW_SPEED_MIN, PLANE_LOW_SPEED_MAX,
  PLANE_LOW_PROBABILITY,
  GRID_SIZE, BLOCK_SIZE, ROAD_WIDTH
} from '../utils/constants.js';

export class AirplaneManager {
  constructor(scene) {
    this.scene = scene;
    this.planes = [];
    this.spawnTimer = 0;
    this.nextSpawnInterval = this.getSpawnInterval();

    this.step = BLOCK_SIZE + ROAD_WIDTH;
    this.cityHalf = (GRID_SIZE * this.step) / 2;
  }

  getSpawnInterval() {
    return PLANE_SPAWN_INTERVAL_MIN +
      Math.random() * (PLANE_SPAWN_INTERVAL_MAX - PLANE_SPAWN_INTERVAL_MIN);
  }

  spawnPlane() {
    if (this.planes.length >= PLANE_MAX_ACTIVE) return;

    const isLow = Math.random() < PLANE_LOW_PROBABILITY;
    const height = isLow
      ? PLANE_LOW_HEIGHT_MIN + Math.random() * (PLANE_LOW_HEIGHT_MAX - PLANE_LOW_HEIGHT_MIN)
      : PLANE_HIGH_HEIGHT_MIN + Math.random() * (PLANE_HIGH_HEIGHT_MAX - PLANE_HIGH_HEIGHT_MIN);

    const speed = isLow
      ? PLANE_LOW_SPEED_MIN + Math.random() * (PLANE_LOW_SPEED_MAX - PLANE_LOW_SPEED_MIN)
      : PLANE_HIGH_SPEED_MIN + Math.random() * (PLANE_HIGH_SPEED_MAX - PLANE_HIGH_SPEED_MIN);

    const angle = Math.random() * Math.PI * 2;
    const spawnDist = this.cityHalf + 60;

    const startX = Math.cos(angle) * spawnDist;
    const startZ = Math.sin(angle) * spawnDist;

    const plane = new Plane(this.scene, startX, startZ, height, angle, speed);
    this.planes.push(plane);
  }

  update(deltaTime) {
    this.spawnTimer += deltaTime;

    if (this.spawnTimer >= this.nextSpawnInterval) {
      this.spawnPlane();
      this.spawnTimer = 0;
      this.nextSpawnInterval = this.getSpawnInterval();
    }

    for (const plane of this.planes) {
      plane.update(deltaTime);
    }

    this.removeDeadPlanes();
  }

  removeDeadPlanes() {
    for (let i = this.planes.length - 1; i >= 0; i--) {
      if (!this.planes[i].alive) {
        this.planes[i].destroy();
        this.planes.splice(i, 1);
      }
    }
  }
}
