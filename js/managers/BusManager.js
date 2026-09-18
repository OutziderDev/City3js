import { Bus } from '../entities/Bus.js';
import {
  GRID_SIZE, BLOCK_SIZE, ROAD_WIDTH, BUS_MAX_ACTIVE, BUS_COLORS,
  BUS_SPAWN_INTERVAL_MIN, BUS_SPAWN_INTERVAL_MAX,
  DIR_POS_X, DIR_NEG_X, DIR_POS_Z, DIR_NEG_Z
} from '../utils/constants.js';

export class BusManager {
  constructor(scene) {
    this.scene = scene;
    this.buses = [];
    this.spawnTimer = 0;
    this.nextSpawnInterval = this.getSpawnInterval();
  }

  getSpawnInterval() {
    return BUS_SPAWN_INTERVAL_MIN + Math.random() * (BUS_SPAWN_INTERVAL_MAX - BUS_SPAWN_INTERVAL_MIN);
  }

  spawnBus() {
    if (this.buses.length >= BUS_MAX_ACTIVE) return;

    const step = BLOCK_SIZE + ROAD_WIDTH;
    const total = GRID_SIZE * step;
    const half = total / 2;
    const laneOffset = ROAD_WIDTH / 4;

    const isHorizontal = Math.random() > 0.5;
    let x, z, dir;

    if (isHorizontal) {
      const roadIndex = Math.floor(Math.random() * (GRID_SIZE + 1));
      const roadZ = -half + roadIndex * step;
      dir = Math.random() > 0.5 ? DIR_POS_X : DIR_NEG_X;
      z = dir === DIR_POS_X ? roadZ - laneOffset : roadZ + laneOffset;
      x = dir === DIR_POS_X ? -half - 10 : half + 10;
    } else {
      const roadIndex = Math.floor(Math.random() * (GRID_SIZE + 1));
      const roadX = -half + roadIndex * step;
      dir = Math.random() > 0.5 ? DIR_POS_Z : DIR_NEG_Z;
      x = dir === DIR_POS_Z ? roadX + laneOffset : roadX - laneOffset;
      z = dir === DIR_POS_Z ? -half - 10 : half + 10;
    }

    const color = BUS_COLORS[Math.floor(Math.random() * BUS_COLORS.length)];
    const bus = new Bus(this.scene, x, z, dir, color);
    this.buses.push(bus);
  }

  update(deltaTime, trafficLights, cityBounds, collisionManager) {
    this.spawnTimer += deltaTime;

    if (this.spawnTimer >= this.nextSpawnInterval) {
      this.spawnBus();
      this.spawnTimer = 0;
      this.nextSpawnInterval = this.getSpawnInterval();
    }

    for (const bus of this.buses) {
      const blocked = collisionManager ? collisionManager.isBlocked(bus) : false;
      bus.update(deltaTime, trafficLights, cityBounds, blocked);
    }

    this.removeDeadBuses();
  }

  removeDeadBuses() {
    for (let i = this.buses.length - 1; i >= 0; i--) {
      if (!this.buses[i].alive) {
        this.buses[i].destroy();
        this.buses.splice(i, 1);
      }
    }
  }
}
