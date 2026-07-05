import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { POST_CATEGORIES, TenantContext } from '@app/common';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { Public } from '../auth/auth.decorators';
import { AdminJwtGuard, resolveTenantScope } from './admin-jwt.guard';
import { AdminPrincipal, CurrentAdmin } from './admin.decorators';

export class TransitionDto {
  @IsString()
  @IsNotEmpty()
  to!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  claim_schedule?: string;

  @IsOptional()
  @IsString()
  claim_location?: string;
}

export class AdminPostDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsIn(POST_CATEGORIES as unknown as string[])
  category!: string;

  @IsOptional()
  @IsString()
  hero_image?: string;

  @IsOptional()
  pinned?: boolean;

  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}

/**
 * The staff-console operations surface (replaces the CLI stand-in scripts):
 * tenant-scoped lists + audited status-machine transitions, actor = admin id.
 */
@Controller('admin/tenants/:tenantId')
@Public()
@UseGuards(AdminJwtGuard)
export class AdminOpsController {
  constructor(
    @Inject(SERVICE_CLIENT('tenancy')) private readonly tenancy: ClientProxy,
    @Inject(SERVICE_CLIENT('reports')) private readonly reports: ClientProxy,
    @Inject(SERVICE_CLIENT('egov')) private readonly egov: ClientProxy,
    @Inject(SERVICE_CLIENT('assistance')) private readonly assistance: ClientProxy,
    @Inject(SERVICE_CLIENT('content')) private readonly content: ClientProxy,
    @Inject(SERVICE_CLIENT('notification')) private readonly notifications: ClientProxy,
  ) {}

  private async ctx(admin: AdminPrincipal, tenantId: string): Promise<TenantContext> {
    const scope = resolveTenantScope(admin, tenantId);
    return callService<TenantContext>(this.tenancy, 'tenancy.resolve', { key: scope });
  }

  private actor(admin: AdminPrincipal): string {
    return `admin:${admin.role}:${admin.adminId}`;
  }

  // ---- 311 tickets ----
  @Get('reports')
  async listReports(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('tenantId') tenantId: string,
    @Query('status') status?: string,
  ) {
    const tenant = await this.ctx(admin, tenantId);
    return callService(this.reports, 'reports.ticket.list', { tenant, data: { status } });
  }

  @Post('reports/:ticketId/transition')
  async transitionReport(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('tenantId') tenantId: string,
    @Param('ticketId') ticketId: string,
    @Body() dto: TransitionDto,
  ) {
    const tenant = await this.ctx(admin, tenantId);
    return callService(this.reports, 'reports.ticket.transition', {
      tenant,
      data: { ticket_id: ticketId, to: dto.to, actor: this.actor(admin), note: dto.note },
    });
  }

  // ---- e-gov applications ----
  @Get('applications')
  async listApplications(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('tenantId') tenantId: string,
    @Query('status') status?: string,
  ) {
    const tenant = await this.ctx(admin, tenantId);
    return callService(this.egov, 'egov.application.list', { tenant, data: { status } });
  }

  @Post('applications/:stubId/transition')
  async transitionApplication(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('tenantId') tenantId: string,
    @Param('stubId') stubId: string,
    @Body() dto: TransitionDto,
  ) {
    const tenant = await this.ctx(admin, tenantId);
    return callService(this.egov, 'egov.application.transition', {
      tenant,
      data: { stub_id: stubId, to: dto.to, actor: this.actor(admin), note: dto.note },
    });
  }

  // ---- assistance requests ----
  @Get('assistance')
  async listAssistance(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('tenantId') tenantId: string,
    @Query('status') status?: string,
  ) {
    const tenant = await this.ctx(admin, tenantId);
    return callService(this.assistance, 'assistance.request.list', { tenant, data: { status } });
  }

  @Post('assistance/:requestId/transition')
  async transitionAssistance(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('tenantId') tenantId: string,
    @Param('requestId') requestId: string,
    @Body() dto: TransitionDto,
  ) {
    const tenant = await this.ctx(admin, tenantId);
    return callService(this.assistance, 'assistance.request.transition', {
      tenant,
      data: {
        request_id: requestId,
        to: dto.to,
        actor: this.actor(admin),
        note: dto.note,
        claim_schedule: dto.claim_schedule,
        claim_location: dto.claim_location,
      },
    });
  }

  // ---- CMS + feedback + audit ----
  @Post('posts')
  async createPost(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('tenantId') tenantId: string,
    @Body() dto: AdminPostDto,
  ) {
    const tenant = await this.ctx(admin, tenantId);
    return callService(this.content, 'content.posts.create', {
      tenant,
      data: {
        title: dto.title,
        body: dto.body,
        category: dto.category,
        heroImage: dto.hero_image,
        pinned: dto.pinned ?? false,
        author: 'City PIO',
      },
    });
  }

  @Get('feedback')
  async listFeedback(@CurrentAdmin() admin: AdminPrincipal, @Param('tenantId') tenantId: string) {
    const tenant = await this.ctx(admin, tenantId);
    return callService(this.content, 'content.feedback.list', { tenant, data: {} });
  }

  @Get('audit')
  async auditLog(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('tenantId') tenantId: string,
    @Query('category') category?: string,
  ) {
    const tenant = await this.ctx(admin, tenantId);
    return callService(this.notifications, 'audit.list', { tenant, data: { category } });
  }
}
