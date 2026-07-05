/**
 * Tenant config service. GET /v1/config is a public route; the request
 * interceptor pins X-Tenant-ID (the installed bundle id IS the tenant key).
 */
import { api } from "@/services/api";
import type { TenantConfigEnvelope } from "@/types/config";

interface ConfigResponseBody {
  success: boolean;
  data: TenantConfigEnvelope;
}

export async function getTenantConfig(): Promise<TenantConfigEnvelope> {
  const body = await api.get<ConfigResponseBody>("/v1/config");
  return body.data;
}
