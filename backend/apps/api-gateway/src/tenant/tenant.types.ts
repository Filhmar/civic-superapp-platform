import type { Request } from 'express';
import type { TenantContext } from '@app/common';

export interface TenantRequest extends Request {
  tenant: TenantContext;
  correlationId?: string;
}

export const TENANT_HEADER = 'x-tenant-id';
