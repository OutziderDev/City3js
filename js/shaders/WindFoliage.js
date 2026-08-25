import * as THREE from 'three';

export const windTime = { value: 0 };

export const foliageVertexShader = `
  uniform float uTime;
  uniform float uWindStrength;

  varying vec2 vUv;
  varying float vWindFactor;

  void main() {
    vUv = uv;

    vec3 pos = position;

    float heightFactor = max(0.0, pos.y) * 0.5;
    float windX = sin(uTime * 1.8 + pos.x * 2.0 + pos.z * 1.5) * uWindStrength;
    float windZ = cos(uTime * 1.3 + pos.z * 2.5 + pos.x * 1.0) * uWindStrength * 0.6;
    float windY = sin(uTime * 2.5 + pos.x * 3.0) * uWindStrength * 0.15;

    pos.x += windX * heightFactor;
    pos.z += windZ * heightFactor;
    pos.y += windY * heightFactor;

    vWindFactor = heightFactor;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const foliageFragmentShader = `
  uniform vec3 uColor;
  uniform float uTime;

  varying vec2 vUv;
  varying float vWindFactor;

  void main() {
    vec2 uv = vUv;

    float dist = length(uv - vec2(0.5));
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

    vec3 darkGreen = uColor * 0.6;
    vec3 lightGreen = uColor * 1.2;

    float pattern = sin(uv.x * 12.0 + uTime * 0.3) * cos(uv.y * 10.0 - uTime * 0.2);
    vec3 color = mix(darkGreen, lightGreen, pattern * 0.5 + 0.5);

    float edge = 1.0 - smoothstep(0.2, 0.35, dist);
    color = mix(color * 0.7, color, edge);

    if (alpha < 0.1) discard;

    gl_FragColor = vec4(color, alpha);
  }
`;

let cachedLeafTexture = null;

export function getLeafTexture() {
  if (cachedLeafTexture) return cachedLeafTexture;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const rx = size * 0.42;
  const ry = size * 0.48;

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#228b22';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.quadraticCurveTo(cx + rx * 0.1, cy - ry * 0.3, cx, cy + ry * 0.8);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  for (let i = 0; i < 5; i++) {
    const t = 0.2 + i * 0.15;
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry + t * ry * 2);
    ctx.quadraticCurveTo(cx + rx * 0.5, cy - ry * 0.1 + i * 4, cx + rx * 0.7, cy + ry * 0.3 + i * 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.alphaTest = 0.1;
  return (cachedLeafTexture = texture);
}

export function createFoliageMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: windTime,
      uWindStrength: { value: 0.12 + Math.random() * 0.08 },
      uColor: { value: new THREE.Color(color) }
    },
    vertexShader: foliageVertexShader,
    fragmentShader: foliageFragmentShader,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false
  });
}
