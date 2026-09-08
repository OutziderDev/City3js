import { Ambulance } from '../entities/Ambulance.js';
import {
  GRID_SIZE, BLOCK_SIZE, ROAD_WIDTH, AMBULANCE_MAX_ACTIVE,
  AMBULANCE_SPAWN_INTERVAL_MIN, AMBULANCE_SPAWN_INTERVAL_MAX,
  DIR_POS_X, DIR_NEG_X, DIR_POS_Z, DIR_NEG_Z
} from '../utils/constants.js';

export class AmbulanceManager {
  constructor(scene) {
    this.scene = scene;
    this.ambulances = [];
    this.spawnTimer = 0;
    this.nextSpawnInterval = this.getSpawnInterval();
  }

  getSpawnInterval() {
    return AMBULANCE_SPAWN_INTERVAL_MIN +
      Math.random() * (AMBULANCE_SPAWN_INTERVAL_MAX - AMBULANCE_SPAWN_INTERVAL_MIN);
  }

  spawnAmbulance() {
    if (this.ambulances.length >= AMBULANCE_MAX_ACTIVE) return;

    const step = BLOCK_SIZE + ROAD_WIDTH;
    const total = GRID_SIZE * step;
    const half = total / 2;
    const laneOffset = ROAD_WIDTH / 4;

    const isHorizontal = Math.random() > 0.5;
    let x, z, dir;

    if (isHorizontal) {
      const roadZ = Math.floor(Math.random() * (GRID_SIZE + 1));
      dir = Math.random() > 0.5 ? DIR_POS_X : DIR_NEG_X;
      z = -half + roadZ * step + (dir === DIR_POS_X ? -laneOffset : laneOffset);
      x = dir === DIR_POS_X ? -half - 10 : half + 10;
    } else {
      const roadX = Math.floor(Math.random() * (GRID_SIZE + 1));
      dir = Math.random() > 0.5 ? DIR_POS_Z : DIR_NEG_Z;
      x = -half + roadX * step + (dir === DIR_POS_Z ? -laneOffset : laneOffset);
      z = dir === DIR_POS_Z ? -half - 10 : half + 10;
    }

    const ambulance = new Ambulance(this.scene, x, z, dir);
    this.ambulances.push(ambulance);
  }

  update(deltaTime) {
    this.spawnTimer += deltaTime;

    if (this.spawnTimer >= this.nextSpawnInterval) {
      this.spawnAmbulance();
      this.spawnTimer = 0;
      this.nextSpawnInterval = this.getSpawnInterval();
    }

    for (const ambulance of this.ambulances) {
      ambulance.update(deltaTime);
    }

    this.removeDeadAmbulances();
  }

  removeDeadAmbulances() {
    for (let i = this.ambulances.length - 1; i >= 0; i--) {
      if (!this.ambulances[i].alive) {
        this.ambulances[i].destroy();
        this.ambulances.splice(i, 1);
      }
    }
  }
}
