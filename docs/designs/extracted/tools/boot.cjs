// Reusable boot helper for Claude Design prototype bundles
const { chromium } = require('playwright-core');
const path = require('path');

const UMD = '/tmp/claude-0/-home-user-civic-superapp-platform/c03923f1-05d0-5294-b7a1-7e5ad0fcb78a/scratchpad/umd';
const DESIGNS = '/home/user/civic-superapp-platform/docs/designs';
const FILES = {
  dasma: 'MyDasma_Standalone.html',
  sorsogon: 'MySorsogon_Standalone.html',
  legazpi: 'MyLegazpi_Standalone.html',
};

async function boot(tenant, opts = {}) {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    headless: true,
  });
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: opts.dpr || 2,
  });
  const page = await ctx.newPage();
  await page.route('https://unpkg.com/**', (route) => {
    const url = route.request().url();
    const file = url.includes('react-dom')
      ? path.join(UMD, 'react-dom.production.min.js')
      : path.join(UMD, 'react.production.min.js');
    route.fulfill({ path: file, contentType: 'application/javascript' });
  });
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ body: '', contentType: 'text/css' })
  );
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  // catch-all: abort any other remote request so nothing hangs
  await page.route(/^https?:\/\/(?!unpkg\.com|fonts\.)/, (route) => route.abort().catch(() => {}));
  await page.goto('file://' + path.join(DESIGNS, FILES[tenant]));
  await page.waitForTimeout(opts.bootWait || 9000);
  return { browser, page };
}

// click first element whose visible text matches, smallest match preferred
async function clickText(page, text, opts = {}) {
  const ok = await page.evaluate(({ text, exact, nth }) => {
    const want = text.toLowerCase();
    const els = Array.from(document.querySelectorAll('button, a, [role="button"], div, span, p, h1, h2, h3, h4, li, img, svg, section'));
    const matches = els.filter((el) => {
      const t = (el.innerText || el.textContent || '').trim();
      if (!t) return false;
      const tl = t.toLowerCase();
      if (exact ? tl !== want : !tl.includes(want)) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.width < 430 && r.height < 700;
    });
    // prefer smallest area (innermost/tightest match)
    matches.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return ra.width * ra.height - rb.width * rb.height;
    });
    const el = matches[nth || 0];
    if (!el) return false;
    // click via synthetic events on the closest clickable ancestor
    let target = el;
    el.scrollIntoView({ block: 'center' });
    const r = target.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, { text, exact: !!opts.exact, nth: opts.nth || 0 });
  if (!ok) return false;
  await page.mouse.click(ok.x, ok.y);
  await page.waitForTimeout(opts.wait || 900);
  return true;
}

async function shot(page, tenant, name, counterObj) {
  const n = String(counterObj.n++).padStart(2, '0');
  const out = `/home/user/civic-superapp-platform/docs/designs/extracted/screens/${tenant}/${n}-${name}.png`;
  await page.screenshot({ path: out });
  console.log('SHOT', out);
  return out;
}

// dump visible clickable-ish texts for exploration
async function dumpTexts(page) {
  return page.evaluate(() => {
    const out = [];
    const els = Array.from(document.querySelectorAll('button, a, [role="button"], [onclick], div[class*="cursor"], *'));
    const seen = new Set();
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.cursor !== 'pointer') continue;
      const t = (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      const r = el.getBoundingClientRect();
      if (!t || r.width === 0 || seen.has(t + '|' + Math.round(r.y))) continue;
      seen.add(t + '|' + Math.round(r.y));
      out.push({ t, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
    }
    return out;
  });
}

module.exports = { boot, clickText, shot, dumpTexts };
