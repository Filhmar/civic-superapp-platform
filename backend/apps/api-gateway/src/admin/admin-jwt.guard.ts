import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '@app/common';
import {
  ADMIN_PUBLIC_KEY,
  AdminPrincipal,
  PLATFORM_ONLY_KEY,
} from './admin.decorators';

interface AdminAccessPayload {
  sub: string;
  role: 'platform_admin' | 'tenant_admin';
  tenantId: string | null;
  sessionId: string;
  plane: string;
}

/**
 * Admin-plane guard: entirely separate secret family (JWT_ADMIN_*) from
 * resident tokens — a resident JWT can never open an admin door and vice versa.
 */
@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(ADMIN_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      admin?: AdminPrincipal;
    }>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Missing admin token');
    let payload: AdminAccessPayload;
    try {
      payload = this.jwt.verify<AdminAccessPayload>(header.slice(7), {
        secret: this.config.require('JWT_ADMIN_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired admin token');
    }
    if (payload.plane !== 'admin') throw new UnauthorizedException('Not an admin token');

    const platformOnly = this.reflector.getAllAndOverride<boolean>(PLATFORM_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (platformOnly && payload.role !== 'platform_admin') {
      throw new ForbiddenException('Platform administrator role required');
    }

    req.admin = {
      adminId: payload.sub,
      role: payload.role,
      tenantId: payload.tenantId,
      sessionId: payload.sessionId,
    };
    return true;
  }
}

/**
 * Resolve which tenant an admin operation targets. Platform admins name any
 * tenant; tenant admins are pinned to their own — a mismatched explicit
 * target is a 403, never a silent fallback.
 */
export function resolveTenantScope(admin: AdminPrincipal, requested?: string): string {
  if (admin.role === 'platform_admin') {
    if (!requested) throw new ForbiddenException('tenant target required for platform admins');
    return requested;
  }
  if (!admin.tenantId) throw new ForbiddenException('Admin account has no tenant scope');
  if (requested && requested !== admin.tenantId) {
    throw new ForbiddenException('Out of tenant scope');
  }
  return admin.tenantId;
}
