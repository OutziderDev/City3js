import * as THREE from 'three';
import {
  RAIN_EVENT_INTERVAL_MIN,
  RAIN_EVENT_INTERVAL_MAX,
  RAIN_DURATION_MIN,
  RAIN_DURATION_MAX,
  RAIN_INTENSITY,
  CLOUD_COUNT,
  CLOUD_SPEED,
  RAIN_PARTICLE_COUNT,
  RAIN_TRANSITION_DURATION
} from '../utils/constants.js';

export class WeatherManager {
  constructor(scene, dayNightCycle) {
    this.scene = scene;
    this.dayNight = dayNightCycle;

    this.clouds = [];
    this.rainParticles = null;
    this.rainGeometry = null;

    this.isRaining = false;
    this.rainIntensity = 0;
    this.targetIntensity = 0;
    this.rainTimer = 0;
    this.rainDuration = 0;
    this.nextEventTimer = this.getRandomInterval();
    this.transitionProgress = 0;

    this.createClouds();
    this.createRainSystem();
  }

  getRandomInterval() {
    return RAIN_EVENT_INTERVAL_MIN + Math.random() * (RAIN_EVENT_INTERVAL_MAX - RAIN_EVENT_INTERVAL_MIN);
  }

  getRandomDuration() {
    return RAIN_DURATION_MIN + Math.random() * (RAIN_DURATION_MAX - RAIN_DURATION_MIN);
  }

  shouldRainNow() {
    const hour = this.dayNight.time * 24;
    let probability = 0.10;

    if (hour >= 14 && hour < 17) {
      probability = 0.40;
    } else if (hour >= 6 && hour < 9) {
      probability = 0.25;
    }

    return Math.random() < probability;
  }

  createClouds() {
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const cloud = this.createSingleCloud();
      cloud.position.set(
        (Math.random() - 0.5) * 300,
        80 + Math.random() * 40,
        (Math.random() - 0.5) * 300
      );
      cloud.visible = false;
      cloud.userData.speed = CLOUD_SPEED * (0.7 + Math.random() * 0.6);
      cloud.userData.direction = Math.random() > 0.5 ? 1 : -1;
      cloud.userData.offset = Math.random() * Math.PI * 2;
      this.clouds.push(cloud);
      this.scene.add(cloud);
    }
  }

  createSingleCloud() {
    const cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshPhongMaterial({
      color: 0x3a3a4a,
      transparent: true,
      opacity: 0.85,
      flatShading: true
    });

    const puffCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < puffCount; i++) {
      const size = 8 + Math.random() * 12;
      const geo = new THREE.SphereGeometry(size, 8, 6);
      const puff = new THREE.Mesh(geo, cloudMat);
      puff.scale.y = 0.35;
      puff.position.set(
        (i - puffCount / 2) * 8 + Math.random() * 4,
        Math.random() * 3 - 1,
        Math.random() * 6 - 3
      );
      cloudGroup.add(puff);
    }

    return cloudGroup;
  }

  createRainSystem() {
    this.rainGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(RAIN_PARTICLE_COUNT * 3);
    const velocities = new Float32Array(RAIN_PARTICLE_COUNT);

    for (let i = 0; i < RAIN_PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 250;
      positions[i * 3 + 1] = Math.random() * 120;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 250;
      velocities[i] = 0.8 + Math.random() * 0.4;
    }

    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rainVelocities = velocities;

    const rainMat = new THREE.PointsMaterial({
      color: 0x8899bb,
      size: 0.2,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.rainParticles = new THREE.Points(this.rainGeometry, rainMat);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  startRain() {
    this.isRaining = true;
    this.rainTimer = 0;
    this.rainDuration = this.getRandomDuration();
    this.targetIntensity = RAIN_INTENSITY;
    this.transitionProgress = 0;

    this.clouds.forEach(cloud => {
      cloud.visible = true;
      cloud.position.x = cloud.userData.direction > 0 ? -150 : 150;
    });

    this.rainParticles.visible = true;
  }

  stopRain() {
    this.targetIntensity = 0;
    this.transitionProgress = 0;
  }

  update(delta) {
    if (!this.isRaining) {
      this.nextEventTimer -= delta;
      if (this.nextEventTimer <= 0) {
        if (this.shouldRainNow()) {
          this.startRain();
        }
        this.nextEventTimer = this.getRandomInterval();
      }
    } else {
      this.rainTimer += delta;

      if (this.rainIntensity > 0 && this.rainTimer >= this.rainDuration) {
        this.stopRain();
      }

      const diff = this.targetIntensity - this.rainIntensity;
      if (Math.abs(diff) > 0.01) {
        this.rainIntensity += Math.sign(diff) * delta * 0.15;
      } else {
        this.rainIntensity = this.targetIntensity;
      }

      if (this.targetIntensity === 0 && this.rainIntensity < 0.01) {
        this.isRaining = false;
        this.rainParticles.visible = false;
        this.clouds.forEach(cloud => { cloud.visible = false; });
        this.rainIntensity = 0;
        this.nextEventTimer = this.getRandomInterval();
      }

      this.dayNight.setWeatherDarkening(this.rainIntensity / RAIN_INTENSITY);
    }

    if (this.rainIntensity > 0) {
      this.updateClouds(delta);
      this.updateRain(delta);
    }
  }

  updateClouds(delta) {
    const time = performance.now() * 0.001;
    this.clouds.forEach(cloud => {
      const speed = cloud.userData.speed * delta * cloud.userData.direction;
      cloud.position.x += speed;
      cloud.position.y += Math.sin(time + cloud.userData.offset) * delta * 0.3;

      if (cloud.userData.direction > 0 && cloud.position.x > 150) {
        cloud.position.x = -150;
      } else if (cloud.userData.direction < 0 && cloud.position.x < -150) {
        cloud.position.x = 150;
      }
    });
  }

  updateRain(delta) {
    const positions = this.rainGeometry.attributes.position.array;
    const cameraPos = this.dayNight.scene.children[0]?.position || { x: 0, y: 0, z: 0 };

    for (let i = 0; i < RAIN_PARTICLE_COUNT; i++) {
      positions[i * 3 + 1] -= this.rainVelocities[i] * 60 * delta;

      if (positions[i * 3 + 1] < 0) {
        positions[i * 3] = cameraPos.x + (Math.random() - 0.5) * 250;
        positions[i * 3 + 1] = 100 + Math.random() * 20;
        positions[i * 3 + 2] = cameraPos.z + (Math.random() - 0.5) * 250;
      }
    }

    this.rainGeometry.attributes.position.needsUpdate = true;
    this.rainParticles.material.opacity = 0.3 + (this.rainIntensity / RAIN_INTENSITY) * 0.4;
  }

  getIsRaining() {
    return this.isRaining;
  }

  getRainIntensity() {
    return this.rainIntensity;
  }
}
