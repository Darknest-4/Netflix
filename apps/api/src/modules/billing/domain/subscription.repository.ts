import type { PlanTier, SubscriptionStatus } from '@nova/shared';

/** Subscription aggregate state. */
export interface SubscriptionRecord {
  id: string;
  userId: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
}

/** Issued invoice. */
export interface InvoiceRecord {
  id: string;
  subscriptionId: string;
  amountMinor: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  issuedAt: Date;
  hostedUrl: string | null;
}

/** Outbound port of the billing context. */
export interface SubscriptionRepository {
  /**
   * @param userId - Account identifier.
   * @returns The account's subscription, or `null`.
   */
  findByUser(userId: string): Promise<SubscriptionRecord | null>;

  /**
   * @param providerSubscriptionId - Identifier issued by the payment provider.
   * @returns The matching subscription, or `null`.
   */
  findByProviderId(providerSubscriptionId: string): Promise<SubscriptionRecord | null>;

  /**
   * Inserts or updates a subscription.
   *
   * @param record - Subscription to persist.
   */
  save(record: SubscriptionRecord): Promise<void>;

  /**
   * @param subscriptionId - Subscription identifier.
   * @returns Invoices, newest first.
   */
  listInvoices(subscriptionId: string): Promise<InvoiceRecord[]>;

  /**
   * Stores an invoice received from the provider.
   *
   * @param invoice - Invoice to persist.
   */
  addInvoice(invoice: InvoiceRecord): Promise<void>;

  /** @returns Every subscription (admin table and analytics). */
  listAll(): Promise<SubscriptionRecord[]>;
}

/** Injection token of {@link SubscriptionRepository}. */
export const SUBSCRIPTION_REPOSITORY = Symbol('SubscriptionRepository');
