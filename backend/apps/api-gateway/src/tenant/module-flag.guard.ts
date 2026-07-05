import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleName } from '@app/common';
import { TenantRequest } from './tenant.types';

export const MODULE_FLAG_KEY = 'requiresModule';

/** Route is only live for tenants with modules.<name> = true; otherwise 403 (inert). */
export const RequiresModule = (name: ModuleName) => SetMetadata(MODULE_FLAG_KEY, name);

@Injectable()
export class ModuleFlagGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<ModuleName | undefined>(MODULE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;
    const req = context.switchToHttp().getRequest<TenantRequest>();
    if (!req.tenant?.modules?.[required]) {
      throw new ForbiddenException(`Module '${required}' is not enabled for this tenant`);
    }
    return true;
  }
}
