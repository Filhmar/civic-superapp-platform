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
