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
  SNOW_MELT_START_DELAY,
  SNOW_MELT_DURATION,
  SNOW_CELL_SIZE,
  SNOW_MAX_CELL_HEIGHT,
  GRID_SIZE,
  BLOCK_SIZE,
  ROAD_WIDTH,
  SIDEWALK_WIDTH,
  SIDEWALK_HEIGHT
} from '../utils/constants.js';

export class SnowManager {
  constructor(scene, dayNightCycle, coordinator) {
    this.scene = scene;
    this.dayNight = dayNightCycle;
    this.coordinator = coordinator;

    this.snowflakes = null;
    this.snowGeometry = null;
    this.snowVelocities = null;
    this.snowDrifts = null;

    this.cells = [];
    this.cellMap = new Map();
    this.cellMesh = null;

    this.isSnowing = false;
    this.stormIntensity = 0;
    this.targetIntensity = 0;
    this.stormTimer = 0;
    this.stormDuration = 0;
    this.nextEventTimer = this.getRandomInterval();

    this.isMelting = false;
    this.meltTimer = 0;
    this.hasMelted = false;

    this.gridStep = BLOCK_SIZE + ROAD_WIDTH;
    this.totalSize = GRID_SIZE * this.gridStep;
    this.halfExtent = this.totalSize / 2;

    this.createSnowSystem();
    this.createCellGrid();
  }

  getRandomInterval() {
    return SNOW_EVENT_INTERVAL_MIN + Math.random() * (SNOW_EVENT_INTERVAL_MAX - SNOW_EVENT_INTERVAL_MIN);
  }

  getRandomDuration() {
    return SNOW_DURATION_MIN + Math.random() * (SNOW_DURATION_MAX - SNOW_DURATION_MIN);
  }

  getSnowProbability() {
    const visualTime = (this.dayNight.time + this.dayNight.dayOffset) % 1;
    const hour = visualTime * 24;
    let probability = 0.15;
    if (hour >= 18 && hour < 22) probability = 0.40;
    else if (hour >= 6 && hour < 10) probability = 0.30;
    return probability;
  }

  shouldSnowNow() {
    return Math.random() < this.getSnowProbability();
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

  createCellGrid() {
    const cs = SNOW_CELL_SIZE;
    const sw = SIDEWALK_WIDTH;
    const swCenter = BLOCK_SIZE / 2 - sw / 2;
    const segs = Math.ceil(BLOCK_SIZE / cs);
    const segsW = Math.ceil(sw / cs);

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const bx = -this.halfExtent + r * this.gridStep + ROAD_WIDTH / 2 + BLOCK_SIZE / 2;
        const bz = -this.halfExtent + c * this.gridStep + ROAD_WIDTH / 2 + BLOCK_SIZE / 2;
        const blockKey = `${r}_${c}`;

        for (let sx = 0; sx < segs; sx++) {
          for (let side = 0; side < 2; side++) {
            const wx = bx - BLOCK_SIZE / 2 + (sx + 0.5) * cs;
            const wz = side === 0 ? bz - swCenter : bz + swCenter;
            const key = `${blockKey}_h${side}_${sx}`;
            this.addCell(wx, wz, key);
          }
        }

        for (let sz = 0; sz < segs; sz++) {
          for (let side = 0; side < 2; side++) {
            const wz = bz - BLOCK_SIZE / 2 + (sz + 0.5) * cs;
            const wx = side === 0 ? bx - swCenter : bx + swCenter;
            const key = `${blockKey}_v${side}_${sz}`;
            this.addCell(wx, wz, key);
          }
        }
      }
    }

    if (this.cells.length === 0) return;

    const geo = new THREE.BoxGeometry(cs * 0.9, 1, cs * 0.9);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.45,
      transparent: true,
      opacity: 1
    });

    this.cellMesh = new THREE.InstancedMesh(geo, mat, this.cells.length);
    this.cellMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.cellMesh.frustumCulled = false;
    this.cellMesh.visible = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      dummy.position.set(cell.x, -10, cell.z);
      dummy.scale.set(1, 0.01, 1);
      dummy.updateMatrix();
      this.cellMesh.setMatrixAt(i, dummy.matrix);
    }
    this.cellMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.cellMesh);
  }

  addCell(x, z, key) {
    const idx = this.cells.length;
    this.cells.push({ x, z, h: 0, idx });
    this.cellMap.set(key, idx);
  }

  getCellIndex(wx, wz) {
    const cs = SNOW_CELL_SIZE;
    const halfE = this.halfExtent;
    const step = this.gridStep;
    const sw = SIDEWALK_WIDTH;
    const swCenter = BLOCK_SIZE / 2 - sw / 2;
    const segs = Math.ceil(BLOCK_SIZE / cs);

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const bx = -halfE + r * step + ROAD_WIDTH / 2 + BLOCK_SIZE / 2;
        const bz = -halfE + c * step + ROAD_WIDTH / 2 + BLOCK_SIZE / 2;

        const xMin = bx - BLOCK_SIZE / 2;
        const xMax = bx + BLOCK_SIZE / 2;
        const zMin = bz - BLOCK_SIZE / 2;
        const zMax = bz + BLOCK_SIZE / 2;

        if (wx >= xMin && wx < xMax && wz >= zMin && wz < zMax) {
          const blockKey = `${r}_${c}`;

          const z1a = bz - swCenter - sw / 2;
          const z1b = bz - swCenter + sw / 2;
          const z2a = bz + swCenter - sw / 2;
          const z2b = bz + swCenter + sw / 2;

          if (wz >= z1a && wz < z1b) {
            const sx = Math.floor((wx - xMin) / cs);
            return this.cellMap.get(`${blockKey}_h0_${sx}`) ?? -1;
          }
          if (wz >= z2a && wz < z2b) {
            const sx = Math.floor((wx - xMin) / cs);
            return this.cellMap.get(`${blockKey}_h1_${sx}`) ?? -1;
          }

          const x1a = bx - swCenter - sw / 2;
          const x1b = bx - swCenter + sw / 2;
          const x2a = bx + swCenter - sw / 2;
          const x2b = bx + swCenter + sw / 2;

          if (wx >= x1a && wx < x1b) {
            const sz = Math.floor((wz - zMin) / cs);
            return this.cellMap.get(`${blockKey}_v0_${sz}`) ?? -1;
          }
          if (wx >= x2a && wx < x2b) {
            const sz = Math.floor((wz - zMin) / cs);
            return this.cellMap.get(`${blockKey}_v1_${sz}`) ?? -1;
          }

          return -1;
        }
      }
    }
    return -1;
  }

  isOnSidewalk(wx, wz) {
    const halfE = this.halfExtent;
    const step = this.gridStep;
    const sw = SIDEWALK_WIDTH;
    const swCenter = BLOCK_SIZE / 2 - sw / 2;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const bx = -halfE + r * step + ROAD_WIDTH / 2 + BLOCK_SIZE / 2;
        const bz = -halfE + c * step + ROAD_WIDTH / 2 + BLOCK_SIZE / 2;

        if (wx >= bx - BLOCK_SIZE / 2 && wx < bx + BLOCK_SIZE / 2 &&
            wz >= bz - BLOCK_SIZE / 2 && wz < bz + BLOCK_SIZE / 2) {
          const z1 = bz - swCenter - sw / 2;
          const z2 = bz - swCenter + sw / 2;
          const z3 = bz + swCenter - sw / 2;
          const z4 = bz + swCenter + sw / 2;
          if ((wz >= z1 && wz < z2) || (wz >= z3 && wz < z4)) return true;

          const x1 = bx - swCenter - sw / 2;
          const x2 = bx - swCenter + sw / 2;
          const x3 = bx + swCenter - sw / 2;
          const x4 = bx + swCenter + sw / 2;
          if ((wx >= x1 && wx < x2) || (wx >= x3 && wx < x4)) return true;
        }
      }
    }
    return false;
  }

  startSnow() {
    if (!this.coordinator.canStartWeather('snow')) return;

    this.isSnowing = true;
    this.isMelting = false;
    this.hasMelted = false;
    this.stormTimer = 0;
    this.stormDuration = this.getRandomDuration();
    this.targetIntensity = 1.0;
    this.coordinator.registerWeatherStart('snow');

    this.snowflakes.visible = true;
    this.cellMesh.visible = true;
  }

  stopSnow() {
    this.targetIntensity = 0;
    this.isMelting = true;
    this.meltTimer = 0;
    this.hasMelted = false;
    this.coordinator.registerWeatherEnd();
  }

  update(delta) {
    if (!this.isSnowing && !this.isMelting) {
      this.nextEventTimer -= delta;
      if (this.nextEventTimer <= 0) {
        if (this.shouldSnowNow()) this.startSnow();
        this.nextEventTimer = this.getRandomInterval();
      }
    }

    if (this.isSnowing) {
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

      this.dayNight.setWeatherDarkening(this.stormIntensity);
      this.updateSnowflakes(delta);
      this.updateCellVisuals();
    }

    if (this.isMelting) {
      this.meltTimer += delta;

      if (this.meltTimer >= SNOW_MELT_START_DELAY && !this.hasMelted) {
        let allGone = true;
        for (let i = 0; i < this.cells.length; i++) {
          if (this.cells[i].h > 0.001) {
            this.cells[i].h *= 1 - delta * 0.35;
            if (this.cells[i].h < 0.001) this.cells[i].h = 0;
            allGone = false;
          }
        }
        this.updateCellVisuals();

        if (allGone) {
          this.hasMelted = true;
          this.isMelting = false;
          this.cellMesh.visible = false;
          for (let i = 0; i < this.cells.length; i++) this.cells[i].h = 0;
        }
      }
    }
  }

  updateSnowflakes(delta) {
    const positions = this.snowGeometry.attributes.position.array;
    const time = performance.now() * 0.001;
    const cam = this.scene.children[0]?.position || { x: 0, y: 0, z: 0 };

    for (let i = 0; i < SNOW_PARTICLE_COUNT; i++) {
      const idx = i * 3;
      const drift = Math.sin(time * 0.5 + this.snowDrifts[i]) * SNOW_DRIFT_STRENGTH;

      positions[idx] += drift * delta * 30;
      positions[idx + 1] -= this.snowVelocities[i] * 40 * delta;
      positions[idx + 2] += Math.cos(time * 0.3 + this.snowDrifts[i]) * SNOW_DRIFT_STRENGTH * delta * 20;

      if (positions[idx + 1] <= SIDEWALK_HEIGHT) {
        const wx = positions[idx];
        const wz = positions[idx + 2];

        if (this.isOnSidewalk(wx, wz)) {
          const ci = this.getCellIndex(wx, wz);
          if (ci >= 0 && ci < this.cells.length && this.cells[ci].h < SNOW_MAX_CELL_HEIGHT) {
            this.cells[ci].h += SNOW_MAX_CELL_HEIGHT * 0.004 * (0.4 + Math.random() * 0.6);
            if (this.cells[ci].h > SNOW_MAX_CELL_HEIGHT) {
              this.cells[ci].h = SNOW_MAX_CELL_HEIGHT;
            }
          }
        }

        positions[idx] = cam.x + (Math.random() - 0.5) * 250;
        positions[idx + 1] = 100 + Math.random() * 30;
        positions[idx + 2] = cam.z + (Math.random() - 0.5) * 250;
      }
    }

    this.snowGeometry.attributes.position.needsUpdate = true;
    this.snowflakes.material.opacity = 0.4 + this.stormIntensity * 0.5;
  }

  updateCellVisuals() {
    if (!this.cellMesh) return;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      if (cell.h > 0.001) {
        const s = Math.max(0.01, cell.h / SNOW_MAX_CELL_HEIGHT);
        dummy.position.set(cell.x, SIDEWALK_HEIGHT + (cell.h / 2) * s + 0.01, cell.z);
        dummy.scale.set(1, s, 1);
      } else {
        dummy.position.set(cell.x, -10, cell.z);
        dummy.scale.set(1, 0.01, 1);
      }
      dummy.updateMatrix();
      this.cellMesh.setMatrixAt(i, dummy.matrix);
    }

    this.cellMesh.instanceMatrix.needsUpdate = true;
  }

  forceSnow() {
    if (this.isSnowing) {
      this.stopSnow();
      return;
    }

    if (this.coordinator.isWeatherActive()) {
      if (this.weatherManager && this.weatherManager.isStillVisual()) {
        this.weatherManager.stopRain();
      }
    }

    this.isSnowing = true;
    this.isMelting = false;
    this.hasMelted = false;
    this.stormTimer = 0;
    this.stormDuration = this.getRandomDuration();
    this.targetIntensity = 1.0;
    this.coordinator.forceStartWeather('snow');

    this.snowflakes.visible = true;
    this.cellMesh.visible = true;

    this.nextEventTimer = this.getRandomInterval();
  }

  getIsSnowing() {
    return this.isSnowing || this.isMelting;
  }

  isStillVisual() {
    return this.stormIntensity > 0.01 || this.isMelting;
  }

  getSnowIntensity() {
    return this.stormIntensity;
  }

  getSnowRemaining() {
    if (!this.isSnowing || this.stormDuration === 0) return 0;
    return 1 - (this.stormTimer / this.stormDuration);
  }
}
