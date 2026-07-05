import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AdminAuthService, AdminRole } from './admin-auth.service';

@Controller()
export class AdminController {
  constructor(private readonly auth: AdminAuthService) {}

  @MessagePattern({ cmd: 'admin.auth.login' })
  login(@Payload() p: { email: string; password: string }) {
    return this.auth.login(p.email, p.password);
  }

  @MessagePattern({ cmd: 'admin.auth.refresh' })
  refresh(@Payload() p: { refresh_token: string }) {
    return this.auth.refresh(p.refresh_token);
  }

  @MessagePattern({ cmd: 'admin.auth.logout' })
  logout(@Payload() p: { session_id: string }) {
    return this.auth.logout(p.session_id);
  }

  @MessagePattern({ cmd: 'admin.me' })
  me(@Payload() p: { admin_id: string }) {
    return this.auth.me(p.admin_id);
  }

  @MessagePattern({ cmd: 'admin.users.list' })
  listUsers(@Payload() p: { tenant_id?: string }) {
    return this.auth.listUsers(p.tenant_id);
  }

  @MessagePattern({ cmd: 'admin.users.create' })
  createUser(
    @Payload()
    p: { email: string; password: string; name: string; role: AdminRole; tenant_id?: string },
  ) {
    return this.auth.createUser({
      email: p.email,
      password: p.password,
      name: p.name,
      role: p.role,
      tenantId: p.tenant_id,
    });
  }
}
