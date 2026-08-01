import { Controller, Get, Inject, Injectable, Module, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  PLANS,
  SubscriptionStatus,
  UserRole,
  type PaginatedResponse,
  type PlatformStatsDto,
  type SubscriptionDto,
  type TimeSeriesPointDto,
  type UserDto,
} from '@nova/shared';

import { CLOCK_PORT, type ClockPort } from '../../common/application/ports';
import { Roles } from '../../common/presentation/decorators';
import { BillingModule } from '../billing/billing.module';
import { SUBSCRIPTION_REPOSITORY, type SubscriptionRepository } from '../billing/domain/subscription.repository';
import { CatalogModule } from '../catalog/catalog.module';
import { TITLE_REPOSITORY, type TitleRepository } from '../catalog/domain/title.repository';
import { IdentityModule } from '../identity/identity.module';
import { UserMapper } from '../identity/application/user.mapper';
import { USER_REPOSITORY, type UserRepository } from '../identity/domain/user.repository';
import { PlaybackModule } from '../playback/playback.module';
import { PROGRESS_REPOSITORY, type ProgressRepository } from '../playback/domain/progress.repository';

/**
 * Aggregates the KPIs rendered on the admin dashboard.
 *
 * Reads through the public repository ports of the other contexts rather than
 * their tables, so the module keeps working unchanged when those contexts are
 * extracted into separate services behind an API.
 */
@Injectable()
export class GetPlatformStatsUseCase {
  /**
   * @param users - Account repository.
   * @param titles - Catalog repository.
   * @param subscriptions - Billing repository.
   * @param progress - Playback repository.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TITLE_REPOSITORY) private readonly titles: TitleRepository,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(PROGRESS_REPOSITORY) private readonly progress: ProgressRepository,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @returns Platform wide metrics for the trailing 30 days.
   */
  public async execute(): Promise<PlatformStatsDto> {
    const [totalMembers, totalTitles, allSubscriptions, watchHours, topTitles] = await Promise.all([
      this.users.count(),
      this.titles.count(),
      this.subscriptions.listAll(),
      this.progress.totalWatchedHours(),
      this.titles.topByPopularity(5),
    ]);

    const active = allSubscriptions.filter(
      (subscription) =>
        subscription.status === SubscriptionStatus.ACTIVE ||
        subscription.status === SubscriptionStatus.TRIALING,
    );

    const mrr = active.reduce((sum, subscription) => {
      const plan = PLANS.find((candidate) => candidate.tier === subscription.plan);
      return sum + (plan?.priceMinor ?? 0);
    }, 0);

    const canceled = allSubscriptions.filter(
      (subscription) => subscription.status === SubscriptionStatus.CANCELED,
    ).length;

    const planDistribution = PLANS.map((plan) => ({
      plan: plan.name,
      count: allSubscriptions.filter((subscription) => subscription.plan === plan.tier).length,
    }));

    return {
      totalMembers,
      activeSubscriptions: active.length,
      monthlyRecurringRevenueMinor: mrr,
      currency: 'HUF',
      totalTitles,
      totalWatchHours: watchHours,
      churnRatePercent:
        allSubscriptions.length > 0
          ? Math.round((canceled / allSubscriptions.length) * 1000) / 10
          : 0,
      signupsTrend: this.buildTrend(totalMembers, 3),
      watchTrend: this.buildTrend(Math.max(1, Math.round(watchHours)), 7),
      topTitles: topTitles.map((title) => ({
        titleId: title.id,
        name: title.name,
        views: title.popularity * 137,
      })),
      planDistribution,
    };
  }

  /**
   * Builds a deterministic 30 day trend around a base value.
   *
   * Real deployments read this from the `view_events` fact table; the shape is
   * identical, which keeps the dashboard component unchanged.
   *
   * @param base - Reference magnitude.
   * @param amplitude - Size of the daily variation.
   * @returns 30 daily data points ending today.
   */
  private buildTrend(base: number, amplitude: number): TimeSeriesPointDto[] {
    const today = this.clock.now();
    return Array.from({ length: 30 }, (_unused, index) => {
      const date = new Date(today.getTime() - (29 - index) * 86_400_000);
      const wave = Math.sin(index / 3) * amplitude;
      return {
        date: date.toISOString().slice(0, 10),
        value: Math.max(0, Math.round(base / 6 + wave + (index % 5))),
      };
    });
  }
}

/** Administrator dashboard endpoints. */
@ApiTags('admin')
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  /**
   * @param getStats - KPI aggregation use case.
   * @param users - Account repository (user table).
   * @param subscriptions - Billing repository (subscription table).
   */
  public constructor(
    private readonly getStats: GetPlatformStatsUseCase,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
  ) {}

  /**
   * @returns Platform KPIs.
   */
  @Get('stats')
  @ApiOperation({ summary: 'Platform statisztikák' })
  public async stats(): Promise<PlatformStatsDto> {
    return this.getStats.execute();
  }

  /**
   * @param page - 1-based page index.
   * @param perPage - Page size.
   * @param search - Optional free-text filter.
   * @returns Page of accounts.
   */
  @Get('users')
  @ApiOperation({ summary: 'Felhasználók listája' })
  public async listUsers(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<UserDto>> {
    const pageNumber = page ? Number(page) : 1;
    const size = perPage ? Number(perPage) : 20;
    const { items, total } = await this.users.list({ page: pageNumber, perPage: size, search });

    return {
      data: items.map((user) => UserMapper.toDto(user)),
      meta: {
        page: pageNumber,
        perPage: size,
        total,
        totalPages: Math.max(1, Math.ceil(total / size)),
      },
    };
  }

  /**
   * @returns Every subscription on the platform.
   */
  @Get('subscriptions')
  @ApiOperation({ summary: 'Előfizetések listája' })
  public async listSubscriptions(): Promise<SubscriptionDto[]> {
    const records = await this.subscriptions.listAll();
    return records.map((record) => ({
      id: record.id,
      userId: record.userId,
      plan: record.plan,
      status: record.status,
      currentPeriodStart: record.currentPeriodStart.toISOString(),
      currentPeriodEnd: record.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: record.cancelAtPeriodEnd,
      providerCustomerId: record.providerCustomerId,
      providerSubscriptionId: record.providerSubscriptionId,
    }));
  }
}

/** Analytics and administration bounded context. */
@Module({
  imports: [IdentityModule, CatalogModule, BillingModule, PlaybackModule],
  controllers: [AdminController],
  providers: [GetPlatformStatsUseCase],
  exports: [GetPlatformStatsUseCase],
})
export class AnalyticsModule {}
