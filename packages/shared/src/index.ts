/**
 * Public surface of `@nova/shared`.
 *
 * The package deliberately contains no framework code: only enumerations,
 * data-transfer contracts, constants and pure functions. Both the NestJS API
 * and the Next.js web client depend on it, which makes the wire format a
 * compile-time contract rather than a convention.
 */
export * from './enums';
export * from './types/identity';
export * from './types/catalog';
export * from './types/billing';
export * from './types/platform';
export * from './constants';
export * from './utils/format';
export * from './utils/artwork';
export * from './utils/validation';
