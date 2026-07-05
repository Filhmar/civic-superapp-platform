import { Injectable } from '@nestjs/common';
import { TenantContext, rpcError } from '@app/common';
import { PrismaService } from '../prisma.service';
import { AuthService } from './auth.service';

export interface ProfileUpdate {
  name?: string;
  unit?: string;
  language?: string;
  avatarUrl?: string;
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async get(tenant: TenantContext, userId: string): Promise<object> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId: tenant.tenantId },
    });
    if (!user) rpcError(404, 'Profile not found');
    return this.auth.publicUser(user);
  }

  async update(tenant: TenantContext, userId: string, update: ProfileUpdate): Promise<object> {
    if (update.unit !== undefined && update.unit !== null) {
      // Barangay must be one of the tenant's configured geo units (data, not code).
      // Validation happens gateway-side against config; service stores as-is.
    }
    const existing = await this.prisma.user.findFirst({
      where: { id: userId, tenantId: tenant.tenantId },
      select: { id: true },
    });
    if (!existing) rpcError(404, 'Profile not found');
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(update.name !== undefined ? { name: update.name } : {}),
        ...(update.unit !== undefined ? { unit: update.unit } : {}),
        ...(update.language !== undefined ? { language: update.language } : {}),
        ...(update.avatarUrl !== undefined ? { avatarUrl: update.avatarUrl } : {}),
      },
    });
    return this.auth.publicUser(user);
  }
}
