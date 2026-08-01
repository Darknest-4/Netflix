import type { PlanTier, SubscriptionStatus } from '../enums';

/** Commercial description of a plan, rendered on the pricing and signup pages. */
export interface PlanDto {
  tier: PlanTier;
  name: string;
  /** Monthly price in minor units (fillér/cent). */
  priceMinor: number;
  currency: 'HUF' | 'EUR' | 'USD';
  maxStreams: number;
  maxProfiles: number;
  maxQuality: '720p' | '1080p' | '4K + HDR';
  downloadsPerAccount: number;
  features: string[];
  /** Price identifier registered with the payment provider. */
  stripePriceId: string;
}

/** Subscription aggregate as exposed by the billing module. */
export interface SubscriptionDto {
  id: string;
  userId: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  /** Provider customer id; `null` while running in offline demo mode. */
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
}

/** Single line of the billing history table. */
export interface InvoiceDto {
  id: string;
  subscriptionId: string;
  amountMinor: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  issuedAt: string;
  /** Hosted invoice URL when the payment provider is configured. */
  hostedUrl: string | null;
}

/** Result of creating a Stripe Checkout session. */
export interface CheckoutSessionDto {
  sessionId: string;
  /** URL the browser is redirected to in order to complete payment. */
  url: string;
  /** True when the API runs without Stripe keys and simulated the checkout. */
  simulated: boolean;
}
