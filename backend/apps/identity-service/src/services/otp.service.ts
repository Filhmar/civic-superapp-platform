import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import { AppConfigService, TenantContext, rpcError } from '@app/common';
import { RedisService } from '@app/redis';
import { PrismaService } from '../prisma.service';
import { OtpDelivery } from './otp-delivery';

const PH_MOBILE = /^\+639\d{9}$/;

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: AppConfigService,
    private readonly otpDelivery: OtpDelivery,
  ) {}

  async request(
    tenant: TenantContext,
    phoneNumber: string,
    ip: string | undefined,
    _smsProvider: string,
  ): Promise<{ requested: true; expires_in_seconds: number; dev_code?: string }> {
    if (!PH_MOBILE.test(phoneNumber)) {
      rpcError(400, 'Phone number must be in +639XXXXXXXXX format');
    }
    await this.enforceRateLimits(phoneNumber, ip);

    const code = String(randomInt(0, 10 ** this.config.get('OTP_LENGTH'))).padStart(
      this.config.get('OTP_LENGTH'),
      '0',
    );
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
    const isDev = this.config.get('NODE_ENV') !== 'production';
    return {
      requested: true,
      expires_in_seconds: expiryMinutes * 60,
      // Surfaced only outside production so the flow is fully testable end-to-end.
      ...(isDev ? { dev_code: code } : {}),
    };
  }

  /** Returns the phone number on success; throws otherwise. */
  async verify(tenant: TenantContext, phoneNumber: string, code: string): Promise<string> {
    const otp = await this.prisma.otpRequest.findFirst({
      where: {
        tenantId: tenant.tenantId,
        phoneNumber,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) rpcError(400, 'No active OTP — request a new code');
    if (otp.attempts >= this.config.get('MAX_OTP_ATTEMPTS')) {
      rpcError(429, 'Too many attempts — request a new code');
    }
    const ok = await bcrypt.compare(code, otp.codeHash);
    if (!ok) {
      await this.prisma.otpRequest.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      rpcError(401, 'Incorrect code');
    }
    await this.prisma.otpRequest.update({ where: { id: otp.id }, data: { isUsed: true } });
    return phoneNumber;
  }

  private async enforceRateLimits(phoneNumber: string, ip: string | undefined): Promise<void> {
    const checks: [string, number, number][] = [
      [
        `otp:phone:h:${phoneNumber}`,
        3600,
        this.config.get('MAX_OTP_REQUESTS_PER_PHONE_PER_HOUR'),
      ],
      [`otp:phone:d:${phoneNumber}`, 86400, this.config.get('MAX_OTP_REQUESTS_PER_PHONE_PER_DAY')],
      ...(ip
        ? ([[`otp:ip:h:${ip}`, 3600, this.config.get('MAX_OTP_REQUESTS_PER_IP_PER_HOUR')]] as [
            string,
            number,
            number,
          ][])
        : []),
    ];
    for (const [key, ttl, limit] of checks) {
      const count = await this.redis.client.incr(key);
      if (count === 1) await this.redis.client.expire(key, ttl);
      if (count > limit) rpcError(429, 'Too many OTP requests — try again later');
    }
  }
}
