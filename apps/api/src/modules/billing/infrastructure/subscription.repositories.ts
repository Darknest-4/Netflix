import { Injectable } from '@nestjs/common';
import { PlanTier, SubscriptionStatus } from '@nova/shared';

import { PrismaService } from '../../../common/infrastructure/persistence/prisma.service';
import type {
  InvoiceRecord,
  SubscriptionRecord,
  SubscriptionRepository,
} from '../domain/subscription.repository';

/** In-process billing storage with a seeded subscription for the demo account. */
@Injectable()
export class InMemorySubscriptionRepository implements SubscriptionRepository {
  private readonly subscriptions = new Map<string, SubscriptionRecord>([
    [
      '11111111-1111-4111-8111-111111111111',
      {
        id: 'sub-demo-1',
        userId: '11111111-1111-4111-8111-111111111111',
        plan: PlanTier.PREMIUM,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date('2026-07-08T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-08-08T00:00:00.000Z'),
        cancelAtPeriodEnd: false,
        providerCustomerId: null,
        providerSubscriptionId: null,
      },
    ],
    [
      '22222222-2222-4222-8222-222222222222',
      {
        id: 'sub-demo-2',
        userId: '22222222-2222-4222-8222-222222222222',
        plan: PlanTier.PREMIUM,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date('2026-07-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z'),
        cancelAtPeriodEnd: false,
        providerCustomerId: null,
        providerSubscriptionId: null,
      },
    ],
  ]);

  private readonly invoices: InvoiceRecord[] = [
    {
      id: 'inv-demo-1',
      subscriptionId: 'sub-demo-1',
      amountMinor: 599_000,
      currency: 'HUF',
      status: 'paid',
      issuedAt: new Date('2026-07-08T00:05:00.000Z'),
      hostedUrl: null,
    },
    {
      id: 'inv-demo-2',
      subscriptionId: 'sub-demo-1',
      amountMinor: 599_000,
      currency: 'HUF',
      status: 'paid',
      issuedAt: new Date('2026-06-08T00:05:00.000Z'),
      hostedUrl: null,
    },
  ];

  /** @inheritdoc */
  public async findByUser(userId: string): Promise<SubscriptionRecord | null> {
    return this.subscriptions.get(userId) ?? null;
  }

  /** @inheritdoc */
  public async findByProviderId(providerSubscriptionId: string): Promise<SubscriptionRecord | null> {
    for (const record of this.subscriptions.values()) {
      if (record.providerSubscriptionId === providerSubscriptionId) {
        return record;
      }
    }
    return null;
  }

  /** @inheritdoc */
  public async save(record: SubscriptionRecord): Promise<void> {
    this.subscriptions.set(record.userId, record);
  }

  /** @inheritdoc */
  public async listInvoices(subscriptionId: string): Promise<InvoiceRecord[]> {
    return this.invoices
      .filter((invoice) => invoice.subscriptionId === subscriptionId)
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
  }

  /** @inheritdoc */
  public async addInvoice(invoice: InvoiceRecord): Promise<void> {
    this.invoices.push(invoice);
  }

  /** @inheritdoc */
  public async listAll(): Promise<SubscriptionRecord[]> {
    return [...this.subscriptions.values()];
  }
}

/** PostgreSQL backed billing storage. */
@Injectable()
export class PrismaSubscriptionRepository implements SubscriptionRepository {
  /**
   * @param prisma - Connection handle.
   */
  public constructor(private readonly prisma: PrismaService) {}

  /** @inheritdoc */
  public async findByUser(userId: string): Promise<SubscriptionRecord | null> {
    const row = await this.prisma.subscription.findUnique({ where: { userId } });
    return row ? PrismaSubscriptionRepository.toRecord(row) : null;
  }

  /** @inheritdoc */
  public async findByProviderId(providerSubscriptionId: string): Promise<SubscriptionRecord | null> {
    const row = await this.prisma.subscription.findFirst({ where: { providerSubscriptionId } });
    return row ? PrismaSubscriptionRepository.toRecord(row) : null;
  }

  /** @inheritdoc */
  public async save(record: SubscriptionRecord): Promise<void> {
    await this.prisma.subscription.upsert({
      where: { userId: record.userId },
      create: {
        id: record.id,
        userId: record.userId,
        plan: record.plan,
        status: record.status,
        currentPeriodStart: record.currentPeriodStart,
        currentPeriodEnd: record.currentPeriodEnd,
        cancelAtPeriodEnd: record.cancelAtPeriodEnd,
        providerCustomerId: record.providerCustomerId,
        providerSubscriptionId: record.providerSubscriptionId,
      },
      update: {
        plan: record.plan,
        status: record.status,
        currentPeriodStart: record.currentPeriodStart,
        currentPeriodEnd: record.currentPeriodEnd,
        cancelAtPeriodEnd: record.cancelAtPeriodEnd,
        providerCustomerId: record.providerCustomerId,
        providerSubscriptionId: record.providerSubscriptionId,
      },
    });
  }

  /** @inheritdoc */
  public async listInvoices(subscriptionId: string): Promise<InvoiceRecord[]> {
    const rows = await this.prisma.invoice.findMany({
      where: { subscriptionId },
      orderBy: { issuedAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id,
      subscriptionId: row.subscriptionId,
      amountMinor: row.amountMinor,
      currency: row.currency,
      status: row.status as InvoiceRecord['status'],
      issuedAt: row.issuedAt,
      hostedUrl: row.hostedUrl,
    }));
  }

  /** @inheritdoc */
  public async addInvoice(invoice: InvoiceRecord): Promise<void> {
    await this.prisma.invoice.create({
      data: {
        id: invoice.id,
        subscriptionId: invoice.subscriptionId,
        amountMinor: invoice.amountMinor,
        currency: invoice.currency,
        status: invoice.status,
        issuedAt: invoice.issuedAt,
        hostedUrl: invoice.hostedUrl,
      },
    });
  }

  /** @inheritdoc */
  public async listAll(): Promise<SubscriptionRecord[]> {
    const rows = await this.prisma.subscription.findMany();
    return rows.map(PrismaSubscriptionRepository.toRecord);
  }

  /**
   * Maps a database row onto the port's record shape.
   *
   * @param row - Prisma record.
   * @returns Subscription record.
   */
  private static toRecord(row: {
    id: string;
    userId: string;
    plan: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    providerCustomerId: string | null;
    providerSubscriptionId: string | null;
  }): SubscriptionRecord {
    return {
      id: row.id,
      userId: row.userId,
      plan: row.plan as PlanTier,
      status: row.status as SubscriptionStatus,
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      providerCustomerId: row.providerCustomerId,
      providerSubscriptionId: row.providerSubscriptionId,
    };
  }
}
