import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantScoped } from '@app/common';
import { FeatureInput, GeoService } from './geo.service';
import { GeoLayer } from './schemas/geo-feature.schema';

@Controller()
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @MessagePattern({ cmd: 'geo.boundary' })
  boundary(@Payload() p: TenantScoped) {
    return this.geo.boundary(p.tenant);
  }

  @MessagePattern({ cmd: 'geo.validate' })
  validate(@Payload() p: TenantScoped<{ lat: number; lng: number }>) {
    return this.geo.validate(p.tenant, p.data.lat, p.data.lng);
  }

  @MessagePattern({ cmd: 'geo.locate' })
  locate(@Payload() p: TenantScoped<{ lat: number; lng: number }>) {
    return this.geo.locate(p.tenant, p.data.lat, p.data.lng);
  }

  @MessagePattern({ cmd: 'geo.features.bbox' })
  featuresInBbox(
    @Payload()
    p: TenantScoped<{ bbox: [number, number, number, number]; layer?: GeoLayer; limit?: number }>,
  ) {
    return this.geo.featuresInBbox(p.tenant, p.data.bbox, p.data.layer, p.data.limit);
  }

  @MessagePattern({ cmd: 'geo.import' })
  importFeatures(
    @Payload() p: TenantScoped<{ features: FeatureInput[]; replace_layers?: GeoLayer[] }>,
  ) {
    return this.geo.importFeatures(p.tenant, p.data.features, p.data.replace_layers ?? []);
  }
}
