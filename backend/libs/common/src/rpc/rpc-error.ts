import { HttpException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

export interface RpcErrorShape {
  statusCode: number;
  message: string;
  error?: string;
}

/** Throw inside a TCP service; the gateway maps it back to the same HTTP status. */
export function rpcError(statusCode: number, message: string, error?: string): never {
  throw new RpcException({ statusCode, message, error } satisfies RpcErrorShape);
}

function isRpcErrorShape(e: unknown): e is RpcErrorShape {
  return (
    typeof e === 'object' &&
    e !== null &&
    typeof (e as RpcErrorShape).statusCode === 'number' &&
    typeof (e as RpcErrorShape).message === 'string'
  );
}

/** Gateway-side: convert a rejected TCP call into an HttpException. */
export function toHttpException(e: unknown): HttpException {
  if (isRpcErrorShape(e)) {
    return new HttpException(
      { statusCode: e.statusCode, message: e.message, error: e.error },
      e.statusCode,
    );
  }
  if (e instanceof HttpException) return e;
  const message = e instanceof Error ? e.message : 'Internal server error';
  return new HttpException({ statusCode: 500, message }, 500);
}
