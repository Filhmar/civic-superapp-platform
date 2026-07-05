import { isRenderableAssetUrl } from "@/lib/asset-url";

describe("isRenderableAssetUrl", () => {
  it("accepts http URLs", () => {
    expect(isRenderableAssetUrl("http://localhost:9000/bucket/x.png")).toBe(
      true,
    );
  });

  it("accepts https URLs", () => {
    expect(isRenderableAssetUrl("https://cdn.example.com/seal.png")).toBe(true);
  });

  it("rejects relative paths", () => {
    expect(isRenderableAssetUrl("/assets/tenants/x/seal.png")).toBe(false);
    expect(isRenderableAssetUrl("assets/seal.png")).toBe(false);
  });

  it("rejects empty / undefined / null", () => {
    expect(isRenderableAssetUrl("")).toBe(false);
    expect(isRenderableAssetUrl(undefined)).toBe(false);
    expect(isRenderableAssetUrl(null)).toBe(false);
  });

  it("rejects other schemes", () => {
    expect(isRenderableAssetUrl("file:///tmp/x.png")).toBe(false);
    expect(isRenderableAssetUrl("data:image/png;base64,AAAA")).toBe(false);
  });
});
