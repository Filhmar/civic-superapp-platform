import { DISABLED_TILE, resolveToneColors } from "@/lib/modules";

describe("resolveToneColors", () => {
  it("returns dark siblings in dark scheme", () => {
    const light = resolveToneColors("red", "light", "#1B5E20", "#EDF1ED");
    const dark = resolveToneColors("red", "dark", "#1B5E20", "#EDF1ED");
    expect(light).toEqual({ bg: "#FDEDEC", icon: "#E53935" });
    expect(dark).toEqual({ bg: "#3B1D1E", icon: "#FF8A80" });
  });

  it("derives brand tone from tenant primary at runtime (no per-tenant code)", () => {
    expect(resolveToneColors("brand", "light", "#1B5E20", "#EDF1ED")).toEqual({
      bg: "#EDF1ED",
      icon: "#1B5E20",
    });
    const dark = resolveToneColors("brand", "dark", "#1B5E20", "#EDF1ED");
    expect(dark.bg).toBe("#1B5E2033"); // 20% alpha primary over dark bg
    expect(dark.icon).not.toBe("#1B5E20"); // lightened for contrast
  });

  it("disabled tile chips exist for both schemes", () => {
    expect(DISABLED_TILE.light.bg).toBeTruthy();
    expect(DISABLED_TILE.light.icon).toBeTruthy();
    expect(DISABLED_TILE.dark.bg).toBeTruthy();
    expect(DISABLED_TILE.dark.icon).toBeTruthy();
    expect(DISABLED_TILE.dark.bg).not.toBe(DISABLED_TILE.light.bg);
  });
});
