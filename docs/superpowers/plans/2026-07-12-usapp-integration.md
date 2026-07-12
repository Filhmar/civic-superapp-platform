# Usapp Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver OTP codes and fan out in-app notifications through Usapp (`app.usapp.ph`), with `integration-service` owning the single Usapp HTTP client.

**Architecture:** `integration-service` exposes one RPC `integration.usapp.send`. `identity-service` calls it for OTP (env-selected `mock`|`usapp`, send-before-persist). `notification-service` calls it best-effort on every `notifications.create`, gated by a new per-tenant `TenantContext.pushChannel`. The Usapp driver maps HTTP status → domain error; the RPC re-encodes those as `rpcError(409|503|502)` so callers stay transport-agnostic.

**Tech Stack:** NestJS 11 (TCP microservices), Zod config, Prisma (identity/tenancy Postgres), Mongoose (notification), Jest, Expo SDK 54 (mobile). `fetch` only — no Usapp SDK.

**Spec:** `docs/superpowers/specs/2026-07-12-usapp-integration-design.md`

## Global Constraints

- **Usapp is in-app delivery to a registered Usapp account, not SMS/FCM.** No account → HTTP `404`.
- **Platform = one Usapp tenant.** Single `USAPP_API_KEY` + IP allowlist. Credential is env infra, never per-LGU config. Which LGU pushes = `integrations.push` config data. **Zero `if (tenant === …)`.**
- **Driver invariants:** never log the OTP code / message `content`; log a **masked** phone only. **Never retry.** **Always time out** (`AbortSignal.timeout`, default 5000 ms).
- **OTP ordering:** send-before-persist — persist the code only after Usapp accepts it.
- **Push is best-effort:** it must never fail or delay the in-app Mongo write.
- **Dev uses `mock`** (`OTP_DELIVERY_DRIVER=mock`); localhost egress is not allowlisted so real calls would `403`. `mock` is forbidden under `NODE_ENV=production` (boot fails).
- **Secrets:** real `.env*` files are never edited by this plan — only `.env.example` (empty key). Phone format stays `^\+639\d{9}$`.
- Backend commands run from `backend/`; mobile from `mobile-application/`. Worktree: `.claude/worktrees/usapp-integration`.

---

## Task 0: Install dependencies in the fresh worktree

**Files:** none (environment only).

- [ ] **Step 1: Install backend deps**

Run: `cd backend && npm install`
Expected: completes; `node_modules/` present.

- [ ] **Step 2: Install mobile deps**

Run: `cd mobile-application && npm install`
Expected: completes.

- [ ] **Step 3: Baseline typecheck (known-good HEAD)**

Run: `cd backend && npm run typecheck`
Expected: no errors (this is committed master `1bc323f`).

---

## Task 1: Config env, tenant-config schema, shared maskPhone

**Files:**
- Modify: `backend/libs/common/src/config/config.schema.ts`
- Modify: `backend/libs/common/src/tenant/tenant-config.schema.ts`
- Modify: `backend/libs/common/src/tenant/tenant-config.types.ts`
- Create: `backend/libs/common/src/util/mask-phone.ts`
- Modify: `backend/libs/common/src/index.ts`
- Modify: `backend/.env.example`
- Test: `backend/libs/common/src/config/config.schema.spec.ts` (create)
- Test: `backend/libs/common/src/util/mask-phone.spec.ts` (create)

**Interfaces:**
- Produces:
  - Env keys `USAPP_BASE_URL?: string`, `USAPP_API_KEY?: string`, `USAPP_TIMEOUT_MS: number` (default 5000), `OTP_DELIVERY_DRIVER: 'mock' | 'usapp'` (default `'mock'`).
  - `TenantConfig.integrations.push: 'usapp' | 'none'` (schema default `'none'`).
  - `TenantContext.pushChannel: 'usapp' | 'none'`.
  - `maskPhone(phone: string): string` exported from `@app/common`.

- [ ] **Step 1: Write the failing maskPhone test**

Create `backend/libs/common/src/util/mask-phone.spec.ts`:

```ts
import { maskPhone } from './mask-phone';

describe('maskPhone', () => {
  it('keeps the +63 prefix and last 4 digits, masks the middle', () => {
    expect(maskPhone('+639171234567')).toBe('+63••••••4567');
  });
  it('fully masks very short strings', () => {
    expect(maskPhone('123')).toBe('••••');
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `cd backend && npx jest libs/common/src/util/mask-phone.spec.ts`
Expected: FAIL — cannot find module `./mask-phone`.

- [ ] **Step 3: Implement maskPhone**

Create `backend/libs/common/src/util/mask-phone.ts`:

```ts
/** Redacts a phone for logs: keeps the +63 prefix and last 4 digits. */
export function maskPhone(phone: string): string {
  if (phone.length <= 4) return '••••';
  return `${phone.slice(0, 3)}••••••${phone.slice(-4)}`;
}
```

- [ ] **Step 4: Export it from the barrel**

In `backend/libs/common/src/index.ts`, add after the `./ids/tenant-ids` line:

```ts
export * from './util/mask-phone';
```

- [ ] **Step 5: Run maskPhone test, verify pass**

Run: `cd backend && npx jest libs/common/src/util/mask-phone.spec.ts`
Expected: PASS.

- [ ] **Step 6: Write the failing config-schema test**

Create `backend/libs/common/src/config/config.schema.spec.ts`:

```ts
import { validateConfig } from './config.schema';

describe('config schema — Usapp / OTP driver', () => {
  it('defaults OTP_DELIVERY_DRIVER to mock and USAPP_TIMEOUT_MS to 5000', () => {
    const cfg = validateConfig({ NODE_ENV: 'development' });
    expect(cfg.OTP_DELIVERY_DRIVER).toBe('mock');
    expect(cfg.USAPP_TIMEOUT_MS).toBe(5000);
  });

  it('rejects OTP_DELIVERY_DRIVER=usapp without Usapp credentials', () => {
    expect(() =>
      validateConfig({ NODE_ENV: 'development', OTP_DELIVERY_DRIVER: 'usapp' }),
    ).toThrow(/USAPP_BASE_URL|USAPP_API_KEY/);
  });

  it('accepts usapp when creds are present', () => {
    const cfg = validateConfig({
      NODE_ENV: 'staging',
      OTP_DELIVERY_DRIVER: 'usapp',
      USAPP_BASE_URL: 'https://app.usapp.ph',
      USAPP_API_KEY: 'k',
    });
    expect(cfg.OTP_DELIVERY_DRIVER).toBe('usapp');
  });

  it('forbids mock OTP driver under NODE_ENV=production', () => {
    expect(() =>
      validateConfig({ NODE_ENV: 'production', OTP_DELIVERY_DRIVER: 'mock' }),
    ).toThrow(/must not be `mock` in production/);
  });
});
```

- [ ] **Step 7: Run it, verify it fails**

Run: `cd backend && npx jest libs/common/src/config/config.schema.spec.ts`
Expected: FAIL (defaults/refinements not present).

- [ ] **Step 8: Add env keys + fail-fast refinement**

In `backend/libs/common/src/config/config.schema.ts`, add these keys inside the object, after the `SMS_PROVIDER` line (in the OTP block):

```ts
  // OTP delivery driver (global, not per-tenant). mock = dev/log; usapp = via integration-service.
  OTP_DELIVERY_DRIVER: z.enum(['mock', 'usapp']).default('mock'),

  // Usapp (integration-service only). Secret; never committed.
  USAPP_BASE_URL: z.url().optional(),
  USAPP_API_KEY: z.string().optional(),
  USAPP_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
```

Then change the schema terminator from `});` to a `superRefine`. Replace:

```ts
  // Socket.io
  SOCKET_IO_ADAPTER: z.enum(['memory', 'redis']).default('memory'),
});
```

with:

```ts
  // Socket.io
  SOCKET_IO_ADAPTER: z.enum(['memory', 'redis']).default('memory'),
}).superRefine((env, ctx) => {
  // No silent no-op OTP channel in production.
  if (env.NODE_ENV === 'production' && env.OTP_DELIVERY_DRIVER === 'mock') {
    ctx.addIssue({
      code: 'custom',
      path: ['OTP_DELIVERY_DRIVER'],
      message: 'must not be `mock` in production — it logs codes and delivers none.',
    });
  }
  // The usapp driver needs its credentials.
  if (env.OTP_DELIVERY_DRIVER === 'usapp') {
    if (!env.USAPP_BASE_URL) {
      ctx.addIssue({ code: 'custom', path: ['USAPP_BASE_URL'], message: 'required when OTP_DELIVERY_DRIVER=usapp' });
    }
    if (!env.USAPP_API_KEY) {
      ctx.addIssue({ code: 'custom', path: ['USAPP_API_KEY'], message: 'required when OTP_DELIVERY_DRIVER=usapp' });
    }
  }
});
```

(`z.infer` and `validateConfig`'s `safeParse` both work unchanged on the resulting `ZodEffects`.)

- [ ] **Step 9: Run config test, verify pass**

Run: `cd backend && npx jest libs/common/src/config/config.schema.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 10: Add `push` to tenant-config integrations schema + type**

In `backend/libs/common/src/tenant/tenant-config.schema.ts`, change the `integrations` object from:

```ts
  integrations: z.object({
    weather: z.string(),
    sms: z.string(),
    payments: z.array(z.enum(['gcash', 'card'])).min(1),
  }),
```

to:

```ts
  integrations: z.object({
    weather: z.string(),
    sms: z.string(),
    payments: z.array(z.enum(['gcash', 'card'])).min(1),
    // Push channel for outbound notification fan-out. Defaulted so older stored
    // configs (provisioned before this field) validate as 'none'.
    push: z.enum(['usapp', 'none']).default('none'),
  }),
```

In `backend/libs/common/src/tenant/tenant-config.types.ts`, update the `TenantConfig` `integrations` line from:

```ts
  integrations: { weather: string; sms: string; payments: string[] };
```

to:

```ts
  integrations: { weather: string; sms: string; payments: string[]; push: 'usapp' | 'none' };
```

and add `pushChannel` to `TenantContext` (after `modules`):

```ts
  modules: Record<ModuleName, boolean>;
  pushChannel: 'usapp' | 'none';
  configVersion: number;
```

- [ ] **Step 10b: Patch the one existing `TenantContext` literal**

Adding `pushChannel` as a required field breaks the only pre-existing literal (verified: the tenant-admin-panel uses a *local* type, not this one). In `backend/apps/identity-service/src/services/auth.service.spec.ts`, in the `const tenant: TenantContext = { … }` literal, add after the `modules:` line:

```ts
  pushChannel: 'none',
```

(New spec files created by later tasks already include this field.)

- [ ] **Step 11: Add Usapp block to `.env.example`**

In `backend/.env.example`, append:

```bash
# --- OTP delivery + Usapp (integration-service) ---
OTP_DELIVERY_DRIVER=mock            # mock (dev/log) | usapp (staging/prod)
USAPP_BASE_URL=https://app.usapp.ph # origin only; driver appends the path
USAPP_API_KEY=                      # SECRET rawKey from Usapp provisioning — leave empty here
USAPP_TIMEOUT_MS=5000
```

- [ ] **Step 12: Typecheck + commit**

Run: `cd backend && npm run typecheck`
Expected: no errors.

```bash
git add backend/libs/common backend/.env.example
git commit -m "feat(common): add Usapp/OTP env, tenant push channel, maskPhone"
```

---

## Task 2: Propagate `pushChannel` through tenancy.resolve + seeds

**Files:**
- Modify: `backend/apps/tenancy-service/src/services/tenancy.service.ts:20-28`
- Modify: `backend/apps/tenancy-service/src/services/tenancy.service.spec.ts`
- Modify: `backend/apps/tenancy-service/prisma/seed-data.ts` (both `integrations:` literals)

**Interfaces:**
- Consumes: `TenantContext.pushChannel`, `TenantConfig.integrations.push` (Task 1).
- Produces: `tenancy.resolve` returns a context whose `pushChannel` = the tenant's `integrations.push` (or `'none'`).

- [ ] **Step 1: Update the resolve test**

In `backend/apps/tenancy-service/src/services/tenancy.service.spec.ts`, inside the first test (`resolves by bundle id …`), add an assertion after the `configVersion` expectation:

```ts
    expect(ctx.pushChannel).toBe('none');
```

(The seed default is `'none'`; Task 2 Step 4 keeps it `'none'`.)

- [ ] **Step 2: Run it, verify it fails**

Run: `cd backend && npx jest apps/tenancy-service/src/services/tenancy.service.spec.ts -t "resolves by bundle id"`
Expected: FAIL — `ctx.pushChannel` is `undefined`.

- [ ] **Step 3: Map pushChannel in resolve**

In `backend/apps/tenancy-service/src/services/tenancy.service.ts`, in the returned object of `resolve()`, add after the `modules:` line:

```ts
      modules: config.modules as Record<ModuleName, boolean>,
      // Fail-closed default for configs stored before this field existed.
      pushChannel: config.integrations?.push ?? 'none',
      configVersion: latest.version,
```

- [ ] **Step 4: Add `push: 'none'` to both seed integrations blocks**

In `backend/apps/tenancy-service/prisma/seed-data.ts`, change **both** occurrences of:

```ts
    integrations: { weather: 'openweather', sms: 'semaphore', payments: ['gcash', 'card'] },
```

to:

```ts
    integrations: { weather: 'openweather', sms: 'semaphore', payments: ['gcash', 'card'], push: 'none' },
```

- [ ] **Step 5: Run test + typecheck, verify pass**

Run: `cd backend && npx jest apps/tenancy-service/src/services/tenancy.service.spec.ts && npm run typecheck`
Expected: PASS; no type errors.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/tenancy-service
git commit -m "feat(tenancy): expose per-tenant pushChannel on TenantContext"
```

---

## Task 3: Usapp driver + domain errors (integration-service)

**Files:**
- Create: `backend/apps/integration-service/src/usapp/usapp.errors.ts`
- Create: `backend/apps/integration-service/src/usapp/usapp.driver.ts`
- Test: `backend/apps/integration-service/src/usapp/usapp.driver.spec.ts` (create)

**Interfaces:**
- Consumes: `AppConfigService` (`USAPP_BASE_URL`, `USAPP_API_KEY`, `USAPP_TIMEOUT_MS`), `maskPhone`.
- Produces:
  - `class UsappDriver { async send(phone: string, content: string): Promise<void> }`
  - Errors `RecipientNotRegisteredError`, `DeliveryRateLimitedError`, `DeliveryUnavailableError`.

- [ ] **Step 1: Write the failing driver test**

Create `backend/apps/integration-service/src/usapp/usapp.driver.spec.ts`:

```ts
import { AppConfigService } from '@app/common';
import { UsappDriver } from './usapp.driver';
import {
  DeliveryRateLimitedError,
  DeliveryUnavailableError,
  RecipientNotRegisteredError,
} from './usapp.errors';

function makeConfig(): AppConfigService {
  const values: Record<string, unknown> = {
    USAPP_BASE_URL: 'https://app.usapp.ph/',
    USAPP_API_KEY: 'secret-key',
    USAPP_TIMEOUT_MS: 5000,
  };
  return { get: (k: string) => values[k], require: (k: string) => values[k] } as unknown as AppConfigService;
}

describe('UsappDriver', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });

  it('POSTs to /api/v1/messages/send with x-api-key and returns on 201', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201 });
    await new UsappDriver(makeConfig()).send('+639171234567', 'Your code is 123456.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://app.usapp.ph/api/v1/messages/send'); // trailing slash trimmed
    expect(init.headers['x-api-key']).toBe('secret-key');
    expect(JSON.parse(init.body)).toEqual({
      recipientPhone: '+639171234567',
      content: 'Your code is 123456.',
      format: 'plain',
    });
  });

  it('maps 404 → RecipientNotRegisteredError', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    await expect(new UsappDriver(makeConfig()).send('+639990000000', 'x')).rejects.toBeInstanceOf(
      RecipientNotRegisteredError,
    );
  });

  it('maps 429 → DeliveryRateLimitedError', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429 });
    await expect(new UsappDriver(makeConfig()).send('+639171234567', 'x')).rejects.toBeInstanceOf(
      DeliveryRateLimitedError,
    );
  });

  it('maps 401/403/500 and network faults → DeliveryUnavailableError', async () => {
    for (const status of [401, 403, 500]) {
      fetchMock.mockResolvedValue({ ok: false, status });
      await expect(new UsappDriver(makeConfig()).send('+639171234567', 'x')).rejects.toBeInstanceOf(
        DeliveryUnavailableError,
      );
    }
    fetchMock.mockRejectedValue(new Error('timeout'));
    await expect(new UsappDriver(makeConfig()).send('+639171234567', 'x')).rejects.toBeInstanceOf(
      DeliveryUnavailableError,
    );
  });

  it('never passes the message content to the logger', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    const spy = jest.spyOn(require('@nestjs/common').Logger.prototype, 'error').mockImplementation(() => undefined);
    await expect(new UsappDriver(makeConfig()).send('+639171234567', 'SECRET-CODE-99')).rejects.toThrow();
    for (const call of spy.mock.calls) {
      expect(String(call[0])).not.toContain('SECRET-CODE-99');
    }
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `cd backend && npx jest apps/integration-service/src/usapp/usapp.driver.spec.ts`
Expected: FAIL — cannot find `./usapp.driver`.

- [ ] **Step 3: Implement the domain errors**

Create `backend/apps/integration-service/src/usapp/usapp.errors.ts`:

```ts
/** Usapp 404 — the number holds no registered Usapp account. Expected, user-actionable. */
export class RecipientNotRegisteredError extends Error {}
/** Usapp 429 — per-second/-minute rate limit or monthly quota exhausted. */
export class DeliveryRateLimitedError extends Error {}
/** 401/403/400/5xx/timeout/network — misconfig or transient upstream fault. */
export class DeliveryUnavailableError extends Error {}
```

- [ ] **Step 4: Implement the driver**

Create `backend/apps/integration-service/src/usapp/usapp.driver.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService, maskPhone } from '@app/common';
import {
  DeliveryRateLimitedError,
  DeliveryUnavailableError,
  RecipientNotRegisteredError,
} from './usapp.errors';

/**
 * Sole Usapp HTTP client for the platform. Invariants: never log `content`
 * (it carries the OTP code), never retry, always time out.
 */
@Injectable()
export class UsappDriver {
  private readonly logger = new Logger(UsappDriver.name);

  constructor(private readonly config: AppConfigService) {}

  async send(phone: string, content: string): Promise<void> {
    const base = this.config.require('USAPP_BASE_URL').replace(/\/+$/, '');
    let response: Response;
    try {
      response = await fetch(`${base}/api/v1/messages/send`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.config.require('USAPP_API_KEY'),
        },
        body: JSON.stringify({ recipientPhone: phone, content, format: 'plain' }),
        signal: AbortSignal.timeout(this.config.get('USAPP_TIMEOUT_MS')),
      });
    } catch (err) {
      this.logger.error(
        `Usapp unreachable for ${maskPhone(phone)}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new DeliveryUnavailableError();
    }

    if (response.ok) return;

    if (response.status === 404) throw new RecipientNotRegisteredError();

    if (response.status === 429) {
      this.logger.warn(`Usapp rate-limited this tenant sending to ${maskPhone(phone)}`);
      throw new DeliveryRateLimitedError();
    }

    if (response.status === 401 || response.status === 403) {
      this.logger.error(
        `Usapp rejected this tenant (${response.status}) sending to ${maskPhone(phone)}. ` +
          `Check USAPP_API_KEY, that the key is neither revoked nor expired, that the tenant ` +
          `is active, and that this host's egress IP is in the tenant ipAllowlist.`,
      );
      throw new DeliveryUnavailableError();
    }

    this.logger.error(`Usapp answered ${response.status} sending to ${maskPhone(phone)}`);
    throw new DeliveryUnavailableError();
  }
}
```

- [ ] **Step 5: Run driver test, verify pass**

Run: `cd backend && npx jest apps/integration-service/src/usapp/usapp.driver.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/apps/integration-service/src/usapp
git commit -m "feat(integration): Usapp driver with domain-error mapping"
```

---

## Task 4: `integration.usapp.send` RPC + module wiring

**Files:**
- Modify: `backend/apps/integration-service/src/integration.controller.ts`
- Modify: `backend/apps/integration-service/src/integration.module.ts`
- Test: `backend/apps/integration-service/src/integration.controller.spec.ts` (create)

**Interfaces:**
- Consumes: `UsappDriver`, `usapp.errors` (Task 3).
- Produces: RPC `{ cmd: 'integration.usapp.send' }`, payload `{ phone: string; content: string }` → `{ delivered: true }` or `rpcError(409|503|502)`.

- [ ] **Step 1: Write the failing controller test**

Create `backend/apps/integration-service/src/integration.controller.spec.ts`:

```ts
import { IntegrationController } from './integration.controller';
import { WeatherService } from './weather.service';
import { UsappDriver } from './usapp/usapp.driver';
import {
  DeliveryRateLimitedError,
  DeliveryUnavailableError,
  RecipientNotRegisteredError,
} from './usapp/usapp.errors';

function makeController(send: jest.Mock) {
  const usapp = { send } as unknown as UsappDriver;
  return new IntegrationController({} as WeatherService, usapp);
}

describe('integration.usapp.send', () => {
  it('returns { delivered: true } on success', async () => {
    const ctrl = makeController(jest.fn().mockResolvedValue(undefined));
    await expect(ctrl.usappSend({ phone: '+639171234567', content: 'hi' })).resolves.toEqual({
      delivered: true,
    });
  });

  it('maps NotRegistered → 409', async () => {
    const ctrl = makeController(jest.fn().mockRejectedValue(new RecipientNotRegisteredError()));
    await expect(ctrl.usappSend({ phone: '+639990000000', content: 'x' })).rejects.toMatchObject({
      error: { statusCode: 409 },
    });
  });

  it('maps RateLimited → 503', async () => {
    const ctrl = makeController(jest.fn().mockRejectedValue(new DeliveryRateLimitedError()));
    await expect(ctrl.usappSend({ phone: '+639171234567', content: 'x' })).rejects.toMatchObject({
      error: { statusCode: 503 },
    });
  });

  it('maps Unavailable → 502', async () => {
    const ctrl = makeController(jest.fn().mockRejectedValue(new DeliveryUnavailableError()));
    await expect(ctrl.usappSend({ phone: '+639171234567', content: 'x' })).rejects.toMatchObject({
      error: { statusCode: 502 },
    });
  });
});
```

(The `RpcException` from `rpcError` exposes its payload at `.error`, matching the existing tenancy spec's `error: { statusCode }` assertion style.)

- [ ] **Step 2: Run it, verify it fails**

Run: `cd backend && npx jest apps/integration-service/src/integration.controller.spec.ts`
Expected: FAIL — `usappSend` not a function.

- [ ] **Step 3: Add the RPC handler**

Replace the full contents of `backend/apps/integration-service/src/integration.controller.ts` with:

```ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantScoped, rpcError } from '@app/common';
import { WeatherService } from './weather.service';
import { UsappDriver } from './usapp/usapp.driver';
import {
  DeliveryRateLimitedError,
  RecipientNotRegisteredError,
} from './usapp/usapp.errors';

@Controller()
export class IntegrationController {
  constructor(
    private readonly weather: WeatherService,
    private readonly usapp: UsappDriver,
  ) {}

  @MessagePattern({ cmd: 'integration.weather.get' })
  getWeather(@Payload() p: TenantScoped<{ centroid: [number, number]; provider: string }>) {
    return this.weather.get(p.tenant.tenantId, p.data.centroid, p.data.provider);
  }

  // Platform-level (single Usapp tenant): not TenantScoped. Callers pass the
  // already-composed message; the driver never sees business context.
  @MessagePattern({ cmd: 'integration.usapp.send' })
  async usappSend(@Payload() p: { phone: string; content: string }) {
    try {
      await this.usapp.send(p.phone, p.content);
      return { delivered: true };
    } catch (e) {
      if (e instanceof RecipientNotRegisteredError) rpcError(409, 'Recipient is not registered on Usapp');
      if (e instanceof DeliveryRateLimitedError) rpcError(503, 'Usapp is rate limiting delivery');
      rpcError(502, 'Usapp delivery unavailable');
    }
  }
}
```

- [ ] **Step 4: Register the driver in the module**

In `backend/apps/integration-service/src/integration.module.ts`, import and add `UsappDriver` to `providers`:

```ts
import { Module } from '@nestjs/common';
import { AppConfigModule } from '@app/common';
import { RedisModule } from '@app/redis';
import { IntegrationController } from './integration.controller';
import { WeatherService } from './weather.service';
import { UsappDriver } from './usapp/usapp.driver';

@Module({
  imports: [AppConfigModule, RedisModule],
  controllers: [IntegrationController],
  providers: [WeatherService, UsappDriver],
})
export class IntegrationModule {}
```

- [ ] **Step 5: Run test, verify pass**

Run: `cd backend && npx jest apps/integration-service/src/integration.controller.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/apps/integration-service
git commit -m "feat(integration): integration.usapp.send RPC (409/503/502 mapping)"
```

---

## Task 5: OTP delivery via Usapp (identity-service) + send-before-persist

**Files:**
- Create: `backend/apps/identity-service/src/services/otp-delivery.ts`
- Delete: `backend/apps/identity-service/src/services/sms.provider.ts`
- Modify: `backend/apps/identity-service/src/services/otp.service.ts`
- Modify: `backend/apps/identity-service/src/identity.module.ts`
- Test: `backend/apps/identity-service/src/services/otp.service.spec.ts` (create)

**Interfaces:**
- Consumes: RPC `integration.usapp.send` (Task 4); `INTEGRATION_CLIENT` token; `OTP_DELIVERY_DRIVER`, `USAPP`/`OTP_EXPIRY_MINUTES` config.
- Produces:
  - `const INTEGRATION_CLIENT = 'INTEGRATION_CLIENT'`
  - `class OtpDelivery { async send(phoneNumber: string, code: string): Promise<void> }`
  - `OtpService.request(...)` unchanged signature, but delivers **before** persisting.

- [ ] **Step 1: Write the failing OTP service test**

Create `backend/apps/identity-service/src/services/otp.service.spec.ts`:

```ts
import { OtpService } from './otp.service';
import { OtpDelivery } from './otp-delivery';
import { AppConfigService, TenantContext } from '@app/common';
import { PrismaService } from '../prisma.service';
import { RedisService } from '@app/redis';

const tenant: TenantContext = {
  tenantId: 'ph-test-city',
  kind: 'city',
  status: 'active',
  ticketPrefix: 'TST',
  residentIdPrefix: 'TST',
  modules: {} as TenantContext['modules'],
  pushChannel: 'none',
  configVersion: 1,
};

function makeConfig(): AppConfigService {
  const values: Record<string, unknown> = {
    OTP_LENGTH: 6,
    OTP_EXPIRY_MINUTES: 5,
    NODE_ENV: 'development',
    MAX_OTP_REQUESTS_PER_PHONE_PER_HOUR: 5,
    MAX_OTP_REQUESTS_PER_PHONE_PER_DAY: 15,
    MAX_OTP_REQUESTS_PER_IP_PER_HOUR: 20,
  };
  return { get: (k: string) => values[k] } as unknown as AppConfigService;
}

function makeRedis(): RedisService {
  return { client: { incr: jest.fn().mockResolvedValue(1), expire: jest.fn().mockResolvedValue(1) } } as unknown as RedisService;
}

describe('OtpService.request — send before persist', () => {
  it('persists the code only after delivery succeeds', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'otp1' });
    const prisma = { otpRequest: { create } } as unknown as PrismaService;
    const delivery = { send: jest.fn().mockResolvedValue(undefined) } as unknown as OtpDelivery;
    const svc = new OtpService(prisma, makeRedis(), makeConfig(), delivery);

    const res = await svc.request(tenant, '+639171234567', '1.2.3.4', 'mock');

    expect(delivery.send).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    // deliver happened before persist
    const deliverOrder = (delivery.send as jest.Mock).mock.invocationCallOrder[0];
    const persistOrder = (create as jest.Mock).mock.invocationCallOrder[0];
    expect(deliverOrder).toBeLessThan(persistOrder);
    expect(res.requested).toBe(true);
    expect(res.dev_code).toHaveLength(6); // surfaced in dev
  });

  it('persists NOTHING when delivery throws', async () => {
    const create = jest.fn();
    const prisma = { otpRequest: { create } } as unknown as PrismaService;
    const err = Object.assign(new Error('not on usapp'), { error: { statusCode: 409 } });
    const delivery = { send: jest.fn().mockRejectedValue(err) } as unknown as OtpDelivery;
    const svc = new OtpService(prisma, makeRedis(), makeConfig(), delivery);

    await expect(svc.request(tenant, '+639171234567', '1.2.3.4', 'mock')).rejects.toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `cd backend && npx jest apps/identity-service/src/services/otp.service.spec.ts`
Expected: FAIL — cannot find `./otp-delivery`.

- [ ] **Step 3: Create `OtpDelivery` (replaces `SmsProvider`)**

Create `backend/apps/identity-service/src/services/otp-delivery.ts`:

```ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AppConfigService, maskPhone, rpcError } from '@app/common';

export const INTEGRATION_CLIENT = 'INTEGRATION_CLIENT';

/**
 * OTP delivery port. Driver is chosen by OTP_DELIVERY_DRIVER (global env):
 *  - mock  → log the code (development only; forbidden in production at boot).
 *  - usapp → delegate to integration-service, which maps failures to 409/503/502.
 */
@Injectable()
export class OtpDelivery {
  private readonly logger = new Logger(OtpDelivery.name);

  constructor(
    private readonly config: AppConfigService,
    @Inject(INTEGRATION_CLIENT) private readonly integration: ClientProxy,
  ) {}

  async send(phoneNumber: string, code: string): Promise<void> {
    if (this.config.get('OTP_DELIVERY_DRIVER') === 'mock') {
      this.logger.log(`[mock-otp] ${maskPhone(phoneNumber)}: ${code}`);
      return;
    }
    const content = `Your verification code is ${code}. Valid for ${this.config.get('OTP_EXPIRY_MINUTES')} minutes.`;
    try {
      await firstValueFrom(
        this.integration.send({ cmd: 'integration.usapp.send' }, { phone: phoneNumber, content }),
      );
    } catch (e) {
      // Re-wrap the integration RpcException as a fresh rpcError so it propagates
      // cleanly through this service to the gateway (409/503/502 preserved).
      const shape = (e as { error?: { statusCode?: number; message?: string }; statusCode?: number; message?: string });
      const status = shape.error?.statusCode ?? shape.statusCode ?? 502;
      const message = shape.error?.message ?? shape.message ?? 'OTP delivery failed';
      rpcError(status, message);
    }
  }
}
```

- [ ] **Step 4: Delete the old SmsProvider**

Run: `cd backend && git rm apps/identity-service/src/services/sms.provider.ts`

- [ ] **Step 5: Rewire `OtpService` to deliver-before-persist**

In `backend/apps/identity-service/src/services/otp.service.ts`:

Change the import line:

```ts
import { SmsProvider } from './sms.provider';
```

to:

```ts
import { OtpDelivery } from './otp-delivery';
```

Change the constructor param:

```ts
    private readonly sms: SmsProvider,
```

to:

```ts
    private readonly otpDelivery: OtpDelivery,
```

Replace the body of `request()` from the `await this.prisma.otpRequest.create({...})` block through the `await this.sms.sendOtp(...)` line, i.e. replace:

```ts
    const expiryMinutes = this.config.get('OTP_EXPIRY_MINUTES');
    await this.prisma.otpRequest.create({
      data: {
        tenantId: tenant.tenantId,
        phoneNumber,
        codeHash: await bcrypt.hash(code, 10),
        ip,
        expiresAt: new Date(Date.now() + expiryMinutes * 60_000),
      },
    });
    await this.sms.sendOtp(phoneNumber, code, smsProvider);
```

with:

```ts
    const expiryMinutes = this.config.get('OTP_EXPIRY_MINUTES');
    // Deliver first (send-before-persist): if delivery throws (e.g. Usapp 404 →
    // 409), we persist nothing, so no dead code is stored for an unreachable user.
    await this.otpDelivery.send(phoneNumber, code);
    await this.prisma.otpRequest.create({
      data: {
        tenantId: tenant.tenantId,
        phoneNumber,
        codeHash: await bcrypt.hash(code, 10),
        ip,
        expiresAt: new Date(Date.now() + expiryMinutes * 60_000),
      },
    });
```

Then rename the now-unused trailing param so lint (`no-unused-vars`) stays green: in the `request(...)` signature change `smsProvider: string,` to `_smsProvider: string,`. The controller calls it positionally, so the caller is unaffected.

- [ ] **Step 6: Wire the module (INTEGRATION_CLIENT + OtpDelivery)**

Replace the full contents of `backend/apps/identity-service/src/identity.module.ts` with:

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AppConfigModule, AppConfigService } from '@app/common';
import { RedisModule } from '@app/redis';
import { IdentityController } from './identity.controller';
import { PrismaService } from './prisma.service';
import { OtpService } from './services/otp.service';
import { AuthService } from './services/auth.service';
import { ProfileService } from './services/profile.service';
import { DigitalIdService } from './services/digital-id.service';
import { OtpDelivery, INTEGRATION_CLIENT } from './services/otp-delivery';
import { TokenService } from './services/token.service';

@Module({
  imports: [AppConfigModule, RedisModule, JwtModule.register({})],
  controllers: [IdentityController],
  providers: [
    PrismaService,
    OtpService,
    AuthService,
    ProfileService,
    DigitalIdService,
    OtpDelivery,
    TokenService,
    {
      provide: INTEGRATION_CLIENT,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const { host, port } = config.tcpEndpoint('integration');
        return ClientProxyFactory.create({ transport: Transport.TCP, options: { host, port } });
      },
    },
  ],
})
export class IdentityModule {}
```

- [ ] **Step 7: Run OTP test + typecheck, verify pass**

Run: `cd backend && npx jest apps/identity-service/src/services/otp.service.spec.ts && npm run typecheck`
Expected: PASS (2 tests); no type errors (no lingering `sms.provider` imports).

- [ ] **Step 8: Commit**

```bash
git add backend/apps/identity-service
git commit -m "feat(identity): OTP delivery via Usapp, send-before-persist"
```

---

## Task 6: `identity.phone.resolve` + notification push fan-out

**Files:**
- Modify: `backend/apps/identity-service/src/services/profile.service.ts`
- Modify: `backend/apps/identity-service/src/identity.controller.ts`
- Modify: `backend/apps/notification-service/src/notification.service.ts`
- Modify: `backend/apps/notification-service/src/notification.module.ts`
- Test: `backend/apps/notification-service/src/notification.service.spec.ts` (create)

**Interfaces:**
- Consumes: RPC `integration.usapp.send` (Task 4); `TenantContext.pushChannel` (Task 2); `maskPhone`.
- Produces:
  - RPC `{ cmd: 'identity.phone.resolve' }`, payload `TenantScoped<{ user_id: string }>` → `{ phone_number: string | null }`.
  - `notifications.create` additionally fans out to Usapp when `tenant.pushChannel === 'usapp'`.
  - Tokens `INTEGRATION_CLIENT`, `IDENTITY_CLIENT` in `notification.service.ts`.

- [ ] **Step 1: Add `resolvePhone` to ProfileService**

In `backend/apps/identity-service/src/services/profile.service.ts`, add a method inside the class:

```ts
  /** Minimal lookup for outbound delivery: the resident's phone, or null (guest). */
  async resolvePhone(tenant: TenantContext, userId: string): Promise<{ phone_number: string | null }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId: tenant.tenantId },
      select: { phoneNumber: true },
    });
    return { phone_number: user?.phoneNumber ?? null };
  }
```

- [ ] **Step 2: Expose it as an RPC**

In `backend/apps/identity-service/src/identity.controller.ts`, add a handler (after `profileUpdate`):

```ts
  @MessagePattern({ cmd: 'identity.phone.resolve' })
  resolvePhone(@Payload() p: TenantScoped<{ user_id: string }>) {
    return this.profile.resolvePhone(p.tenant, p.data.user_id);
  }
```

- [ ] **Step 3: Typecheck identity**

Run: `cd backend && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Write the failing notification push test**

Create `backend/apps/notification-service/src/notification.service.spec.ts`:

```ts
import { NotificationService } from './notification.service';
import { TenantContext } from '@app/common';
import { of, throwError } from 'rxjs';
import type { Model } from 'mongoose';

function baseTenant(push: 'usapp' | 'none'): TenantContext {
  return {
    tenantId: 'ph-test-city',
    kind: 'city',
    status: 'active',
    ticketPrefix: 'TST',
    residentIdPrefix: 'TST',
    modules: {} as TenantContext['modules'],
    pushChannel: push,
    configVersion: 1,
  };
}

function makeModels() {
  const notifications = { create: jest.fn().mockResolvedValue({ _id: 'n1' }) } as unknown as Model<never>;
  const audit = { create: jest.fn().mockResolvedValue({}) } as unknown as Model<never>;
  return { notifications, audit };
}

describe('NotificationService.create — Usapp push fan-out', () => {
  it('does not push when tenant.pushChannel is not usapp', async () => {
    const { notifications, audit } = makeModels();
    const integration = { send: jest.fn() };
    const identity = { send: jest.fn() };
    const svc = new NotificationService(notifications, audit, integration as never, identity as never);

    await svc.create(baseTenant('none'), 'u1', 'Title', 'Body', 'egov');
    await new Promise((r) => setImmediate(r)); // let best-effort microtask settle

    expect(identity.send).not.toHaveBeenCalled();
    expect(integration.send).not.toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalledTimes(1);
  });

  it('resolves phone then sends via Usapp when pushChannel=usapp', async () => {
    const { notifications, audit } = makeModels();
    const integration = { send: jest.fn().mockReturnValue(of({ delivered: true })) };
    const identity = { send: jest.fn().mockReturnValue(of({ phone_number: '+639171234567' })) };
    const svc = new NotificationService(notifications, audit, integration as never, identity as never);

    await svc.create(baseTenant('usapp'), 'u1', 'Title', 'Body', 'egov');
    await new Promise((r) => setImmediate(r));

    expect(identity.send).toHaveBeenCalledWith({ cmd: 'identity.phone.resolve' }, expect.objectContaining({ data: { user_id: 'u1' } }));
    expect(integration.send).toHaveBeenCalledWith(
      { cmd: 'integration.usapp.send' },
      { phone: '+639171234567', content: 'Title\nBody' },
    );
  });

  it('skips push for a guest with no phone', async () => {
    const { notifications, audit } = makeModels();
    const integration = { send: jest.fn() };
    const identity = { send: jest.fn().mockReturnValue(of({ phone_number: null })) };
    const svc = new NotificationService(notifications, audit, integration as never, identity as never);

    await svc.create(baseTenant('usapp'), 'guest1', 'T', 'B', 'egov');
    await new Promise((r) => setImmediate(r));

    expect(integration.send).not.toHaveBeenCalled();
  });

  it('swallows Usapp failures — in-app write still succeeds', async () => {
    const { notifications, audit } = makeModels();
    const integration = { send: jest.fn().mockReturnValue(throwError(() => ({ error: { statusCode: 404 } }))) };
    const identity = { send: jest.fn().mockReturnValue(of({ phone_number: '+639990000000' })) };
    const svc = new NotificationService(notifications, audit, integration as never, identity as never);

    const res = await svc.create(baseTenant('usapp'), 'u1', 'T', 'B', 'egov');
    await new Promise((r) => setImmediate(r));

    expect(res).toEqual({ id: 'n1' }); // create resolved normally
  });
});
```

- [ ] **Step 5: Run it, verify it fails**

Run: `cd backend && npx jest apps/notification-service/src/notification.service.spec.ts`
Expected: FAIL — `NotificationService` constructor takes 2 args, not 4.

- [ ] **Step 6: Add push fan-out to NotificationService**

In `backend/apps/notification-service/src/notification.service.ts`:

Change the imports at the top to add the client + rx + logging + maskPhone:

```ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Model } from 'mongoose';
import { TenantContext, rpcError } from '@app/common';
import { Notification } from './schemas/notification.schema';
import { AuditEvent } from './schemas/audit-event.schema';

export const INTEGRATION_CLIENT = 'INTEGRATION_CLIENT';
export const IDENTITY_CLIENT = 'IDENTITY_CLIENT';
```

Change the constructor to inject the two clients + a logger:

```ts
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name) private readonly notifications: Model<Notification>,
    @InjectModel(AuditEvent.name) private readonly auditEvents: Model<AuditEvent>,
    @Inject(INTEGRATION_CLIENT) private readonly integration: ClientProxy,
    @Inject(IDENTITY_CLIENT) private readonly identity: ClientProxy,
  ) {}
```

In `create()`, after the `auditEvents.create(...).catch(...)` line and before `return { id: String(doc._id) }`, add the best-effort push:

```ts
    // Best-effort outbound fan-out. Never fails or delays the in-app write.
    void this.maybePush(tenant, userId, title, body);
    return { id: String(doc._id) };
```

Add the private method at the end of the class:

```ts
  /** Fan a notification out to the citizen's Usapp account, if the tenant opts in. */
  private async maybePush(
    tenant: TenantContext,
    userId: string,
    title: string,
    body: string,
  ): Promise<void> {
    if (tenant.pushChannel !== 'usapp') return;
    try {
      const { phone_number } = await firstValueFrom(
        this.identity.send<{ phone_number: string | null }>(
          { cmd: 'identity.phone.resolve' },
          { tenant, data: { user_id: userId } },
        ),
      );
      if (!phone_number) return; // guest / no phone on file
      await firstValueFrom(
        this.integration.send(
          { cmd: 'integration.usapp.send' },
          { phone: phone_number, content: `${title}\n${body}` },
        ),
      );
    } catch (e) {
      const msg = (e as { error?: { message?: string }; message?: string })?.error?.message
        ?? (e as { message?: string })?.message
        ?? String(e);
      this.logger.warn(`Usapp push skipped: ${msg}`);
    }
  }
```

Note: `rpcError` stays imported — the existing `markRead` method already uses `rpcError(404, …)`. The `@app/common` import line changes only by keeping `TenantContext` + `rpcError` (both already present); the new symbols come from `@nestjs/common`, `@nestjs/microservices`, and `rxjs`.

- [ ] **Step 7: Register both clients in the module**

Replace the full contents of `backend/apps/notification-service/src/notification.module.ts` with (adds the two TCP client providers; preserves the existing Mongoose registration):

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AppConfigModule, AppConfigService } from '@app/common';
import { MongodbModule } from '@app/mongodb';
import { NotificationController } from './notification.controller';
import {
  NotificationService,
  INTEGRATION_CLIENT,
  IDENTITY_CLIENT,
} from './notification.service';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { AuditEvent, AuditEventSchema } from './schemas/audit-event.schema';

@Module({
  imports: [
    AppConfigModule,
    MongodbModule.forService('MONGODB_NOTIFICATION_URI'),
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: AuditEvent.name, schema: AuditEventSchema },
    ]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    {
      provide: INTEGRATION_CLIENT,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const { host, port } = config.tcpEndpoint('integration');
        return ClientProxyFactory.create({ transport: Transport.TCP, options: { host, port } });
      },
    },
    {
      provide: IDENTITY_CLIENT,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const { host, port } = config.tcpEndpoint('identity');
        return ClientProxyFactory.create({ transport: Transport.TCP, options: { host, port } });
      },
    },
  ],
})
export class NotificationModule {}
```

- [ ] **Step 8: Run test + typecheck, verify pass**

Run: `cd backend && npx jest apps/notification-service/src/notification.service.spec.ts && npm run typecheck`
Expected: PASS (4 tests); no type errors.

- [ ] **Step 9: Commit**

```bash
git add backend/apps/identity-service backend/apps/notification-service
git commit -m "feat(notification): best-effort Usapp push fan-out gated by pushChannel"
```

---

## Task 7: Mobile — OTP copy + 409 (not-on-Usapp) handling

**Files:**
- Modify: `mobile-application/services/auth.ts` (add `otpErrorMessage` helper)
- Modify: `mobile-application/app/(auth)/login.tsx` (request onError)
- Modify: `mobile-application/app/(auth)/otp.tsx` (copy + resend onError)
- Test: `mobile-application/__tests__/otp-error-message.test.ts` (create)

**Interfaces:**
- Consumes: `ApiError { status: number; message: string }` (from `services/api.ts`).
- Produces: `otpErrorMessage(err: unknown): string` exported from `services/auth.ts`.

**Note:** Read the Expo v54 docs before editing mobile code (per `mobile-application/AGENTS.md`). No device-push work — copy + error mapping only.

- [ ] **Step 1: Write the failing helper test**

Create `mobile-application/__tests__/otp-error-message.test.ts`:

```ts
import { otpErrorMessage } from "@/services/auth";

describe("otpErrorMessage", () => {
  it("maps 409 to the actionable 'register on Usapp' copy", () => {
    expect(otpErrorMessage({ status: 409, message: "x" })).toMatch(/Usapp/i);
    expect(otpErrorMessage({ status: 409, message: "x" })).toMatch(/register/i);
  });

  it("uses the server message for other statuses", () => {
    expect(otpErrorMessage({ status: 503, message: "We're busy" })).toBe("We're busy");
  });

  it("falls back to a generic message when none is present", () => {
    expect(otpErrorMessage({ status: 0 })).toMatch(/try again/i);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `cd mobile-application && npx jest __tests__/otp-error-message.test.ts`
Expected: FAIL — `otpErrorMessage` is not exported.

- [ ] **Step 3: Implement the helper**

In `mobile-application/services/auth.ts`, add (near the other exports):

```ts
/**
 * Maps an OTP delivery error to user copy. A 409 means the number holds no Usapp
 * account (Usapp is the OTP channel) — actionable, not a generic failure.
 */
export function otpErrorMessage(err: unknown): string {
  const e = err as { status?: number; message?: string };
  if (e?.status === 409) {
    return "That number isn't on Usapp yet. Install Usapp, register this number, then request your code.";
  }
  return e?.message ?? "Something went wrong. Please try again.";
}
```

- [ ] **Step 4: Run helper test, verify pass**

Run: `cd mobile-application && npx jest __tests__/otp-error-message.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Use the helper on the request screen**

In `mobile-application/app/(auth)/login.tsx`:

Add the import:

```ts
import { otpErrorMessage } from "@/services/auth";
```

Change the `onError` in the `requestOtp.mutate` call from:

```ts
      onError: (err) => {
        toast.show(
          (err as { message?: string })?.message ?? "Could not send the code.",
```

to (keep the rest of the toast call intact):

```ts
      onError: (err) => {
        toast.show(
          otpErrorMessage(err),
```

- [ ] **Step 6: Update OTP screen copy + resend error**

In `mobile-application/app/(auth)/otp.tsx`:

Add the import:

```ts
import { otpErrorMessage } from "@/services/auth";
```

Change the delivery copy (the caption under "Enter the code") from:

```tsx
        We sent a {CODE_LENGTH}-digit code to {phone}
```

to:

```tsx
        We sent a {CODE_LENGTH}-digit code to your Usapp app for {phone}
```

Change the resend `onError` from:

```ts
      onError: (err) => {
        toast.show(
          (err as { message?: string })?.message ?? "Could not resend the code.",
```

to:

```ts
      onError: (err) => {
        toast.show(
          otpErrorMessage(err),
```

- [ ] **Step 7: Typecheck + lint + test**

Run: `cd mobile-application && npx tsc --noEmit && npm run lint && npx jest __tests__/otp-error-message.test.ts`
Expected: no type errors; lint clean; test PASS.

- [ ] **Step 8: Commit**

```bash
git add mobile-application/services/auth.ts "mobile-application/app/(auth)/login.tsx" "mobile-application/app/(auth)/otp.tsx" mobile-application/__tests__/otp-error-message.test.ts
git commit -m "feat(mobile): OTP copy for Usapp + 409 not-registered handling"
```

---

## Task 8: Full verification + traceability

**Files:**
- Modify: `TRACEABILITY.md` (if an OTP/notification §10 row exists)

- [ ] **Step 1: Backend — full test suite**

Run: `cd backend && npm test`
Expected: all suites pass (new: config, mask-phone, usapp.driver, integration.controller, otp.service, notification.service, tenancy.service).

- [ ] **Step 2: Backend — lint + typecheck + build**

Run: `cd backend && npm run lint && npm run typecheck && npm run build:all`
Expected: clean; every app (incl. integration-service, identity-service, notification-service) builds.

- [ ] **Step 3: Mobile — typecheck + lint + tests + web export**

Run: `cd mobile-application && npx tsc --noEmit && npm run lint && npm test && npx expo export --platform web`
Expected: clean; tests pass; export succeeds.

- [ ] **Step 4: E2E mock path (both seeded tenants)**

Run the stack, then:
`cd backend && npx ts-node -P tsconfig.scripts.json scripts/verify-e2e.ts`
Expected: `N passed / 0 failed`. OTP flows exercise the **mock** driver (`OTP_DELIVERY_DRIVER=mock`); seeded tenants have `push='none'` so no outbound Usapp attempt occurs. (Real Usapp delivery is a staging/prod smoke test with a live key + allowlisted egress IP — **out of local scope**, per spec §8.)

- [ ] **Step 5: Update TRACEABILITY (if applicable)**

If `TRACEABILITY.md` has a §10 row for OTP auth or notifications, update its status/notes to reflect Usapp delivery + push fan-out (mock-verified locally; live delivery pending staging). If no such row exists, skip.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore(usapp): verification pass + traceability"
```

---

## Notes for the implementer

- **RPC error propagation:** `rpcError(status, msg)` throws `RpcException`; the gateway's `callService` → `toHttpException` turns it into the matching HTTP status. Assertions in tests read the payload at `.error.statusCode` (see the tenancy spec pattern).
- **ClientProxy pattern:** copy `egov.module.ts`'s `NOTIFICATION_CLIENT` factory exactly, swapping the `tcpEndpoint('<service>')` name.
- **Bash cwd in the worktree:** absolute paths are safest; the worktree root is `.claude/worktrees/usapp-integration`, backend at `backend/`, mobile at `mobile-application/`.
- **Do not touch real `.env*`** — only `.env.example`. The operator supplies `USAPP_API_KEY` and sets `OTP_DELIVERY_DRIVER=usapp` in staging/prod, and registers the egress IP in the Usapp tenant allowlist.
