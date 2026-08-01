import { Inject, Injectable } from '@nestjs/common';
import { BRAND_NAME, NotificationChannel, type NotificationDto } from '@nova/shared';

import {
  CLOCK_PORT,
  ID_GENERATOR_PORT,
  MAILER_PORT,
  PUSH_SENDER_PORT,
  type ClockPort,
  type IdGeneratorPort,
  type MailerPort,
  type PushSenderPort,
} from '../../../common/application/ports';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRecord,
  type NotificationRepository,
} from '../infrastructure/notification.repositories';
import { renderEmail } from '../infrastructure/email.templates';

/** Input of {@link SendNotificationUseCase}. */
export interface SendNotificationCommand {
  userId: string;
  email?: string;
  subject: string;
  body: string;
  href?: string;
  /** Channels to deliver on; the in-app record is always written. */
  channels?: NotificationChannel[];
}

/**
 * Maps the record onto its API representation.
 *
 * @param record - Stored notification.
 * @returns Wire-safe DTO.
 */
export function toNotificationDto(record: NotificationRecord): NotificationDto {
  return {
    id: record.id,
    userId: record.userId,
    channel: record.channel,
    subject: record.subject,
    body: record.body,
    href: record.href,
    readAt: record.readAt ? record.readAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
  };
}

/**
 * Fans a notification out to every requested channel.
 *
 * The in-app record is always persisted first so the bell icon is consistent
 * even when e-mail or push delivery fails.
 */
@Injectable()
export class SendNotificationUseCase {
  /**
   * @param notifications - Notification repository.
   * @param mailer - E-mail port.
   * @param push - Web Push port.
   * @param ids - Identifier factory.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
    @Inject(MAILER_PORT) private readonly mailer: MailerPort,
    @Inject(PUSH_SENDER_PORT) private readonly push: PushSenderPort,
    @Inject(ID_GENERATOR_PORT) private readonly ids: IdGeneratorPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @param command - Recipient, content and channels.
   * @returns The stored in-app notification.
   */
  public async execute(command: SendNotificationCommand): Promise<NotificationDto> {
    const channels = command.channels ?? [NotificationChannel.IN_APP];
    const record: NotificationRecord = {
      id: this.ids.generate(),
      userId: command.userId,
      channel: NotificationChannel.IN_APP,
      subject: command.subject,
      body: command.body,
      href: command.href ?? null,
      readAt: null,
      createdAt: this.clock.now(),
    };

    await this.notifications.save(record);

    if (channels.includes(NotificationChannel.EMAIL) && command.email) {
      const rendered = renderEmail({
        title: command.subject,
        body: command.body,
        ctaLabel: command.href ? `Megnyitás a ${BRAND_NAME}-n` : undefined,
        ctaHref: command.href,
      });
      await this.mailer.send({
        to: command.email,
        subject: command.subject,
        html: rendered.html,
        text: rendered.text,
      });
    }

    if (channels.includes(NotificationChannel.PUSH)) {
      const subscriptions = await this.notifications.listPushSubscriptions(command.userId);
      await Promise.all(
        subscriptions.map((subscription) =>
          this.push.send(
            { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
            { title: command.subject, body: command.body, url: command.href },
          ),
        ),
      );
    }

    return toNotificationDto(record);
  }
}

/** Lists the notifications shown in the bell menu. */
@Injectable()
export class ListNotificationsUseCase {
  /**
   * @param notifications - Notification repository.
   */
  public constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
  ) {}

  /**
   * @param userId - Recipient.
   * @param limit - Maximum number of rows.
   * @returns Notifications, newest first.
   */
  public async execute(userId: string, limit = 20): Promise<NotificationDto[]> {
    const records = await this.notifications.listByUser(userId, limit);
    return records.map(toNotificationDto);
  }
}

/** Marks a notification as read. */
@Injectable()
export class MarkNotificationReadUseCase {
  /**
   * @param notifications - Notification repository.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @param id - Notification identifier.
   * @param userId - Recipient.
   */
  public async execute(id: string, userId: string): Promise<void> {
    await this.notifications.markRead(id, userId, this.clock.now());
  }
}

/** Registers the browser push subscription created by the service worker. */
@Injectable()
export class RegisterPushSubscriptionUseCase {
  /**
   * @param notifications - Notification repository.
   */
  public constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
  ) {}

  /**
   * @param userId - Owner of the subscription.
   * @param subscription - Endpoint and encryption keys.
   */
  public async execute(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ): Promise<void> {
    await this.notifications.savePushSubscription({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });
  }
}
