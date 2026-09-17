/**
 * Captura una URL con el Edge del sistema (sin descargar navegadores).
 *
 * Uso: node scripts/screenshot.mjs <url> <salida.png> [ancho] [alto]
 */
import { chromium } from 'playwright-core';

const [url, output, width = '1400', height = '800'] = process.argv.slice(2);
if (!url || !output) {
  console.error('Uso: node scripts/screenshot.mjs <url> <salida.png> [ancho] [alto]');
  process.exit(1);
}

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});

try {
  const page = await browser.newPage({
    viewport: { width: Number(width), height: Number(height) },
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: output, fullPage: true });
  console.log(`captura guardada en ${output}`);
} finally {
  await browser.close();
}
