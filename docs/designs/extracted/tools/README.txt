Rendering/extraction scripts for the Claude Design prototype bundles.
Run from backend/apps/platform-admin-panel (needs its node_modules/playwright-core):
  node ../../../docs/designs/extracted/tools/crawler.cjs <dasma|sorsogon|legazpi>
  node ../../../docs/designs/extracted/tools/extract.cjs <tenant>
Requires react UMD files; see boot.cjs UMD path (route-intercepts unpkg.com).
