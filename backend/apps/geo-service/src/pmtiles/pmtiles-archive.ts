/**
 * Minimal PMTiles v3 archive writer. The `pmtiles` npm package is read-only, so
 * we serialize the archive ourselves — a single static file that MinIO serves by
 * HTTP range request, which is exactly why the self-hosted basemap has no
 * per-request tile billing. Kept dependency-free (Buffer + varints) and pure so
 * it round-trips against the official reader in tests.
 *
 * Spec: https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md
 */
export interface PmTile {
  tileId: number;
  /** Already-compressed tile bytes (gzip when tileCompression = 2). */
  data: Buffer;
}

export interface PmTilesMeta {
  minZoom: number;
  maxZoom: number;
  /** [minLng, minLat, maxLng, maxLat] */
  bounds: [number, number, number, number];
  center: [number, number];
  centerZoom: number;
  /** Free-form JSON metadata (TileJSON vector_layers etc.). */
  metadata: Record<string, unknown>;
}

interface Entry {
  tileId: number;
  offset: number;
  length: number;
  runLength: number;
}

/** Unsigned LEB128 varint. */
export function writeVarint(arr: number[], n: number): void {
  while (n >= 0x80) {
    arr.push((n & 0x7f) | 0x80);
    n = Math.floor(n / 128);
  }
  arr.push(n);
}

/** Serialize a PMTiles directory (uncompressed) per the v3 spec. */
export function serializeDirectory(entries: Entry[]): Buffer {
  const out: number[] = [];
  writeVarint(out, entries.length);
  let last = 0;
  for (const e of entries) {
    writeVarint(out, e.tileId - last);
    last = e.tileId;
  }
  for (const e of entries) writeVarint(out, e.runLength);
  for (const e of entries) writeVarint(out, e.length);
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].offset === entries[i - 1].offset + entries[i - 1].length) {
      writeVarint(out, 0);
    } else {
      writeVarint(out, entries[i].offset + 1);
    }
  }
  return Buffer.from(out);
}

const HEADER_LEN = 127;

/**
 * Pack pre-compressed MVT tiles into a clustered PMTiles v3 archive.
 * `tiles` need not be pre-sorted; they are ordered by Hilbert tileId here.
 */
export function buildPmtilesArchive(tiles: PmTile[], meta: PmTilesMeta): Buffer {
  const sorted = [...tiles].sort((a, b) => a.tileId - b.tileId);
  const entries: Entry[] = [];
  const blobs: Buffer[] = [];
  let offset = 0;
  for (const t of sorted) {
    entries.push({ tileId: t.tileId, offset, length: t.data.length, runLength: 1 });
    blobs.push(t.data);
    offset += t.data.length;
  }
  const dataBuf = Buffer.concat(blobs);
  const rootDir = serializeDirectory(entries);
  const metaBuf = Buffer.from(JSON.stringify(meta.metadata));

  const rootOffset = HEADER_LEN;
  const metaOffset = rootOffset + rootDir.length;
  const dataOffset = metaOffset + metaBuf.length;

  const header = Buffer.alloc(HEADER_LEN);
  header.write('PMTiles', 0, 'ascii');
  header.writeUInt8(3, 7);
  const w64 = (val: number, off: number) => header.writeBigUInt64LE(BigInt(val), off);
  w64(rootOffset, 8);
  w64(rootDir.length, 16);
  w64(metaOffset, 24);
  w64(metaBuf.length, 32);
  w64(0, 40); // leaf dir offset
  w64(0, 48); // leaf dir length
  w64(dataOffset, 56);
  w64(dataBuf.length, 64);
  w64(entries.length, 72); // addressed tiles
  w64(entries.length, 80); // tile entries
  w64(entries.length, 88); // tile contents
  header.writeUInt8(1, 96); // clustered = true
  header.writeUInt8(1, 97); // internal compression = none
  header.writeUInt8(2, 98); // tile compression = gzip
  header.writeUInt8(1, 99); // tile type = MVT
  header.writeUInt8(meta.minZoom, 100);
  header.writeUInt8(meta.maxZoom, 101);
  const e7 = (n: number) => Math.round(n * 1e7);
  header.writeInt32LE(e7(meta.bounds[0]), 102);
  header.writeInt32LE(e7(meta.bounds[1]), 106);
  header.writeInt32LE(e7(meta.bounds[2]), 110);
  header.writeInt32LE(e7(meta.bounds[3]), 114);
  header.writeUInt8(meta.centerZoom, 118);
  header.writeInt32LE(e7(meta.center[0]), 119);
  header.writeInt32LE(e7(meta.center[1]), 123);

  return Buffer.concat([header, rootDir, metaBuf, dataBuf]);
}
