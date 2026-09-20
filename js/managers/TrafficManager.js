import { TrafficLight } from '../entities/TrafficLight.js';
import {
  GRID_SIZE, BLOCK_SIZE, ROAD_WIDTH, AVENUE_INDICES
} from '../utils/constants.js';

export class TrafficManager {
  constructor(scene) {
    this.scene = scene;
    this.trafficLights = [];
    this.createTrafficLights();
    this.synchronizeAvenueLights();
  }

  createTrafficLights() {
    const step = BLOCK_SIZE + ROAD_WIDTH;
    const halfExtent = (GRID_SIZE * step) / 2;

    for (let row = 0; row <= GRID_SIZE; row++) {
      for (let col = 0; col <= GRID_SIZE; col++) {
        const ix = -halfExtent + row * (BLOCK_SIZE + ROAD_WIDTH) + ROAD_WIDTH / 2;
        const iz = -halfExtent + col * (BLOCK_SIZE + ROAD_WIDTH) + ROAD_WIDTH / 2;

        const tlH = new TrafficLight(this.scene, ix, iz, 'horizontal');
        tlH.gridRow = row;
        tlH.gridCol = col;
        this.trafficLights.push(tlH);

        const tlV = new TrafficLight(this.scene, ix, iz, 'vertical');
        tlV.gridRow = row;
        tlV.gridCol = col;
        this.trafficLights.push(tlV);
      }
    }
  }

  synchronizeAvenueLights() {
    const avenueHorizontalGroups = {};
    const avenueVerticalGroups = {};

    for (const tl of this.trafficLights) {
      if (tl.orientation === 'horizontal' && AVENUE_INDICES.includes(tl.gridRow)) {
        if (!avenueHorizontalGroups[tl.gridRow]) {
          avenueHorizontalGroups[tl.gridRow] = [];
        }
        avenueHorizontalGroups[tl.gridRow].push(tl);
      }

      if (tl.orientation === 'vertical' && AVENUE_INDICES.includes(tl.gridCol)) {
        if (!avenueVerticalGroups[tl.gridCol]) {
          avenueVerticalGroups[tl.gridCol] = [];
        }
        avenueVerticalGroups[tl.gridCol].push(tl);
      }
    }

    for (const row of AVENUE_INDICES) {
      const group = avenueHorizontalGroups[row];
      if (group && group.length > 1) {
        this.syncGroup(group);
      }
    }

    for (const col of AVENUE_INDICES) {
      const group = avenueVerticalGroups[col];
      if (group && group.length > 1) {
        this.syncGroup(group);
      }
    }
  }

  syncGroup(lights) {
    const master = lights[0];
    for (let i = 1; i < lights.length; i++) {
      lights[i].greenDuration = master.greenDuration;
      lights[i].redDuration = master.redDuration;
      lights[i].timer = master.timer + i * 0.3;
      lights[i].state = master.state;
    }
  }

  update(deltaTime) {
    for (const tl of this.trafficLights) {
      tl.update(deltaTime);
    }
  }
}
