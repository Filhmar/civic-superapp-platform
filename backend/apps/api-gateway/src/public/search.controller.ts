import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { TenantRequest } from '../tenant/tenant.types';
import { AuthUser, Public, ResidentOnly } from '../auth/auth.decorators';

/**
 * Federated per-tenant search (Reference §5.11): places + transport from the
 * places service, news posts from content, hotlines from emergency, service
 * catalog from egov — fanned out in parallel, module flags respected.
 */
@Controller('search')
export class SearchGatewayController {
  constructor(
    @Inject(SERVICE_CLIENT('places')) private readonly places: ClientProxy,
    @Inject(SERVICE_CLIENT('content')) private readonly content: ClientProxy,
    @Inject(SERVICE_CLIENT('emergency')) private readonly emergency: ClientProxy,
    @Inject(SERVICE_CLIENT('egov')) private readonly egov: ClientProxy,
  ) {}

  @Public()
  @Get()
  async search(@Req() req: TenantRequest & { user?: AuthUser }, @Query('q') q?: string) {
    const query = (q ?? '').trim();
    if (!query) return { places: [], routes: [], posts: [], hotlines: [], services: [] };
    const m = req.tenant.modules;
    const userId = req.user?.scope === 'resident' ? req.user.userId : undefined;

    const [placesRes, posts, hotlines, catalog] = await Promise.all([
      callService<{ places: unknown[]; routes: unknown[] }>(this.places, 'search.query', {
        tenant: req.tenant,
        data: { query, user_id: userId },
      }),
      m.news
        ? callService<unknown[]>(this.content, 'content.posts.search', {
            tenant: req.tenant,
            data: { query },
          })
        : Promise.resolve([]),
      callService<{ org: string; tag: string; numbers: string[] }[]>(
        this.emergency,
        'emergency.hotlines.list',
        { tenant: req.tenant, data: {} },
      ).then((all) => all.filter((h) => h.org.toLowerCase().includes(query.toLowerCase()))),
      m.egov
        ? callService<{ group: string; services: { code: string; name: string; fee: number }[] }[]>(
            this.egov,
            'egov.catalog.list',
            { tenant: req.tenant, data: {} },
          ).then((groups) =>
            groups
              .flatMap((g) => g.services)
              .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 5),
          )
        : Promise.resolve([]),
    ]);

    return {
      places: m.tourism || m.directory ? placesRes.places : [],
      routes: m.transport ? placesRes.routes : [],
      posts,
      hotlines,
      services: catalog,
    };
  }

  @ResidentOnly()
  @Get('recent')
  recent(@Req() req: TenantRequest & { user: AuthUser }) {
    return callService(this.places, 'search.recent', {
      tenant: req.tenant,
      data: { user_id: req.user.userId },
    });
  }
}
