import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { UserRole } from '@nova/shared';

import { AccessDenied } from '../domain/domain.exceptions';
import { IS_PUBLIC_KEY, ROLES_KEY, type AuthenticatedUser } from './decorators';

/**
 * Global authentication guard.
 *
 * Validates the bearer access token unless the route opted out with `@Public()`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  /**
   * @param reflector - Metadata reader used to detect `@Public()` routes.
   */
  public constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * @param context - Nest execution context.
   * @returns True when the request may proceed.
   */
  public override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic ? true : super.canActivate(context);
  }
}

/**
 * Role based authorisation guard.
 *
 * Runs after `JwtAuthGuard` and enforces the roles declared with `@Roles()`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * @param reflector - Metadata reader used to collect required roles.
   */
  public constructor(private readonly reflector: Reflector) {}

  /**
   * @param context - Nest execution context.
   * @returns True when the caller holds one of the required roles.
   * @throws {AccessDenied} When the caller lacks every required role.
   */
  public canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user;
    if (!user || !required.includes(user.role)) {
      throw new AccessDenied('Ehhez az erőforráshoz adminisztrátori jogosultság szükséges.');
    }
    return true;
  }
}
