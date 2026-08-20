import { Person } from '../entities/Person.js';
import {
  PERSON_COUNT, GRID_SIZE, BLOCK_SIZE, ROAD_WIDTH,
  DIR_POS_X, DIR_NEG_X, DIR_POS_Z, DIR_NEG_Z
} from '../utils/constants.js';

export class PedestrianManager {
  constructor(scene) {
    this.scene = scene;
    this.people = [];
    this.spawnPeople();
  }

  spawnPeople() {
    const step = BLOCK_SIZE + ROAD_WIDTH;
    const total = GRID_SIZE * step;
    const half = total / 2;
    const swOffset = BLOCK_SIZE / 2 + 1.5;

    for (let i = 0; i < PERSON_COUNT; i++) {
      const isHorizontal = Math.random() > 0.5;
      let x, z, dir;

      if (isHorizontal) {
        const row = Math.floor(Math.random() * (GRID_SIZE + 1));
        const side = Math.random() > 0.5 ? 1 : -1;
        x = -half + Math.random() * total;
        z = -half + row * step + ROAD_WIDTH / 2 + side * swOffset;
        dir = Math.random() > 0.5 ? DIR_POS_X : DIR_NEG_X;
      } else {
        const col = Math.floor(Math.random() * (GRID_SIZE + 1));
        const side = Math.random() > 0.5 ? 1 : -1;
        x = -half + col * step + ROAD_WIDTH / 2 + side * swOffset;
        z = -half + Math.random() * total;
        dir = Math.random() > 0.5 ? DIR_POS_Z : DIR_NEG_Z;
      }

      const person = new Person(this.scene, x, z, dir);
      this.people.push(person);
    }
  }

  update(deltaTime, cityBounds) {
    for (const person of this.people) {
      person.update(deltaTime, cityBounds);
    }
  }
}
