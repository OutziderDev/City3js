import { TrafficLight } from '../entities/TrafficLight.js';
import {
  GRID_SIZE, BLOCK_SIZE, ROAD_WIDTH
} from '../utils/constants.js';

export class TrafficManager {
  constructor(scene) {
    this.scene = scene;
    this.trafficLights = [];
    this.createTrafficLights();
  }

  createTrafficLights() {
    const step = BLOCK_SIZE + ROAD_WIDTH;
    const halfExtent = (GRID_SIZE * step) / 2;

    for (let row = 0; row <= GRID_SIZE; row++) {
      for (let col = 0; col <= GRID_SIZE; col++) {
        const ix = -halfExtent + row * (BLOCK_SIZE + ROAD_WIDTH) + ROAD_WIDTH / 2;
        const iz = -halfExtent + col * (BLOCK_SIZE + ROAD_WIDTH) + ROAD_WIDTH / 2;

        const tlH = new TrafficLight(this.scene, ix, iz, 'horizontal');
        this.trafficLights.push(tlH);

        const tlV = new TrafficLight(this.scene, ix, iz, 'vertical');
        this.trafficLights.push(tlV);
      }
    }
  }

  update(deltaTime) {
    for (const tl of this.trafficLights) {
      tl.update(deltaTime);
    }
  }
}
