import * as THREE from 'three';
import {
  PLANE_LENGTH, PLANE_WINGSPAN, PLANE_BODY_RADIUS, PLANE_COLORS,
  GRID_SIZE, BLOCK_SIZE, ROAD_WIDTH
} from '../utils/constants.js';

export class Plane {
  constructor(scene, startX, startZ, startY, angle, speed) {
    this.scene = scene;
    this.speed = speed;
    this.angle = angle;
    this.alive = true;
    this.fading = false;
    this.fadeAlpha = 1;

    this.step = BLOCK_SIZE + ROAD_WIDTH;
    this.cityHalf = (GRID_SIZE * this.step) / 2 + 40;

    this.group = new THREE.Group();
    this.createBody();
    this.createWings();
    this.createTail();
    this.createPropeller();

    this.group.position.set(startX, startY, startZ);
    this.group.rotation.y = this.angle;
    scene.add(this.group);

    this.velocityX = Math.sin(this.angle) * speed;
    this.velocityZ = Math.cos(this.angle) * speed;
  }

  createBody() {
    const color = PLANE_COLORS[Math.floor(Math.random() * PLANE_COLORS.length)];

    const bodyGeo = new THREE.CylinderGeometry(
      PLANE_BODY_RADIUS, PLANE_BODY_RADIUS * 0.8, PLANE_LENGTH, 8
    );
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color, roughness: 0.3, metalness: 0.4
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    this.group.add(body);

    const noseGeo = new THREE.ConeGeometry(PLANE_BODY_RADIUS * 0.7, 1.5, 8);
    noseGeo.rotateX(-Math.PI / 2);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0x333333, roughness: 0.4, metalness: 0.6
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.z = PLANE_LENGTH / 2 + 0.5;
    this.group.add(nose);

    const cockpitGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff, transparent: true, opacity: 0.6,
      roughness: 0.1, metalness: 0.8
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, PLANE_BODY_RADIUS * 0.5, PLANE_LENGTH * 0.2);
    cockpit.scale.set(1, 0.8, 1.5);
    this.group.add(cockpit);
  }

  createWings() {
    const wingGeo = new THREE.BoxGeometry(PLANE_WINGSPAN, 0.12, 1.8);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd, roughness: 0.4, metalness: 0.3
    });
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.y = PLANE_BODY_RADIUS * 0.2;
    wing.castShadow = true;
    this.group.add(wing);

    const tipGeo = new THREE.BoxGeometry(0.6, 0.08, 1.0);
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5 });
    for (const side of [-1, 1]) {
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.set(side * (PLANE_WINGSPAN / 2 + 0.1), PLANE_BODY_RADIUS * 0.2, 0);
      this.group.add(tip);
    }
  }

  createTail() {
    const tailFinGeo = new THREE.BoxGeometry(0.08, 1.6, 1.2);
    const tailFinMat = new THREE.MeshStandardMaterial({
      color: 0xcc2222, roughness: 0.5
    });
    const tailFin = new THREE.Mesh(tailFinGeo, tailFinMat);
    tailFin.position.set(0, PLANE_BODY_RADIUS + 0.6, -PLANE_LENGTH / 2 + 0.3);
    this.group.add(tailFin);

    const hStabGeo = new THREE.BoxGeometry(2.4, 0.08, 0.8);
    const hStabMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd, roughness: 0.4
    });
    const hStab = new THREE.Mesh(hStabGeo, hStabMat);
    hStab.position.set(0, PLANE_BODY_RADIUS * 0.3, -PLANE_LENGTH / 2 + 0.2);
    this.group.add(hStab);
  }

  createPropeller() {
    const hubGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.2, 8);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.x = Math.PI / 2;
    hub.position.z = PLANE_LENGTH / 2 + 1.2;
    this.group.add(hub);

    this.propeller = new THREE.Group();
    const bladeGeo = new THREE.BoxGeometry(0.15, 1.8, 0.06);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
    const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
    const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
    blade2.rotation.z = Math.PI / 2;
    this.propeller.add(blade1);
    this.propeller.add(blade2);
    this.propeller.position.z = PLANE_LENGTH / 2 + 1.3;
    this.group.add(this.propeller);
  }

  update(deltaTime) {
    if (!this.alive) return;

    if (this.fading) {
      this.fadeAlpha -= deltaTime * 0.6;
      this.group.traverse((child) => {
        if (child.material) {
          child.material.transparent = true;
          child.material.opacity = Math.max(0, this.fadeAlpha);
        }
      });
      if (this.fadeAlpha <= 0) {
        this.alive = false;
      }
      return;
    }

    this.propeller.rotation.z += deltaTime * 40;

    this.group.position.x += this.velocityX * deltaTime;
    this.group.position.z += this.velocityZ * deltaTime;

    this.group.position.y += Math.sin(Date.now() * 0.001) * 0.003;

    const margin = 10;
    if (
      this.group.position.x < -this.cityHalf - margin ||
      this.group.position.x > this.cityHalf + margin ||
      this.group.position.z < -this.cityHalf - margin ||
      this.group.position.z > this.cityHalf + margin
    ) {
      this.fading = true;
    }
  }

  destroy() {
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
