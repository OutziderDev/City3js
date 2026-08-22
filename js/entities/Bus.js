import * as THREE from 'three';
import {
  BUS_LENGTH, BUS_WIDTH, BUS_HEIGHT, BUS_SPEED, BUS_LIFETIME_MIN, BUS_LIFETIME_MAX,
  ROAD_WIDTH, DIR_POS_X, DIR_NEG_X, DIR_POS_Z, DIR_NEG_Z
} from '../utils/constants.js';

export class Bus {
  constructor(scene, startX, startZ, direction, color) {
    this.scene = scene;
    this.direction = direction;
    this.speed = BUS_SPEED;
    this.color = color;
    this.age = 0;
    this.lifetime = BUS_LIFETIME_MIN + Math.random() * (BUS_LIFETIME_MAX - BUS_LIFETIME_MIN);
    this.alive = true;

    this.group = new THREE.Group();
    this.createBody();
    this.createWindows();
    this.createWheels();
    this.createFloatingLabel();

    this.group.rotation.y = this.getAngle();
    this.group.position.set(startX, 0.1, startZ);
    scene.add(this.group);
  }

  createBody() {
    const bodyGeo = new THREE.BoxGeometry(BUS_WIDTH, BUS_HEIGHT * 0.65, BUS_LENGTH);
    const bodyMat = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.5, metalness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = BUS_HEIGHT * 0.45;
    body.castShadow = true;
    this.group.add(body);

    const roofGeo = new THREE.BoxGeometry(BUS_WIDTH * 0.95, 0.15, BUS_LENGTH * 0.98);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.6 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = BUS_HEIGHT * 0.78;
    this.group.add(roof);

    const headlightGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffaa, emissiveIntensity: 0.7
    });
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(headlightGeo, headlightMat);
      hl.position.set(side * BUS_WIDTH * 0.38, BUS_HEIGHT * 0.3, BUS_LENGTH / 2 + 0.05);
      this.group.add(hl);
    }

    const tailGeo = new THREE.SphereGeometry(0.14, 8, 8);
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5
    });
    for (const side of [-1, 1]) {
      const tl = new THREE.Mesh(tailGeo, tailMat);
      tl.position.set(side * BUS_WIDTH * 0.38, BUS_HEIGHT * 0.3, -BUS_LENGTH / 2 - 0.05);
      this.group.add(tl);
    }

    const stripeGeo = new THREE.BoxGeometry(BUS_WIDTH + 0.02, 0.25, BUS_LENGTH + 0.02);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = BUS_HEIGHT * 0.45;
    this.group.add(stripe);
  }

  createWindows() {
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xaaddff, transparent: true, opacity: 0.5, roughness: 0.1, metalness: 0.6
    });

    const wWidth = 1.2;
    const wHeight = 0.9;
    const wGeo = new THREE.PlaneGeometry(wWidth, wHeight);

    const windowCount = 6;
    const windowSpacing = (BUS_LENGTH - 2) / windowCount;

    for (const side of [-1, 1]) {
      for (let i = 0; i < windowCount; i++) {
        const z = -BUS_LENGTH / 2 + 1.2 + i * windowSpacing;

        const win = new THREE.Mesh(wGeo, windowMat);
        if (side === 1) {
          win.position.set(BUS_WIDTH / 2 + 0.02, BUS_HEIGHT * 0.6, z);
          win.rotation.y = Math.PI / 2;
        } else {
          win.position.set(-BUS_WIDTH / 2 - 0.02, BUS_HEIGHT * 0.6, z);
          win.rotation.y = -Math.PI / 2;
        }
        this.group.add(win);
      }
    }
  }

  createWheels() {
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });

    const positions = [
      [-BUS_WIDTH / 2 - 0.1, 0.35, BUS_LENGTH * 0.3],
      [BUS_WIDTH / 2 + 0.1, 0.35, BUS_LENGTH * 0.3],
      [-BUS_WIDTH / 2 - 0.1, 0.35, -BUS_LENGTH * 0.3],
      [BUS_WIDTH / 2 + 0.1, 0.35, -BUS_LENGTH * 0.3]
    ];

    for (const pos of positions) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(...pos);
      this.group.add(wheel);
    }
  }

  createFloatingLabel() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 88, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Bus', 128, 48);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(4, 1.5, 1);
    sprite.position.y = BUS_HEIGHT + 1.8;
    this.group.add(sprite);
  }

  getAngle() {
    switch (this.direction) {
      case DIR_POS_X: return -Math.PI / 2;
      case DIR_NEG_X: return Math.PI / 2;
      case DIR_POS_Z: return 0;
      case DIR_NEG_Z: return Math.PI;
    }
  }

  update(deltaTime, trafficLights, cityBounds) {
    this.age += deltaTime;
    if (this.age >= this.lifetime) {
      this.alive = false;
      return;
    }

    const shouldStop = this.checkTrafficLights(trafficLights);
    if (shouldStop) return;

    const dist = this.speed * deltaTime;

    switch (this.direction) {
      case DIR_POS_X: this.group.position.x += dist; break;
      case DIR_NEG_X: this.group.position.x -= dist; break;
      case DIR_POS_Z: this.group.position.z += dist; break;
      case DIR_NEG_Z: this.group.position.z -= dist; break;
    }

    this.wrapAround(cityBounds);
  }

  checkTrafficLights(trafficLights) {
    const myX = this.group.position.x;
    const myZ = this.group.position.z;

    for (const tl of trafficLights) {
      if (!tl.shouldStop(this.direction)) continue;
      if (!tl.isBeforeIntersection(myX, myZ, this.direction)) continue;

      const dist = tl.getDistanceTo(myX, myZ);
      if (dist < ROAD_WIDTH / 2 + 6) {
        return true;
      }
    }
    return false;
  }

  wrapAround(bounds) {
    const margin = 8;
    const x = this.group.position.x;
    const z = this.group.position.z;

    if (x > bounds.maxX + margin) this.group.position.x = bounds.minX - margin;
    if (x < bounds.minX - margin) this.group.position.x = bounds.maxX + margin;
    if (z > bounds.maxZ + margin) this.group.position.z = bounds.minZ - margin;
    if (z < bounds.minZ - margin) this.group.position.z = bounds.maxZ + margin;
  }

  destroy() {
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
