import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantScoped } from '@app/common';
import { PlacesService } from './places.service';
import { PoiKind } from './schemas/places.schema';

@Controller()
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @MessagePattern({ cmd: 'places.list' })
  list(
    @Payload()
    p: TenantScoped<{ kind?: PoiKind; near?: { lat: number; lng: number }; limit?: number; user_id?: string }>,
  ) {
    return this.places.list(p.tenant, p.data);
  }

  @MessagePattern({ cmd: 'places.get' })
  get(@Payload() p: TenantScoped<{ id: string; user_id?: string }>) {
    return this.places.get(p.tenant, p.data.id, p.data.user_id);
  }

  @MessagePattern({ cmd: 'places.favorite.set' })
  favorite(@Payload() p: TenantScoped<{ user_id: string; poi_id: string; value: boolean }>) {
    return this.places.setFavorite(p.tenant, p.data.user_id, p.data.poi_id, p.data.value);
  }

  @MessagePattern({ cmd: 'transport.routes.list' })
  routes(@Payload() p: TenantScoped) {
    return this.places.listRoutes(p.tenant);
  }

  @MessagePattern({ cmd: 'transport.routes.match' })
  match(@Payload() p: TenantScoped<{ from: string; to: string }>) {
    return this.places.matchRoutes(p.tenant, p.data.from, p.data.to);
  }

  @MessagePattern({ cmd: 'search.query' })
  search(@Payload() p: TenantScoped<{ query: string; user_id?: string }>) {
    return this.places.search(p.tenant, p.data.query, p.data.user_id);
  }

  @MessagePattern({ cmd: 'search.recent' })
  recent(@Payload() p: TenantScoped<{ user_id: string }>) {
    return this.places.recentSearches(p.tenant, p.data.user_id);
  }
}
