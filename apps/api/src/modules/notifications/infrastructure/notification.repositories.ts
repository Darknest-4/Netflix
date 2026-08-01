import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '@nova/shared';

import { PrismaService } from '../../../common/infrastructure/persistence/prisma.service';

/** Stored notification. */
export interface NotificationRecord {
  id: string;
  userId: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
}

/** Registered browser push subscription. */
export interface PushSubscriptionRecord {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Outbound port of the notifications context. */
export interface NotificationRepository {
  /**
   * @param userId - Recipient.
   * @param limit - Maximum number of rows.
   * @returns Notifications, newest first.
   */
  listByUser(userId: string, limit: number): Promise<NotificationRecord[]>;

  /**
   * @param record - Notification to persist.
   */
  save(record: NotificationRecord): Promise<void>;

  /**
   * Marks a notification as read.
   *
   * @param id - Notification identifier.
   * @param userId - Recipient, verified to prevent cross-account access.
   * @param readAt - Instant of the read.
   */
  markRead(id: string, userId: string, readAt: Date): Promise<void>;

  /**
   * Stores (or refreshes) a push subscription.
   *
   * @param record - Subscription registered by the service worker.
   */
  savePushSubscription(record: PushSubscriptionRecord): Promise<void>;

  /**
   * @param userId - Recipient.
   * @returns Every push subscription of the account.
   */
  listPushSubscriptions(userId: string): Promise<PushSubscriptionRecord[]>;
}

/** Injection token of {@link NotificationRepository}. */
export const NOTIFICATION_REPOSITORY = Symbol('NotificationRepository');

/** In-process notification storage. */
@Injectable()
export class InMemoryNotificationRepository implements NotificationRepository {
  private readonly notifications: NotificationRecord[] = [
    {
      id: 'n-1',
      userId: '11111111-1111-4111-8111-111111111111',
      channel: NotificationChannel.IN_APP,
      subject: 'Megjött az Északi Fény 2. évada',
      body: 'A folytatás minden epizódja elérhető. Jó nézést!',
      href: '/title/eszaki-feny',
      readAt: null,
      createdAt: new Date('2026-07-30T09:00:00.000Z'),
    },
    {
      id: 'n-2',
      userId: '11111111-1111-4111-8111-111111111111',
      channel: NotificationChannel.IN_APP,
      subject: 'Új a listádon szereplő címhez',
      body: 'A Fekete Doboz mostantól 4K + HDR minőségben is nézhető.',
      href: '/title/fekete-doboz',
      readAt: new Date('2026-07-31T08:10:00.000Z'),
      createdAt: new Date('2026-07-29T17:30:00.000Z'),
    },
  ];

  private readonly pushSubscriptions: PushSubscriptionRecord[] = [];

  /** @inheritdoc */
  public async listByUser(userId: string, limit: number): Promise<NotificationRecord[]> {
    return this.notifications
      .filter((notification) => notification.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /** @inheritdoc */
  public async save(record: NotificationRecord): Promise<void> {
    this.notifications.push(record);
  }

  /** @inheritdoc */
  public async markRead(id: string, userId: string, readAt: Date): Promise<void> {
    const notification = this.notifications.find(
      (candidate) => candidate.id === id && candidate.userId === userId,
    );
    if (notification) {
      notification.readAt = readAt;
    }
  }

  /** @inheritdoc */
  public async savePushSubscription(record: PushSubscriptionRecord): Promise<void> {
    const index = this.pushSubscriptions.findIndex(
      (candidate) => candidate.endpoint === record.endpoint,
    );
    if (index >= 0) {
      this.pushSubscriptions[index] = record;
    } else {
      this.pushSubscriptions.push(record);
    }
  }

  /** @inheritdoc */
  public async listPushSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
    return this.pushSubscriptions.filter((subscription) => subscription.userId === userId);
  }
}

/** PostgreSQL backed notification storage. */
@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  /**
   * @param prisma - Connection handle.
   */
  public constructor(private readonly prisma: PrismaService) {}

  /** @inheritdoc */
  public async listByUser(userId: string, limit: number): Promise<NotificationRecord[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      channel: row.channel as NotificationChannel,
      subject: row.subject,
      body: row.body,
      href: row.href,
      readAt: row.readAt,
      createdAt: row.createdAt,
    }));
  }

  /** @inheritdoc */
  public async save(record: NotificationRecord): Promise<void> {
    await this.prisma.notification.create({
      data: {
        id: record.id,
        userId: record.userId,
        channel: record.channel,
        subject: record.subject,
        body: record.body,
        href: record.href,
        createdAt: record.createdAt,
      },
    });
  }

  /** @inheritdoc */
  public async markRead(id: string, userId: string, readAt: Date): Promise<void> {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { readAt } });
  }

  /** @inheritdoc */
  public async savePushSubscription(record: PushSubscriptionRecord): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: record.endpoint },
      create: {
        userId: record.userId,
        endpoint: record.endpoint,
        p256dh: record.p256dh,
        auth: record.auth,
      },
      update: { p256dh: record.p256dh, auth: record.auth, userId: record.userId },
    });
  }

  /** @inheritdoc */
  public async listPushSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
    const rows = await this.prisma.pushSubscription.findMany({ where: { userId } });
    return rows.map((row) => ({
      userId: row.userId,
      endpoint: row.endpoint,
      p256dh: row.p256dh,
      auth: row.auth,
    }));
  }
}
