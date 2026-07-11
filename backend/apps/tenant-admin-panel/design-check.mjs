/**
 * Visual-verification captures for the City Console design restyle.
 * Serves the built app via `vite preview`, logs in as the LEGAZPI admin
 * (whose config colors match the design prototype 1:1) and captures
 * 1440x900 screenshots of every designed screen into design-check/.
 * Also captures the dashboard as the DASMA admin to prove the same build
 * renders a green console from config alone.
 *
 * Run: npm run build && node design-check.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROMIUM_PATH = '/opt/pw-browsers/chromium';
const OUT = path.join(__dirname, 'design-check');
const CANDIDATE_PORTS = [5174, 8090, 8091];

function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.listen(port, '127.0.0.1', () => srv.close(() => resolve(true)));
  });
}

async function findFreePort() {
  for (const port of CANDIDATE_PORTS) {
    if (await isPortFree(port)) return port;
  }
  throw new Error('no free CORS-allowed port');
}

async function waitForServer(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`preview server did not come up at ${url}`);
}

fs.mkdirSync(OUT, { recursive: true });
const port = await findFreePort();
const origin = `http://localhost:${port}`;

const preview = spawn(
  process.execPath,
  [
    path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js'),
    'preview',
    '--port',
    String(port),
    '--strictPort',
    '--host',
    '127.0.0.1',
  ],
  { cwd: __dirname, stdio: 'ignore' },
);

async function login(page, email, password) {
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('.sidebar', { timeout: 15000 });
  // wait for the tenant theme fetch to land
  await page.waitForTimeout(1200);
}

async function shot(page, name) {
  // let entrance animations (fadeUp .3s) finish before capturing
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, name) });
  console.log(`captured ${name}`);
}

let browser;
try {
  await waitForServer(`${origin}/login`);
  browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  // ---- LEGAZPI (matches the design prototype 1:1) ----
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await shot(page, '01-login.png');

  await login(page, 'lgu-admin@legazpi.gov.ph', 'LegazpiAdmin!2026');
  await page.waitForSelector('[data-testid="card-config-version"]', { timeout: 15000 });
  await shot(page, '02-dashboard.png');

  await page.click('a[href="/modules"]');
  await page.waitForSelector('[data-testid="module-list"] .module-row', { timeout: 15000 });
  await shot(page, '03-modules.png');

  await page.click('a[href="/content"]');
  await page.waitForSelector('.cat-picker', { timeout: 15000 });
  await shot(page, '04-content.png');

  await page.click('a[href="/operations"]');
  await page.waitForSelector('.ops-tab', { timeout: 15000 });
  await page.waitForSelector('tbody tr', { timeout: 15000 });
  await shot(page, '05-operations.png');

  const actionBtn = page.locator('.action-btn').first();
  if ((await actionBtn.count()) > 0) {
    await actionBtn.click();
    await page.waitForSelector('[data-testid="transition-dialog"]', { timeout: 5000 });
    await page.waitForTimeout(400);
    await shot(page, '05b-dialog.png');
    await page.click('[data-testid="transition-dialog"] button:has-text("Cancel")');
  }

  await page.click('a[href="/audit"]');
  await page.waitForSelector('.audit-row', { timeout: 15000 });
  await shot(page, '08-audit.png');

  await page.click('a[href="/branding"]');
  await page.waitForSelector('.phone-screen', { timeout: 15000 });
  await page.waitForTimeout(600);
  await shot(page, '10-branding-studio.png');

  await page.locator('.content').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await page.waitForTimeout(400);
  await shot(page, '10b-branding-studio-scrolled.png');

  // draft retheme: pick the Sorsogon blue + red preset swatches -> phone preview
  // re-themes LIVE while the console shell stays on the saved (teal) config.
  await page.locator('.content').evaluate((el) => el.scrollTo(0, 0));
  await page.locator('.swatch[title="#1B4F9C"]').click();
  await page.locator('.swatch[title="#D62839"]').click();
  await shot(page, '10c-branding-draft-retheme.png');
  await page.close();

  // ---- DASMA (same build, green console purely from config) ----
  const page2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await login(page2, 'lgu-admin@dasmarinas.gov.ph', 'DasmaAdmin!2026');
  await page2.waitForSelector('[data-testid="card-config-version"]', { timeout: 15000 });
  await shot(page2, '20-dasma-dashboard.png');
  await page2.close();

  console.log('DESIGN CHECK CAPTURES OK');
} catch (err) {
  console.error('DESIGN CHECK FAILED:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  preview.kill('SIGTERM');
}
