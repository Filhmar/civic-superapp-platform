// Crawls a Claude Design civic-app prototype and screenshots every screen.
// Usage: node crawler.cjs <tenant>
const { boot, clickText, dumpTexts } = require('./boot.cjs');

const tenant = process.argv[2];
const OUT = `/home/user/civic-superapp-platform/docs/designs/extracted/screens/${tenant}`;
const c = { n: 1 };

async function shot(page, name) {
  const out = `${OUT}/${String(c.n++).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: out });
  console.log('SHOT', name);
}

const summarize = (arr) => arr.map((o) => o.t).filter((v, i, a) => a.indexOf(v) === i);

// click the widest clickable element whose text matches regex (primary buttons are full-width)
async function clickPrimary(page, regex, opts = {}) {
  const pos = await page.evaluate((src) => {
    const re = new RegExp(src, 'i');
    let best = null;
    for (const el of document.querySelectorAll('*')) {
      if (getComputedStyle(el).cursor !== 'pointer') continue;
      const t = (el.innerText || '').trim();
      if (!t || t.length > 80 || !re.test(t)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 10 || r.height < 10 || r.height > 120) continue;
      if (!best || r.width > best.w) best = { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width };
    }
    return best;
  }, regex.source);
  if (!pos) return false;
  await page.mouse.click(pos.x, pos.y);
  await page.waitForTimeout(opts.wait || 900);
  return true;
}

// find tab bar & tap a tab (bottom area)
async function tab(page, label) {
  const pos = await page.evaluate((label) => {
    for (const el of document.querySelectorAll('*')) {
      const t = (el.innerText || '').trim();
      if (t !== label) continue;
      const r = el.getBoundingClientRect();
      if (r.y > 650 && r.width > 0) return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    return null;
  }, label);
  if (!pos) return false;
  await page.mouse.click(pos.x, pos.y);
  await page.waitForTimeout(900);
  return true;
}

async function hasTabBar(page) {
  return page.evaluate(() => {
    for (const el of document.querySelectorAll('*')) {
      const t = (el.innerText || '').trim();
      if (t === 'Home') {
        const r = el.getBoundingClientRect();
        if (r.y > 650 && r.width > 0 && r.width < 100) return true;
      }
    }
    return false;
  });
}

// click the small textless back button top-left, if present
async function goBack(page) {
  const pos = await page.evaluate(() => {
    let best = null;
    for (const el of document.querySelectorAll('*')) {
      if (getComputedStyle(el).cursor !== 'pointer') continue;
      const r = el.getBoundingClientRect();
      if (r.x < 70 && r.y > 20 && r.y < 130 && r.width > 15 && r.width < 70 && r.height < 70) {
        if (!best || r.y < best.ry) best = { x: r.x + r.width / 2, y: r.y + r.height / 2, ry: r.y };
      }
    }
    return best;
  });
  if (!pos) return false;
  await page.mouse.click(pos.x, pos.y);
  await page.waitForTimeout(800);
  return true;
}

async function ensureHome(page) {
  for (let i = 0; i < 7; i++) {
    if (await hasTabBar(page)) { await tab(page, 'Home'); return true; }
    if (!(await goBack(page))) break;
  }
  return hasTabBar(page);
}

// scroll internal scroll container
async function scrollApp(page, to) {
  await page.evaluate((to) => {
    let best = null;
    for (const el of document.querySelectorAll('*')) {
      if (el.scrollHeight > el.clientHeight + 100 && el.clientHeight > 300) {
        if (!best || el.scrollHeight > best.scrollHeight) best = el;
      }
    }
    if (best) best.scrollTop = to === 'bottom' ? best.scrollHeight : to;
  }, to);
  await page.waitForTimeout(600);
}

// click a home module tile by label
async function tile(page, label) {
  const pos = await page.evaluate((label) => {
    for (const el of document.querySelectorAll('*')) {
      const t = (el.innerText || '').trim();
      if (t !== label) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 60 && r.width < 130 && r.height > 60) return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    return null;
  }, label);
  if (!pos) return false;
  await page.mouse.click(pos.x, pos.y);
  await page.waitForTimeout(900);
  return true;
}

async function dump(page, tag) {
  console.log(tag, JSON.stringify(summarize(await dumpTexts(page)).slice(0, 40)));
}

(async () => {
  const { boot } = require('./boot.cjs');
  const { browser, page } = await boot(tenant, { bootWait: tenant === 'dasma' ? 14000 : 9000 });

  // --- onboarding ---
  await shot(page, 'onboarding-1');
  await clickPrimary(page, /^Next$/);
  await shot(page, 'onboarding-2');
  await clickPrimary(page, /^Next$/);
  await shot(page, 'onboarding-3');
  await clickPrimary(page, /Get Started|Magsimula|Start/);

  // --- login ---
  await shot(page, 'login');
  await clickPrimary(page, /Send OTP/);
  await page.waitForTimeout(600);
  await shot(page, 'otp');
  await dump(page, 'OTP:');
  if (!(await clickPrimary(page, /Verify|Confirm|Continue|Login/))) {
    console.log('no verify button, tabbar?', await hasTabBar(page));
  }
  await page.waitForTimeout(800);
  if (!(await hasTabBar(page))) { await dump(page, 'AFTER-OTP:'); }

  // --- home ---
  await shot(page, 'home-top');
  await scrollApp(page, 'bottom');
  await shot(page, 'home-scrolled');
  await scrollApp(page, 0);

  // --- notifications (bell icon in header, textless, near avatar top-right) ---
  try {
    const bell = await page.evaluate(() => {
      let cands = [];
      for (const el of document.querySelectorAll('*')) {
        if (getComputedStyle(el).cursor !== 'pointer') continue;
        const r = el.getBoundingClientRect();
        const t = (el.innerText || '').trim();
        if (r.y < 110 && r.x > 250 && r.width > 15 && r.width < 60 && r.height < 60 && t.length <= 3) {
          cands.push({ x: r.x + r.width / 2, y: r.y + r.height / 2, t });
        }
      }
      return cands;
    });
    console.log('BELL CANDS', JSON.stringify(bell));
    const b = bell.find((x) => x.t === '') || bell[0];
    if (b) {
      await page.mouse.click(b.x, b.y);
      await page.waitForTimeout(900);
      await shot(page, 'notifications');
      await ensureHome(page);
    }
  } catch (e) { console.log('notif fail', e.message); }

  // --- search ---
  try {
    if (await clickPrimary(page, /Maghanap|Search|serbisyo o lugar/)) {
      await page.waitForTimeout(600);
      await page.keyboard.type('health', { delay: 40 }).catch(() => {});
      await page.waitForTimeout(700);
      await shot(page, 'search');
      await ensureHome(page);
    }
  } catch (e) { console.log('search fail', e.message); }

  // --- SOS ---
  await tab(page, 'SOS');
  await shot(page, 'sos');
  await dump(page, 'SOS:');
  await ensureHome(page);

  // --- services catalog + flow ---
  await tab(page, 'Services');
  await shot(page, 'services-catalog');
  const svc = summarize(await dumpTexts(page));
  const firstSvc = svc.find((s) => /Real Property Tax|Business Permit|Cedula|Community Tax/i.test(s) && s.length < 40);
  if (firstSvc && (await clickText(page, firstSvc))) {
    await shot(page, 'service-form');
    // fill purpose dropdown if present
    if (await clickPrimary(page, /Select purpose/i)) {
      await page.waitForTimeout(500);
      await dump(page, 'PURPOSE:');
      await clickPrimary(page, /Clearance|Payment|Renewal|Transfer|Loan|Requirement/i).catch(() => {});
      await page.waitForTimeout(400);
    }
    if (await clickPrimary(page, /Review Application|Review|Continue/)) {
      await shot(page, 'service-review-fees');
      await dump(page, 'REVIEW:');
      if (await clickPrimary(page, /Pay|Proceed|Confirm|Submit/)) {
        await shot(page, 'service-payment-success-qr');
        await dump(page, 'PAYMENT:');
        if (await clickPrimary(page, /^Pay ₱|^Pay Now/)) {
          await shot(page, 'service-qr-claim');
          await dump(page, 'QR:');
        }
      }
    }
  } else console.log('NO SERVICE FOUND');
  await ensureHome(page);

  // --- report flow ---
  if (await tile(page, 'Report')) {
    await shot(page, 'report-categories');
    const cats = summarize(await dumpTexts(page));
    console.log('CATS:', JSON.stringify(cats.slice(0, 30)));
    const cat = cats.find((s) => /Road|Garbage|Basura|Flood|Baha|Light|Ilaw|Pothole|Drainage|Noise/i.test(s) && s.length < 30);
    if (cat && (await clickText(page, cat))) {
      await page.waitForTimeout(400);
      await clickPrimary(page, /^Continue$|^Magpatuloy$/);
      await shot(page, 'report-form');
      await dump(page, 'REPORTFORM:');
      if (await clickPrimary(page, /Submit|Isumite|Send Report|I-report/)) {
        await shot(page, 'report-success-timeline');
        await dump(page, 'REPORTOK:');
      }
    }
  }
  await ensureHome(page);

  // --- assistance ---
  if (await tile(page, 'Assistance')) {
    await shot(page, 'assistance-programs');
    const progs = summarize(await dumpTexts(page));
    console.log('PROGS:', JSON.stringify(progs.slice(0, 25)));
    const prog = progs.find((s) => /AICS|Ayuda|Scholar|Medical|Burial|Livelihood|PWD|Senior/i.test(s) && s.length < 45);
    if (prog && (await clickText(page, prog))) {
      await shot(page, 'assistance-detail');
    }
  }
  await ensureHome(page);

  // --- hotlines ---
  if (await tile(page, 'Hotlines')) {
    await shot(page, 'hotlines');
    await dump(page, 'HOTLINES:');
  }
  await ensureHome(page);

  // --- news feed + article ---
  await tab(page, 'News');
  await shot(page, 'news-feed');
  const news = summarize(await dumpTexts(page));
  console.log('NEWS:', JSON.stringify(news.slice(0, 20)));
  const art = news.find((s) => s.length > 22 && s.length < 60 && !/Home|Services|More|SOS|ago|·|Search|Maghanap/i.test(s));
  console.log('ARTICLE PICK:', art);
  if (art && (await clickText(page, art.slice(0, 25)))) {
    await shot(page, 'news-article');
    await scrollApp(page, 'bottom');
    await shot(page, 'news-article-scrolled');
  }
  await ensureHome(page);

  // --- tourism grid + detail ---
  if (await tile(page, 'Tourism')) {
    await shot(page, 'tourism-grid');
    const t = summarize(await dumpTexts(page));
    console.log('TOURISM:', JSON.stringify(t.slice(0, 25)));
    const poi = t.find((s) => s.length > 6 && s.length < 35 && !/Home|Services|News|More|SOS|Search/i.test(s));
    if (poi && (await clickText(page, poi))) {
      await shot(page, 'tourism-detail');
      await scrollApp(page, 'bottom');
      await shot(page, 'tourism-detail-scrolled');
    }
  }
  await ensureHome(page);

  // --- single-level tiles ---
  for (const label of ['Directory', 'Transport', 'Health', 'Jobs', 'Events', 'Weather', 'Gov Services']) {
    if (await tile(page, label)) {
      await shot(page, label.toLowerCase().replace(/\s+/g, '-'));
      await ensureHome(page);
    } else console.log('tile missing:', label);
  }

  // --- more/profile ---
  await tab(page, 'More');
  await shot(page, 'more-profile');
  const more = summarize(await dumpTexts(page));
  console.log('MORE:', JSON.stringify(more.slice(0, 40)));
  // digital city ID
  if (await clickPrimary(page, /Digital.*ID|City ID|ID ng Lungsod/i)) {
    await shot(page, 'digital-city-id');
    await dump(page, 'ID:');
    if (await clickPrimary(page, /Activate/i)) {
      await page.waitForTimeout(800);
      await shot(page, 'digital-city-id-active');
    }
    await ensureHome(page);
    await tab(page, 'More');
  }
  for (const [re, name] of [[/Settings|Mga Setting/i, 'settings'], [/Help|Tulong|FAQ|Support/i, 'help'], [/My Requests|Aking|Transactions|History/i, 'my-requests']]) {
    if (await clickPrimary(page, re)) {
      await page.waitForTimeout(600);
      if (!(await hasTabBar(page)) || true) await shot(page, name);
      await ensureHome(page);
      await tab(page, 'More');
    }
  }
  // style guide screen (documents the design system)
  if (await clickPrimary(page, /Design System|Style Guide/i)) {
    await shot(page, 'style-guide-1');
    const sh = await page.evaluate(() => {
      let b = null;
      for (const el of document.querySelectorAll('*')) {
        if (el.scrollHeight > el.clientHeight + 100 && el.clientHeight > 300) {
          if (!b || el.scrollHeight > b.scrollHeight) b = el;
        }
      }
      return b ? b.scrollHeight : 0;
    });
    for (let i = 1; i <= Math.min(5, Math.ceil(sh / 800) - 1); i++) {
      await scrollApp(page, i * 800);
      await shot(page, 'style-guide-' + (i + 1));
    }
  } else console.log('no style guide');

  console.log('DONE', c.n - 1, 'shots');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
