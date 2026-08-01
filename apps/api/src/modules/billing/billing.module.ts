import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Post,
  Req,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import {
  PlanTier,
  type CheckoutSessionDto,
  type InvoiceDto,
  type PlanDto,
  type SubscriptionDto,
} from '@nova/shared';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';

import { EVENT_BUS_PORT, type EventBusPort } from '../../common/application/ports';
import { PrismaService } from '../../common/infrastructure/persistence/prisma.service';
import { CurrentUser, Public, type AuthenticatedUser } from '../../common/presentation/decorators';
import type { AppConfig } from '../../config/configuration';
import {
  CancelSubscriptionUseCase,
  CreateCheckoutUseCase,
  GetSubscriptionUseCase,
  HandlePaymentWebhookUseCase,
  ListInvoicesUseCase,
  ListPlansUseCase,
  StartTrialUseCase,
} from './application/manage-subscription.use-cases';
import { SUBSCRIPTION_REPOSITORY } from './domain/subscription.repository';
import {
  PAYMENT_GATEWAY,
  SimulatedPaymentGateway,
  StripePaymentGateway,
  type PaymentGatewayPort,
} from './infrastructure/payment.adapters';
import {
  InMemorySubscriptionRepository,
  PrismaSubscriptionRepository,
} from './infrastructure/subscription.repositories';

/** Body of `POST /billing/checkout`. */
export class CheckoutDto {
  @ApiProperty({ enum: PlanTier })
  @IsEnum(PlanTier)
  public plan!: PlanTier;

  @ApiPropertyOptional({ description: 'Sikeres fizetés utáni átirányítás.' })
  @IsOptional()
  @IsString()
  public successUrl?: string;

  @ApiPropertyOptional({ description: 'Megszakított fizetés utáni átirányítás.' })
  @IsOptional()
  @IsString()
  public cancelUrl?: string;
}

/** Body of `POST /billing/cancel`. */
export class CancelDto {
  @ApiProperty({ description: 'true: időszak végén lemond, false: visszavonja a lemondást.' })
  @IsBoolean()
  public cancelAtPeriodEnd!: boolean;
}

/** Subscription and payment endpoints. */
@ApiTags('billing')
@Controller('billing')
export class BillingController {
  /**
   * @param listPlans - Plan catalogue.
   * @param getSubscription - Subscription query.
   * @param createCheckout - Checkout use case.
   * @param cancelSubscription - Cancellation use case.
   * @param listInvoices - Invoice history.
   * @param handleWebhook - Provider webhook handler.
   * @param gateway - Payment provider port (webhook parsing).
   * @param config - Runtime configuration (redirect URLs).
   */
  public constructor(
    private readonly listPlans: ListPlansUseCase,
    private readonly getSubscription: GetSubscriptionUseCase,
    private readonly createCheckout: CreateCheckoutUseCase,
    private readonly cancelSubscription: CancelSubscriptionUseCase,
    private readonly listInvoices: ListInvoicesUseCase,
    private readonly handleWebhook: HandlePaymentWebhookUseCase,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGatewayPort,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /**
   * @returns Purchasable plans.
   */
  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Előfizetési csomagok' })
  public plans(): PlanDto[] {
    return this.listPlans.execute();
  }

  /**
   * @param caller - Authenticated account.
   * @returns The caller's subscription, or `null`.
   */
  @Get('subscription')
  @ApiOperation({ summary: 'Aktuális előfizetés' })
  public async subscription(
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<SubscriptionDto | null> {
    return this.getSubscription.execute(caller.userId);
  }

  /**
   * @param caller - Authenticated account.
   * @returns Invoice history.
   */
  @Get('invoices')
  @ApiOperation({ summary: 'Számlatörténet' })
  public async invoices(@CurrentUser() caller: AuthenticatedUser): Promise<InvoiceDto[]> {
    return this.listInvoices.execute(caller.userId);
  }

  /**
   * @param caller - Authenticated account.
   * @param dto - Selected plan and redirect URLs.
   * @returns Checkout session.
   */
  @Post('checkout')
  @ApiOperation({ summary: 'Fizetési munkamenet indítása (Stripe Checkout)' })
  public async checkout(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: CheckoutDto,
  ): Promise<CheckoutSessionDto> {
    const webAppUrl = this.config.get('app', { infer: true }).webAppUrl;
    return this.createCheckout.execute({
      userId: caller.userId,
      email: caller.email,
      plan: dto.plan,
      successUrl: dto.successUrl ?? `${webAppUrl}/account/subscription?status=success`,
      cancelUrl: dto.cancelUrl ?? `${webAppUrl}/account/subscription?status=cancelled`,
    });
  }

  /**
   * @param caller - Authenticated account.
   * @param dto - Desired cancellation state.
   * @returns The updated subscription.
   */
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Előfizetés lemondása / visszavonása' })
  public async cancel(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: CancelDto,
  ): Promise<SubscriptionDto> {
    return this.cancelSubscription.execute(caller.userId, dto.cancelAtPeriodEnd);
  }

  /**
   * Receives payment provider webhooks.
   *
   * @param signature - Provider signature header.
   * @param request - Raw request (the unparsed body is required for verification).
   * @returns Acknowledgement.
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook fogadása' })
  public async webhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() request: Request & { rawBody?: Buffer },
  ): Promise<{ received: boolean }> {
    const event = this.gateway.parseWebhook(request.rawBody ?? JSON.stringify(request.body), signature);
    if (event) {
      await this.handleWebhook.execute(event);
    }
    return { received: true };
  }
}

/** Grants the trial subscription when a new account is registered. */
@Injectable()
export class TrialProvisioningHandler implements OnModuleInit {
  /**
   * @param eventBus - Domain event bus.
   * @param startTrial - Trial provisioning use case.
   */
  public constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly startTrial: StartTrialUseCase,
  ) {}

  /** Registers the subscription when the module boots. */
  public onModuleInit(): void {
    this.eventBus.subscribe<{ userId: string; plan?: PlanTier }>(
      'user.registered',
      async (payload) => {
        await this.startTrial.execute(payload.userId, payload.plan ?? PlanTier.STANDARD);
      },
    );
  }
}

/** Billing bounded context: plans, checkout, subscriptions and invoices. */
@Module({
  controllers: [BillingController],
  providers: [
    ListPlansUseCase,
    GetSubscriptionUseCase,
    CreateCheckoutUseCase,
    CancelSubscriptionUseCase,
    ListInvoicesUseCase,
    HandlePaymentWebhookUseCase,
    StartTrialUseCase,
    TrialProvisioningHandler,
    {
      provide: SUBSCRIPTION_REPOSITORY,
      inject: [ConfigService, PrismaService],
      useFactory: (config: ConfigService<AppConfig, true>, prisma: PrismaService) =>
        config.get('database', { infer: true }).driver === 'prisma'
          ? new PrismaSubscriptionRepository(prisma)
          : new InMemorySubscriptionRepository(),
    },
    {
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const billing = config.get('billing', { infer: true });
        return billing.stripeSecretKey
          ? new StripePaymentGateway(billing.stripeSecretKey, billing.stripeWebhookSecret)
          : new SimulatedPaymentGateway();
      },
    },
  ],
  exports: [SUBSCRIPTION_REPOSITORY, GetSubscriptionUseCase],
})
export class BillingModule {}
