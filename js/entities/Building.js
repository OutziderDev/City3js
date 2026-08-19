import * as THREE from 'three';
import { FLOOR_HEIGHT } from '../utils/constants.js';

export class Building {
  constructor(scene, x, z, width, depth, height, floors, color) {
    this.scene = scene;
    this.x = x;
    this.z = z;
    this.width = width;
    this.depth = depth;
    this.height = height;
    this.floors = floors;
    this.color = color;

    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);

    this.createStructure();
    this.createWindows();
    this.createRoof();
    this.createBase();

    scene.add(this.group);
  }

  createStructure() {
    const geo = new THREE.BoxGeometry(this.width, this.height, this.depth);
    const mat = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.7,
      metalness: 0.1
    });
    this.structure = new THREE.Mesh(geo, mat);
    this.structure.position.y = this.height / 2;
    this.structure.castShadow = true;
    this.structure.receiveShadow = true;
    this.group.add(this.structure);
  }

  createWindows() {
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffaa,
      emissiveIntensity: 0.3,
      roughness: 0.2,
      metalness: 0.5
    });

    const windowDarkMat = new THREE.MeshStandardMaterial({
      color: 0x334455,
      roughness: 0.3,
      metalness: 0.4
    });

    const wWidth = 0.8;
    const wHeight = 1.4;
    const wGeo = new THREE.PlaneGeometry(wWidth, wHeight);

    const sides = [
      { axis: 'x', sign: 1, normal: [1, 0, 0], up: [0, 1, 0] },
      { axis: 'x', sign: -1, normal: [-1, 0, 0], up: [0, 1, 0] },
      { axis: 'z', sign: 1, normal: [0, 0, 1], up: [0, 1, 0] },
      { axis: 'z', sign: -1, normal: [0, 0, -1], up: [0, 1, 0] }
    ];

    for (let floor = 0; floor < this.floors; floor++) {
      const y = floor * FLOOR_HEIGHT + FLOOR_HEIGHT * 0.5 + 1;

      for (const side of sides) {
        const count = side.axis === 'x'
          ? Math.floor(this.depth / 2.2)
          : Math.floor(this.width / 2.2);

        const sideLen = side.axis === 'x' ? this.depth : this.width;

        for (let i = 0; i < count; i++) {
          const t = (i / count) - 0.5 + 0.5 / count;
          const offset = t * (sideLen - 1.5);

          const win = new THREE.Mesh(wGeo, Math.random() > 0.3 ? windowMat : windowDarkMat);

          if (side.axis === 'x') {
            win.position.set(
              side.sign * (this.width / 2 + 0.02),
              y,
              offset
            );
            win.rotation.y = side.sign * Math.PI / 2;
          } else {
            win.position.set(
              offset,
              y,
              side.sign * (this.depth / 2 + 0.02)
            );
            win.rotation.y = side.axis === 'z' && side.sign < 0 ? Math.PI : 0;
          }

          this.group.add(win);
        }
      }
    }
  }

  createRoof() {
    const roofGeo = new THREE.BoxGeometry(this.width + 0.4, 0.3, this.depth + 0.4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.color).multiplyScalar(0.7),
      roughness: 0.6
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = this.height + 0.15;
    roof.castShadow = true;
    this.group.add(roof);
  }

  createBase() {
    const baseGeo = new THREE.BoxGeometry(this.width + 0.6, 0.4, this.depth + 0.6);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.8
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.2;
    base.receiveShadow = true;
    this.group.add(base);
  }
}
