import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { UserRole } from '@nova/shared';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from '../../../common/presentation/decorators';

/** Claim set carried by an access token. */
interface AccessTokenClaims {
  sub: string;
  email: string;
  role: UserRole;
}

/**
 * Bearer token strategy.
 *
 * Validates the signature and expiry, then projects the claims onto
 * `request.user` for `@CurrentUser()`. No database round-trip happens here —
 * that is the point of a stateless access token.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  /**
   * @param accessSecret - Secret the access tokens are signed with.
   */
  public constructor(accessSecret: string) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: accessSecret,
    });
  }

  /**
   * @param payload - Verified token claims.
   * @returns The authenticated caller attached to the request.
   */
  public validate(payload: AccessTokenClaims): AuthenticatedUser {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
