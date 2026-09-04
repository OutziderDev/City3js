import * as THREE from 'three';
import {
  SNOW_EVENT_INTERVAL_MIN,
  SNOW_EVENT_INTERVAL_MAX,
  SNOW_DURATION_MIN,
  SNOW_DURATION_MAX,
  SNOW_PARTICLE_COUNT,
  SNOW_FLAKE_SIZE,
  SNOW_FALL_SPEED_MIN,
  SNOW_FALL_SPEED_MAX,
  SNOW_DRIFT_STRENGTH,
  SNOW_MELT_DELAY,
  SNOW_MELT_SPEED,
  SNOW_ACCUMULATION_COUNT,
  GRID_SIZE,
  BLOCK_SIZE,
  ROAD_WIDTH,
  SIDEWALK_WIDTH,
  SIDEWALK_HEIGHT
} from '../utils/constants.js';

export class SnowManager {
  constructor(scene, dayNightCycle) {
    this.scene = scene;
    this.dayNight = dayNightCycle;

    this.snowflakes = null;
    this.snowGeometry = null;
    this.snowVelocities = null;
    this.snowDrifts = null;

    this.snowAccumulations = [];
    this.snowGroup = new THREE.Group();
    this.scene.add(this.snowGroup);

    this.isSnowing = false;
    this.stormIntensity = 0;
    this.targetIntensity = 0;
    this.stormTimer = 0;
    this.stormDuration = 0;
    this.nextEventTimer = this.getRandomInterval();

    this.isMelting = false;
    this.meltTimer = 0;

    this.gridStep = BLOCK_SIZE + ROAD_WIDTH;
    this.totalSize = GRID_SIZE * this.gridStep;
    this.halfExtent = this.totalSize / 2;

    this.createSnowSystem();
    this.createSnowAccumulation();
  }

  getRandomInterval() {
    return SNOW_EVENT_INTERVAL_MIN + Math.random() * (SNOW_EVENT_INTERVAL_MAX - SNOW_EVENT_INTERVAL_MIN);
  }

  getRandomDuration() {
    return SNOW_DURATION_MIN + Math.random() * (SNOW_DURATION_MAX - SNOW_DURATION_MIN);
  }

  shouldSnowNow() {
    const visualTime = (this.dayNight.time + this.dayNight.dayOffset) % 1;
    const hour = visualTime * 24;
    let probability = 0.05;

    if (hour >= 18 && hour < 22) {
      probability = 0.30;
    } else if (hour >= 6 && hour < 10) {
      probability = 0.20;
    }

    return Math.random() < probability;
  }

  createSnowSystem() {
    this.snowGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(SNOW_PARTICLE_COUNT * 3);
    const velocities = new Float32Array(SNOW_PARTICLE_COUNT);
    const drifts = new Float32Array(SNOW_PARTICLE_COUNT);

    for (let i = 0; i < SNOW_PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 300;
      positions[i * 3 + 1] = Math.random() * 120;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
      velocities[i] = SNOW_FALL_SPEED_MIN + Math.random() * (SNOW_FALL_SPEED_MAX - SNOW_FALL_SPEED_MIN);
      drifts[i] = (Math.random() - 0.5) * Math.PI * 2;
    }

    this.snowGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.snowVelocities = velocities;
    this.snowDrifts = drifts;

    const snowMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: SNOW_FLAKE_SIZE,
      transparent: true,
      opacity: 0.8,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    this.snowflakes = new THREE.Points(this.snowGeometry, snowMat);
    this.snowflakes.visible = false;
    this.scene.add(this.snowflakes);
  }

  createSnowAccumulation() {
    const sidewalkPositions = this.getSidewalkPositions();

    for (let i = 0; i < SNOW_ACCUMULATION_COUNT; i++) {
      const pos = sidewalkPositions[Math.floor(Math.random() * sidewalkPositions.length)];

      const width = 0.8 + Math.random() * 1.5;
      const depth = 0.8 + Math.random() * 1.5;
      const height = 0.05 + Math.random() * 0.1;

      const geo = new THREE.BoxGeometry(width, height, depth);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.4,
        transparent: true,
        opacity: 0
      });

      const pile = new THREE.Mesh(geo, mat);
      pile.position.set(
        pos.x + (Math.random() - 0.5) * 2,
        SIDEWALK_HEIGHT + height / 2,
        pos.z + (Math.random() - 0.5) * 2
      );
      pile.castShadow = true;
      pile.receiveShadow = true;

      pile.userData.baseScale = 0.3 + Math.random() * 0.4;
      pile.userData.targetScale = 0.8 + Math.random() * 0.4;
      pile.userData.targetOpacity = 0.5 + Math.random() * 0.5;
      pile.userData.currentOpacity = 0;
      pile.scale.setScalar(pile.userData.baseScale);

      this.snowAccumulations.push(pile);
      this.snowGroup.add(pile);
    }
  }

  getSidewalkPositions() {
    const positions = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const bx = -this.halfExtent + r * this.gridStep + ROAD_WIDTH / 2 + BLOCK_SIZE / 2;
        const bz = -this.halfExtent + c * this.gridStep + ROAD_WIDTH / 2 + BLOCK_SIZE / 2;
        const swCenter = BLOCK_SIZE / 2 - SIDEWALK_WIDTH / 2;

        positions.push({ x: bx, z: bz - swCenter });
        positions.push({ x: bx, z: bz + swCenter });
        positions.push({ x: bx - swCenter, z: bz });
        positions.push({ x: bx + swCenter, z: bz });
      }
    }

    return positions;
  }

  startSnow() {
    this.isSnowing = true;
    this.stormTimer = 0;
    this.stormDuration = this.getRandomDuration();
    this.targetIntensity = 1.0;

    this.snowflakes.visible = true;

    this.snowAccumulations.forEach(pile => {
      pile.visible = true;
    });
  }

  stopSnow() {
    this.targetIntensity = 0;
    this.isMelting = true;
    this.meltTimer = 0;
  }

  update(delta) {
    if (!this.isSnowing) {
      this.nextEventTimer -= delta;
      if (this.nextEventTimer <= 0) {
        if (this.shouldSnowNow()) {
          this.startSnow();
        }
        this.nextEventTimer = this.getRandomInterval();
      }
    } else {
      this.stormTimer += delta;

      if (this.stormIntensity > 0 && this.stormTimer >= this.stormDuration) {
        this.stopSnow();
      }

      const diff = this.targetIntensity - this.stormIntensity;
      if (Math.abs(diff) > 0.01) {
        this.stormIntensity += Math.sign(diff) * delta * 0.1;
      } else {
        this.stormIntensity = this.targetIntensity;
      }

      if (this.targetIntensity === 0 && this.stormIntensity < 0.01) {
        this.isSnowing = false;
        this.snowflakes.visible = false;
        this.stormIntensity = 0;
        this.nextEventTimer = this.getRandomInterval();
      }

      this.dayNight.setWeatherDarkening(this.stormIntensity / 1.0);
    }

    if (this.isMelting) {
      this.meltTimer += delta;
      if (this.meltTimer >= SNOW_MELT_DELAY) {
        let allMelted = true;
        this.snowAccumulations.forEach(pile => {
          pile.userData.currentOpacity -= SNOW_MELT_SPEED * delta;
          if (pile.userData.currentOpacity > 0) {
            allMelted = false;
          } else {
            pile.userData.currentOpacity = 0;
            pile.visible = false;
          }
          pile.material.opacity = pile.userData.currentOpacity;
        });
        if (allMelted) {
          this.isMelting = false;
        }
      }
    }

    if (this.stormIntensity > 0) {
      this.updateSnowflakes(delta);
      this.updateAccumulation(delta);
    }
  }

  updateSnowflakes(delta) {
    const positions = this.snowGeometry.attributes.position.array;
    const time = performance.now() * 0.001;
    const cameraPos = this.scene.children[0]?.position || { x: 0, y: 0, z: 0 };

    for (let i = 0; i < SNOW_PARTICLE_COUNT; i++) {
      const drift = Math.sin(time * 0.5 + this.snowDrifts[i]) * SNOW_DRIFT_STRENGTH;

      positions[i * 3] += drift * delta * 30;
      positions[i * 3 + 1] -= this.snowVelocities[i] * 40 * delta;
      positions[i * 3 + 2] += Math.cos(time * 0.3 + this.snowDrifts[i]) * SNOW_DRIFT_STRENGTH * delta * 20;

      if (positions[i * 3 + 1] < 0) {
        positions[i * 3] = cameraPos.x + (Math.random() - 0.5) * 250;
        positions[i * 3 + 1] = 100 + Math.random() * 30;
        positions[i * 3 + 2] = cameraPos.z + (Math.random() - 0.5) * 250;
      }
    }

    this.snowGeometry.attributes.position.needsUpdate = true;
    this.snowflakes.material.opacity = 0.4 + this.stormIntensity * 0.5;
  }

  updateAccumulation(delta) {
    const time = performance.now() * 0.001;

    this.snowAccumulations.forEach((pile, index) => {
      const targetOpacity = this.stormIntensity * pile.userData.targetOpacity;
      const diff = targetOpacity - pile.userData.currentOpacity;

      if (Math.abs(diff) > 0.01) {
        pile.userData.currentOpacity += Math.sign(diff) * delta * 0.15;
      } else {
        pile.userData.currentOpacity = targetOpacity;
      }

      pile.material.opacity = Math.max(0, pile.userData.currentOpacity);

      const targetScale = pile.userData.baseScale + (pile.userData.targetScale - pile.userData.baseScale) * this.stormIntensity;
      const currentScale = pile.scale.x;
      const scaleDiff = targetScale - currentScale;
      if (Math.abs(scaleDiff) > 0.01) {
        const newScale = currentScale + Math.sign(scaleDiff) * delta * 0.3;
        pile.scale.setScalar(newScale);
      }

      pile.position.y = SIDEWALK_HEIGHT + (pile.geometry.parameters.height / 2) * pile.scale.y;

      const bob = Math.sin(time * 0.5 + index * 0.1) * 0.02 * this.stormIntensity;
      pile.position.y += bob;
    });
  }

  getIsSnowing() {
    return this.isSnowing || this.isMelting;
  }

  getSnowIntensity() {
    return this.stormIntensity;
  }
}
