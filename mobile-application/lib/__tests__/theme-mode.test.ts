import { normalizeThemePreference } from "@/lib/theme-mode";

describe("normalizeThemePreference", () => {
  it("passes through the three valid modes", () => {
    expect(normalizeThemePreference("system")).toBe("system");
    expect(normalizeThemePreference("light")).toBe("light");
    expect(normalizeThemePreference("dark")).toBe("dark");
  });

  it("defaults to system for invalid / legacy / null values", () => {
    expect(normalizeThemePreference("auto")).toBe("system"); // legacy value
    expect(normalizeThemePreference(null)).toBe("system");
    expect(normalizeThemePreference(undefined)).toBe("system");
    expect(normalizeThemePreference("")).toBe("system");
    expect(normalizeThemePreference(42)).toBe("system");
  });
});
