import { Body, Controller, Get, Inject, Post, Query, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { Public } from '../auth/auth.decorators';
import { AdminJwtGuard, resolveTenantScope } from './admin-jwt.guard';
import { AdminPublic, AdminPrincipal, CurrentAdmin, PlatformOnly } from './admin.decorators';

export class AdminLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class AdminRefreshDto {
  @IsString()
  @IsNotEmpty()
  refresh_token!: string;
}

export class AdminCreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  password!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn(['platform_admin', 'tenant_admin'])
  role!: 'platform_admin' | 'tenant_admin';

  @IsOptional()
  @IsString()
  tenant_id?: string;
}

// @Public() skips the resident-plane guard; AdminJwtGuard owns this plane.
@Controller('admin')
@Public()
@UseGuards(AdminJwtGuard)
export class AdminAuthController {
  constructor(@Inject(SERVICE_CLIENT('admin')) private readonly admin: ClientProxy) {}

  @AdminPublic()
  @Post('auth/login')
  login(@Body() dto: AdminLoginDto) {
    return callService(this.admin, 'admin.auth.login', dto);
  }

  @AdminPublic()
  @Post('auth/refresh')
  refresh(@Body() dto: AdminRefreshDto) {
    return callService(this.admin, 'admin.auth.refresh', dto);
  }

  @Post('auth/logout')
  logout(@CurrentAdmin() admin: AdminPrincipal) {
    return callService(this.admin, 'admin.auth.logout', { session_id: admin.sessionId });
  }

  @Get('me')
  me(@CurrentAdmin() admin: AdminPrincipal) {
    return callService(this.admin, 'admin.me', { admin_id: admin.adminId });
  }

  @Get('users')
  listUsers(@CurrentAdmin() admin: AdminPrincipal, @Query('tenant_id') tenantId?: string) {
    // Platform admins may list everyone (no tenant filter) or filter by tenant;
    // tenant admins only ever see their own tenant's accounts.
    const scope =
      admin.role === 'platform_admin' ? tenantId : resolveTenantScope(admin, tenantId);
    return callService(this.admin, 'admin.users.list', { tenant_id: scope });
  }

  @PlatformOnly()
  @Post('users')
  createUser(@Body() dto: AdminCreateUserDto) {
    return callService(this.admin, 'admin.users.create', dto);
  }
}
