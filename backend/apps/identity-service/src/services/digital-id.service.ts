import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService, TenantContext, rpcError } from '@app/common';
import { PrismaService } from '../prisma.service';

const QR_TTL_SECONDS = 300; // rotating QR: each fetch mints a short-lived JWS

interface QrPayload {
  rid: string;
  tid: string;
  name: string;
  unit: string | null;
  vr: boolean;
}

@Injectable()
export class DigitalIdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async get(tenant: TenantContext, userId: string): Promise<object> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId: tenant.tenantId },
    });
    if (!user) rpcError(404, 'User not found');
    if (!user.residentId) rpcError(409, 'No resident id assigned');
    const validUntil = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);
    const qr = this.jwt.sign(
      {
        rid: user.residentId,
        tid: tenant.tenantId,
        name: user.name ?? 'Unnamed Resident',
        unit: user.unit,
        vr: user.verifiedResident,
      } satisfies QrPayload,
      { secret: this.config.require('DIGITAL_ID_QR_SECRET'), expiresIn: QR_TTL_SECONDS },
    );
    return {
      resident_id: user.residentId,
      name: user.name,
      unit: user.unit,
      verified_resident: user.verifiedResident,
      valid_until: validUntil.toISOString(),
      qr_token: qr,
      qr_expires_in: QR_TTL_SECONDS,
    };
  }

  /**
   * Public verify (Reference §5.1): tenant travels inside the signed payload;
   * returns name, unit, verified_resident, validity — nothing else.
   */
  async verify(token: string): Promise<object> {
    let payload: QrPayload;
    try {
      payload = this.jwt.verify<QrPayload>(token, {
        secret: this.config.require('DIGITAL_ID_QR_SECRET'),
      });
    } catch {
      rpcError(401, 'Invalid or expired QR code');
    }
    return {
      valid: true,
      tenant_id: payload.tid,
      resident_id: payload.rid,
      name: payload.name,
      unit: payload.unit,
      verified_resident: payload.vr,
    };
  }
}
