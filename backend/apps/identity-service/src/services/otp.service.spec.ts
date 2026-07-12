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
