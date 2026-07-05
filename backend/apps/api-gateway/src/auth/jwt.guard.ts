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
import { RedisService } from '@app/redis';
import { IS_PUBLIC_KEY, RESIDENT_ONLY_KEY, AuthUser } from './auth.decorators';
import { TenantRequest } from '../tenant/tenant.types';

interface AccessPayload {
  sub: string;
  tenantId: string;
  scope: 'resident' | 'guest';
  sessionId: string;
}

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<TenantRequest & { user?: AuthUser }>();
    const header = req.headers.authorization;

    if (isPublic) {
      // Public routes still personalize when a valid token is present
      // (favorites on place lists, recent searches) — best-effort, non-fatal.
      if (header?.startsWith('Bearer ')) {
        try {
          const payload = this.jwt.verify<AccessPayload>(header.slice(7), {
            secret: this.config.require('JWT_ACCESS_SECRET'),
          });
          if (!req.tenant || payload.tenantId === req.tenant.tenantId) {
            req.user = {
              userId: payload.sub,
              tenantId: payload.tenantId,
              scope: payload.scope,
              sessionId: payload.sessionId,
            };
          }
        } catch {
          // ignore: public route, invalid token just means anonymous
        }
      }
      return true;
    }

    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');

    let payload: AccessPayload;
    try {
      payload = this.jwt.verify<AccessPayload>(header.slice(7), {
        secret: this.config.require('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // A token minted for one tenant must never work against another.
    if (req.tenant && payload.tenantId !== req.tenant.tenantId) {
      throw new UnauthorizedException('Token tenant mismatch');
    }

    const revoked = await this.redis.client
      .get(`session:revoked:${payload.sessionId}`)
      .catch(() => null);
    if (revoked) throw new UnauthorizedException('Session revoked');

    const residentOnly = this.reflector.getAllAndOverride<boolean>(RESIDENT_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (residentOnly && payload.scope !== 'resident') {
      throw new ForbiddenException('Sign in to use this feature');
    }

    req.user = {
      userId: payload.sub,
      tenantId: payload.tenantId,
      scope: payload.scope,
      sessionId: payload.sessionId,
    };
    return true;
  }
}
