import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantContext, rpcError } from '@app/common';
import { Favorite, Poi, PoiKind, RecentSearch, TransportRoute } from './schemas/places.schema';

function isOpenNow(hours: { day: number; open: string; close: string }[], now = new Date()): boolean | null {
  if (!hours.length) return null;
  const today = hours.filter((h) => h.day === now.getDay());
  if (!today.length) return false;
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return today.some((h) => h.open <= hhmm && hhmm < h.close);
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

@Injectable()
export class PlacesService {
  constructor(
    @InjectModel(Poi.name) private readonly pois: Model<Poi>,
    @InjectModel(Favorite.name) private readonly favorites: Model<Favorite>,
    @InjectModel(TransportRoute.name) private readonly routes: Model<TransportRoute>,
    @InjectModel(RecentSearch.name) private readonly recents: Model<RecentSearch>,
  ) {}

  async list(
    tenant: TenantContext,
    q: { kind?: PoiKind; near?: { lat: number; lng: number }; limit?: number; user_id?: string },
  ) {
    const filter: Record<string, unknown> = { tenantId: tenant.tenantId };
    if (q.kind) filter.kind = q.kind;
    let docs = await this.pois.find(filter).sort({ order: 1 }).limit(100).lean();
    if (q.near) {
      docs = docs
        .map((d) => ({ ...d, _distance: distanceKm(q.near!, d.geo) }))
        .sort((a, b) => (a as { _distance: number })._distance - (b as { _distance: number })._distance);
    }
    docs = docs.slice(0, Math.min(q.limit ?? 20, 50));
    const favIds = q.user_id
      ? new Set(
          (await this.favorites.find({ tenantId: tenant.tenantId, userId: q.user_id }).lean()).map(
            (f) => f.poiId,
          ),
        )
      : new Set<string>();
    return docs.map((d) => this.publicPoi(d, favIds));
  }

  async get(tenant: TenantContext, id: string, userId?: string) {
    const doc = await this.pois.findOne({ _id: id, tenantId: tenant.tenantId }).lean();
    if (!doc) rpcError(404, 'Place not found');
    const fav = userId
      ? await this.favorites.exists({ tenantId: tenant.tenantId, userId, poiId: id })
      : null;
    return this.publicPoi(doc, fav ? new Set([id]) : new Set());
  }

  async setFavorite(tenant: TenantContext, userId: string, poiId: string, value: boolean) {
    const poi = await this.pois.exists({ _id: poiId, tenantId: tenant.tenantId });
    if (!poi) rpcError(404, 'Place not found');
    if (value) {
      await this.favorites.updateOne(
        { tenantId: tenant.tenantId, userId, poiId },
        { $setOnInsert: { tenantId: tenant.tenantId, userId, poiId } },
        { upsert: true },
      );
    } else {
      await this.favorites.deleteOne({ tenantId: tenant.tenantId, userId, poiId });
    }
    return { favorite: value };
  }

  async listRoutes(tenant: TenantContext) {
    const docs = await this.routes
      .find({ tenantId: tenant.tenantId })
      .sort({ popular: -1, order: 1 })
      .lean();
    return docs.map((r) => this.publicRoute(r));
  }

  /** Simple From→To matcher: routes whose stop list contains both, in order. */
  async matchRoutes(tenant: TenantContext, from: string, to: string) {
    const docs = await this.routes.find({ tenantId: tenant.tenantId }).lean();
    const norm = (s: string) => s.trim().toLowerCase();
    const matches = docs.filter((r) => {
      const stops = r.stops.map(norm);
      const i = stops.findIndex((s) => s.includes(norm(from)));
      const j = stops.findIndex((s) => s.includes(norm(to)));
      return i !== -1 && j !== -1 && i < j;
    });
    return matches.map((r) => this.publicRoute(r));
  }

  /** Federated search: catalog handled gateway-side; here places + routes. */
  async search(tenant: TenantContext, query: string, userId?: string) {
    const rx = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [pois, routes] = await Promise.all([
      this.pois
        .find({ tenantId: tenant.tenantId, $or: [{ name: rx }, { description: rx }, { category: rx }] })
        .limit(10)
        .lean(),
      this.routes
        .find({ tenantId: tenant.tenantId, $or: [{ name: rx }, { stops: rx }] })
        .limit(5)
        .lean(),
    ]);
    if (userId && query.trim()) {
      await this.recents.updateOne(
        { tenantId: tenant.tenantId, userId, query: query.trim() },
        { $set: { at: new Date() } },
        { upsert: true },
      );
    }
    return {
      places: pois.map((d) => this.publicPoi(d, new Set())),
      routes: routes.map((r) => this.publicRoute(r)),
    };
  }

  async recentSearches(tenant: TenantContext, userId: string) {
    const docs = await this.recents
      .find({ tenantId: tenant.tenantId, userId })
      .sort({ at: -1 })
      .limit(8)
      .lean();
    return docs.map((d) => d.query);
  }

  private publicPoi(d: Record<string, unknown>, favIds: Set<string>) {
    const hours = (d.hours ?? []) as { day: number; open: string; close: string }[];
    return {
      id: String(d._id),
      kind: d.kind,
      name: d.name,
      description: d.description,
      category: d.category ?? null,
      photos: d.photos,
      rating: d.rating,
      geo: d.geo,
      address: d.address ?? null,
      contact: d.contact ?? null,
      open_now: isOpenNow(hours),
      hours,
      favorite: favIds.has(String(d._id)),
      distance_km: (d as { _distance?: number })._distance !== undefined
        ? Math.round((d as { _distance: number })._distance * 10) / 10
        : undefined,
    };
  }

  private publicRoute(r: Record<string, unknown>) {
    return {
      id: String(r._id),
      mode: r.mode,
      name: r.name,
      stops: r.stops,
      fare_min: r.fareMin,
      fare_max: r.fareMax,
      popular: r.popular,
    };
  }
}
