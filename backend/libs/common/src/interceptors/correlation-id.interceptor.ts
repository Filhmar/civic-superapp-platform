import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import type { Request, Response } from 'express';

export const CORRELATION_HEADER = 'x-correlation-id';

/** Assign/propagate a correlation id per request; echoed on the response. */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const req = context.switchToHttp().getRequest<Request>();
      const res = context.switchToHttp().getResponse<Response>();
      const id = (req.headers[CORRELATION_HEADER] as string) ?? randomUUID();
      (req as Request & { correlationId: string }).correlationId = id;
      res.setHeader(CORRELATION_HEADER, id);
    }
    return next.handle();
  }
}
