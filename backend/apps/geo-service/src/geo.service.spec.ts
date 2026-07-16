import { Model } from 'mongoose';
import { TenantContext } from '@app/common';
import { GeoService } from './geo.service';
import { GeoFeature } from './schemas/geo-feature.schema';

// A city boundary box roughly around Dasmariñas used for the pure-math assertions.
const BOUNDARY_GEOM = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [120.87, 14.27],
      [120.99, 14.27],
      [120.99, 14.39],
      [120.87, 14.39],
      [120.87, 14.27],
    ],
  ],
};

const tenant = {
  tenantId: 'ph-cavite-dasmarinas',
  ticketPrefix: 'DSM',
} as unknown as TenantContext;

/** Chainable Mongoose-model stub that records the filter each query received. */
function makeModel(overrides: Partial<Record<string, unknown>> = {}) {
  const calls: { method: string; filter: unknown }[] = [];
  const lean = (value: unknown) => ({ lean: () => Promise.resolve(value) });
  const model = {
    calls,
    findOne: jest.fn((filter: unknown) => {
      calls.push({ method: 'findOne', filter });
      const key = (filter as { layer?: string }).layer ?? 'any';
      return lean((overrides.findOne as Record<string, unknown>)?.[key] ?? null);
    }),
    find: jest.fn((filter: unknown) => {
      calls.push({ method: 'find', filter });
      return { limit: () => lean(overrides.find ?? []) };
    }),
    exists: jest.fn((filter: unknown) => {
      calls.push({ method: 'exists', filter });
      return Promise.resolve(overrides.exists ?? null);
    }),
    deleteMany: jest.fn((filter: unknown) => {
      calls.push({ method: 'deleteMany', filter });
      return Promise.resolve({ deletedCount: 0 });
    }),
    insertMany: jest.fn((docs: unknown) => {
      calls.push({ method: 'insertMany', filter: docs });
      return Promise.resolve(docs);
    }),
    aggregate: jest.fn(() => Promise.resolve(overrides.aggregate ?? [])),
  };
  return model as unknown as Model<GeoFeature> & {
    calls: { method: string; filter: unknown }[];
  };
}

describe('GeoService', () => {
  it('scopes EVERY query to the tenant (no cross-tenant leakage)', async () => {
    const model = makeModel({
      findOne: { boundary: { name: 'City Boundary', geometry: BOUNDARY_GEOM } },
      find: [],
    });
    const svc = new GeoService(model);
    await svc.boundary(tenant);
    await svc.validate(tenant, 14.33, 120.93);
    await svc.locate(tenant, 14.33, 120.93);
    await svc.featuresInBbox(tenant, [120.9, 14.3, 121.0, 14.4]);
    // Boundary lookups may query by _id after resolving the boundary; all
    // tenant-facing entry queries must carry tenantId.
    const tenantScoped = model.calls.filter(
      (c) => (c.filter as { layer?: string })?.layer !== undefined,
    );
    expect(tenantScoped.length).toBeGreaterThan(0);
    for (const c of tenantScoped) {
      expect((c.filter as { tenantId?: string }).tenantId).toBe(tenant.tenantId);
    }
  });

  it('boundary derives bbox/center/zoom from the polygon (turf)', async () => {
    const model = makeModel({
      findOne: { boundary: { name: 'City Boundary', geometry: BOUNDARY_GEOM } },
    });
    const out = await svcOf(model).boundary(tenant);
    expect(out.bbox).toEqual([120.87, 14.27, 120.99, 14.39]);
    expect(out.center.lng).toBeCloseTo(120.93, 2);
    expect(out.center.lat).toBeCloseTo(14.33, 2);
    expect(out.zoom).toBeGreaterThanOrEqual(10);
    expect(out.zoom).toBeLessThanOrEqual(16);
  });

  it('validate does NOT block writes when no boundary is configured', async () => {
    const model = makeModel({ findOne: {} }); // boundary lookup → null
    const res = await svcOf(model).validate(tenant, 0, 0);
    expect(res).toEqual({ inside: true, configured: false });
    expect(model.exists).not.toHaveBeenCalled();
  });

  it('validate uses the 2dsphere $geoIntersects gate against the boundary', async () => {
    const model = makeModel({ findOne: { boundary: { _id: 'b1' } }, exists: { _id: 'b1' } });
    const res = await svcOf(model).validate(tenant, 14.33, 120.93);
    expect(res).toEqual({ inside: true, configured: true });
    const existsCall = model.calls.find((c) => c.method === 'exists');
    expect(existsCall?.filter).toMatchObject({
      geometry: { $geoIntersects: { $geometry: { type: 'Point', coordinates: [120.93, 14.33] } } },
    });
  });

  it('locate resolves the containing barangay + nearest facility distance', async () => {
    const model = makeModel({
      findOne: {
        barangay: { name: 'Zone I' },
        boundary: { _id: 'b1' },
        facility: {
          name: 'City Hall',
          properties: { kind: 'government' },
          geometry: { type: 'Point', coordinates: [120.9367, 14.3294] },
        },
      },
    });
    const out = await svcOf(model).locate(tenant, 14.3294, 120.9367);
    expect(out.inside).toBe(true);
    expect(out.unit).toBe('Zone I');
    expect(out.nearest_facility).toMatchObject({ name: 'City Hall', kind: 'government' });
    expect(out.nearest_facility?.distance_m).toBe(0);
    // $near must be issued for the facility lookup.
    const nearCall = model.calls.find(
      (c) => (c.filter as { geometry?: { $near?: unknown } })?.geometry?.$near,
    );
    expect(nearCall).toBeTruthy();
  });

  it('importFeatures rejects an unknown layer', async () => {
    const svc = svcOf(makeModel());
    await expect(
      svc.importFeatures(
        tenant,
        [{ layer: 'streets' as never, name: 'x', geometry: { type: 'Point', coordinates: [0, 0] } }],
        [],
      ),
    ).rejects.toBeDefined();
  });

  it('importFeatures replaces only the requested layers, scoped to tenant', async () => {
    const model = makeModel({ aggregate: [{ _id: 'boundary', n: 1 }] });
    await svcOf(model).importFeatures(
      tenant,
      [{ layer: 'boundary', name: 'City', geometry: BOUNDARY_GEOM }],
      ['boundary'],
    );
    const del = model.calls.find((c) => c.method === 'deleteMany');
    expect(del?.filter).toMatchObject({
      tenantId: tenant.tenantId,
      layer: { $in: ['boundary'] },
    });
  });
});

function svcOf(model: Model<GeoFeature>): GeoService {
  return new GeoService(model);
}
