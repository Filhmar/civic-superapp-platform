/**
 * Headless smoke test against the REAL backend (http://localhost:3005).
 * Builds the SPA, serves it with `vite preview`, then drives it with
 * playwright-core using the preinstalled Chromium.
 *
 * Login credentials for the smoke run live ONLY in this script.
 */
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import net from 'node:net';
import { chromium } from 'playwright-core';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CHROMIUM = '/opt/pw-browsers/chromium';
const EMAIL = 'admin@platform.local';
const PASSWORD = 'PlatformAdmin!2026';
// Backend CORS allow-list permits localhost:5173 / :5174 — pick a free one of those.
const CANDIDATE_PORTS = [5173, 5174];

function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.listen(port, () => srv.close(() => resolve(true)));
  });
}

async function waitForHttp(url, timeoutMs = 20000) {
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
  throw new Error(`Server at ${url} did not come up within ${timeoutMs}ms`);
}

function assert(cond, message) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${message}`);
  console.log(`[smoke] PASS: ${message}`);
}

async function main() {
  console.log('[smoke] building SPA...');
  execSync('npm run build', { cwd: DIR, stdio: 'inherit' });

  let port = null;
  for (const p of CANDIDATE_PORTS) {
    if (await isPortFree(p)) {
      port = p;
      break;
    }
  }
  if (!port) throw new Error('No free port among CORS-allowed 5173/5174');

  console.log(`[smoke] starting vite preview on :${port}...`);
  // detached => own process group, so we can kill npx AND its vite grandchild on teardown.
  const preview = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], {
    cwd: DIR,
    stdio: 'pipe',
    detached: true,
  });
  preview.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`));

  let browser = null;
  try {
    await waitForHttp(`http://localhost:${port}/`);
    console.log('[smoke] preview server is up');

    browser = await chromium.launch({ executablePath: CHROMIUM });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', (err) => console.error('[page error]', err.message));

    // --- Login ---
    await page.goto(`http://localhost:${port}/login`);
    assert((await page.textContent('body')).includes('Civic Platform Console'), 'login page shows product title');
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // --- Tenants table (grid rows) ---
    await page.waitForSelector('.table-card [data-tenant-id]', { timeout: 15000 });
    const tenantsText = await page.textContent('.table-card');
    assert(tenantsText.includes('ph-cavite-dasmarinas'), "tenants table contains 'ph-cavite-dasmarinas'");
    assert(tenantsText.includes('ph-sorsogon-sorsogoncity'), "tenants table contains 'ph-sorsogon-sorsogoncity'");

    // --- Provision drawer: open, walk to step 3, close WITHOUT submitting ---
    await page.click('[data-testid="open-provision"]');
    await page.waitForSelector('[data-testid="provision-drawer"]', { timeout: 10000 });
    assert(true, 'provision drawer opened');
    // Step 1: fill the identity contract so Continue passes validation.
    await page.fill('[data-testid="prov-tenant-id"]', 'ph-smoke-testcity');
    await page.fill('[data-testid="prov-bundle-id"]', 'com.smoketest.app');
    await page.fill('[data-testid="prov-name"]', 'SmokeTest City');
    const prefixInputs = page.locator('.drawer-body input[placeholder="XXX"]');
    await prefixInputs.nth(0).fill('SMK');
    await prefixInputs.nth(1).fill('SMK');
    await page.fill('.drawer-body input[placeholder="12.9714"]', '12.34');
    await page.fill('.drawer-body input[placeholder="124.0064"]', '123.45');
    await page.fill('[data-testid="prov-barangays"]', 'Barangay Uno');
    await page.click('[data-testid="drawer-continue"]');
    await page.waitForSelector('[data-testid="drawer-pane-2"]', { timeout: 5000 });
    assert(true, 'provision drawer advanced to step 2 (branding)');
    await page.click('[data-testid="drawer-continue"]');
    await page.waitForSelector('[data-testid="drawer-pane-3"]', { timeout: 5000 });
    const provisionBtn = await page.locator('[data-testid="drawer-provision"]').count();
    assert(provisionBtn === 1, 'provision drawer reached step 3 (modules) with Provision button');
    // Close WITHOUT provisioning — no junk tenants.
    await page.click('[data-testid="drawer-close"]');
    await page.waitForSelector('[data-testid="provision-drawer"]', { state: 'detached', timeout: 5000 });
    assert(true, 'provision drawer closed without submitting');

    // --- Open tenant detail -> Modules tab ---
    await page.click('[data-tenant-id="ph-sorsogon-sorsogoncity"]');
    await page.waitForSelector('button[data-tab="modules"]', { timeout: 15000 });
    await page.click('button[data-tab="modules"]');
    const jobsInput = page.locator('label[data-module="jobs"] input');
    await jobsInput.waitFor({ state: 'attached', timeout: 15000 });
    const initialOn = await jobsInput.isChecked();
    console.log(`[smoke] 'jobs' module initial state: ${initialOn ? 'ON' : 'OFF'}`);

    // --- Toggle jobs ON (real mutation via PATCH /config/modules) ---
    await page.click('label[data-module="jobs"]');
    const toast1 = page.locator('.toast-success', { hasText: /v\d+ saved/ }).first();
    await toast1.waitFor({ timeout: 15000 });
    const toast1Text = (await toast1.textContent()).trim();
    assert(/v\d+ saved$/.test(toast1Text), `saved-version toast shown after toggle ('${toast1Text}')`);
    assert((await jobsInput.isChecked()) === !initialOn, `'jobs' toggled to ${!initialOn ? 'ON' : 'OFF'}`);
    const v1 = Number(/v(\d+) saved/.exec(toast1Text)[1]);

    // --- Toggle jobs back (leave state as found) ---
    await page.waitForSelector('label[data-module="jobs"] input:not([disabled])');
    await page.click('label[data-module="jobs"]');
    const toast2 = page.locator(`.toast-success:has-text("v${v1 + 1} saved")`).first();
    await toast2.waitFor({ timeout: 15000 });
    assert(true, `saved-version toast shown after revert ('v${v1 + 1} saved')`);
    await page.waitForSelector('label[data-module="jobs"] input:not([disabled])');
    assert((await jobsInput.isChecked()) === initialOn, `'jobs' module state restored to initial (${initialOn ? 'ON' : 'OFF'})`);

    // --- Operations: open a transition dialog, then cancel (no mutation) ---
    await page.click('button[data-tab="operations"]');
    await page.waitForSelector('[data-ops-domain="reports"]', { timeout: 10000 });
    const actionBtn = page.locator('.action-btn').first();
    await actionBtn.waitFor({ timeout: 15000 });
    const actionLabel = (await actionBtn.textContent()).trim();
    await actionBtn.click();
    await page.waitForSelector('[data-testid="transition-dialog"]', { timeout: 5000 });
    assert(
      (await page.textContent('[data-testid="transition-dialog"]')).includes('Note (attached to audit trail)'),
      `transition dialog opened for '${actionLabel}' with audit-note field`,
    );
    await page.click('[data-testid="dialog-cancel"]');
    await page.waitForSelector('[data-testid="transition-dialog"]', { state: 'detached', timeout: 5000 });
    assert(true, 'transition dialog cancelled without applying');

    // --- Screenshot ---
    await page.screenshot({ path: path.join(DIR, 'smoke.png') });
    console.log('[smoke] screenshot written to smoke.png');

    console.log('[smoke] ALL CHECKS PASSED');
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    try {
      process.kill(-preview.pid, 'SIGTERM'); // kill the whole preview process group
    } catch {
      preview.kill('SIGTERM');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[smoke] FAILED:', err.message ?? err);
    process.exit(1);
  });
