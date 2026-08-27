import { Car } from '../entities/Car.js';
import {
  CAR_COUNT, GRID_SIZE, BLOCK_SIZE, ROAD_WIDTH,
  DIR_POS_X, DIR_NEG_X, DIR_POS_Z, DIR_NEG_Z
} from '../utils/constants.js';

export class VehicleManager {
  constructor(scene) {
    this.scene = scene;
    this.cars = [];
    this.spawnCars();
  }

  spawnCars() {
    const step = BLOCK_SIZE + ROAD_WIDTH;
    const total = GRID_SIZE * step;
    const half = total / 2;
    const laneOffset = ROAD_WIDTH / 4;

    for (let i = 0; i < CAR_COUNT; i++) {
      const isHorizontal = Math.random() > 0.5;
      let x, z, dir;

      if (isHorizontal) {
        const row = Math.floor(Math.random() * (GRID_SIZE + 1));
        x = -half + Math.random() * total;
        dir = Math.random() > 0.5 ? DIR_POS_X : DIR_NEG_X;
        z = -half + row * step + ROAD_WIDTH / 2 + (dir === DIR_POS_X ? -laneOffset : laneOffset);
      } else {
        const col = Math.floor(Math.random() * (GRID_SIZE + 1));
        z = -half + Math.random() * total;
        dir = Math.random() > 0.5 ? DIR_POS_Z : DIR_NEG_Z;
        x = -half + col * step + ROAD_WIDTH / 2 + (dir === DIR_POS_Z ? laneOffset : -laneOffset);
      }

      const car = new Car(this.scene, x, z, dir);
      this.cars.push(car);
    }
  }

  update(deltaTime, trafficLights, cityBounds, collisionManager) {
    for (const car of this.cars) {
      const blocked = collisionManager ? collisionManager.isBlocked(car) : false;
      car.update(deltaTime, trafficLights, cityBounds, blocked);
    }
  }
}
