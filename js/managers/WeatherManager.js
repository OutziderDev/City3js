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

const LIGHTNING_PROBABILITY = 0.08;
const LIGHTNING_COOLDOWN_MIN = 4;
const LIGHTNING_COOLDOWN_MAX = 12;
const LIGHTNING_FLASH_DURATION = 0.15;
const LIGHTNING_BOLT_SEGMENTS = 8;
const LIGHTNING_BOLT_SPREAD = 15;

export class WeatherManager {
  constructor(scene, dayNightCycle, coordinator) {
    this.scene = scene;
    this.dayNight = dayNightCycle;
    this.coordinator = coordinator;

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

    this.lightningBolts = [];
    this.lightningFlash = null;
    this.lightningTimer = 0;
    this.nextLightningCooldown = this.getRandomLightningCooldown();
    this.isFlashing = false;
    this.flashIntensity = 0;
    this.flashLight = null;

    this.createClouds();
    this.createRainSystem();
    this.createLightningSystem();
  }

  getRandomInterval() {
    return RAIN_EVENT_INTERVAL_MIN + Math.random() * (RAIN_EVENT_INTERVAL_MAX - RAIN_EVENT_INTERVAL_MIN);
  }

  getRandomDuration() {
    return RAIN_DURATION_MIN + Math.random() * (RAIN_DURATION_MAX - RAIN_DURATION_MIN);
  }

  getRainProbability() {
    const visualTime = (this.dayNight.time + this.dayNight.dayOffset) % 1;
    const hour = visualTime * 24;
    let probability = 0.05;

    if (hour >= 14 && hour < 17) {
      probability = 0.35;
    } else if (hour >= 6 && hour < 9) {
      probability = 0.20;
    }

    return probability;
  }

  shouldRainNow() {
    return Math.random() < this.getRainProbability();
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

  createLightningSystem() {
    this.flashLight = new THREE.PointLight(0xffffff, 0, 400);
    this.flashLight.position.set(0, 100, 0);
    this.scene.add(this.flashLight);

    for (let i = 0; i < 3; i++) {
      const boltMat = new THREE.LineBasicMaterial({
        color: 0xffffee,
        transparent: true,
        opacity: 0,
        linewidth: 2
      });
      const boltGeo = new THREE.BufferGeometry();
      const positions = new Float32Array((LIGHTNING_BOLT_SEGMENTS + 1) * 3);
      boltGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const bolt = new THREE.Line(boltGeo, boltMat);
      bolt.visible = false;
      this.scene.add(bolt);
      this.lightningBolts.push(bolt);
    }

    this.lightningFlash = new THREE.Mesh(
      new THREE.SphereGeometry(200, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
        depthWrite: false
      })
    );
    this.scene.add(this.lightningFlash);
  }

  getRandomLightningCooldown() {
    return LIGHTNING_COOLDOWN_MIN + Math.random() * (LIGHTNING_COOLDOWN_MAX - LIGHTNING_COOLDOWN_MIN);
  }

  triggerLightning() {
    const bolt = this.lightningBolts.find(b => !b.visible);
    if (!bolt) return;

    const startX = (Math.random() - 0.5) * 200;
    const startZ = (Math.random() - 0.5) * 200;
    const startY = 80 + Math.random() * 30;

    const positions = bolt.geometry.attributes.position.array;
    positions[0] = startX;
    positions[1] = startY;
    positions[2] = startZ;

    for (let i = 1; i <= LIGHTNING_BOLT_SEGMENTS; i++) {
      const t = i / LIGHTNING_BOLT_SEGMENTS;
      positions[i * 3] = startX + (Math.random() - 0.5) * LIGHTNING_BOLT_SPREAD * t;
      positions[i * 3 + 1] = startY - t * startY * 0.9;
      positions[i * 3 + 2] = startZ + (Math.random() - 0.5) * LIGHTNING_BOLT_SPREAD * t;
    }

    bolt.geometry.attributes.position.needsUpdate = true;
    bolt.visible = true;
    bolt.material.opacity = 1;

    this.flashLight.position.set(startX, 60, startZ);
    this.flashLight.intensity = 3;
    this.isFlashing = true;
    this.flashIntensity = 1;

    this.lightningFlash.position.set(startX, startY / 2, startZ);
    this.lightningFlash.material.opacity = 0.15;

    setTimeout(() => {
      bolt.material.opacity = 0.3;
    }, 50);

    setTimeout(() => {
      bolt.visible = false;
      bolt.material.opacity = 0;
    }, LIGHTNING_FLASH_DURATION * 1000);
  }

  startRain() {
    if (!this.coordinator.canStartWeather('rain')) return;

    this.isRaining = true;
    this.rainTimer = 0;
    this.rainDuration = this.getRandomDuration();
    this.targetIntensity = RAIN_INTENSITY;
    this.transitionProgress = 0;
    this.coordinator.registerWeatherStart('rain');

    this.clouds.forEach(cloud => {
      cloud.visible = true;
      cloud.position.x = cloud.userData.direction > 0 ? -150 : 150;
    });

    this.rainParticles.visible = true;
  }

  stopRain() {
    this.targetIntensity = 0;
    this.transitionProgress = 0;

    this.lightningBolts.forEach(bolt => {
      bolt.visible = false;
      bolt.material.opacity = 0;
    });
    this.flashLight.intensity = 0;
    this.lightningFlash.material.opacity = 0;
    this.isFlashing = false;
    this.coordinator.registerWeatherEnd();
  }

  update(delta) {
    if (!this.isRaining) {
      this.nextEventTimer -= delta;
      if (this.nextEventTimer <= 0) {
        this.startRain();
        this.nextEventTimer = this.getRandomInterval();
      }
    } else {
      this.rainTimer += delta;

      if (this.rainIntensity > 0 && this.rainTimer >= this.rainDuration) {
        this.stopRain();
      }

      this.lightningTimer += delta;
      if (this.lightningTimer >= this.nextLightningCooldown && this.rainIntensity > RAIN_INTENSITY * 0.5) {
        if (Math.random() < LIGHTNING_PROBABILITY) {
          this.triggerLightning();
        }
        this.lightningTimer = 0;
        this.nextLightningCooldown = this.getRandomLightningCooldown();
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
      this.updateLightning(delta);
    }
  }

  updateLightning(delta) {
    if (this.isFlashing) {
      this.flashIntensity -= delta * 8;
      if (this.flashIntensity <= 0) {
        this.flashIntensity = 0;
        this.isFlashing = false;
        this.flashLight.intensity = 0;
        this.lightningFlash.material.opacity = 0;
      } else {
        this.flashLight.intensity = this.flashIntensity * 3;
        this.lightningFlash.material.opacity = this.flashIntensity * 0.15;
      }
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

  forceRain() {
    if (this.isRaining) {
      this.stopRain();
      return;
    }

    if (this.coordinator.isWeatherActive()) {
      if (this.snowManager && this.snowManager.isStillVisual()) {
        this.snowManager.stopSnow();
      }
    }

    this.isRaining = true;
    this.rainTimer = 0;
    this.rainDuration = this.getRandomDuration();
    this.targetIntensity = RAIN_INTENSITY;
    this.transitionProgress = 0;
    this.coordinator.forceStartWeather('rain');

    this.clouds.forEach(cloud => {
      cloud.visible = true;
      cloud.position.x = cloud.userData.direction > 0 ? -150 : 150;
    });

    this.rainParticles.visible = true;
    this.nextEventTimer = this.getRandomInterval();
  }

  getIsRaining() {
    return this.isRaining;
  }

  isStillVisual() {
    return this.rainIntensity > 0.01;
  }

  getRainIntensity() {
    return this.rainIntensity;
  }

  getRainRemaining() {
    if (!this.isRaining || this.rainDuration === 0) return 0;
    return 1 - (this.rainTimer / this.rainDuration);
  }
}
