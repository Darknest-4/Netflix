import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PLANS,
  PlanTier,
  SubscriptionStatus,
  type CheckoutSessionDto,
  type InvoiceDto,
  type PlanDto,
  type SubscriptionDto,
} from '@nova/shared';

import {
  CLOCK_PORT,
  EVENT_BUS_PORT,
  ID_GENERATOR_PORT,
  type ClockPort,
  type EventBusPort,
  type IdGeneratorPort,
} from '../../../common/application/ports';
import { EntityNotFound } from '../../../common/domain/domain.exceptions';
import type { SubscriptionRecord } from '../domain/subscription.repository';
import { SUBSCRIPTION_REPOSITORY, type SubscriptionRepository } from '../domain/subscription.repository';
import { PAYMENT_GATEWAY, type PaymentGatewayPort, type PaymentWebhookEvent } from '../infrastructure/payment.adapters';

/** Length of the free trial granted at registration, in days. */
const TRIAL_DAYS = 30;

/**
 * Maps the record onto its API representation.
 *
 * @param record - Stored subscription.
 * @returns Wire-safe DTO.
 */
function toDto(record: SubscriptionRecord): SubscriptionDto {
  return {
    id: record.id,
    userId: record.userId,
    plan: record.plan,
    status: record.status,
    currentPeriodStart: record.currentPeriodStart.toISOString(),
    currentPeriodEnd: record.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: record.cancelAtPeriodEnd,
    providerCustomerId: record.providerCustomerId,
    providerSubscriptionId: record.providerSubscriptionId,
  };
}

/** Returns the purchasable plans. */
@Injectable()
export class ListPlansUseCase {
  /**
   * @returns Every plan offered on the pricing page.
   */
  public execute(): PlanDto[] {
    return [...PLANS];
  }
}

/** Reads the subscription of an account. */
@Injectable()
export class GetSubscriptionUseCase {
  /**
   * @param subscriptions - Billing repository.
   */
  public constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
  ) {}

  /**
   * @param userId - Account identifier.
   * @returns The subscription, or `null` when the account never subscribed.
   */
  public async execute(userId: string): Promise<SubscriptionDto | null> {
    const record = await this.subscriptions.findByUser(userId);
    return record ? toDto(record) : null;
  }
}

/** Starts a hosted checkout for a plan change or a first purchase. */
@Injectable()
export class CreateCheckoutUseCase {
  /**
   * @param gateway - Payment provider port.
   * @param subscriptions - Billing repository.
   * @param ids - Identifier factory.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGatewayPort,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(ID_GENERATOR_PORT) private readonly ids: IdGeneratorPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @param input - Account, plan and redirect URLs.
   * @returns Checkout session to redirect the browser to.
   */
  public async execute(input: {
    userId: string;
    email: string;
    plan: PlanTier;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionDto> {
    const session = await this.gateway.createCheckoutSession(input);

    if (session.simulated) {
      // Without a payment provider the plan takes effect immediately, so the
      // rest of the product behaves exactly as it would after a real payment.
      const now = this.clock.now();
      const existing = await this.subscriptions.findByUser(input.userId);

      await this.subscriptions.save({
        id: existing?.id ?? this.ids.generate(),
        userId: input.userId,
        plan: input.plan,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 30 * 86_400_000),
        cancelAtPeriodEnd: false,
        providerCustomerId: existing?.providerCustomerId ?? null,
        providerSubscriptionId: existing?.providerSubscriptionId ?? null,
      });
    }

    return session;
  }
}

/** Schedules or revokes the cancellation of a subscription. */
@Injectable()
export class CancelSubscriptionUseCase {
  /**
   * @param subscriptions - Billing repository.
   * @param gateway - Payment provider port.
   * @param eventBus - Domain event publisher.
   */
  public constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGatewayPort,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  /**
   * @param userId - Account identifier.
   * @param cancelAtPeriodEnd - True to stop renewal, false to resume it.
   * @returns The updated subscription.
   * @throws {EntityNotFound} When the account has no subscription.
   */
  public async execute(userId: string, cancelAtPeriodEnd: boolean): Promise<SubscriptionDto> {
    const record = await this.subscriptions.findByUser(userId);
    if (!record) {
      throw new EntityNotFound('Előfizetés', userId);
    }

    if (record.providerSubscriptionId) {
      await this.gateway.updateCancellation(record.providerSubscriptionId, cancelAtPeriodEnd);
    }

    record.cancelAtPeriodEnd = cancelAtPeriodEnd;
    await this.subscriptions.save(record);

    await this.eventBus.publish('subscription.updated', {
      userId,
      status: cancelAtPeriodEnd ? 'CANCEL_SCHEDULED' : record.status,
    });

    return toDto(record);
  }
}

/** Lists the invoices of an account. */
@Injectable()
export class ListInvoicesUseCase {
  /**
   * @param subscriptions - Billing repository.
   */
  public constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
  ) {}

  /**
   * @param userId - Account identifier.
   * @returns Invoices, newest first.
   */
  public async execute(userId: string): Promise<InvoiceDto[]> {
    const subscription = await this.subscriptions.findByUser(userId);
    if (!subscription) {
      return [];
    }

    const invoices = await this.subscriptions.listInvoices(subscription.id);
    return invoices.map((invoice) => ({
      id: invoice.id,
      subscriptionId: invoice.subscriptionId,
      amountMinor: invoice.amountMinor,
      currency: invoice.currency,
      status: invoice.status,
      issuedAt: invoice.issuedAt.toISOString(),
      hostedUrl: invoice.hostedUrl,
    }));
  }
}

/**
 * Applies a payment provider webhook.
 *
 * Webhooks are the authoritative source of subscription state: the local record
 * is always reconciled to what the provider reports.
 */
@Injectable()
export class HandlePaymentWebhookUseCase {
  private readonly logger = new Logger(HandlePaymentWebhookUseCase.name);

  /**
   * @param subscriptions - Billing repository.
   * @param ids - Identifier factory.
   * @param clock - Wall clock.
   * @param eventBus - Domain event publisher.
   */
  public constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(ID_GENERATOR_PORT) private readonly ids: IdGeneratorPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  /**
   * @param event - Normalised provider event.
   */
  public async execute(event: PaymentWebhookEvent): Promise<void> {
    if (!event.providerSubscriptionId) {
      this.logger.debug(`Figyelmen kívül hagyott webhook: ${event.type}`);
      return;
    }

    const record = await this.subscriptions.findByProviderId(event.providerSubscriptionId);
    if (!record) {
      this.logger.warn(`Ismeretlen előfizetés a webhookban: ${event.providerSubscriptionId}`);
      return;
    }

    if (event.status) {
      record.status = HandlePaymentWebhookUseCase.mapStatus(event.status);
    }
    if (event.currentPeriodEnd) {
      record.currentPeriodEnd = event.currentPeriodEnd;
    }
    if (event.plan) {
      record.plan = event.plan;
    }
    await this.subscriptions.save(record);

    if (event.type === 'invoice.payment_succeeded' && event.amountMinor) {
      await this.subscriptions.addInvoice({
        id: this.ids.generate(),
        subscriptionId: record.id,
        amountMinor: event.amountMinor,
        currency: event.currency ?? 'HUF',
        status: 'paid',
        issuedAt: this.clock.now(),
        hostedUrl: event.hostedInvoiceUrl,
      });
    }

    await this.eventBus.publish('subscription.updated', {
      userId: record.userId,
      status: record.status,
    });
  }

  /**
   * Maps a provider status string onto the domain enumeration.
   *
   * @param status - Provider status.
   * @returns Domain subscription status.
   */
  private static mapStatus(status: string): SubscriptionStatus {
    switch (status) {
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
      case 'unpaid':
        return SubscriptionStatus.CANCELED;
      default:
        return SubscriptionStatus.INCOMPLETE;
    }
  }
}

/** Grants the free trial when an account is created. */
@Injectable()
export class StartTrialUseCase {
  /**
   * @param subscriptions - Billing repository.
   * @param ids - Identifier factory.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(ID_GENERATOR_PORT) private readonly ids: IdGeneratorPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @param userId - Newly created account.
   * @param plan - Plan selected during signup.
   */
  public async execute(userId: string, plan: PlanTier = PlanTier.STANDARD): Promise<void> {
    const now = this.clock.now();
    await this.subscriptions.save({
      id: this.ids.generate(),
      userId,
      plan,
      status: SubscriptionStatus.TRIALING,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + TRIAL_DAYS * 86_400_000),
      cancelAtPeriodEnd: false,
      providerCustomerId: null,
      providerSubscriptionId: null,
    });
  }
}
