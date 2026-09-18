import { Car } from '../entities/Car.js';
import {
  CAR_MAX_ACTIVE, CAR_SPAWN_INTERVAL_MIN, CAR_SPAWN_INTERVAL_MAX,
  GRID_SIZE, BLOCK_SIZE, ROAD_WIDTH,
  DIR_POS_X, DIR_NEG_X, DIR_POS_Z, DIR_NEG_Z
} from '../utils/constants.js';

export class VehicleManager {
  constructor(scene) {
    this.scene = scene;
    this.cars = [];
    this.spawnTimer = 0;
    this.nextSpawnInterval = this.getSpawnInterval();
  }

  getSpawnInterval() {
    return CAR_SPAWN_INTERVAL_MIN +
      Math.random() * (CAR_SPAWN_INTERVAL_MAX - CAR_SPAWN_INTERVAL_MIN);
  }

  spawnCar() {
    if (this.cars.length >= CAR_MAX_ACTIVE) return;

    const step = BLOCK_SIZE + ROAD_WIDTH;
    const total = GRID_SIZE * step;
    const half = total / 2;
    const laneOffset = ROAD_WIDTH / 4;

    const roadPositions = [];
    for (let i = 0; i <= GRID_SIZE; i++) {
      roadPositions.push(-half + i * step);
    }

    const isHorizontal = Math.random() > 0.5;
    let x, z, dir;

    if (isHorizontal) {
      const roadZ = roadPositions[Math.floor(Math.random() * roadPositions.length)];
      dir = Math.random() > 0.5 ? DIR_POS_X : DIR_NEG_X;
      z = roadZ + (dir === DIR_POS_X ? -laneOffset : laneOffset);
      x = dir === DIR_POS_X ? -half - 10 : half + 10;
    } else {
      const roadX = roadPositions[Math.floor(Math.random() * roadPositions.length)];
      dir = Math.random() > 0.5 ? DIR_POS_Z : DIR_NEG_Z;
      x = roadX + (dir === DIR_POS_Z ? -laneOffset : laneOffset);
      z = dir === DIR_POS_Z ? -half - 10 : half + 10;
    }

    const destRoad = roadPositions[Math.floor(Math.random() * roadPositions.length)];
    const destCross = roadPositions[Math.floor(Math.random() * roadPositions.length)];
    const destX = destCross;
    const destZ = destRoad;

    const car = new Car(this.scene, x, z, dir, destX, destZ);
    this.cars.push(car);
  }

  update(deltaTime, trafficLights, cityBounds, collisionManager) {
    this.spawnTimer += deltaTime;

    if (this.spawnTimer >= this.nextSpawnInterval) {
      this.spawnCar();
      this.spawnTimer = 0;
      this.nextSpawnInterval = this.getSpawnInterval();
    }

    for (const car of this.cars) {
      const blocked = collisionManager ? collisionManager.isBlocked(car) : false;
      car.update(deltaTime, trafficLights, cityBounds, blocked);
    }

    this.removeDeadCars();
  }

  removeDeadCars() {
    for (let i = this.cars.length - 1; i >= 0; i--) {
      if (!this.cars[i].alive) {
        this.cars[i].destroy();
        this.cars.splice(i, 1);
      }
    }
  }
}
