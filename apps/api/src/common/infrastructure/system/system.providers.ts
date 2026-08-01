import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { ClockPort, EventBusPort, IdGeneratorPort, PushSenderPort } from '../../application/ports';

/** Real wall clock; the only place the application reads the system time. */
@Injectable()
export class SystemClock implements ClockPort {
  /** @inheritdoc */
  public now(): Date {
    return new Date();
  }

  /** @inheritdoc */
  public nowIso(): string {
    return new Date().toISOString();
  }
}

/** UUID v4 identifier factory. */
@Injectable()
export class UuidGenerator implements IdGeneratorPort {
  /** @inheritdoc */
  public generate(): string {
    return randomUUID();
  }
}

/**
 * In-process domain event bus.
 *
 * Handlers run detached from the publisher so a failing subscriber can never
 * break the originating use case. Replacing this with Kafka or NATS when the
 * modules are extracted into services is a single provider swap.
 */
@Injectable()
export class InMemoryEventBus implements EventBusPort {
  private readonly logger = new Logger(InMemoryEventBus.name);
  private readonly handlers = new Map<string, Array<(payload: unknown) => Promise<void> | void>>();

  /** @inheritdoc */
  public async publish<T>(event: string, payload: T): Promise<void> {
    const subscribers = this.handlers.get(event) ?? [];
    await Promise.all(
      subscribers.map(async (handler) => {
        try {
          await handler(payload);
        } catch (error) {
          this.logger.error(`Esemény feldolgozás hiba (${event}): ${(error as Error).message}`);
        }
      }),
    );
  }

  /** @inheritdoc */
  public subscribe<T>(event: string, handler: (payload: T) => Promise<void> | void): void {
    const existing = this.handlers.get(event) ?? [];
    existing.push(handler as (payload: unknown) => Promise<void> | void);
    this.handlers.set(event, existing);
  }
}

/**
 * Web Push sender.
 *
 * Uses VAPID keys when configured; otherwise it logs the payload so the
 * notification flow can be exercised end to end in development.
 */
@Injectable()
export class WebPushSender implements PushSenderPort {
  private readonly logger = new Logger(WebPushSender.name);
  private readonly enabled: boolean;

  /**
   * @param config - VAPID key pair and contact subject.
   */
  public constructor(
    private readonly config: { publicKey: string | null; privateKey: string | null; subject: string },
  ) {
    this.enabled = Boolean(config.publicKey && config.privateKey);
  }

  /** @inheritdoc */
  public async send(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: { title: string; body: string; url?: string },
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.log(`[DEV PUSH] ${payload.title} — ${payload.body}`);
      return false;
    }

    // Imported lazily: the library reads its VAPID state at call time.
    const webPush = await import('web-push');
    webPush.default.setVapidDetails(
      this.config.subject,
      this.config.publicKey as string,
      this.config.privateKey as string,
    );

    try {
      await webPush.default.sendNotification(subscription, JSON.stringify(payload));
      return true;
    } catch (error) {
      this.logger.warn(`Push kézbesítés sikertelen: ${(error as Error).message}`);
      return false;
    }
  }
}
