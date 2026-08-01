/**
 * Domain level errors.
 *
 * The domain layer must not depend on NestJS or HTTP, so it throws these
 * framework-free errors. `DomainExceptionFilter` maps them onto status codes
 * at the presentation boundary.
 */
export abstract class DomainException extends Error {
  /** Machine readable error code returned to API clients. */
  public abstract readonly code: string;

  /** HTTP status the presentation layer should translate this error into. */
  public abstract readonly status: number;

  /**
   * @param message - Human readable, user-safe description.
   * @param details - Optional structured context (never contains secrets).
   */
  protected constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** A business rule was violated (HTTP 422). */
export class BusinessRuleViolation extends DomainException {
  public readonly code = 'BUSINESS_RULE_VIOLATION';
  public readonly status = 422;

  /**
   * @param message - Description of the violated rule.
   * @param details - Optional structured context.
   */
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}

/** The requested aggregate does not exist (HTTP 404). */
export class EntityNotFound extends DomainException {
  public readonly code = 'ENTITY_NOT_FOUND';
  public readonly status = 404;

  /**
   * @param entity - Name of the aggregate, e.g. `Title`.
   * @param identifier - Identifier that produced no match.
   */
  public constructor(entity: string, identifier: string) {
    super(`${entity} nem található: ${identifier}`, { entity, identifier });
  }
}

/** Authentication failed or the token is no longer valid (HTTP 401). */
export class AuthenticationFailed extends DomainException {
  public readonly code = 'AUTHENTICATION_FAILED';
  public readonly status = 401;

  /**
   * @param message - Reason shown to the user.
   */
  public constructor(message = 'Hibás e-mail cím vagy jelszó.') {
    super(message);
  }
}

/** The caller is authenticated but lacks the required permission (HTTP 403). */
export class AccessDenied extends DomainException {
  public readonly code = 'ACCESS_DENIED';
  public readonly status = 403;

  /**
   * @param message - Reason shown to the user.
   */
  public constructor(message = 'Ehhez a művelethez nincs jogosultságod.') {
    super(message);
  }
}

/** A uniqueness constraint of the domain was violated (HTTP 409). */
export class ConflictError extends DomainException {
  public readonly code = 'CONFLICT';
  public readonly status = 409;

  /**
   * @param message - Description of the conflict.
   * @param details - Optional structured context.
   */
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}
