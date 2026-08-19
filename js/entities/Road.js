import * as THREE from 'three';
import { ROAD_WIDTH, SIDEWALK_WIDTH, SIDEWALK_HEIGHT } from '../utils/constants.js';

export class Road {
  constructor(scene, x, z, orientation, length) {
    this.scene = scene;

    const roadGeo = new THREE.PlaneGeometry(
      orientation === 'horizontal' ? length : ROAD_WIDTH,
      orientation === 'horizontal' ? ROAD_WIDTH : length
    );
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.01, z);
    road.receiveShadow = true;
    scene.add(road);

    this.addCenterLine(x, z, orientation, length);
    this.addSidewalks(x, z, orientation, length);
  }

  addCenterLine(x, z, orientation, length) {
    const dashLength = 3;
    const gapLength = 2;
    const totalDash = dashLength + gapLength;
    const numDashes = Math.floor(length / totalDash);

    const dashGeo = new THREE.PlaneGeometry(
      orientation === 'horizontal' ? dashLength : 0.15,
      orientation === 'horizontal' ? 0.15 : dashLength
    );
    const dashMat = new THREE.MeshStandardMaterial({ color: 0xffff00, roughness: 0.7 });

    for (let i = 0; i < numDashes; i++) {
      const dash = new THREE.Mesh(dashGeo, dashMat);
      const pos = -length / 2 + i * totalDash + dashLength / 2 + totalDash / 2;

      if (orientation === 'horizontal') {
        dash.position.set(x + pos, 0.03, z);
      } else {
        dash.position.set(x, 0.03, z + pos);
      }
      dash.rotation.x = -Math.PI / 2;
      this.scene.add(dash);
    }
  }

  addSidewalks(x, z, orientation, length) {
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8 });

    const sides = orientation === 'horizontal' ? [-1, 1] : [-1, 1];

    for (const side of sides) {
      const swGeo = new THREE.BoxGeometry(
        orientation === 'horizontal' ? length + SIDEWALK_WIDTH : SIDEWALK_WIDTH,
        SIDEWALK_HEIGHT,
        orientation === 'horizontal' ? SIDEWALK_WIDTH : length + SIDEWALK_WIDTH
      );
      const sidewalk = new THREE.Mesh(swGeo, sidewalkMat);

      if (orientation === 'horizontal') {
        sidewalk.position.set(x, SIDEWALK_HEIGHT / 2, z + side * (ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2));
      } else {
        sidewalk.position.set(x + side * (ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2), SIDEWALK_HEIGHT / 2, z);
      }

      sidewalk.castShadow = true;
      sidewalk.receiveShadow = true;
      this.scene.add(sidewalk);
    }
  }
}
