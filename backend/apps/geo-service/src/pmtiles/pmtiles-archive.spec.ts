import zlib from 'node:zlib';
import { PMTiles, Source, RangeResponse, zxyToTileId } from 'pmtiles';
import { buildPmtilesArchive, PmTile } from './pmtiles-archive';

/** In-memory range source so the official reader can validate our archive bytes. */
class BufferSource implements Source {
  constructor(private readonly buf: Buffer) {}
  getKey(): string {
    return 'mem';
  }
  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    const slice = this.buf.subarray(offset, offset + length);
    // Copy into a standalone (non-shared) ArrayBuffer — subarray shares the pool.
    const copy = new Uint8Array(slice.byteLength);
    copy.set(slice);
    return { data: copy.buffer };
  }
}

function gunzipIfNeeded(bytes: Uint8Array): Buffer {
  const b = Buffer.from(bytes);
  return b[0] === 0x1f && b[1] === 0x8b ? zlib.gunzipSync(b) : b;
}

describe('PMTiles v3 archive writer', () => {
  const payloadA = Buffer.from('tile-a-mvt-bytes');
  const payloadB = Buffer.from('tile-b-a-bit-longer-mvt-bytes');
  const tiles: PmTile[] = [
    { tileId: zxyToTileId(12, 3320, 2166), data: zlib.gzipSync(payloadA) },
    { tileId: zxyToTileId(12, 3321, 2166), data: zlib.gzipSync(payloadB) },
  ];
  const archive = buildPmtilesArchive(tiles, {
    minZoom: 6,
    maxZoom: 14,
    bounds: [120.87, 14.27, 120.99, 14.39],
    center: [120.93, 14.33],
    centerZoom: 10,
    metadata: { name: 'civic-basemap', vector_layers: [{ id: 'boundary' }] },
  });

  it('starts with the PMTiles v3 magic and parses a valid header', async () => {
    expect(archive.subarray(0, 7).toString('ascii')).toBe('PMTiles');
    expect(archive[7]).toBe(3);
    const p = new PMTiles(new BufferSource(archive));
    const header = await p.getHeader();
    expect(header.minZoom).toBe(6);
    expect(header.maxZoom).toBe(14);
    expect(header.tileType).toBe(1); // MVT
    expect(header.numAddressedTiles).toBe(2);
    expect(header.maxLat).toBeCloseTo(14.39, 4);
    expect(header.minLon).toBeCloseTo(120.87, 4);
  });

  it('round-trips metadata through the official reader', async () => {
    const p = new PMTiles(new BufferSource(archive));
    const meta = (await p.getMetadata()) as { name: string; vector_layers: { id: string }[] };
    expect(meta.name).toBe('civic-basemap');
    expect(meta.vector_layers[0].id).toBe('boundary');
  });

  it('round-trips every tile back to its original bytes', async () => {
    const p = new PMTiles(new BufferSource(archive));
    const a = await p.getZxy(12, 3320, 2166);
    const b = await p.getZxy(12, 3321, 2166);
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(gunzipIfNeeded(new Uint8Array(a!.data)).toString()).toBe(payloadA.toString());
    expect(gunzipIfNeeded(new Uint8Array(b!.data)).toString()).toBe(payloadB.toString());
  });

  it('returns null for a tile that is not in the archive', async () => {
    const p = new PMTiles(new BufferSource(archive));
    const miss = await p.getZxy(12, 100, 100); // in-range for z12 (0..4095) but not stored
    expect(miss).toBeFalsy(); // reader yields undefined for an absent tile
  });
});
