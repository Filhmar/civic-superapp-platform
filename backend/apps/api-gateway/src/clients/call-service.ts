import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { toHttpException } from '@app/common';

const CALL_TIMEOUT_MS = 15000;

/** Send a TCP command and convert service RpcExceptions back to HTTP errors. */
export async function callService<T>(
  client: ClientProxy,
  cmd: string,
  payload: unknown,
): Promise<T> {
  try {
    return await firstValueFrom(
      client.send<T>({ cmd }, payload ?? {}).pipe(timeout(CALL_TIMEOUT_MS)),
    );
  } catch (e) {
    throw toHttpException(e);
  }
}
