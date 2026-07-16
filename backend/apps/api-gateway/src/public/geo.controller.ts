import { BadRequestException, Controller, Get, Inject, Query, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AppConfigService } from '@app/common';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { TenantRequest } from '../tenant/tenant.types';
import { Public } from '../auth/auth.decorators';

function parseBbox(raw?: string): [number, number, number, number] {
  const parts = (raw ?? '').split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new BadRequestException('bbox must be "minLng,minLat,maxLng,maxLat"');
  }
  return parts as [number, number, number, number];
}

/**
 * Self-hosted geo (Reference §5.7 / M10). Basemap tiles are a public static
 * object on MinIO (no per-request billing, fetched by the client's PMTiles
 * protocol); overlays are tenant-scoped through this gateway, which already
 * resolves + validates the tenant before any domain call.
 */
@Controller('geo')
@Public()
export class GeoGatewayController {
  constructor(
    @Inject(SERVICE_CLIENT('geo')) private readonly geo: ClientProxy,
    private readonly appConfig: AppConfigService,
  ) {}

  /** MapLibre style: neutral self-hosted basemap + the tenant's opening view. */
  @Get('style.json')
  async style(@Req() req: TenantRequest) {
    const boundary = await callService<{ center: { lat: number; lng: number }; zoom: number }>(
      this.geo,
      'geo.boundary',
      { tenant: req.tenant, data: {} },
    ).catch(() => null);
    const base =
      this.appConfig.get('S3_PUBLIC_ENDPOINT') ?? this.appConfig.require('S3_ENDPOINT');
    const bucket = this.appConfig.get('S3_BUCKET');
    const key = this.appConfig.get('GEO_BASEMAP_KEY');
    const pmtiles = `pmtiles://${base}/${bucket}/${key}`;
    return {
      version: 8,
      name: 'civic-basemap',
      // Text labels/sprites are added in production (self-hosted glyphs/sprite on
      // MinIO); MVP renders fills/lines/points so no external font server is needed.
      sources: {
        basemap: { type: 'vector', url: pmtiles },
      },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': '#EAF1EC' } },
        {
          id: 'boundary-fill',
          type: 'fill',
          source: 'basemap',
          'source-layer': 'boundary',
          paint: { 'fill-color': '#1E8449', 'fill-opacity': 0.06 },
        },
        {
          id: 'barangay-line',
          type: 'line',
          source: 'basemap',
          'source-layer': 'barangay',
          paint: { 'line-color': '#6B7C70', 'line-width': 0.6, 'line-dasharray': [2, 2] },
        },
        {
          id: 'boundary-line',
          type: 'line',
          source: 'basemap',
          'source-layer': 'boundary',
          paint: { 'line-color': '#1E8449', 'line-width': 1.6 },
        },
        {
          id: 'facility-dot',
          type: 'circle',
          source: 'basemap',
          'source-layer': 'facility',
          paint: { 'circle-radius': 3.5, 'circle-color': '#1B4F9C', 'circle-opacity': 0.8 },
        },
      ],
      center: boundary ? [boundary.center.lng, boundary.center.lat] : undefined,
      zoom: boundary?.zoom,
    };
  }

  @Get('boundary')
  boundary(@Req() req: TenantRequest) {
    return callService(this.geo, 'geo.boundary', { tenant: req.tenant, data: {} });
  }

  @Get('locate')
  locate(@Req() req: TenantRequest, @Query('lat') lat: string, @Query('lng') lng: string) {
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) {
      throw new BadRequestException('lat and lng are required numbers');
    }
    return callService(this.geo, 'geo.locate', { tenant: req.tenant, data: { lat: la, lng: ln } });
  }

  @Get('features')
  features(
    @Req() req: TenantRequest,
    @Query('bbox') bbox?: string,
    @Query('layer') layer?: string,
    @Query('limit') limit?: string,
  ) {
    return callService(this.geo, 'geo.features.bbox', {
      tenant: req.tenant,
      data: { bbox: parseBbox(bbox), layer, limit: limit ? Number(limit) : undefined },
    });
  }
}
