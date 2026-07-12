/**
 * Brand-asset seed (runtime, not DB): uploads a generated civic seal (SVG) and
 * a mayor avatar (PNG) for each tenant THROUGH the admin brand-asset pipeline
 * (presign → PUT to MinIO → confirm → PATCH branding). Fresh volumes ship the
 * config with dead relative asset paths; this replaces them with real, fetchable
 * http(s) URLs so clients render real branding instead of monogram fallbacks.
 *
 * Pure data + generated art — reads each tenant's own colors/prefix/executive
 * from its config (no per-tenant constants here). Requires the gateway + MinIO
 * running. Run: npx ts-node -P tsconfig.scripts.json scripts/seed-brand-assets.ts
 */
import "dotenv/config";
import { setDefaultResultOrder } from "node:dns";
import axios from "axios";
import sharp from "sharp";

// Host-side runs on Windows: Node ≥17 resolves localhost to ::1 first while
// docker port maps bind 127.0.0.1 only. Connect via 127.0.0.1 but preserve
// the original Host header — the S3 presigned signature covers Host.
setDefaultResultOrder("ipv4first");
const ipv4 = (url: string): string =>
  url.replace(/^(https?:\/\/)localhost([:/])/, "$1127.0.0.1$2");

const BASE = ipv4(process.env.SEED_BASE_URL ?? "http://localhost:3005/v1");
const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL ?? "admin@platform.local";
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? "PlatformAdmin!2026";
const BUNDLES = ["com.dasmarinas.app", "com.sorsogon.app", "com.legazpi.app"];

function initialsOf(name: string): string {
  const parts = name.replace(/[.,]/g, "").trim().split(/\s+/).filter(Boolean);
  // Drop honorifics so "Hon. Jenny Austria-Barzaga" → "JA".
  const words = parts.filter((p) => !/^(hon|mayor|atty|dr|engr|sir)$/i.test(p));
  const pick = words.length ? words : parts;
  return ((pick[0]?.[0] ?? "") + (pick[pick.length - 1]?.[0] ?? "")).toUpperCase();
}

function sealSvg(code: string, primary: string, primaryDark: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <circle cx="120" cy="120" r="114" fill="${primaryDark}"/>
  <circle cx="120" cy="120" r="106" fill="${primary}"/>
  <circle cx="120" cy="120" r="88" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="3"/>
  <text x="120" y="152" font-family="Arial, Helvetica, sans-serif" font-size="78" font-weight="bold" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">${code}</text>
</svg>`;
}

function avatarSvg(initials: string, primary: string, primaryDark: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${primaryDark}"/><stop offset="1" stop-color="${primary}"/>
  </linearGradient></defs>
  <rect width="200" height="200" fill="url(#g)"/>
  <text x="100" y="132" font-family="Arial, Helvetica, sans-serif" font-size="92" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${initials}</text>
</svg>`;
}

interface Cfg {
  tenant_id: string;
  identifiers: { ticket_prefix: string };
  brand: { colors: { primary: string; primaryDark: string }; executive: { name: string } };
}

async function main(): Promise<void> {
  const anon = axios.create({ baseURL: BASE, validateStatus: () => true });
  const login = await anon.post("/admin/auth/login", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  const token = login.data?.data?.access_token as string | undefined;
  if (!token) throw new Error(`admin login failed: ${login.status} ${JSON.stringify(login.data)}`);
  const admin = axios.create({
    baseURL: BASE,
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true,
  });

  async function upload(tenantId: string, contentType: string, bytes: Buffer): Promise<string> {
    const pre = await admin.post("/admin/assets/presign", {
      content_type: contentType,
      kind: "brand",
      tenant_id: tenantId,
    });
    const { media_id, upload_url } = pre.data.data as { media_id: string; upload_url: string };
    const signedHost = new URL(upload_url).host;
    const put = await axios.put(ipv4(upload_url), bytes, {
      headers: { "Content-Type": contentType, Host: signedHost },
      validateStatus: () => true,
      maxBodyLength: Infinity,
    });
    if (put.status < 200 || put.status >= 300) {
      throw new Error(`PUT ${contentType} failed: ${put.status}`);
    }
    const conf = await admin.post(`/admin/assets/${media_id}/confirm`, { tenant_id: tenantId });
    const url = conf.data?.data?.url as string | undefined;
    if (!url) throw new Error(`confirm failed: ${conf.status} ${JSON.stringify(conf.data)}`);
    return url;
  }

  async function patchBranding(tenantId: string, brand: Record<string, unknown>): Promise<void> {
    const res = await admin.patch(`/admin/tenants/${tenantId}/config/branding`, {
      branding: { brand },
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`branding patch failed: ${res.status} ${JSON.stringify(res.data)}`);
    }
  }

  for (const bundle of BUNDLES) {
    const cfgRes = await anon.get("/config", { headers: { "X-Tenant-ID": bundle } });
    if (cfgRes.status !== 200) {
      console.log(`skip ${bundle} (config ${cfgRes.status})`);
      continue;
    }
    const cfg = cfgRes.data.data.config as Cfg;
    const { primary, primaryDark } = cfg.brand.colors;
    const tenantId = cfg.tenant_id;

    const sealPng = await sharp(Buffer.from(sealSvg(cfg.identifiers.ticket_prefix, primary, primaryDark)))
      .png()
      .toBuffer();
    const sealUrl = await upload(tenantId, "image/png", sealPng);
    await patchBranding(tenantId, { logo: { assets: { seal: sealUrl } } });

    const avatarPng = await sharp(
      Buffer.from(avatarSvg(initialsOf(cfg.brand.executive.name), primary, primaryDark)),
    )
      .png()
      .toBuffer();
    const photoUrl = await upload(tenantId, "image/png", avatarPng);
    await patchBranding(tenantId, { executive: { photo: photoUrl } });

    console.log(`${tenantId}: seal + mayor photo uploaded`);
    console.log(`  seal  = ${sealUrl}`);
    console.log(`  photo = ${photoUrl}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
