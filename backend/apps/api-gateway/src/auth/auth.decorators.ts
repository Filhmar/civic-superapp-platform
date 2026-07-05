import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Route is reachable without a JWT (tenant resolution still applies unless excluded). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const RESIDENT_ONLY_KEY = 'residentOnly';
/** Route requires a full resident session — guests are rejected. */
export const ResidentOnly = () => SetMetadata(RESIDENT_ONLY_KEY, true);

export interface AuthUser {
  userId: string;
  tenantId: string;
  scope: 'resident' | 'guest';
  sessionId: string;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
  return req.user;
});
