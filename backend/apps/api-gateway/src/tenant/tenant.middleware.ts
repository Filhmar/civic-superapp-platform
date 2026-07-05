import { BadRequestException, Inject, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { RedisService } from '@app/redis';
import { TenantContext } from '@app/common';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { TENANT_HEADER, TenantRequest } from './tenant.types';

const TENANT_CACHE_TTL_SECONDS = 15;

/**
 * Tenant resolution runs before anything else (Reference §2): the mobile build
 * pins X-Tenant-ID (tenant id or bundle id com.<location>.app); we resolve and
 * validate it against the tenancy control plane, cached briefly in Redis.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    @Inject(SERVICE_CLIENT('tenancy')) private readonly tenancyClient: ClientProxy,
    private readonly redis: RedisService,
  ) {}

  async use(req: TenantRequest, _res: Response, next: NextFunction): Promise<void> {
    const key = req.headers[TENANT_HEADER];
    if (!key || typeof key !== 'string') {
      throw new BadRequestException(`Missing ${TENANT_HEADER} header`);
    }
    const cacheKey = `tenant:ctx:${key}`;
    const cached = await this.redis.client.get(cacheKey).catch(() => null);
    if (cached) {
      req.tenant = JSON.parse(cached) as TenantContext;
      next();
      return;
    }
    const tenant = await callService<TenantContext>(this.tenancyClient, 'tenancy.resolve', {
      key,
    });
    await this.redis.client
      .set(cacheKey, JSON.stringify(tenant), 'EX', TENANT_CACHE_TTL_SECONDS)
      .catch(() => undefined);
    req.tenant = tenant;
    next();
  }
}
