import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorDto } from '@nova/shared';

import { DomainException } from '../../domain/domain.exceptions';

/**
 * Single exit point for every error leaving the API.
 *
 * Domain errors keep their semantic status code, framework errors are passed
 * through, and anything else becomes a 500 with the details hidden from the
 * client but written to the log with the correlation id.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /**
   * Converts a thrown value into the `ApiErrorDto` wire format.
   *
   * @param exception - The thrown value.
   * @param host - Nest execution context.
   */
  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) ?? 'n/a';

    const { status, code, message, details } = this.describe(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} → ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ApiErrorDto = {
      statusCode: status,
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    response.status(status).json(body);
  }

  /**
   * Normalises any thrown value into status, code and message.
   *
   * @param exception - The thrown value.
   * @returns Normalised error description.
   */
  private describe(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } {
    if (exception instanceof DomainException) {
      return {
        status: exception.status,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : ((payload as { message?: string | string[] }).message ?? exception.message);

      return {
        status: exception.getStatus(),
        code: (payload as { error?: string }).error?.toUpperCase().replace(/\s+/g, '_') ?? 'HTTP_ERROR',
        message: Array.isArray(message) ? message.join(' ') : message,
        details: typeof payload === 'object' ? (payload as Record<string, unknown>) : undefined,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Váratlan hiba történt. Kérjük, próbáld újra később.',
    };
  }
}
