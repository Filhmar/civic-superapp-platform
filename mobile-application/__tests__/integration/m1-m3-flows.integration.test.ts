/**
 * INTEGRATION — hits the REAL backend (no mocks) at http://localhost:3005.
 * The bundle id below is a TEST INPUT (the installed bundle id IS the tenant
 * key); no tenant string exists in app code. A random phone per run avoids
 * the 5/hour OTP rate limit.
 */
import axios from "axios";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3005";
const TENANT = "com.dasmarinas.app";

const client = axios.create({
  baseURL: BASE_URL,
  headers: { "X-Tenant-ID": TENANT },
});

function randomPhone(): string {
  const digits = String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  return `+6391${digits}`;
}

describe("M1–M3 flows (real backend)", () => {
  const phone = randomPhone();
  let accessToken = "";

  it("completes the full OTP flow using dev_code", async () => {
    const req = await client.post("/v1/otp/request", { phone_number: phone });
    expect(req.data.success).toBe(true);
    expect(req.data.data.requested).toBe(true);
    expect(req.data.data.expires_in_seconds).toBeGreaterThan(0);
    const devCode = req.data.data.dev_code as string;
    expect(devCode).toMatch(/^\d{6}$/);

    const verify = await client.post("/v1/otp/verify", {
      phone_number: phone,
      code: devCode,
    });
    expect(verify.data.success).toBe(true);
    const session = verify.data.data;
    expect(session.scope).toBe("resident");
    expect(session.access_token.length).toBeGreaterThan(10);
    expect(session.refresh_token.length).toBeGreaterThan(10);
    expect(session.user.phone_number).toBe(phone);
    expect(session.user.verified_resident).toBe(true);
    accessToken = session.access_token;
  });

  it("fetches the profile with the session token", async () => {
    const res = await client.get("/v1/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.data.success).toBe(true);
    expect(res.data.data.phone_number).toBe(phone);
    expect(typeof res.data.data.resident_id).toBe("string");
  });

  it("fetches the digital id with a QR token", async () => {
    const res = await client.get("/v1/digital-id", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.data.success).toBe(true);
    const id = res.data.data;
    expect(typeof id.resident_id).toBe("string");
    expect(id.qr_token.length).toBeGreaterThan(10);
    expect(id.qr_expires_in).toBeGreaterThan(0);
    expect(typeof id.valid_until).toBe("string");
  });

  it("creates a report with geo and gets a prefixed ticket + SUBMITTED timeline", async () => {
    const res = await client.post(
      "/v1/reports",
      {
        category_key: "pothole",
        description: "Integration test: pothole near the plaza",
        geo: { lat: 14.3294, lng: 120.9367 },
        address: "Integration Test St",
      },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(res.data.success).toBe(true);
    const report = res.data.data;
    expect(report.ticket_id).toMatch(/^DSM-\d{6}$/);
    expect(report.timeline[0].to).toBe("SUBMITTED");
    expect(report.status).toBe("SUBMITTED");

    // The ticket is retrievable by id and listed under "mine".
    const detail = await client.get(`/v1/reports/${report.ticket_id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(detail.data.data.ticket_id).toBe(report.ticket_id);

    const mine = await client.get("/v1/reports", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const ids = mine.data.data.map((r: { ticket_id: string }) => r.ticket_id);
    expect(ids).toContain(report.ticket_id);
  });

  it("returns 3 pinned posts", async () => {
    const res = await client.get("/v1/posts", { params: { pinned: true } });
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveLength(3);
    for (const post of res.data.data) {
      expect(post.pinned).toBe(true);
      expect(typeof post.title).toBe("string");
    }
  });

  it("returns weather with temp_c", async () => {
    const res = await client.get("/v1/weather");
    expect(res.data.success).toBe(true);
    expect(typeof res.data.data.temp_c).toBe("number");
    expect(typeof res.data.data.aqi).toBe("number");
    expect(typeof res.data.data.condition).toBe("string");
  });
});
