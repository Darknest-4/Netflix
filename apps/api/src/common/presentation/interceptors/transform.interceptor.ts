import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { type Observable, map, tap } from 'rxjs';
import type { ApiResponse } from '@nova/shared';

/**
 * Wraps every successful controller result into the `{ data, meta }` envelope.
 *
 * Handlers that already return a paginated envelope (`{ data, meta }`) are left
 * untouched so list endpoints keep their pagination metadata.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  /**
   * @param context - Nest execution context.
   * @param next - Downstream handler.
   * @returns Stream of enveloped responses.
   */
  public intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
    return next.handle().pipe(
      map((payload) => {
        const isEnvelope =
          payload !== null &&
          typeof payload === 'object' &&
          'data' in (payload as Record<string, unknown>);
        return isEnvelope ? payload : { data: payload };
      }),
    );
  }
}

/**
 * Structured access log with request duration.
 *
 * Emits one line per request, including the correlation id set by
 * `RequestIdMiddleware`, which is what ties API logs to browser sessions.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  /**
   * @param context - Nest execution context.
   * @param next - Downstream handler.
   * @returns The untouched response stream.
   */
  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startedAt;
        this.logger.log(
          `${request.method} ${request.originalUrl} ${duration}ms [${request.headers['x-request-id'] ?? '-'}]`,
        );
      }),
    );
  }
}
