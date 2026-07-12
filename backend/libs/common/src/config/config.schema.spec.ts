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
