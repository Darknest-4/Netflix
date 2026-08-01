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
 * Wraps every successful controller result into the `{ data }` envelope.
 *
 * The wrapping is unconditional — a paginated handler result becomes
 * `{ data: { data, meta } }` — so clients can always unwrap exactly one level,
 * whatever the endpoint returns.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  /**
   * @param context - Nest execution context.
   * @param next - Downstream handler.
   * @returns Stream of enveloped responses.
   */
  public intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
    return next.handle().pipe(map((payload) => ({ data: payload })));
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
