import { SceneSetup } from './scene/SceneSetup.js';
import { DayNightCycle } from './scene/DayNightCycle.js';
import { Grid } from './scene/Grid.js';
import { TrafficLight } from './roads/TrafficLight.js';
import { Car } from './vehicles/Car.js';
import { Person } from './people/Person.js';
import {
  CAR_COUNT, PERSON_COUNT, GRID_SIZE, BLOCK_SIZE, ROAD_WIDTH,
  DIR_POS_X, DIR_NEG_X, DIR_POS_Z, DIR_NEG_Z
} from './utils/constants.js';

class CityApp {
  constructor() {
    this.canvas = document.getElementById('city-canvas');
    this.sceneSetup = new SceneSetup(this.canvas);
    this.dayNight = new DayNightCycle(this.sceneSetup);
    this.grid = new Grid(this.sceneSetup.scene);

    this.trafficLights = [];
    this.cars = [];
    this.people = [];

    this.cityBounds = this.calculateBounds();

    this.createTrafficLights();
    this.spawnCars();
    this.spawnPeople();

    this.clock = { getDelta: () => 0 };
    this.lastTime = performance.now();

    this.updateUI();
    this.animate();
  }

  calculateBounds() {
    const step = BLOCK_SIZE + ROAD_WIDTH;
    const total = GRID_SIZE * step;
    const half = total / 2;
    return {
      minX: -half,
      maxX: half,
      minZ: -half,
      maxZ: half
    };
  }

  createTrafficLights() {
    const step = BLOCK_SIZE + ROAD_WIDTH;
    const halfExtent = (GRID_SIZE * step) / 2;

    for (let row = 0; row <= GRID_SIZE; row++) {
      for (let col = 0; col <= GRID_SIZE; col++) {
        const ix = -halfExtent + row * (BLOCK_SIZE + ROAD_WIDTH) + ROAD_WIDTH / 2;
        const iz = -halfExtent + col * (BLOCK_SIZE + ROAD_WIDTH) + ROAD_WIDTH / 2;

        const tlH = new TrafficLight(
          this.sceneSetup.scene, ix, iz, 'horizontal'
        );
        this.trafficLights.push(tlH);

        const tlV = new TrafficLight(
          this.sceneSetup.scene, ix, iz, 'vertical'
        );
        this.trafficLights.push(tlV);
      }
    }
  }

  spawnCars() {
    const step = BLOCK_SIZE + ROAD_WIDTH;
    const total = GRID_SIZE * step;
    const half = total / 2;

    for (let i = 0; i < CAR_COUNT; i++) {
      const isHorizontal = Math.random() > 0.5;
      let x, z, dir;

      if (isHorizontal) {
        const row = Math.floor(Math.random() * (GRID_SIZE + 1));
        x = -half + Math.random() * total;
        z = -half + row * step + ROAD_WIDTH / 2;
        dir = Math.random() > 0.5 ? DIR_POS_X : DIR_NEG_X;
      } else {
        const col = Math.floor(Math.random() * (GRID_SIZE + 1));
        x = -half + col * step + ROAD_WIDTH / 2;
        z = -half + Math.random() * total;
        dir = Math.random() > 0.5 ? DIR_POS_Z : DIR_NEG_Z;
      }

      const car = new Car(this.sceneSetup.scene, x, z, dir);
      this.cars.push(car);
    }
  }

  spawnPeople() {
    const step = BLOCK_SIZE + ROAD_WIDTH;
    const total = GRID_SIZE * step;
    const half = total / 2;
    const swOffset = ROAD_WIDTH / 2 + 1.5;

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

      const person = new Person(this.sceneSetup.scene, x, z, dir);
      this.people.push(person);
    }
  }

  updateUI() {
    document.getElementById('car-count').textContent = `🚗 ${this.cars.length}`;
    document.getElementById('person-count').textContent = `🚶 ${this.people.length}`;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.dayNight.update(delta);

    for (const tl of this.trafficLights) {
      tl.update(delta);
    }

    for (const car of this.cars) {
      car.update(delta, this.trafficLights, this.cityBounds);
    }

    for (const person of this.people) {
      person.update(delta, this.cityBounds);
    }

    document.getElementById('clock-display').textContent = this.dayNight.getHourString();

    this.sceneSetup.render();
  }
}

new CityApp();
