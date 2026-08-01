/**
 * Outbound ports of the application layer (hexagonal architecture).
 *
 * Use cases depend on these interfaces only; concrete adapters live in
 * `common/infrastructure` and are bound in `InfrastructureModule`. Swapping
 * Redis for an in-process map, or SMTP for a console logger, therefore never
 * touches a single line of business logic.
 */

/** Key/value cache with TTL support. */
export interface CachePort {
  /**
   * Reads a cached value.
   *
   * @param key - Cache key.
   * @returns The parsed value, or `null` on a miss.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Writes a value into the cache.
   *
   * @param key - Cache key.
   * @param value - Serialisable value.
   * @param ttlSeconds - Time to live; falls back to the configured default.
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Removes a single key.
   *
   * @param key - Cache key.
   */
  del(key: string): Promise<void>;

  /**
   * Removes every key matching a glob pattern (e.g. `catalog:*`).
   *
   * @param pattern - Glob pattern.
   */
  delByPattern(pattern: string): Promise<void>;

  /**
   * Reads through the cache, computing the value on a miss.
   *
   * @param key - Cache key.
   * @param ttlSeconds - Time to live for freshly computed values.
   * @param factory - Producer invoked on a cache miss.
   * @returns The cached or freshly computed value.
   */
  wrap<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T>;
}

/** Transactional e-mail sender. */
export interface MailerPort {
  /**
   * Sends a transactional message.
   *
   * @param message - Recipient, subject and rendered bodies.
   */
  send(message: MailMessage): Promise<void>;
}

/** A single outbound e-mail. */
export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Object storage used for media, artwork and subtitle assets. */
export interface StoragePort {
  /**
   * Returns a browser-usable URL for an object.
   *
   * @param key - Object key inside the configured bucket.
   * @returns Absolute URL.
   */
  publicUrl(key: string): string;

  /**
   * Issues a time limited upload URL for the CMS.
   *
   * @param key - Target object key.
   * @param expiresInSeconds - Validity of the generated URL.
   * @returns Pre-signed URL (simulated when S3 is not configured).
   */
  createUploadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

/** In-process domain event bus, ready to be replaced by Kafka/NATS. */
export interface EventBusPort {
  /**
   * Publishes a domain event to every subscriber.
   *
   * @param event - Event name.
   * @param payload - Serialisable event payload.
   */
  publish<T>(event: string, payload: T): Promise<void>;

  /**
   * Subscribes a handler to an event name.
   *
   * @param event - Event name.
   * @param handler - Async handler invoked for each occurrence.
   */
  subscribe<T>(event: string, handler: (payload: T) => Promise<void> | void): void;
}

/** Wall-clock abstraction; keeps time-dependent use cases testable. */
export interface ClockPort {
  /** @returns The current instant. */
  now(): Date;

  /** @returns The current instant as an ISO-8601 string. */
  nowIso(): string;
}

/** Identifier factory; keeps id generation out of the domain. */
export interface IdGeneratorPort {
  /** @returns A new globally unique identifier. */
  generate(): string;
}

/** Web Push transport. */
export interface PushSenderPort {
  /**
   * Delivers a push message to one browser subscription.
   *
   * @param subscription - Endpoint and encryption keys from the service worker.
   * @param payload - Notification payload rendered by the service worker.
   * @returns True when the push service accepted the message.
   */
  send(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: { title: string; body: string; url?: string },
  ): Promise<boolean>;
}

/** Injection tokens for the ports above. */
export const CACHE_PORT = Symbol('CachePort');
export const MAILER_PORT = Symbol('MailerPort');
export const STORAGE_PORT = Symbol('StoragePort');
export const EVENT_BUS_PORT = Symbol('EventBusPort');
export const CLOCK_PORT = Symbol('ClockPort');
export const ID_GENERATOR_PORT = Symbol('IdGeneratorPort');
export const PUSH_SENDER_PORT = Symbol('PushSenderPort');
