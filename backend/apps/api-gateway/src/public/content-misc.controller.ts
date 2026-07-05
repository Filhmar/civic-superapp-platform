import { Body, Controller, Get, Inject, Post, Query, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { TenantRequest } from '../tenant/tenant.types';
import { Public, CurrentUser, AuthUser } from '../auth/auth.decorators';

export class FaqQueryDto {
  @IsOptional()
  @IsIn(['en', 'fil'])
  locale?: string;
}

export class FeedbackDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contact?: string;
}

@Controller()
export class ContentMiscController {
  constructor(@Inject(SERVICE_CLIENT('content')) private readonly content: ClientProxy) {}

  @Public()
  @Get('faq')
  faq(@Req() req: TenantRequest, @Query() q: FaqQueryDto) {
    return callService(this.content, 'content.faq.list', {
      tenant: req.tenant,
      data: { locale: q.locale ?? 'en' },
    });
  }

  @Post('feedback')
  feedback(
    @Req() req: TenantRequest,
    @CurrentUser() user: AuthUser,
    @Body() dto: FeedbackDto,
  ) {
    return callService(this.content, 'content.feedback.create', {
      tenant: req.tenant,
      data: {
        user_id: user.scope === 'resident' ? user.userId : undefined,
        message: dto.message,
        contact: dto.contact,
      },
    });
  }
}
