/**
 * RE-VERIFICATION SUITE (TRACEABILITY pass 2).
 * Runs the full Reference §10 flow against BOTH seeded tenants through the
 * public gateway, asserting that identical code yields tenant-specific data.
 *   ts-node scripts/verify-e2e.ts [baseUrl]
 */
import axios, { AxiosInstance } from 'axios';
import { io } from 'socket.io-client';

const BASE = process.argv[2] ?? 'http://localhost:3005';

interface TenantSpec {
  bundle: string;
  name: string;
  primary: string;
  slogan: string;
  executive: string;
  prefix: string;
  cedulaFee: number;
  rescueOrgIncludes: string;
  phone: string;
}

const TENANTS: TenantSpec[] = [
  {
    bundle: 'com.dasmarinas.app',
    name: 'MyDasma',
    primary: '#1E8449',
    slogan: 'Sulong na! Sulong pa!',
    executive: 'Hon. Jenny Austria-Barzaga',
    prefix: 'DSM',
    cedulaFee: 100,
    rescueOrgIncludes: 'Dasmariñas',
    phone: `+6391${String(Math.floor(10000000 + Math.random() * 89999999))}`,
  },
  {
    bundle: 'com.sorsogon.app',
    name: 'MySorsogon',
    primary: '#1B4F9C',
    slogan: 'Taas-Noo, Ciudadano Ako!',
    executive: 'Hon. Ma. Ester E. Hamor',
    prefix: 'SOR',
    cedulaFee: 80,
    rescueOrgIncludes: 'Sorsogon',
    phone: `+6392${String(Math.floor(10000000 + Math.random() * 89999999))}`,
  },
];

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean, detail?: unknown): void {
  if (cond) {
    passed++;
    console.log(`  ✔ ${label}`);
  } else {
    failed++;
    console.log(`  ✘ ${label} — ${JSON.stringify(detail)}`);
  }
}

function client(bundle: string, token?: string): AxiosInstance {
  return axios.create({
    baseURL: `${BASE}/v1`,
    headers: {
      'X-Tenant-ID': bundle,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    validateStatus: () => true,
  });
}

async function verifyTenant(t: TenantSpec): Promise<void> {
  console.log(`\n=== ${t.name} (${t.bundle}) ===`);
  const anon = client(t.bundle);

  // Rows 1,2,8,10,13,27: config-driven boot
  const cfg = (await anon.get('/config')).data.data;
  check('config: app name from data', cfg.config.app.name === t.name);
  check('config: primary color', cfg.config.brand.colors.primary === t.primary, cfg.config.brand.colors.primary);
  check('config: slogan', cfg.config.brand.slogan === t.slogan);
  check('config: executive', cfg.config.brand.executive.name === t.executive);
  check('config: 3 onboarding slides', cfg.config.onboarding.length === 3);
  check('config: modules off = health,jobs', !cfg.config.modules.health && !cfg.config.modules.jobs);
  check('config: locales en+fil', JSON.stringify(cfg.config.locales) === '["en","fil"]');
  check('config: min app version present (force-update)', typeof cfg.app_min_supported_version === 'string');

  // Row 3: OTP → JWT
  const otp = (await anon.post('/otp/request', { phone_number: t.phone })).data.data;
  check('otp: dev_code issued', typeof otp.dev_code === 'string');
  const verify = (await anon.post('/otp/verify', { phone_number: t.phone, code: otp.dev_code })).data.data;
  check(`resident id prefixed ${t.prefix}-YYYY-`, new RegExp(`^${t.prefix}-\\d{4}-\\d{6}$`).test(verify.user.resident_id), verify.user.resident_id);
  const access = verify.access_token as string;
  const refresh = verify.refresh_token as string;
  const me = client(t.bundle, access);

  // refresh rotation + reuse detection
  const rot = (await anon.post('/auth/refresh', { refresh_token: refresh })).data.data;
  check('refresh rotates', rot.refresh_token !== refresh);
  const reuse = await anon.post('/auth/refresh', { refresh_token: refresh });
  check('rotated-token reuse rejected 401', reuse.status === 401, reuse.status);

  // guest + scope
  const guest = (await anon.post('/auth/guest')).data.data;
  const guestClient = client(t.bundle, guest.access_token);
  const guestDigital = await guestClient.get('/digital-id');
  check('guest blocked from resident-only (403)', guestDigital.status === 403, guestDigital.status);

  // cross-tenant token rejection
  const other = TENANTS.find((x) => x.bundle !== t.bundle)!;
  const cross = await client(other.bundle, access).get('/profile');
  check('cross-tenant token rejected 401', cross.status === 401, cross.status);

  // Row 4, 26/27: profile + language + barangay from config
  const unit = cfg.config.geo.units[3];
  const prof = (await me.patch('/profile', { name: 'Verify Bot', unit, language: 'fil' })).data.data;
  check('profile: barangay from config geo.units', prof.unit === unit);
  const badUnit = await me.patch('/profile', { unit: 'Nonexistent Barangay' });
  check('profile: bogus barangay rejected 400', badUnit.status === 400, badUnit.status);

  // Row 26: digital id + public verify
  const did = (await me.get('/digital-id')).data.data;
  check('digital id QR token', typeof did.qr_token === 'string');
  const pub = (await axios.get(`${BASE}/v1/verify/${did.qr_token}`, { validateStatus: () => true })).data.data;
  check('public QR verify carries tenant in payload', pub.tenant_id === cfg.config.tenant_id && pub.valid === true, pub);

  // Rows 9,21: posts
  const pinned = (await anon.get('/posts?pinned=true')).data.data;
  check('3 pinned posts (carousel)', pinned.length === 3, pinned.length);
  const news = (await anon.get('/posts?category=TOURISM')).data.data;
  check('category filter works', news.every((p: { category: string }) => p.category === 'TOURISM'));

  // Row 11: weather from tenant centroid
  const weather = (await anon.get('/weather')).data.data;
  check('weather centroid matches config', JSON.stringify(weather.centroid) === JSON.stringify(cfg.config.geo.centroid), weather.centroid);

  // Rows 16,17: report 311 + audited timeline
  const cats = (await anon.get('/reports/categories')).data.data;
  check('6 report categories', cats.length === 6, cats.length);
  const ticket = (
    await me.post('/reports', {
      category_key: 'pothole',
      description: 'E2E verification pothole report.',
      geo: { lat: cfg.config.geo.centroid[0], lng: cfg.config.geo.centroid[1] },
    })
  ).data.data;
  check(`ticket id ${t.prefix}-######`, new RegExp(`^${t.prefix}-\\d{6}$`).test(ticket.ticket_id), ticket.ticket_id);
  check('timeline[0] audited SUBMITTED', ticket.timeline[0].to === 'SUBMITTED' && !!ticket.timeline[0].actor && !!ticket.timeline[0].at);

  // Rows 14,15: e-gov flow with fees + ₱20 and payments
  const catalog = (await anon.get('/services')).data.data;
  const ctc = catalog.flatMap((g: { services: { code: string; fee: number }[] }) => g.services).find((s: { code: string }) => s.code === 'CTC');
  check(`cedula fee is tenant data (${t.cedulaFee})`, ctc.fee === t.cedulaFee, ctc.fee);
  const app = (await me.post('/applications', { service_code: 'CTC', form_data: { full_name: 'Verify Bot' } })).data.data;
  check(`claim stub ${t.prefix}-CTC-######`, new RegExp(`^${t.prefix}-CTC-\\d{6}$`).test(app.stub_id), app.stub_id);
  check('quote total = fee + convenience 20', app.fees.total === app.fees.fee + 20 && app.fees.convenience_fee === 20, app.fees);
  const idem = `e2e-${t.prefix}-${app.application_id}`;
  const pay = (await me.post('/payments', { application_id: app.application_id, method: 'gcash', idempotency_key: idem })).data.data;
  check(`receipt ${t.prefix}-OR-YYYY-######`, new RegExp(`^${t.prefix}-OR-\\d{4}-\\d{6}$`).test(pay.payment.receipt_no), pay.payment.receipt_no);
  check('application → PROCESSING after payment', pay.application.status === 'PROCESSING');
  const replay = (await me.post('/payments', { application_id: app.application_id, method: 'gcash', idempotency_key: idem })).data.data;
  check('idempotent replay (same receipt, no double charge)', replay.idempotent_replay === true && replay.payment.receipt_no === pay.payment.receipt_no);

  // Row 18: assistance
  const programs = (await anon.get('/assistance/programs')).data.data;
  check('5 assistance programs', programs.length === 5, programs.length);
  const areq = (await me.post('/assistance/requests', { program_key: 'medical', details: 'E2E verification request.' })).data.data;
  check(`assistance id ${t.prefix}-AST-######`, new RegExp(`^${t.prefix}-AST-\\d{6}$`).test(areq.request_id), areq.request_id);
  check('requirement checklist attached', areq.checklist.length > 0);

  // Rows 7,19,20: SOS + hotlines
  const hotlines = (await anon.get('/hotlines?tag=rescue')).data.data;
  check('rescue hotline is tenant data', hotlines[0].org.includes(t.rescueOrgIncludes), hotlines[0].org);
  const sos = (await me.post('/sos/sessions', { lat: cfg.config.geo.centroid[0], lng: cfg.config.geo.centroid[1] })).data.data;
  check(`sos id ${t.prefix}-SOS-######`, new RegExp(`^${t.prefix}-SOS-\\d{6}$`).test(sos.session_id), sos.session_id);
  // WS stream
  const socket = io(`${BASE}/sos`, { auth: { token: access, tenant: t.bundle }, transports: ['websocket'] });
  const wsOk = await new Promise<boolean>((resolve) => {
    socket.on('connect', () => resolve(true));
    socket.on('connect_error', () => resolve(false));
    setTimeout(() => resolve(false), 4000);
  });
  check('sos websocket connects', wsOk);
  if (wsOk) {
    const ack = (await socket
      .timeout(3000)
      .emitWithAck('sos:location', { session_id: sos.session_id, lat: 14.0, lng: 121.0 })
      .catch(() => null)) as { received?: boolean } | null;
    check('ws location acked + persisted', ack?.received === true, ack);
  }
  socket.disconnect();
  const closed = (await me.post(`/sos/sessions/${sos.session_id}/close`)).data.data;
  check('sos closed with location trail', closed.status === 'CLOSED' && closed.location_count >= 2, closed.location_count);

  // Rows 22,23: places
  const tourism = (await me.get('/places?kind=tourism')).data.data;
  check('tourism grid has open_now/rating', tourism.length > 0 && 'open_now' in tourism[0] && 'rating' in tourism[0]);
  await me.put(`/places/${tourism[0].id}/favorite`);
  const favd = (await me.get(`/places/${tourism[0].id}`)).data.data;
  check('favorite ♥ persists', favd.favorite === true);
  await me.delete(`/places/${tourism[0].id}/favorite`);
  const dir = (await anon.get('/places?kind=business')).data.data;
  check('directory (business) non-empty', dir.length > 0);
  const nearby = (await anon.get(`/places?near=${cfg.config.geo.centroid[0]},${cfg.config.geo.centroid[1]}&limit=3`)).data.data;
  check('nearby strip distance-sorted', nearby.length === 3 && nearby[0].distance_km <= nearby[2].distance_km);

  // Row 24: transport
  const routes = (await anon.get('/transport/routes')).data.data;
  check('transport routes with fares', routes.length > 0 && routes[0].fare_min > 0);

  // Rows 6: federated search + recents
  const search = (await me.get('/search?q=city')).data.data;
  check('federated search returns sections', 'places' in search && 'posts' in search && 'hotlines' in search && 'services' in search);
  const recents = (await me.get('/search/recent')).data.data;
  check('recent searches recorded', Array.isArray(recents) && recents.includes('city'), recents);

  // Rows 25,5: notifications from status machines (payment created some)
  const unread = (await me.get('/notifications/unread-count')).data.data;
  check('unread badge > 0 after payment event', unread.unread > 0, unread);
  const inbox = (await me.get('/notifications')).data.data;
  check('inbox has PROCESSING notification', inbox.some((n: { title: string }) => n.title.includes(app.stub_id)));

  // Row 28: FAQ + feedback + logout
  const faqFil = (await anon.get('/faq?locale=fil')).data.data;
  check('FAQ localized (fil)', faqFil.length > 0);
  const fb = (await me.post('/feedback', { message: 'E2E verification feedback.' })).data.data;
  check('feedback intake', fb.received === true);
  const lo = (await me.post('/auth/logout')).data.data;
  check('logout', lo.logged_out === true);
  const after = await me.get('/profile');
  check('access revoked immediately after logout (401)', after.status === 401, after.status);
}

async function verifyToggleInertness(): Promise<void> {
  console.log('\n=== Module-toggle inertness (same code, config-only difference) ===');
  // Uses the control-plane script path: flip transport off for Sorsogon.
  const { execSync } = await import('node:child_process');
  const anonSor = client('com.sorsogon.app');
  const anonDsm = client('com.dasmarinas.app');
  execSync('npx ts-node -P tsconfig.scripts.json scripts/toggle-module.ts ph-sorsogon-sorsogoncity transport false', { stdio: 'pipe' });
  const off = await anonSor.get('/transport/routes');
  const dsmOn = await anonDsm.get('/transport/routes');
  const cfgOff = (await anonSor.get('/config')).data.data.config.modules.transport;
  check('transport OFF for Sorsogon → 403 (inert)', off.status === 403, off.status);
  check('transport still live for MyDasma → 200', dsmOn.status === 200, dsmOn.status);
  check('Sorsogon config now hides the tile (transport=false)', cfgOff === false);
  execSync('npx ts-node -P tsconfig.scripts.json scripts/toggle-module.ts ph-sorsogon-sorsogoncity transport true', { stdio: 'pipe' });
  const restored = await anonSor.get('/transport/routes');
  check('restored via config version append → 200', restored.status === 200, restored.status);
}

async function main(): Promise<void> {
  for (const t of TENANTS) await verifyTenant(t);
  await verifyToggleInertness();
  console.log(`\n==== RESULT: ${passed} passed, ${failed} failed ====`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
