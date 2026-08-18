import * as THREE from 'three';
import { DAY_CYCLE_SPEED } from '../utils/constants.js';

export class DayNightCycle {
  constructor(sceneSetup) {
    this.scene = sceneSetup.scene;
    this.sunLight = sceneSetup.sunLight;
    this.ambientLight = sceneSetup.ambientLight;
    this.hemiLight = sceneSetup.hemiLight;
    this.fog = sceneSetup.fog;
    this.renderer = sceneSetup.renderer;

    this.time = 0.25;
    this.sunMesh = null;
    this.moonMesh = null;

    this.createSkyDome();
    this.createSun();
    this.createMoon();
    this.createStars();
  }

  createSkyDome() {
    const skyGeo = new THREE.SphereGeometry(200, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0x88bbff) },
        offset: { value: 10 },
        exponent: { value: 0.4 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);
  }

  createSun() {
    const sunGeo = new THREE.SphereGeometry(5, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);
  }

  createMoon() {
    const moonGeo = new THREE.SphereGeometry(3, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xddddff });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moonMesh);
  }

  createStars() {
    const starsGeo = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 0; i < 500; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 180;
      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    }
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
    this.starsMesh = new THREE.Points(starsGeo, starsMat);
    this.scene.add(this.starsMesh);
  }

  update(deltaTime) {
    this.time += DAY_CYCLE_SPEED * deltaTime;
    if (this.time > 1) this.time -= 1;

    const angle = this.time * Math.PI * 2 - Math.PI / 2;
    const radius = 120;
    const sunY = Math.sin(angle) * radius;
    const sunX = Math.cos(angle) * radius;

    this.sunMesh.position.set(sunX, sunY, 0);
    this.sunLight.position.set(sunX, sunY, 30);

    this.moonMesh.position.set(-sunX, -sunY, -30);

    const dayFactor = Math.max(0, Math.sin(this.time * Math.PI * 2 - Math.PI / 2));
    const nightFactor = 1 - dayFactor;

    const dayTopColor = new THREE.Color(0x0066cc);
    const dayBottomColor = new THREE.Color(0x88bbff);
    const sunsetTopColor = new THREE.Color(0xff6633);
    const sunsetBottomColor = new THREE.Color(0xff9944);
    const nightTopColor = new THREE.Color(0x000022);
    const nightBottomColor = new THREE.Color(0x000044);

    let topColor, bottomColor;

    if (dayFactor > 0.3) {
      topColor = dayTopColor;
      bottomColor = dayBottomColor;
    } else if (dayFactor > 0) {
      const t = dayFactor / 0.3;
      topColor = new THREE.Color().lerpColors(sunsetTopColor, dayTopColor, t);
      bottomColor = new THREE.Color().lerpColors(sunsetBottomColor, dayBottomColor, t);
    } else {
      const t = Math.max(0, (dayFactor + 0.3) / 0.3);
      topColor = new THREE.Color().lerpColors(nightTopColor, sunsetTopColor, t);
      bottomColor = new THREE.Color().lerpColors(nightBottomColor, sunsetBottomColor, t);
    }

    this.skyMesh.material.uniforms.topColor.value.copy(topColor);
    this.skyMesh.material.uniforms.bottomColor.value.copy(bottomColor);

    this.sunLight.intensity = Math.max(0.05, dayFactor * 1.4);
    this.ambientLight.intensity = 0.15 + dayFactor * 0.35;

    const daySunColor = new THREE.Color(0xfff4e0);
    const sunsetColor = new THREE.Color(0xff8844);
    if (dayFactor > 0.2) {
      this.sunLight.color.copy(daySunColor);
    } else {
      const t = Math.max(0, dayFactor / 0.2);
      this.sunLight.color.lerpColors(sunsetColor, daySunColor, t);
    }

    this.fog.color.copy(bottomColor);
    this.scene.background = bottomColor;

    this.starsMesh.visible = nightFactor > 0.3;
    this.starsMesh.material.opacity = Math.max(0, (nightFactor - 0.3) / 0.7);

    this.sunMesh.visible = dayFactor > 0;
    this.moonMesh.visible = nightFactor > 0.3;
  }

  getHourString() {
    const hours = Math.floor(this.time * 24);
    const minutes = Math.floor((this.time * 24 - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  getDayFactor() {
    return Math.max(0, Math.sin(this.time * Math.PI * 2 - Math.PI / 2));
  }
}
