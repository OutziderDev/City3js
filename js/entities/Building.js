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
    this.windowData = [];

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
    const wWidth = 0.8;
    const wHeight = 1.4;
    const wGeo = new THREE.PlaneGeometry(wWidth, wHeight);

    const sides = [
      { axis: 'x', sign: 1 },
      { axis: 'x', sign: -1 },
      { axis: 'z', sign: 1 },
      { axis: 'z', sign: -1 }
    ];

    const positions = [];
    const rotations = [];

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

          const pos = new THREE.Vector3();
          const rot = new THREE.Euler();

          if (side.axis === 'x') {
            pos.set(side.sign * (this.width / 2 + 0.02), y, offset);
            rot.y = side.sign * Math.PI / 2;
          } else {
            pos.set(offset, y, side.sign * (this.depth / 2 + 0.02));
            rot.y = side.axis === 'z' && side.sign < 0 ? Math.PI : 0;
          }

          positions.push(pos);
          rotations.push(rot);

          this.windowData.push({
            isOn: Math.random() > 0.5,
            nextChange: Math.random() * 15 + 5,
            matrix: new THREE.Matrix4()
          });
        }
      }
    }

    this.windowCount = positions.length;

    this.matOn = new THREE.MeshStandardMaterial({
      color: 0xffeebb,
      emissive: 0xffcc66,
      emissiveIntensity: 1.0,
      roughness: 0.3,
      metalness: 0.2
    });

    this.matOff = new THREE.MeshStandardMaterial({
      color: 0x1a2233,
      roughness: 0.5,
      metalness: 0.3
    });

    this.meshOn = new THREE.InstancedMesh(wGeo, this.matOn, this.windowCount);
    this.meshOff = new THREE.InstancedMesh(wGeo, this.matOff, this.windowCount);
    this.meshOn.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.meshOff.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.windowCount; i++) {
      dummy.position.copy(positions[i]);
      dummy.rotation.copy(rotations[i]);
      dummy.updateMatrix();
      this.windowData[i].matrix.copy(dummy.matrix);
    }

    this.meshOn.count = 0;
    this.meshOff.count = 0;

    this.group.add(this.meshOn);
    this.group.add(this.meshOff);
  }

  updateWindows(dayFactor, deltaTime) {
    const nightFactor = 1 - dayFactor;
    const targetOnRatio = 0.25 + nightFactor * 0.5;

    let onCount = 0;
    for (const w of this.windowData) {
      if (w.isOn) onCount++;
    }

    const targetOn = Math.round(targetOnRatio * this.windowCount);

    for (let i = 0; i < this.windowCount; i++) {
      const win = this.windowData[i];
      win.nextChange -= deltaTime;

      if (win.nextChange > 0) continue;

      win.nextChange = Math.random() * 8 + 3;

      if (onCount < targetOn && !win.isOn) {
        if (Math.random() < 0.6) {
          win.isOn = true;
          onCount++;
        }
      } else if (onCount > targetOn && win.isOn) {
        if (Math.random() < 0.6) {
          win.isOn = false;
          onCount--;
        }
      } else {
        if (Math.random() < 0.05) {
          win.isOn = !win.isOn;
          onCount += win.isOn ? 1 : -1;
        }
      }
    }

    this.rebuildWindowInstances();
  }

  rebuildWindowInstances() {
    let onIdx = 0;
    let offIdx = 0;

    for (let i = 0; i < this.windowCount; i++) {
      const win = this.windowData[i];
      if (win.isOn) {
        this.meshOn.setMatrixAt(onIdx, win.matrix);
        onIdx++;
      } else {
        this.meshOff.setMatrixAt(offIdx, win.matrix);
        offIdx++;
      }
    }

    this.meshOn.count = onIdx;
    this.meshOff.count = offIdx;
    this.meshOn.instanceMatrix.needsUpdate = true;
    this.meshOff.instanceMatrix.needsUpdate = true;
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
