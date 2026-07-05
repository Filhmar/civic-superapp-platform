/**
 * Module-grid derivation: merge PLATFORM module metadata with the tenant's
 * runtime `config.modules` flags. Pure — unit-testable.
 */
import { MODULES, type ModuleMeta } from "@/constants/modules";
import type { ModuleFlags } from "@/types/config";

export interface ModuleTile extends ModuleMeta {
  /** From the tenant config; missing/absent flags mean disabled. */
  enabled: boolean;
}

export function deriveModuleTiles(
  flags: Partial<ModuleFlags> | undefined,
): ModuleTile[] {
  return MODULES.map((meta) => ({
    ...meta,
    enabled: flags?.[meta.key] === true,
  }));
}
