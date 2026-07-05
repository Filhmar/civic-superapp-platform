// Extracts computed styles, CSS custom props, SVG marks and screen texts from a prototype.
// Usage: node extract.cjs <tenant>
const fs = require('fs');
const { boot, clickText, dumpTexts } = require('./boot.cjs');

const tenant = process.argv[2];
const OUT = '/home/user/civic-superapp-platform/docs/designs/extracted';

async function clickPrimary(page, src) {
  const p = await page.evaluate((src) => {
    const re = new RegExp(src, 'i');
    let b = null;
    for (const el of document.querySelectorAll('*')) {
      if (getComputedStyle(el).cursor !== 'pointer') continue;
      const t = (el.innerText || '').trim();
      if (!t || t.length > 80 || !re.test(t)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 10 || r.height < 10 || r.height > 120) continue;
      if (!b || r.width > b.w) b = { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width };
    }
    return b;
  }, src);
  if (!p) return false;
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(900);
  return true;
}

const pick = (cs) => ({
  fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
  lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, color: cs.color,
  background: cs.backgroundColor, backgroundImage: cs.backgroundImage === 'none' ? undefined : cs.backgroundImage.slice(0, 200),
  borderRadius: cs.borderRadius, boxShadow: cs.boxShadow === 'none' ? undefined : cs.boxShadow,
  padding: cs.padding, border: cs.border, gap: cs.gap !== 'normal' ? cs.gap : undefined,
  textTransform: cs.textTransform !== 'none' ? cs.textTransform : undefined,
  height: cs.height, width: cs.width,
});

// find element by exact text, smallest area, and return computed style
async function styleOf(page, text, opts = {}) {
  return page.evaluate(({ text, contains, pickSrc }) => {
    const pick = eval('(' + pickSrc + ')');
    const want = text.toLowerCase();
    let matches = [];
    for (const el of document.querySelectorAll('*')) {
      const t = (el.innerText || el.textContent || '').trim();
      if (!t) continue;
      const tl = t.toLowerCase();
      if (contains ? !tl.includes(want) : tl !== want) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      matches.push(el);
    }
    matches.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return ra.width * ra.height - rb.width * rb.height;
    });
    const el = matches[0];
    if (!el) return null;
    return pick(getComputedStyle(el));
  }, { text, contains: !!opts.contains, pickSrc: pick.toString() });
}

// style of the clickable ancestor (cards/buttons) containing text
async function cardStyleOf(page, text, opts = {}) {
  return page.evaluate(({ text, pickSrc, minW }) => {
    const pick = eval('(' + pickSrc + ')');
    const want = text.toLowerCase();
    let cands = [];
    for (const el of document.querySelectorAll('*')) {
      const t = (el.innerText || '').trim().toLowerCase();
      if (!t.includes(want)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < (minW || 60) || r.height < 20 || r.height > 500) continue;
      const cs = getComputedStyle(el);
      const hasBg = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.boxShadow !== 'none' || parseFloat(cs.borderRadius) > 0;
      if (!hasBg) continue;
      cands.push(el);
    }
    cands.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return ra.width * ra.height - rb.width * rb.height;
    });
    const el = cands[0];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { rect: { w: Math.round(r.width), h: Math.round(r.height) }, ...pick(getComputedStyle(el)) };
  }, { text, pickSrc: pick.toString(), minW: opts.minW });
}

async function fullText(page) {
  return page.evaluate(() => document.body.innerText);
}

(async () => {
  const { browser, page } = await boot(tenant, { bootWait: tenant === 'dasma' ? 14000 : 9000 });
  const result = { tenant, cssVars: {}, typography: {}, components: {}, texts: {} };

  // CSS custom props from all style tags
  result.cssVars = await page.evaluate(() => {
    const vars = {};
    for (const st of document.querySelectorAll('style')) {
      const m = st.textContent.matchAll(/--([\w-]+)\s*:\s*([^;}{]+)[;}]/g);
      for (const g of m) vars[g[1]] = g[2].trim();
    }
    // also computed on root & first big wrapper
    const roots = [document.documentElement, document.body, document.body.firstElementChild];
    for (const r of roots) {
      if (!r) continue;
      for (const sheet of []) {}
    }
    return vars;
  });
  // inline style custom props (React apps often set them via style attr)
  result.cssVarsInline = await page.evaluate(() => {
    const vars = {};
    for (const el of document.querySelectorAll('[style]')) {
      for (let i = 0; i < el.style.length; i++) {
        const p = el.style[i];
        if (p.startsWith('--')) vars[p] = el.style.getPropertyValue(p).trim();
      }
    }
    return vars;
  });

  // onboarding texts
  result.texts.onboarding = [];
  for (let i = 0; i < 3; i++) {
    result.texts.onboarding.push(await fullText(page));
    if (i === 0) {
      result.typography.onboardingTitle = await cardStyleOf(page, 'app', { minW: 100 });
    }
    if (i < 2) await clickPrimary(page, '^Next$');
  }
  await clickPrimary(page, 'Get Started|Magsimula|Start');
  result.texts.login = await fullText(page);
  // SVG mark on login screen
  const mark = await page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll('svg')).map((s) => ({ html: s.outerHTML, r: s.getBoundingClientRect() }));
    // biggest svg in upper half = the seal/mark
    const big = svgs.filter((s) => s.r.y < 500 && s.r.width > 50).sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)[0];
    return big ? big.html : null;
  });
  if (mark) fs.writeFileSync(`${OUT}/marks/${tenant}-mark.svg`, mark);

  await clickPrimary(page, 'Send OTP');
  await clickPrimary(page, 'Verify|Confirm');
  await page.waitForTimeout(800);

  // HOME styles
  const t = result.typography, comp = result.components;
  result.texts.home = await fullText(page);
  t.greeting = await page.evaluate((pickSrc) => {
    const pick = eval('(' + pickSrc + ')');
    // biggest bold text in top 200px
    let best = null;
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.y > 110 || r.width === 0) continue;
      const cs = getComputedStyle(el);
      const fs_ = parseFloat(cs.fontSize);
      if (el.children.length > 0) continue;
      if (!best || fs_ > best._fs) best = { _fs: fs_, text: (el.innerText || '').trim(), ...pick(cs) };
    }
    return best;
  }, pick.toString());
  comp.searchBar = await cardStyleOf(page, 'Maghanap');
  if (!comp.searchBar) comp.searchBar = await cardStyleOf(page, 'Search');
  comp.sosBar = await cardStyleOf(page, 'Emergency SOS');
  comp.moduleTile = await cardStyleOf(page, 'Hotlines', { minW: 70 });
  t.tileLabel = await styleOf(page, 'Hotlines');
  t.sectionTitle = await styleOf(page, 'City Services', { contains: true }) || await styleOf(page, 'Services', { contains: false });
  comp.announcementCard = await cardStyleOf(page, 'EVENT', { minW: 200 });
  comp.chip = await styleOf(page, 'EVENT');
  // scroll for mayor / weather / nearby
  await page.evaluate(() => {
    let b = null;
    for (const el of document.querySelectorAll('*')) {
      if (el.scrollHeight > el.clientHeight + 100 && el.clientHeight > 300) { if (!b || el.scrollHeight > b.scrollHeight) b = el; }
    }
    if (b) b.scrollTop = b.scrollHeight;
  });
  await page.waitForTimeout(600);
  result.texts.homeScrolled = await fullText(page);
  comp.mayorCard = await cardStyleOf(page, 'Mayor', { minW: 200 });
  comp.weatherCard = await cardStyleOf(page, '°', { minW: 200 });
  // tab bar
  comp.tabBar = await page.evaluate((pickSrc) => {
    const pick = eval('(' + pickSrc + ')');
    for (const el of document.querySelectorAll('*')) {
      const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (/Home.*Services.*News.*More/.test(t) && el.getBoundingClientRect().y > 600) {
        const r = el.getBoundingClientRect();
        return { rect: { w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y) }, ...pick(getComputedStyle(el)) };
      }
    }
    return null;
  }, pick.toString());
  comp.sosTabButton = await page.evaluate((pickSrc) => {
    const pick = eval('(' + pickSrc + ')');
    let cands = [];
    for (const el of document.querySelectorAll('*')) {
      const t = (el.innerText || '').trim();
      if (t !== 'SOS') continue;
      const r = el.getBoundingClientRect();
      if (r.y > 600 && r.width > 30) cands.push({ rect: { w: Math.round(r.width), h: Math.round(r.height) }, ...pick(getComputedStyle(el)) });
    }
    cands.sort((a, b) => b.rect.w - a.rect.w);
    return cands[0] || null;
  }, pick.toString());
  t.activeTabLabel = await styleOf(page, 'Home');

  // phone frame + screen bg
  comp.phoneFrame = await page.evaluate((pickSrc) => {
    const pick = eval('(' + pickSrc + ')');
    let best = null;
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width > 300 && r.width < 430 && r.height > 700 && parseFloat(cs.borderRadius) > 20) {
        if (!best || r.width * r.height > best._a) best = { _a: r.width * r.height, rect: { w: Math.round(r.width), h: Math.round(r.height) }, ...pick(cs) };
      }
    }
    return best;
  }, pick.toString());

  // primary button style: go to a service form
  await clickPrimary(page, '^Services$'); // tab may need bottom position, clickPrimary works since it's pointer
  result.texts.services = await fullText(page);
  const svc = (await dumpTexts(page)).map((o) => o.t).find((s) => /Tax|Permit|Cedula/i.test(s) && s.length < 40);
  if (svc) {
    await clickText(page, svc);
    comp.primaryButton = await cardStyleOf(page, 'Review Application') || await cardStyleOf(page, 'Review');
    comp.input = await cardStyleOf(page, 'Juan', { minW: 150 }) || await cardStyleOf(page, 'Dela Cruz', { minW: 150 });
    t.inputLabel = await styleOf(page, 'Full Name');
    t.screenTitle = await styleOf(page, 'Apply for Service');
    // review + fees
    await clickPrimary(page, 'Review Application|^Review$|^Continue$');
    result.texts.serviceReview = await fullText(page);
    await clickPrimary(page, '^Pay');
    result.texts.paymentSuccess = await fullText(page);
    comp.qrStubCard = await cardStyleOf(page, 'CLAIM STUB', { minW: 200 }) || await cardStyleOf(page, 'Reference', { minW: 200 });
  }
  // back home
  for (let i = 0; i < 6; i++) {
    const done = await page.evaluate(() => {
      for (const el of document.querySelectorAll('*')) {
        const t = (el.innerText || '').trim();
        if (t === 'Home') { const r = el.getBoundingClientRect(); if (r.y > 650 && r.width < 100) return true; }
      }
      return false;
    });
    if (done) break;
    const b = await page.evaluate(() => {
      for (const el of document.querySelectorAll('*')) {
        if (getComputedStyle(el).cursor !== 'pointer') continue;
        const r = el.getBoundingClientRect();
        if (r.x < 70 && r.y > 20 && r.y < 130 && r.width > 15 && r.width < 70 && r.height < 70) return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      return null;
    });
    if (!b) { await clickPrimary(page, 'Back to Home|^Done$'); break; }
    await page.mouse.click(b.x, b.y);
    await page.waitForTimeout(700);
  }
  await clickPrimary(page, '^Home$');

  // hotlines text
  await clickText(page, 'Hotlines', { exact: true });
  result.texts.hotlines = await fullText(page);
  comp.listRow = await cardStyleOf(page, 'Police', { minW: 200 });
  // back
  await page.evaluate(() => {});
  const back1 = await page.evaluate(() => {
    for (const el of document.querySelectorAll('*')) {
      if (getComputedStyle(el).cursor !== 'pointer') continue;
      const r = el.getBoundingClientRect();
      if (r.x < 70 && r.y > 20 && r.y < 130 && r.width > 15 && r.width < 70 && r.height < 70) return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    return null;
  });
  if (back1) { await page.mouse.click(back1.x, back1.y); await page.waitForTimeout(700); }

  // tourism, assistance, report, news, transport, directory texts
  const grab = async (label, key) => {
    if (await clickText(page, label, { exact: true })) {
      result.texts[key] = await fullText(page);
      const b = await page.evaluate(() => {
        for (const el of document.querySelectorAll('*')) {
          if (getComputedStyle(el).cursor !== 'pointer') continue;
          const r = el.getBoundingClientRect();
          if (r.x < 70 && r.y > 20 && r.y < 130 && r.width > 15 && r.width < 70 && r.height < 70) return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }
        return null;
      });
      if (b) { await page.mouse.click(b.x, b.y); await page.waitForTimeout(700); }
    }
  };
  await grab('Tourism', 'tourism');
  await grab('Report', 'report');
  await grab('Assistance', 'assistance');
  await grab('Transport', 'transport');
  await grab('Directory', 'directory');
  await clickPrimary(page, '^News$');
  result.texts.news = await fullText(page);
  await clickPrimary(page, '^More$');
  result.texts.more = await fullText(page);
  if (await clickPrimary(page, 'Digital City ID|City ID')) {
    result.texts.digitalId = await fullText(page);
    comp.digitalIdCard = await cardStyleOf(page, 'ID', { minW: 250 });
  }
  // style-guide text (has token names)
  const b2 = await page.evaluate(() => {
    for (const el of document.querySelectorAll('*')) {
      if (getComputedStyle(el).cursor !== 'pointer') continue;
      const r = el.getBoundingClientRect();
      if (r.x < 70 && r.y > 20 && r.y < 130 && r.width > 15 && r.width < 70 && r.height < 70) return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    return null;
  });
  if (b2) { await page.mouse.click(b2.x, b2.y); await page.waitForTimeout(700); }
  await clickPrimary(page, '^More$');
  if (await clickPrimary(page, 'Design System|Style Guide')) {
    result.texts.styleGuide = await fullText(page);
  }

  fs.writeFileSync(`${OUT}/raw-${tenant}.json`, JSON.stringify(result, null, 2));
  console.log('WROTE', `${OUT}/raw-${tenant}.json`, 'mark:', !!mark);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
