/**
 * E2E de verificación del pipeline de detección + overlay.
 *
 * Usa el Edge del sistema (sin descargar navegadores) y sustituye la cámara por
 * un stream de canvas con una cara esquemática, para poder validar de forma
 * objetiva que:
 *   1. el modelo carga (el banner deja de decir "Cargando modelo…"),
 *   2. se detecta el rostro (aparece la insignia de forma facial),
 *   3. el overlay PINTA píxeles (se cuentan los píxeles con alfa > 8).
 *
 * Uso:
 *   node scripts/e2e-check.mjs <url> [timeoutMs] [--gpu]
 */
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'https://la-barba.vercel.app/';
const timeoutMs = Number(process.argv[3] ?? 45000);
const useGpu = process.argv.includes('--gpu');

/** Dibuja una cara esquemática en un canvas y la expone como cámara. */
function installFakeCamera() {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  const draw = () => {
    ctx.fillStyle = '#2a2a36';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#e8c39e';
    ctx.beginPath();
    ctx.ellipse(640, 300, 165, 190, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.ellipse(585, 290, 20, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(695, 290, 20, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(640, 330, 14, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a4b3a';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(640, 390, 58, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    requestAnimationFrame(draw);
  };
  draw();
  const stream = canvas.captureStream(30);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: async () => stream,
      enumerateDevices: async () => [],
    },
  });
}

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const logs = [];
  page.on('console', (message) =>
    logs.push(`${message.type()}: ${message.text().slice(0, 150)}`),
  );
  page.on('pageerror', (error) =>
    logs.push(`PAGEERROR: ${error.message.slice(0, 200)}`),
  );

  await page.addInitScript(installFakeCamera);

  const startedAt = Date.now();
  await page.goto(url, { waitUntil: 'load' });

  // Fuerza una recarga limpia sin Service Worker para no medir caché previa.
  await page.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) {
      await registration.unregister();
    }
    for (const key of await caches.keys()) await caches.delete(key);
  });
  await page.reload({ waitUntil: 'load' });

  await page.getByRole('button', { name: 'Activar cámara' }).click();

  let readyAtMs = null;
  let banner = '';
  while (Date.now() - startedAt < timeoutMs) {
    await page.waitForTimeout(1000);
    banner = (await page.locator('[role="status"]').allTextContents()).join(' | ');
    if (await page.locator('text=/^Rostro/').count()) {
      readyAtMs = Date.now() - startedAt;
      break;
    }
  }

  const shape = await page
    .locator('text=/^Rostro/')
    .first()
    .textContent()
    .catch(() => null);

  // Verificación objetiva: ¿el overlay ha pintado píxeles?
  const overlay = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let painted = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 8) painted += 1;
    }
    return { width: canvas.width, height: canvas.height, paintedPixels: painted };
  });

  await page.screenshot({ path: 'e2e-result.png' });

  // --- Modo afeitado: los paneles desaparecen y queda el paso actual ---
  const panelsBefore = await page.getByText('Estilo de barba').count();
  await page.getByRole('button', { name: 'Modo afeitado' }).click();
  await page.waitForTimeout(1500);

  const panelsAfter = await page.getByText('Estilo de barba').count();
  const exitButton = await page
    .getByRole('button', { name: 'Mostrar los paneles' })
    .count();
  // En modo afeitado NO debe haber pasos, números ni instrucciones.
  const stepElements = await page
    .getByRole('button', { name: /Paso \d+ de \d+/ })
    .count();
  const hintElements = await page.getByText(/Toca el paso/).count();

  const overlayInShave = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let painted = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 8) painted += 1;
    }
    return painted;
  });

  await page.screenshot({ path: 'e2e-shave-mode.png' });

  const video = await page.evaluate(() => {
    const element = document.querySelector('video');
    return element
      ? {
          w: element.videoWidth,
          h: element.videoHeight,
          readyState: element.readyState,
          paused: element.paused,
        }
      : null;
  });

  const result = {
    url,
    delegate: useGpu ? 'GPU (pedido)' : 'CPU (por defecto)',
    readyAtMs,
    faceBadge: shape,
    statusBanner: banner || null,
    overlay,
    video,
    shaveMode: {
      panelsBefore,
      panelsAfter,
      exitButton,
      stepElements,
      hintElements,
      overlayPaintedPixels: overlayInShave,
    },
    verdict:
      readyAtMs !== null &&
      overlay &&
      overlay.paintedPixels > 500 &&
      panelsBefore > 0 &&
      panelsAfter === 0 &&
      exitButton > 0 &&
      stepElements === 0 &&
      hintElements === 0 &&
      (overlayInShave ?? 0) > 500
        ? 'OK: detecta, dibuja y modo afeitado solo con lineas'
        : 'FALLO: revisar deteccion/overlay/modo afeitado',
    logs: logs.filter((l) => !l.includes('beforeinstallprompt')).slice(-10),
  };
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
