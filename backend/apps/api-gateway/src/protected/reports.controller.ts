import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { TenantRequest } from '../tenant/tenant.types';
import { CurrentUser, AuthUser, Public, ResidentOnly } from '../auth/auth.decorators';
import { RequiresModule } from '../tenant/module-flag.guard';

export class GeoDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  category_key!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ValidateNested()
  @Type(() => GeoDto)
  geo!: GeoDto;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;
}

@Controller('reports')
@RequiresModule('reports311')
export class ReportsGatewayController {
  constructor(
    @Inject(SERVICE_CLIENT('reports')) private readonly reports: ClientProxy,
    @Inject(SERVICE_CLIENT('geo')) private readonly geo: ClientProxy,
  ) {}

  @Public()
  @Get('categories')
  categories(@Req() req: TenantRequest) {
    return callService(this.reports, 'reports.categories.list', {
      tenant: req.tenant,
      data: {},
    });
  }

  @ResidentOnly()
  @Post()
  async create(
    @Req() req: TenantRequest,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReportDto,
  ) {
    // Self-hosted boundary gate: a pin must fall inside THIS tenant's own
    // territory. `configured:false` (no boundary loaded) never blocks a write;
    // we also enrich the ticket with the resolved barangay from the tenant's
    // own gazetteer — no external geocoder, so no per-request billing.
    const loc = await callService<{
      inside: boolean;
      unit: string | null;
    }>(this.geo, 'geo.locate', {
      tenant: req.tenant,
      data: { lat: dto.geo.lat, lng: dto.geo.lng },
    }).catch(() => null);
    const check = await callService<{ inside: boolean; configured: boolean }>(
      this.geo,
      'geo.validate',
      { tenant: req.tenant, data: { lat: dto.geo.lat, lng: dto.geo.lng } },
    ).catch(() => ({ inside: true, configured: false }));
    if (check.configured && !check.inside) {
      throw new UnprocessableEntityException(
        'Pinned location is outside the city boundary. Move the pin inside the city.',
      );
    }
    return callService(this.reports, 'reports.ticket.create', {
      tenant: req.tenant,
      data: { ...dto, user_id: user.userId, unit: loc?.unit ?? undefined },
    });
  }

  @ResidentOnly()
  @Get()
  listMine(@Req() req: TenantRequest, @CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return callService(this.reports, 'reports.ticket.list-mine', {
      tenant: req.tenant,
      data: { user_id: user.userId, limit: limit ? Number(limit) : undefined },
    });
  }

  @ResidentOnly()
  @Get(':ticketId')
  get(@Req() req: TenantRequest, @CurrentUser() user: AuthUser, @Param('ticketId') ticketId: string) {
    return callService(this.reports, 'reports.ticket.get', {
      tenant: req.tenant,
      data: { user_id: user.userId, ticket_id: ticketId },
    });
  }
}
