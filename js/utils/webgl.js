export function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    const attempts = [
      ['webgl2', { failIfMajorPerformanceCaveat: false }],
      ['webgl2', {}],
      ['webgl', { failIfMajorPerformanceCaveat: false }],
      ['webgl', {}],
      ['experimental-webgl', {}],
    ];

    for (const [id, attrs] of attempts) {
      try {
        const gl = canvas.getContext(id, attrs);
        if (gl) return true;
      } catch {
        // siguiente intento
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function showWebGLError(message) {
  let overlay = document.getElementById('webgl-error');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'webgl-error';
    overlay.innerHTML = `
      <div class="webgl-error-card">
        <h1>WebGL no disponible</h1>
        <p id="webgl-error-message"></p>
        <p class="webgl-error-note">
          La ciudad 3D necesita WebGL. Esto es una configuración del navegador/entorno,
          no un error del código de la escena.
        </p>
        <ol>
          <li>Abre <code>chrome://gpu</code> y comprueba que <strong>WebGL</strong> diga <em>Hardware accelerated</em>.</li>
          <li>Activa <strong>Aceleración por hardware</strong>: <code>chrome://settings/system</code> → usar aceleración por hardware. Reinicia Chrome del todo.</li>
          <li>Si WebGL sigue deshabilitado, fuerza el override: <code>chrome://flags/#ignore-gpu-blocklist</code> → <strong>Enabled</strong> → reiniciar.</li>
          <li>Si no hay GPU (VM, remoto, Linux sin drivers), habilita SwiftShader por CLI:<br />
            <code>google-chrome --enable-unsafe-swiftshader --ignore-gpu-blocklist</code></li>
          <li>O prueba Firefox o Edge en el mismo equipo.</li>
        </ol>
        <button id="webgl-retry-btn" type="button">Reintentar</button>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#webgl-retry-btn').addEventListener('click', () => {
      window.location.reload();
    });
  }
  const msg = overlay.querySelector('#webgl-error-message');
  if (msg) {
    msg.textContent =
      message ||
      'Tu navegador o entorno no pudo crear un contexto WebGL. La escena 3D no puede renderizarse.';
  }
  overlay.classList.add('visible');
}
