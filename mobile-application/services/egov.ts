import { api } from "@/services/api";
import type {
  Application,
  CreateApplicationInput,
  PaymentMethod,
  PaymentResult,
  ServiceGroup,
} from "@/types/egov";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getServiceCatalog(): Promise<ServiceGroup[]> {
  const body = await api.get<Envelope<ServiceGroup[]>>("/v1/services");
  return body.data;
}

export async function createApplication(
  input: CreateApplicationInput,
): Promise<Application> {
  const body = await api.post<Envelope<Application>>("/v1/applications", input);
  return body.data;
}

export async function getMyApplications(): Promise<Application[]> {
  const body = await api.get<Envelope<Application[]>>("/v1/applications");
  return body.data;
}

export async function getApplication(stubId: string): Promise<Application> {
  const body = await api.get<Envelope<Application>>(
    `/v1/applications/${stubId}`,
  );
  return body.data;
}

export async function payApplication(params: {
  applicationId: string;
  method: PaymentMethod;
  idempotencyKey: string;
}): Promise<PaymentResult> {
  const body = await api.post<Envelope<PaymentResult>>("/v1/payments", {
    application_id: params.applicationId,
    method: params.method,
    idempotency_key: params.idempotencyKey,
  });
  return body.data;
}
