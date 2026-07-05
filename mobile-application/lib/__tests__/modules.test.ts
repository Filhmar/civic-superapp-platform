import { MODULES } from "@/constants/modules";
import { deriveModuleTiles } from "@/lib/modules";
import type { ModuleFlags } from "@/types/config";

// A fake tenant config's module flags — arbitrary values, no real tenant.
const fakeFlags: ModuleFlags = {
  egov: true,
  reports311: true,
  assistance: true,
  sos: true,
  news: true,
  tourism: true,
  directory: true,
  transport: true,
  health: false,
  jobs: false,
};

describe("deriveModuleTiles", () => {
  it("returns one tile per platform module, in platform order", () => {
    const tiles = deriveModuleTiles(fakeFlags);
    expect(tiles).toHaveLength(MODULES.length);
    expect(tiles.map((t) => t.key)).toEqual(MODULES.map((m) => m.key));
  });

  it("marks tiles enabled/disabled from the config flags", () => {
    const tiles = deriveModuleTiles(fakeFlags);
    const byKey = Object.fromEntries(tiles.map((t) => [t.key, t.enabled]));
    expect(byKey.egov).toBe(true);
    expect(byKey.news).toBe(true);
    expect(byKey.health).toBe(false);
    expect(byKey.jobs).toBe(false);
  });

  it("keeps platform metadata (label + icon) on every tile", () => {
    for (const tile of deriveModuleTiles(fakeFlags)) {
      expect(tile.label.length).toBeGreaterThan(0);
      expect(tile.icon).toBeDefined();
    }
  });

  it("treats missing config (or missing keys) as disabled", () => {
    expect(deriveModuleTiles(undefined).every((t) => !t.enabled)).toBe(true);
    const partial = deriveModuleTiles({ news: true });
    expect(partial.find((t) => t.key === "news")?.enabled).toBe(true);
    expect(partial.find((t) => t.key === "egov")?.enabled).toBe(false);
  });
});
