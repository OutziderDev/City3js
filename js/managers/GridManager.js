import * as THREE from 'three';
import {
  GRID_SIZE, BLOCK_SIZE, ROAD_WIDTH, SIDEWALK_WIDTH, SIDEWALK_HEIGHT,
  MIN_FLOORS, MAX_FLOORS, FLOOR_HEIGHT, BUILDING_COLORS
} from '../utils/constants.js';
import { Building } from '../entities/Building.js';

export class GridManager {
  constructor(scene) {
    this.scene = scene;
    this.buildings = [];
    this.intersections = [];

    this.step = BLOCK_SIZE + ROAD_WIDTH;
    this.totalSize = GRID_SIZE * this.step;
    this.halfExtent = this.totalSize / 2;

    this.createGround();
    this.createRoads();
    this.createIntersections();
    this.createBuildings();
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
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8 });
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

      this.addSidewalksFull(pos, 'horizontal', sidewalkMat);
      this.addSidewalksFull(pos, 'vertical', sidewalkMat);
      this.addCenterLineFull(pos, 'horizontal', dashMat);
      this.addCenterLineFull(pos, 'vertical', dashMat);
    }
  }

  addSidewalksFull(pos, orientation, mat) {
    const swLen = this.totalSize + ROAD_WIDTH + SIDEWALK_WIDTH * 2;
    const swGeo = new THREE.BoxGeometry(
      orientation === 'horizontal' ? swLen : SIDEWALK_WIDTH,
      SIDEWALK_HEIGHT,
      orientation === 'horizontal' ? SIDEWALK_WIDTH : swLen
    );

    for (const side of [-1, 1]) {
      const sw = new THREE.Mesh(swGeo, mat);
      if (orientation === 'horizontal') {
        sw.position.set(0, SIDEWALK_HEIGHT / 2, pos + side * (ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2));
      } else {
        sw.position.set(pos + side * (ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2), SIDEWALK_HEIGHT / 2, 0);
      }
      sw.castShadow = true;
      sw.receiveShadow = true;
      this.scene.add(sw);
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

  createIntersections() {
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });

    for (let r = 0; r <= GRID_SIZE; r++) {
      for (let c = 0; c <= GRID_SIZE; c++) {
        const ix = -this.halfExtent + r * this.step;
        const iz = -this.halfExtent + c * this.step;
        this.intersections.push({ x: ix, z: iz });

        this.addCrosswalk(ix, iz, 'horizontal', crossMat);
        this.addCrosswalk(ix, iz, 'vertical', crossMat);
      }
    }
  }

  addCrosswalk(ix, iz, orientation, mat) {
    const stripes = 5;
    const stripeGap = 1.2;
    const crossLength = ROAD_WIDTH;

    const stripeGeo = new THREE.PlaneGeometry(1.5, crossLength);

    for (let i = 0; i < stripes; i++) {
      const stripe = new THREE.Mesh(stripeGeo, mat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.y = 0.02;

      if (orientation === 'horizontal') {
        stripe.rotation.z = Math.PI / 2;
        stripe.position.x = ix + (i - stripes / 2 + 0.5) * stripeGap;
        stripe.position.z = iz;
      } else {
        stripe.position.x = ix;
        stripe.position.z = iz + (i - stripes / 2 + 0.5) * stripeGap;
      }

      stripe.receiveShadow = true;
      this.scene.add(stripe);
    }
  }

  createBuildings() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const bx = -this.halfExtent + r * this.step + ROAD_WIDTH + BLOCK_SIZE / 2;
        const bz = -this.halfExtent + c * this.step + ROAD_WIDTH + BLOCK_SIZE / 2;
        this.addBuildingBlock(bx, bz, BLOCK_SIZE);
      }
    }
  }

  addBuildingBlock(cx, cz, size) {
    const padding = SIDEWALK_WIDTH + 2;
    const usable = size - padding * 2;
    const numBuildings = Math.floor(Math.random() * 2) + 1;

    if (numBuildings === 1) {
      this.addSingleBuilding(cx, cz, usable * 0.85, usable * 0.85);
    } else {
      const halfUsable = usable / 2 - 1;
      this.addSingleBuilding(cx - halfUsable / 2, cz - halfUsable / 2, halfUsable, halfUsable);
      this.addSingleBuilding(cx + halfUsable / 2, cz + halfUsable / 2, halfUsable, halfUsable);
    }
  }

  addSingleBuilding(cx, cz, w, d) {
    const floors = Math.floor(Math.random() * (MAX_FLOORS - MIN_FLOORS + 1)) + MIN_FLOORS;
    const height = floors * FLOOR_HEIGHT;
    const color = BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)];

    const building = new Building(this.scene, cx, cz, w, d, height, floors, color);
    this.buildings.push(building);
  }
}
