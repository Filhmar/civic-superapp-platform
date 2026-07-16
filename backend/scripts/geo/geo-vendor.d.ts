// Minimal ambient typings for the two untyped tile libs used by the basemap
// builder. Kept alongside the script so the scripts tsconfig picks them up.
declare module 'geojson-vt' {
  interface VtTile {
    features: unknown[];
  }
  interface VtIndex {
    getTile(z: number, x: number, y: number): VtTile | null;
  }
  interface VtOptions {
    maxZoom?: number;
    tolerance?: number;
    extent?: number;
    buffer?: number;
    indexMaxZoom?: number;
    indexMaxPoints?: number;
  }
  export default function geojsonvt(data: unknown, options?: VtOptions): VtIndex;
}

declare module 'vt-pbf' {
  export function fromGeojsonVt(
    layers: Record<string, unknown>,
    options?: { version?: number },
  ): Uint8Array;
  const _default: { fromGeojsonVt: typeof fromGeojsonVt };
  export default _default;
}
