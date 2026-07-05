import { palette } from "@/constants/colors";
import { buildThemeVars } from "@/lib/theme";
import type { BrandColors } from "@/types/config";

// A fake tenant config's brand colors — arbitrary values, no real tenant.
const fakeColors: BrandColors = {
  primary: "#101010",
  primaryDark: "#202020",
  accent: "#303030",
  accentDeep: "#404040",
  danger: "#505050",
  tint: "#606060",
};

describe("buildThemeVars", () => {
  it("maps fetched brand colors onto the CSS variables", () => {
    expect(buildThemeVars(fakeColors)).toEqual({
      "--color-brand": "#101010",
      "--color-brand-dark": "#202020",
      "--color-accent": "#303030",
      "--color-accent-deep": "#404040",
      "--color-danger": "#505050",
      "--color-tint": "#606060",
    });
  });

  it("falls back to the neutral placeholder palette when config is absent", () => {
    expect(buildThemeVars(undefined)).toEqual({
      "--color-brand": palette.brand,
      "--color-brand-dark": palette["brand-dark"],
      "--color-accent": palette.accent,
      "--color-accent-deep": palette["accent-deep"],
      "--color-danger": palette.danger,
      "--color-tint": palette.tint,
    });
  });

  it("fills missing tokens per-key from the placeholder palette", () => {
    const partial = buildThemeVars({ primary: "#101010" });
    expect(partial["--color-brand"]).toBe("#101010");
    expect(partial["--color-danger"]).toBe(palette.danger);
    expect(partial["--color-tint"]).toBe(palette.tint);
  });
});
