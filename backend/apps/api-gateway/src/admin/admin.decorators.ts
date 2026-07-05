import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const PLATFORM_ONLY_KEY = 'platformOnly';
/** Route is reserved for the platform (SaaS operator) role. */
export const PlatformOnly = () => SetMetadata(PLATFORM_ONLY_KEY, true);

export const ADMIN_PUBLIC_KEY = 'adminPublic';
/** Admin route reachable without an admin JWT (login/refresh only). */
export const AdminPublic = () => SetMetadata(ADMIN_PUBLIC_KEY, true);

export interface AdminPrincipal {
  adminId: string;
  role: 'platform_admin' | 'tenant_admin';
  tenantId: string | null;
  sessionId: string;
}

export const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<{ admin?: AdminPrincipal }>();
  return req.admin;
});
