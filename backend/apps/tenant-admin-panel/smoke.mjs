/**
 * Headless smoke test for the tenant admin panel against the REAL backend.
 *
 * Steps: build output is served via `vite preview`, then Chromium:
 *   1. /login -> sign in with the LGU admin credentials
 *   2. assert the header shows the tenant name and exactly ONE tenant is visible
 *   3. /branding -> set the slogan, save, assert a "v{n} saved" toast (real mutation)
 *   4. /modules -> assert read-only (no toggle/input/button controls in the list)
 *   5. screenshot -> smoke.png
 *
 * Run: node smoke.mjs   (expects `npm run build` to have been run first)
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROMIUM_PATH = '/opt/pw-browsers/chromium';
const EMAIL = 'lgu-admin@dasmarinas.gov.ph';
const PASSWORD = 'DasmaAdmin!2026';
const EXPECTED_TENANT = 'MyDasma';
const NEW_SLOGAN = 'Sulong na! Sulong pa!';

// The backend CORS allow-list only accepts specific origins; the platform panel
// owns :5173, so this console must be served from one of these ports.
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
  throw new Error(`no free port among CORS-allowed candidates: ${CANDIDATE_PORTS.join(', ')}`);
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

function pass(msg) {
  console.log(`PASS: ${msg}`);
}

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

let browser;
try {
  await waitForServer(origin + '/login');
  pass(`vite preview serving on ${origin}`);

  browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  // 1. login
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForSelector('[data-testid="tenant-name"]', { timeout: 15000 });
  pass('logged in and reached the console');

  // 2. header shows the tenant name; exactly ONE tenant visible
  const tenantEls = page.locator('[data-testid="tenant-name"]');
  const tenantCount = await tenantEls.count();
  if (tenantCount !== 1) throw new Error(`expected exactly 1 tenant-name element, got ${tenantCount}`);
  const tenantName = (await tenantEls.first().textContent())?.trim();
  if (tenantName !== EXPECTED_TENANT) {
    throw new Error(`expected tenant name "${EXPECTED_TENANT}", got "${tenantName}"`);
  }
  const pickers = await page.locator('header select, aside select').count();
  if (pickers !== 0) throw new Error('found a tenant picker control — there must be none');
  pass(`header shows "${tenantName} — City Console"; exactly one tenant visible, no tenant picker`);

  // dashboard cards render real counts
  await page.waitForSelector('[data-testid="card-config-version"]', { timeout: 15000 });
  const versionCard = await page.locator('[data-testid="card-config-version"] .stat-value').textContent();
  if (!/^v\d+$/.test(versionCard?.trim() ?? '')) {
    throw new Error(`config version card malformed: "${versionCard}"`);
  }
  pass(`dashboard shows config version card (${versionCard.trim()})`);

  // 3. branding: change slogan + save -> new version toast (REAL mutation)
  await page.click('a[href="/branding"]');
  await page.waitForSelector('[data-testid="slogan-input"]', { timeout: 15000 });
  // clear first so change events fire even when the final value equals the current one
  await page.fill('[data-testid="slogan-input"]', '');
  await page.fill('[data-testid="slogan-input"]', NEW_SLOGAN);
  await page.click('[data-testid="save-branding"]');
  const toast = page.locator('[data-testid="toast"]', { hasText: /v\d+ saved/ });
  await toast.first().waitFor({ timeout: 15000 });
  const toastText = (await toast.first().textContent())?.trim();
  pass(`branding saved — toast "${toastText}"`);

  // config version chip refreshed to the same version as the toast
  const savedVersion = toastText.match(/v(\d+) saved/)[1];
  await page
    .locator('[data-testid="config-version"]', { hasText: `config v${savedVersion}` })
    .waitFor({ timeout: 15000 });
  pass(`config version chip refreshed to v${savedVersion}`);

  // 4. modules: read-only, no toggle controls
  await page.click('a[href="/modules"]');
  await page.waitForSelector('[data-testid="module-list"] .module-row', { timeout: 15000 });
  const moduleRows = await page.locator('[data-testid="module-list"] .module-row').count();
  const moduleControls = await page
    .locator('[data-testid="module-list"] input, [data-testid="module-list"] button, [data-testid="module-list"] select, [data-testid="module-list"] [role="switch"]')
    .count();
  if (moduleRows === 0) throw new Error('no module rows rendered');
  if (moduleControls !== 0) {
    throw new Error(`modules page must be read-only, found ${moduleControls} controls`);
  }
  const noteVisible = await page.locator('[data-testid="modules-note"]').isVisible();
  if (!noteVisible) throw new Error('platform-operator note not visible on /modules');
  pass(`modules page read-only: ${moduleRows} modules listed, 0 toggle controls, operator note shown`);

  // 5. screenshot
  await page.screenshot({ path: path.join(__dirname, 'smoke.png'), fullPage: true });
  pass('screenshot written to smoke.png');

  console.log('SMOKE OK');
} catch (err) {
  console.error('SMOKE FAILED:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  preview.kill('SIGTERM');
}
