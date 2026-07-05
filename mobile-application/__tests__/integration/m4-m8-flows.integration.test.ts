/**
 * INTEGRATION — hits the REAL backend (no mocks) at http://localhost:3005.
 * Bundle ids are TEST INPUTS (the installed bundle id IS the tenant key).
 * Random phone per run avoids the OTP rate limit.
 */
import axios from "axios";
import { randomUUID } from "crypto";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3005";
const TENANT_A = "com.dasmarinas.app";
const TENANT_B = "com.sorsogon.app";

const client = axios.create({
  baseURL: BASE_URL,
  headers: { "X-Tenant-ID": TENANT_A },
});

function randomPhone(): string {
  const digits = String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  return `+6391${digits}`;
}

let accessToken = "";
const auth = () => ({ Authorization: `Bearer ${accessToken}` });

beforeAll(async () => {
  const phone = randomPhone();
  const req = await client.post("/v1/otp/request", { phone_number: phone });
  const verify = await client.post("/v1/otp/verify", {
    phone_number: phone,
    code: req.data.data.dev_code,
  });
  accessToken = verify.data.data.access_token;
});

describe("M4 e-gov flow (real backend)", () => {
  it("catalog → apply → pay (gcash) → idempotent replay", async () => {
    const catalog = await client.get("/v1/services");
    expect(catalog.data.success).toBe(true);
    const groups = catalog.data.data as {
      group: string;
      services: { code: string; fee: number }[];
    }[];
    expect(groups.length).toBeGreaterThan(0);
    const service = groups[0].services[0];

    const created = await client.post(
      "/v1/applications",
      {
        service_code: service.code,
        form_data: { full_name: "Integration Tester", purpose: "Testing" },
      },
      { headers: auth() },
    );
    expect(created.data.success).toBe(true);
    const app = created.data.data;
    expect(app.stub_id).toMatch(/^DSM-[A-Z]+-\d{6}$/);
    expect(typeof app.application_id).toBe("string");
    expect(app.status).toBe("PENDING_PAYMENT");
    expect(app.fees.total).toBe(app.fees.fee + app.fees.convenience_fee);

    const idempotencyKey = randomUUID();
    const paid = await client.post(
      "/v1/payments",
      {
        application_id: app.application_id,
        method: "gcash",
        idempotency_key: idempotencyKey,
      },
      { headers: auth() },
    );
    expect(paid.data.success).toBe(true);
    const payment = paid.data.data;
    expect(payment.payment.receipt_no).toMatch(/^DSM-OR-\d{4}-\d{6}$/);
    expect(payment.application.status).toBe("PROCESSING");

    // Replay with the same idempotency key → same receipt, flagged replay.
    const replay = await client.post(
      "/v1/payments",
      {
        application_id: app.application_id,
        method: "gcash",
        idempotency_key: idempotencyKey,
      },
      { headers: auth() },
    );
    expect(replay.data.data.idempotent_replay).toBe(true);
    expect(replay.data.data.payment.receipt_no).toBe(
      payment.payment.receipt_no,
    );
  });
});

describe("M5 assistance (real backend)", () => {
  it("lists 5 programs and creates a request with a checklist", async () => {
    const programs = await client.get("/v1/assistance/programs");
    expect(programs.data.data).toHaveLength(5);

    const created = await client.post(
      "/v1/assistance/requests",
      {
        program_key: programs.data.data[0].key,
        details: "Integration test request",
      },
      { headers: auth() },
    );
    const request = created.data.data;
    expect(request.checklist.length).toBeGreaterThan(0);
    expect(request.status).toBe("SUBMITTED");
    expect(request.request_id).toMatch(/^DSM-AST-\d{6}$/);
  });
});

describe("M6 SOS (real backend)", () => {
  it("open → 2 location posts → close with location_count 3", async () => {
    const opened = await client.post(
      "/v1/sos/sessions",
      { lat: 14.3294, lng: 120.9367 },
      { headers: auth() },
    );
    const session = opened.data.data;
    expect(session.session_id).toMatch(/^DSM-SOS-\d{6}$/);
    expect(session.status).toBe("OPEN");

    for (const geo of [
      { lat: 14.3295, lng: 120.9368 },
      { lat: 14.3296, lng: 120.9369 },
    ]) {
      const posted = await client.post(
        `/v1/sos/sessions/${session.session_id}/location`,
        geo,
        { headers: auth() },
      );
      expect(posted.data.data.received).toBe(true);
    }

    const closed = await client.post(
      `/v1/sos/sessions/${session.session_id}/close`,
      undefined,
      { headers: auth() },
    );
    expect(closed.data.data.status).toBe("CLOSED");
    expect(closed.data.data.location_count).toBe(3);
  });
});

describe("M7 places / transport / search (real backend)", () => {
  it("tourism places expose open_now and favorite toggles round-trip", async () => {
    const list = await client.get("/v1/places", {
      params: { kind: "tourism" },
      headers: auth(),
    });
    const places = list.data.data;
    expect(places.length).toBeGreaterThan(0);
    for (const place of places) {
      expect(typeof place.open_now).toBe("boolean");
    }

    const id = places[0].id;
    await client.put(`/v1/places/${id}/favorite`, undefined, {
      headers: auth(),
    });
    const detail = await client.get(`/v1/places/${id}`, { headers: auth() });
    expect(detail.data.data.favorite).toBe(true);
    await client.delete(`/v1/places/${id}/favorite`, { headers: auth() });
    const after = await client.get(`/v1/places/${id}`, { headers: auth() });
    expect(after.data.data.favorite).toBe(false);
  });

  it("matches a transport route from Bayan to Salitran", async () => {
    const res = await client.get("/v1/transport/match", {
      params: { from: "Bayan", to: "Salitran" },
    });
    expect(res.data.data.length).toBeGreaterThanOrEqual(1);
  });

  it("search 'city' returns non-empty places for the second tenant", async () => {
    const res = await axios.get(`${BASE_URL}/v1/search`, {
      params: { q: "city" },
      headers: { "X-Tenant-ID": TENANT_B },
    });
    expect(res.data.data.places.length).toBeGreaterThan(0);
  });
});

describe("M8 faq (real backend)", () => {
  it("returns a non-empty fil FAQ", async () => {
    const res = await client.get("/v1/faq", { params: { locale: "fil" } });
    expect(res.data.data.length).toBeGreaterThan(0);
    expect(typeof res.data.data[0].question).toBe("string");
  });
});
