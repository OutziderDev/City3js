import { SceneSetup } from './core/SceneSetup.js';
import { DayNightCycle } from './core/DayNightCycle.js';
import { GridManager } from './managers/GridManager.js';
import { TrafficManager } from './managers/TrafficManager.js';
import { VehicleManager } from './managers/VehicleManager.js';
import { PedestrianManager } from './managers/PedestrianManager.js';
import { BusManager } from './managers/BusManager.js';
import { WeatherManager } from './managers/WeatherManager.js';
import { CollisionManager } from './managers/CollisionManager.js';
import {
  GRID_SIZE, BLOCK_SIZE, ROAD_WIDTH
} from './utils/constants.js';


class CityApp {
  constructor() {
    this.canvas = document.getElementById('city-canvas');
    this.sceneSetup = new SceneSetup(this.canvas);
    this.dayNight = new DayNightCycle(this.sceneSetup);
    this.grid = new GridManager(this.sceneSetup.scene);
    this.trafficManager = new TrafficManager(this.sceneSetup.scene);
    this.vehicleManager = new VehicleManager(this.sceneSetup.scene);
    this.pedestrianManager = new PedestrianManager(this.sceneSetup.scene);
    this.busManager = new BusManager(this.sceneSetup.scene);
    this.weatherManager = new WeatherManager(this.sceneSetup.scene, this.dayNight);
    this.collisionManager = new CollisionManager(
      this.vehicleManager, this.busManager, this.pedestrianManager, this.grid
    );

    this.cityBounds = this.calculateBounds();

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

  updateUI() {
    document.getElementById('car-count').textContent = `🚗 ${this.vehicleManager.cars.length}`;
    document.getElementById('bus-count').textContent = `🚌 ${this.busManager.buses.length}`;
    document.getElementById('person-count').textContent = `🚶 ${this.pedestrianManager.people.length}`;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.dayNight.update(delta);
    this.grid.updateWindows(this.dayNight.getDayFactor(), delta);
    this.trafficManager.update(delta);
    this.collisionManager.update();
    this.vehicleManager.update(delta, this.trafficManager.trafficLights, this.cityBounds, this.collisionManager);
    this.pedestrianManager.update(delta, this.cityBounds);
    this.busManager.update(delta, this.trafficManager.trafficLights, this.cityBounds, this.collisionManager);
    this.weatherManager.update(delta);

    document.getElementById('clock-display').textContent = this.dayNight.getHourString();
    document.getElementById('bus-count').textContent = `🚌 ${this.busManager.buses.length}`;
    document.getElementById('person-count').textContent = `🚶 ${this.pedestrianManager.people.length}`;

    const weatherEl = document.getElementById('weather-status');
    if (this.weatherManager.getIsRaining()) {
      const pct = Math.round(this.weatherManager.getRainIntensity() * 100);
      weatherEl.textContent = `🌧️ Lluvia ${pct}%`;
      weatherEl.style.display = '';
    } else {
      weatherEl.style.display = 'none';
    }

    this.sceneSetup.render();
  }
}

new CityApp();
