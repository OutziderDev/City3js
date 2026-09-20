import { Car } from '../entities/Car.js';
import {
  CAR_MAX_ACTIVE, CAR_SPAWN_INTERVAL_MIN, CAR_SPAWN_INTERVAL_MAX,
  GRID_SIZE, BLOCK_SIZE, ROAD_WIDTH,
  DIR_POS_X, DIR_NEG_X, DIR_POS_Z, DIR_NEG_Z,
  AVENUE_INDICES, AVENUE_SPEED_MULT, STREET_SPEED_MULT
} from '../utils/constants.js';

export class VehicleManager {
  constructor(scene, pathfindingManager) {
    this.scene = scene;
    this.pathfinding = pathfindingManager;
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
    const half = (GRID_SIZE * step) / 2;
    const laneOffset = ROAD_WIDTH / 4;

    const origin = this.pathfinding.getRandomEdgeOrigin();
    const dest = this.pathfinding.getRandomDestination(origin.row, origin.col);
    const directions = this.pathfinding.getPath(origin.row, origin.col, dest.row, dest.col);

    if (directions.length === 0) return;

    const startDir = directions[0];
    const originPos = this.pathfinding.gridToWorld(origin.row, origin.col);

    let startX, startZ;
    switch (startDir) {
      case DIR_POS_X:
        startX = originPos.x - half - 10;
        startZ = originPos.z - laneOffset;
        break;
      case DIR_NEG_X:
        startX = originPos.x + half + 10;
        startZ = originPos.z + laneOffset;
        break;
      case DIR_POS_Z:
        startX = originPos.x + laneOffset;
        startZ = originPos.z - half - 10;
        break;
      case DIR_NEG_Z:
        startX = originPos.x - laneOffset;
        startZ = originPos.z + half + 10;
        break;
    }

    const route = { directions, destination: dest, currentIndex: 0 };
    const car = new Car(this.scene, startX, startZ, startDir, route);

    const isAvenue = AVENUE_INDICES.includes(origin.col) || AVENUE_INDICES.includes(origin.row);
    car.speed *= isAvenue ? AVENUE_SPEED_MULT : STREET_SPEED_MULT;

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
