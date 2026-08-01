import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { UserRole } from '@nova/shared';

/** Metadata key marking a route as reachable without authentication. */
export const IS_PUBLIC_KEY = 'nova:isPublic';

/** Metadata key holding the roles allowed to call a route. */
export const ROLES_KEY = 'nova:roles';

/**
 * Marks a controller or handler as publicly accessible.
 *
 * `JwtAuthGuard` is registered globally; this decorator is the documented
 * opt-out for landing pages, health checks and webhooks.
 *
 * @returns The Nest metadata decorator.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Restricts a route to the given roles.
 *
 * @param roles - Roles allowed to invoke the handler.
 * @returns The Nest metadata decorator.
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);

/** Authenticated caller as attached to the request by `JwtStrategy`. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Injects the authenticated caller into a handler parameter.
 *
 * @example
 * ```ts
 * findAll(@CurrentUser() user: AuthenticatedUser) { ... }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user,
);
