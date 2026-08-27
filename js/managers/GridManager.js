import * as THREE from 'three';
import {
  GRID_SIZE, BLOCK_SIZE, ROAD_WIDTH, SIDEWALK_WIDTH, SIDEWALK_HEIGHT,
  MIN_FLOORS, MAX_FLOORS, FLOOR_HEIGHT, BUILDING_COLORS
} from '../utils/constants.js';
import { Building } from '../entities/Building.js';
import { Tree } from '../entities/Tree.js';

export class GridManager {
  constructor(scene) {
    this.scene = scene;
    this.buildings = [];
    this.intersections = [];

    this.step = BLOCK_SIZE + ROAD_WIDTH;
    this.totalSize = GRID_SIZE * this.step;
    this.halfExtent = this.totalSize / 2;
    this.swCenter = BLOCK_SIZE / 2 - SIDEWALK_WIDTH / 2;

    this.createGround();
    this.createRoads();
    this.createSidewalks();
    this.createCrosswalks();
    this.createBuildings();
    this.createTrees();
  }

  createGround() {
    const size = this.totalSize + 80;
    const groundGeo = new THREE.PlaneGeometry(size, size);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x556633, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  createRoads() {
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
    const dashMat = new THREE.MeshStandardMaterial({ color: 0xffff00, roughness: 0.7 });

    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = -this.halfExtent + i * this.step;

      const hRoadGeo = new THREE.PlaneGeometry(this.totalSize + ROAD_WIDTH, ROAD_WIDTH);
      const hRoad = new THREE.Mesh(hRoadGeo, roadMat);
      hRoad.rotation.x = -Math.PI / 2;
      hRoad.position.set(0, 0.01, pos);
      hRoad.receiveShadow = true;
      this.scene.add(hRoad);

      const vRoadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, this.totalSize + ROAD_WIDTH);
      const vRoad = new THREE.Mesh(vRoadGeo, roadMat);
      vRoad.rotation.x = -Math.PI / 2;
      vRoad.position.set(pos, 0.01, 0);
      vRoad.receiveShadow = true;
      this.scene.add(vRoad);

      this.addCenterLineFull(pos, 'horizontal', dashMat);
      this.addCenterLineFull(pos, 'vertical', dashMat);
    }
  }

  addCenterLineFull(pos, orientation, mat) {
    const dashLen = 3;
    const gapLen = 2;
    const total = dashLen + gapLen;
    const count = Math.floor(this.totalSize / total);

    const dashGeo = new THREE.PlaneGeometry(
      orientation === 'horizontal' ? dashLen : 0.15,
      orientation === 'horizontal' ? 0.15 : dashLen
    );

    for (let i = 0; i < count; i++) {
      const offset = -this.totalSize / 2 + i * total + dashLen / 2 + total / 2;
      const dash = new THREE.Mesh(dashGeo, mat);
      dash.rotation.x = -Math.PI / 2;

      if (orientation === 'horizontal') {
        dash.position.set(offset, 0.03, pos);
      } else {
        dash.position.set(pos, 0.03, offset);
      }
      this.scene.add(dash);
    }
  }

  createSidewalks() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8 });
    const segLen = BLOCK_SIZE;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const bx = -this.halfExtent + r * this.step + ROAD_WIDTH / 2 + BLOCK_SIZE / 2;
        const bz = -this.halfExtent + c * this.step + ROAD_WIDTH / 2 + BLOCK_SIZE / 2;

        this.addSidewalkSegment(bx, bz - this.swCenter, segLen, 'horizontal', mat);
        this.addSidewalkSegment(bx, bz + this.swCenter, segLen, 'horizontal', mat);
        this.addSidewalkSegment(bx - this.swCenter, bz, segLen, 'vertical', mat);
        this.addSidewalkSegment(bx + this.swCenter, bz, segLen, 'vertical', mat);
      }
    }
  }

  addSidewalkSegment(cx, cz, length, orientation, mat) {
    const geo = new THREE.BoxGeometry(
      orientation === 'horizontal' ? length : SIDEWALK_WIDTH,
      SIDEWALK_HEIGHT,
      orientation === 'horizontal' ? SIDEWALK_WIDTH : length
    );
    const sw = new THREE.Mesh(geo, mat);
    sw.position.set(cx, SIDEWALK_HEIGHT / 2, cz);
    sw.castShadow = true;
    sw.receiveShadow = true;
    this.scene.add(sw);
  }

  createCrosswalks() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const base = -this.halfExtent;

    for (let r = 1; r < GRID_SIZE; r++) {
      for (let c = 1; c < GRID_SIZE; c++) {
        const ix = base + r * this.step;
        const iz = base + c * this.step;
        this.intersections.push({ x: ix, z: iz });

        this.addContinentalCrosswalk(ix, iz, 'north', (mat ));
        this.addContinentalCrosswalk(ix, iz, 'south', mat);
        this.addContinentalCrosswalk(ix, iz, 'east', mat);
        this.addContinentalCrosswalk(ix, iz, 'west', mat);
      }
    }
  }

  addContinentalCrosswalk(ix, iz, side, mat) {
    const stripeWidth = 0.5;
    const stripeGap = 0.5;
    const stripeCount = 6;
    const stripeLength = ROAD_WIDTH;
    const roadHalf = ROAD_WIDTH / 2;
    const crossOffset = roadHalf + 3 + ROAD_WIDTH * 0.05;

    const isNS = side === 'north' || side === 'south';
    const geo = isNS
      ? new THREE.PlaneGeometry(stripeLength, stripeWidth)
      : new THREE.PlaneGeometry(stripeWidth, stripeLength);

    for (let i = 0; i < stripeCount; i++) {
      const dist = (i - (stripeCount - 1) / 2) * (stripeWidth + stripeGap);
      const stripe = new THREE.Mesh(geo, mat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.receiveShadow = true;

      switch (side) {
        case 'north':
          stripe.position.set(ix, 0.03, iz - crossOffset - dist);
          break;
        case 'south':
          stripe.position.set(ix, 0.03, iz + crossOffset + dist);
          break;
        case 'east':
          stripe.position.set(ix + crossOffset + dist, 0.03, iz);
          break;
        case 'west':
          stripe.position.set(ix - crossOffset - dist, 0.03, iz);
          break;
      }

      this.scene.add(stripe);
    }
  }

  createBuildings() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const bx = -this.halfExtent + r * this.step + ROAD_WIDTH / 2 + BLOCK_SIZE / 2;
        const bz = -this.halfExtent + c * this.step + ROAD_WIDTH / 2 + BLOCK_SIZE / 2;
        this.addBuildingBlock(bx, bz, BLOCK_SIZE);
      }
    }
  }

  addBuildingBlock(cx, cz, size) {
    const sidewalkTotal = ROAD_WIDTH / 2 + SIDEWALK_WIDTH;
    const padding = sidewalkTotal + 2;
    const usable = size - padding * 2;
    const numBuildings = Math.floor(Math.random() * 2) + 1;

    if (numBuildings === 1) {
      this.addSingleBuilding(cx, cz, usable * 0.85, usable * 0.85);
    } else if (numBuildings === 2 && Math.random() < 0.2) {
      this.addThreeBuildings(cx, cz, usable);
    } else {
      const halfUsable = usable / 2 - 1;
      this.addSingleBuilding(cx - halfUsable / 2, cz - halfUsable / 2, halfUsable, halfUsable);
      this.addSingleBuilding(cx + halfUsable / 2, cz + halfUsable / 2, halfUsable, halfUsable);
    }
  }

  addThreeBuildings(cx, cz, usable) {
    const gap = 1.5;
    const qw = (usable - gap) / 2;
    const qd = (usable - gap) / 2;

    const positions = [
      { x: cx - qw / 2 - gap / 2, z: cz - qd / 2 - gap / 2 },
      { x: cx + qw / 2 + gap / 2, z: cz - qd / 2 - gap / 2 },
      { x: cx, z: cz + qd / 2 + gap / 2 }
    ];

    for (const pos of positions) {
      const scale = 0.75 + Math.random() * 0.15;
      this.addSingleBuilding(pos.x, pos.z, qw * scale, qd * scale);
    }
  }

  addSingleBuilding(cx, cz, w, d) {
    const floors = Math.floor(Math.random() * (MAX_FLOORS - MIN_FLOORS + 1)) + MIN_FLOORS;
    const height = floors * FLOOR_HEIGHT;
    const color = BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)];

    const building = new Building(this.scene, cx, cz, w, d, height, floors, color);
    this.buildings.push(building);
  }

  createTrees() {
    const treeOffsets = [
      { dx: 1, dz: 1 },
      { dx: -1, dz: 1 },
      { dx: 1, dz: -1 },
      { dx: -1, dz: -1 },
      { dx: 0, dz: 1.4 },
      { dx: 0, dz: -1.4 },
      { dx: 1.4, dz: 0 },
      { dx: -1.4, dz: 0 }
    ];

    for (const b of this.buildings) {
      const count = Math.floor(Math.random() * 3) + 2;
      const shuffled = treeOffsets.sort(() => Math.random() - 0.5);

      let placed = 0;
      for (const off of shuffled) {
        if (placed >= count) break;
        const tx = b.x + off.dx * (b.width / 2 + 1.5);
        const tz = b.z + off.dz * (b.depth / 2 + 1.5);
        if (this.isTreeValid(tx, tz, 2)) {
          new Tree(this.scene, tx, tz);
          placed++;
        }
      }
    }
  }

  isTreeValid(x, z, minDist) {
    for (const b of this.buildings) {
      const dx = Math.abs(x - b.x);
      const dz = Math.abs(z - b.z);
      const overlapX = b.width / 2 + minDist;
      const overlapZ = b.depth / 2 + minDist;
      if (dx < overlapX && dz < overlapZ) {
        return false;
      }
    }
    return true;
  }

  updateWindows(dayFactor, deltaTime) {
    for (const building of this.buildings) {
      building.updateWindows(dayFactor, deltaTime);
    }
  }
}
