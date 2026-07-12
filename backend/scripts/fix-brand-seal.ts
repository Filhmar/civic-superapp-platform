/**
 * One-shot brand-asset fix: strips the near-white background around each
 * tenant's uploaded seal (corner flood fill) and derives a white-silhouette
 * watermark from the cleaned alpha channel. Uploads THROUGH the admin
 * brand-asset pipeline (presign → PUT → confirm → PATCH branding), same as
 * seed-brand-assets.ts. Pure data fix — no app code involved.
 *
 * Idempotent: seals whose corners are already transparent are skipped.
 * Best-effort limit: flood fill can only strip background AROUND the artwork.
 * If the art itself is an opaque tile (post-strip opaque coverage ≥ 70% of
 * the canvas), the tile is reported and the watermark derivation is skipped
 * for that tenant (the app hides absent watermarks); the definitive fix is
 * uploading real transparent artwork via the tenant admin panel.
 *
 * Requires the gateway + MinIO running.
 * Run: npx ts-node -P tsconfig.scripts.json scripts/fix-brand-seal.ts
 */
import "dotenv/config";
import { setDefaultResultOrder } from "node:dns";
import axios from "axios";
import sharp from "sharp";

// Stored asset URLs use "localhost" (host-mapped docker ports on IPv4);
// Node ≥17 resolves localhost to ::1 first on Windows — force IPv4 and
// rewrite outgoing localhost URLs defensively.
setDefaultResultOrder("ipv4first");
const ipv4 = (url: string): string =>
  url.replace(/^(https?:\/\/)localhost([:/])/, "$1127.0.0.1$2");

const BASE = ipv4(process.env.SEED_BASE_URL ?? "http://localhost:3005/v1");
const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL ?? "admin@platform.local";
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? "PlatformAdmin!2026";
const BUNDLES = ["com.dasmarinas.app", "com.sorsogon.app", "com.legazpi.app"];

/** r, g and b all at/above this = background candidate for the flood fill. */
const NEAR_WHITE = 240;
/**
 * Post-strip opaque coverage at/above this = artwork is an opaque tile.
 * A legitimate full-bleed circular seal covers ~π/4 ≈ 79% of its square
 * canvas; an opaque rounded-square tile covers ~95–100%.
 */
const TILE_COVERAGE = 0.9;

interface Cfg {
  tenant_id: string;
  brand: { logo?: { assets?: { seal?: string; watermark?: string } } };
}

interface StripResult {
  cleaned: Buffer;
  opaqueCoverage: number;
  alreadyTransparent: boolean;
}

async function stripBackground(input: Buffer): Promise<StripResult> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const px = (x: number, y: number) => (y * width + x) * 4;
  const isBg = (i: number) =>
    data[i + 3] > 0 &&
    data[i] >= NEAR_WHITE &&
    data[i + 1] >= NEAR_WHITE &&
    data[i + 2] >= NEAR_WHITE;

  const cornerIdx = [
    px(0, 0),
    px(width - 1, 0),
    px(0, height - 1),
    px(width - 1, height - 1),
  ];
  const alreadyTransparent = cornerIdx.every((i) => data[i + 3] === 0);

  if (!alreadyTransparent) {
    // BFS flood fill from all four corners through near-white pixels → alpha 0.
    const stack: Array<[number, number]> = [
      [0, 0],
      [width - 1, 0],
      [0, height - 1],
      [width - 1, height - 1],
    ];
    const seen = new Uint8Array(width * height);
    while (stack.length) {
      const [x, y] = stack.pop() as [number, number];
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const flat = y * width + x;
      if (seen[flat]) continue;
      seen[flat] = 1;
      const i = px(x, y);
      if (!isBg(i)) continue;
      data[i + 3] = 0;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }

  let opaque = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 16) opaque++;

  return {
    cleaned: await sharp(data, { raw: { width, height, channels: 4 } })
      .png()
      .toBuffer(),
    opaqueCoverage: opaque / (width * height),
    alreadyTransparent,
  };
}

/** White pixels, original alpha — a silhouette for gradient watermarks. */
async function whiteSilhouette(cleanedPng: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(cleanedPng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
  }
  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function main(): Promise<void> {
  const anon = axios.create({ baseURL: BASE, validateStatus: () => true });
  const login = await anon.post("/admin/auth/login", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  const token = login.data?.data?.access_token as string | undefined;
  if (!token) {
    throw new Error(
      `admin login failed: ${login.status} ${JSON.stringify(login.data)}`,
    );
  }
  const admin = axios.create({
    baseURL: BASE,
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true,
  });

  async function upload(tenantId: string, bytes: Buffer): Promise<string> {
    const pre = await admin.post("/admin/assets/presign", {
      content_type: "image/png",
      kind: "brand",
      tenant_id: tenantId,
    });
    const { media_id, upload_url } = pre.data.data as {
      media_id: string;
      upload_url: string;
    };
    const put = await axios.put(ipv4(upload_url), bytes, {
      headers: { "Content-Type": "image/png" },
      validateStatus: () => true,
      maxBodyLength: Infinity,
    });
    if (put.status < 200 || put.status >= 300) {
      throw new Error(`PUT failed: ${put.status}`);
    }
    const conf = await admin.post(`/admin/assets/${media_id}/confirm`, {
      tenant_id: tenantId,
    });
    const url = conf.data?.data?.url as string | undefined;
    if (!url) {
      throw new Error(`confirm failed: ${conf.status} ${JSON.stringify(conf.data)}`);
    }
    return url;
  }

  async function patchBranding(
    tenantId: string,
    brand: Record<string, unknown>,
  ): Promise<void> {
    const res = await admin.patch(`/admin/tenants/${tenantId}/config/branding`, {
      branding: { brand },
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(
        `branding patch failed: ${res.status} ${JSON.stringify(res.data)}`,
      );
    }
  }

  for (const bundle of BUNDLES) {
    const cfgRes = await anon.get("/config", {
      headers: { "X-Tenant-ID": bundle },
    });
    if (cfgRes.status !== 200) {
      console.log(`skip ${bundle} (config ${cfgRes.status})`);
      continue;
    }
    const cfg = cfgRes.data.data.config as Cfg;
    const tenantId = cfg.tenant_id;
    const sealUrl = cfg.brand.logo?.assets?.seal;
    if (!sealUrl || !/^https?:\/\//.test(sealUrl)) {
      console.log(`${tenantId}: no uploaded seal — skip`);
      continue;
    }

    const dl = await axios.get<ArrayBuffer>(ipv4(sealUrl), {
      responseType: "arraybuffer",
      validateStatus: () => true,
    });
    if (dl.status !== 200) {
      console.log(`${tenantId}: seal download failed (${dl.status}) — skip`);
      continue;
    }

    const { cleaned, opaqueCoverage, alreadyTransparent } =
      await stripBackground(Buffer.from(dl.data));

    if (alreadyTransparent) {
      console.log(`${tenantId}: seal corners already transparent — seal kept`);
    } else {
      const newSeal = await upload(tenantId, cleaned);
      await patchBranding(tenantId, { logo: { assets: { seal: newSeal } } });
      console.log(`${tenantId}: seal background stripped`);
      console.log(`  seal      = ${newSeal}`);
    }

    if (opaqueCoverage >= TILE_COVERAGE) {
      console.log(
        `${tenantId}: WARNING — artwork is an opaque tile (coverage ${(opaqueCoverage * 100).toFixed(0)}%). ` +
          `Watermark NOT derived; upload transparent artwork via the tenant admin panel.`,
      );
      continue;
    }

    const existingWatermark = cfg.brand.logo?.assets?.watermark;
    if (existingWatermark && /^https?:\/\//.test(existingWatermark)) {
      console.log(`${tenantId}: watermark already set — kept`);
      continue;
    }

    const watermarkUrl = await upload(tenantId, await whiteSilhouette(cleaned));
    await patchBranding(tenantId, {
      logo: { assets: { watermark: watermarkUrl } },
    });
    console.log(`  watermark = ${watermarkUrl}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
