/**
 * INTEGRATION — hits the REAL backend (no mocks). Requires the config service
 * running at http://localhost:3005. The two bundle ids below are TEST INPUTS
 * (the installed bundle id IS the tenant key); no tenant string exists in app
 * code.
 */
import axios from "axios";

import type { TenantConfigEnvelope } from "@/types/config";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3005";
const TENANT_A = "com.dasmarinas.app";
const TENANT_B = "com.sorsogon.app";

async function fetchConfig(tenantId: string): Promise<TenantConfigEnvelope> {
  const res = await axios.get<{ success: boolean; data: TenantConfigEnvelope }>(
    `${BASE_URL}/v1/config`,
    { headers: { "X-Tenant-ID": tenantId } },
  );
  expect(res.status).toBe(200);
  expect(res.data.success).toBe(true);
  return res.data.data;
}

describe("GET /v1/config (real backend, both tenants)", () => {
  it("returns tenant-specific config that differs across tenants", async () => {
    const [a, b] = await Promise.all([
      fetchConfig(TENANT_A),
      fetchConfig(TENANT_B),
    ]);

    // Envelope shape.
    for (const env of [a, b]) {
      expect(typeof env.version).toBe("number");
      expect(typeof env.app_min_supported_version).toBe("string");
      expect(env.config.onboarding).toHaveLength(3);
    }

    // Everything tenant-facing differs — proof the app is config-driven.
    expect(a.config.app.name).not.toBe(b.config.app.name);
    expect(a.config.brand.colors.primary).not.toBe(b.config.brand.colors.primary);
    expect(a.config.brand.colors.primaryDark).not.toBe(
      b.config.brand.colors.primaryDark,
    );
    expect(a.config.brand.slogan).not.toBe(b.config.brand.slogan);
    expect(a.config.identifiers.ticket_prefix).not.toBe(
      b.config.identifiers.ticket_prefix,
    );

    // Module flags come from data; health is off for both tenants today.
    expect(a.config.modules.health).toBe(false);
    expect(b.config.modules.health).toBe(false);
  });

  it("serves an uploaded executive photo as a reachable absolute URL", async () => {
    const a = await fetchConfig(TENANT_A);
    const photo = a.config.brand.executive.photo;
    expect(photo).toMatch(/^https?:\/\//);

    // The asset itself must be publicly fetchable.
    const res = await axios.get(photo, {
      responseType: "arraybuffer",
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it("400s without X-Tenant-ID and 404s for an unknown tenant", async () => {
    const missing = await axios.get(`${BASE_URL}/v1/config`, {
      validateStatus: () => true,
    });
    expect(missing.status).toBe(400);

    const unknown = await axios.get(`${BASE_URL}/v1/config`, {
      headers: { "X-Tenant-ID": "com.unknown.tenant" },
      validateStatus: () => true,
    });
    expect(unknown.status).toBe(404);
  });
});
