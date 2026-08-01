import { Injectable, Logger } from '@nestjs/common';
import { PLANS, type CheckoutSessionDto, type PlanTier } from '@nova/shared';
import { randomUUID } from 'node:crypto';

/** Normalised webhook event handed to the billing use cases. */
export interface PaymentWebhookEvent {
  type: string;
  providerSubscriptionId: string | null;
  providerCustomerId: string | null;
  plan: PlanTier | null;
  status: string | null;
  currentPeriodEnd: Date | null;
  amountMinor: number | null;
  currency: string | null;
  hostedInvoiceUrl: string | null;
}

/** Payment provider port. */
export interface PaymentGatewayPort {
  /**
   * Starts a hosted checkout for a plan.
   *
   * @param input - Account, plan and redirect URLs.
   * @returns Checkout session with the redirect URL.
   */
  createCheckoutSession(input: {
    userId: string;
    email: string;
    plan: PlanTier;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionDto>;

  /**
   * Schedules or cancels the termination of a subscription.
   *
   * @param providerSubscriptionId - Provider side identifier.
   * @param cancelAtPeriodEnd - True to stop renewing at the period end.
   */
  updateCancellation(providerSubscriptionId: string, cancelAtPeriodEnd: boolean): Promise<void>;

  /**
   * Verifies and parses a webhook payload.
   *
   * @param rawBody - Raw request body as received.
   * @param signature - Provider signature header.
   * @returns The normalised event, or `null` when it can be ignored.
   */
  parseWebhook(rawBody: Buffer | string, signature: string | undefined): PaymentWebhookEvent | null;
}

/** Injection token of {@link PaymentGatewayPort}. */
export const PAYMENT_GATEWAY = Symbol('PaymentGatewayPort');

/**
 * Stripe implementation.
 *
 * Instantiated only when `STRIPE_SECRET_KEY` is present; the SDK is imported
 * lazily so the API starts without the dependency being configured.
 */
@Injectable()
export class StripePaymentGateway implements PaymentGatewayPort {
  private readonly logger = new Logger(StripePaymentGateway.name);

  /**
   * @param secretKey - Stripe secret API key.
   * @param webhookSecret - Signing secret of the webhook endpoint.
   */
  public constructor(
    private readonly secretKey: string,
    private readonly webhookSecret: string | null,
  ) {}

  /** Lazily constructs the Stripe SDK client. */
  private async client(): Promise<import('stripe').Stripe> {
    const { default: Stripe } = await import('stripe');
    return new Stripe(this.secretKey);
  }

  /** @inheritdoc */
  public async createCheckoutSession(input: {
    userId: string;
    email: string;
    plan: PlanTier;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionDto> {
    const plan = PLANS.find((candidate) => candidate.tier === input.plan);
    if (!plan) {
      throw new Error(`Ismeretlen csomag: ${input.plan}`);
    }

    const stripe = await this.client();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: input.email,
      client_reference_id: input.userId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: { userId: input.userId, plan: input.plan },
    });

    return { sessionId: session.id, url: session.url ?? input.successUrl, simulated: false };
  }

  /** @inheritdoc */
  public async updateCancellation(
    providerSubscriptionId: string,
    cancelAtPeriodEnd: boolean,
  ): Promise<void> {
    const stripe = await this.client();
    await stripe.subscriptions.update(providerSubscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });
  }

  /** @inheritdoc */
  public parseWebhook(
    rawBody: Buffer | string,
    signature: string | undefined,
  ): PaymentWebhookEvent | null {
    if (!this.webhookSecret || !signature) {
      this.logger.warn('Webhook aláírás ellenőrzés kihagyva — hiányzó titok.');
      return null;
    }

    // Verification is synchronous in the SDK; require it here to keep the
    // signature of the port free of promises.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = require('stripe') as typeof import('stripe').Stripe;
    const stripe = new Stripe(this.secretKey);
    const event = stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    const object = event.data.object as unknown as Record<string, unknown>;

    return {
      type: event.type,
      providerSubscriptionId:
        (object.subscription as string) ?? (event.type.startsWith('customer.subscription') ? (object.id as string) : null),
      providerCustomerId: (object.customer as string) ?? null,
      plan: ((object.metadata as Record<string, string> | undefined)?.plan as PlanTier) ?? null,
      status: (object.status as string) ?? null,
      currentPeriodEnd: object.current_period_end
        ? new Date((object.current_period_end as number) * 1000)
        : null,
      amountMinor: (object.amount_paid as number) ?? null,
      currency: ((object.currency as string) ?? null)?.toUpperCase() ?? null,
      hostedInvoiceUrl: (object.hosted_invoice_url as string) ?? null,
    };
  }
}

/**
 * Offline payment gateway.
 *
 * Active when no Stripe key is configured: checkout immediately "succeeds" so
 * the subscription flow, plan switching and the billing history remain fully
 * testable in development and in CI.
 */
@Injectable()
export class SimulatedPaymentGateway implements PaymentGatewayPort {
  private readonly logger = new Logger(SimulatedPaymentGateway.name);

  public constructor() {
    this.logger.log('Szimulált fizetési átjáró aktív (Stripe kulcs nélkül).');
  }

  /** @inheritdoc */
  public async createCheckoutSession(input: {
    userId: string;
    plan: PlanTier;
    successUrl: string;
  }): Promise<CheckoutSessionDto> {
    const sessionId = `sim_${randomUUID()}`;
    const url = `${input.successUrl}${input.successUrl.includes('?') ? '&' : '?'}session_id=${sessionId}&plan=${input.plan}&simulated=1`;
    return { sessionId, url, simulated: true };
  }

  /** @inheritdoc */
  public async updateCancellation(): Promise<void> {
    // Nothing to call: the local record is the source of truth in this mode.
  }

  /** @inheritdoc */
  public parseWebhook(): PaymentWebhookEvent | null {
    return null;
  }
}
