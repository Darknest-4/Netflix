import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Param,
  Post,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { BRAND_NAME, NotificationChannel, type NotificationDto } from '@nova/shared';
import { IsObject, IsString } from 'class-validator';

import { EVENT_BUS_PORT, type EventBusPort } from '../../common/application/ports';
import { PrismaService } from '../../common/infrastructure/persistence/prisma.service';
import { CurrentUser, type AuthenticatedUser } from '../../common/presentation/decorators';
import type { AppConfig } from '../../config/configuration';
import {
  ListNotificationsUseCase,
  MarkNotificationReadUseCase,
  RegisterPushSubscriptionUseCase,
  SendNotificationUseCase,
} from './application/notify.use-cases';
import {
  InMemoryNotificationRepository,
  NOTIFICATION_REPOSITORY,
  PrismaNotificationRepository,
} from './infrastructure/notification.repositories';
import { RealtimeGateway } from './presentation/realtime.gateway';

/** Body of `POST /notifications/push/subscribe`. */
export class PushSubscribeDto {
  @ApiProperty({ example: 'https://fcm.googleapis.com/fcm/send/...' })
  @IsString()
  public endpoint!: string;

  @ApiProperty({ example: { p256dh: '...', auth: '...' } })
  @IsObject()
  public keys!: { p256dh: string; auth: string };
}

/** Notification endpoints (bell menu and Web Push registration). */
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  /**
   * @param listNotifications - Listing use case.
   * @param markRead - Read-marking use case.
   * @param registerPush - Push registration use case.
   */
  public constructor(
    private readonly listNotifications: ListNotificationsUseCase,
    private readonly markRead: MarkNotificationReadUseCase,
    private readonly registerPush: RegisterPushSubscriptionUseCase,
  ) {}

  /**
   * @param caller - Authenticated account.
   * @returns Notifications, newest first.
   */
  @Get()
  @ApiOperation({ summary: 'Értesítések listája' })
  public async list(@CurrentUser() caller: AuthenticatedUser): Promise<NotificationDto[]> {
    return this.listNotifications.execute(caller.userId);
  }

  /**
   * @param caller - Authenticated account.
   * @param id - Notification identifier.
   * @returns Acknowledgement.
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Értesítés olvasottnak jelölése' })
  public async read(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.markRead.execute(id, caller.userId);
    return { success: true };
  }

  /**
   * @param caller - Authenticated account.
   * @param dto - Subscription created by the service worker.
   * @returns Acknowledgement.
   */
  @Post('push/subscribe')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Web Push feliratkozás rögzítése' })
  public async subscribe(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: PushSubscribeDto,
  ): Promise<{ success: boolean }> {
    await this.registerPush.execute(caller.userId, dto);
    return { success: true };
  }
}

/** Sends the welcome e-mail when an account is created. */
@Injectable()
export class WelcomeMailHandler implements OnModuleInit {
  /**
   * @param eventBus - Domain event bus.
   * @param sendNotification - Notification fan-out use case.
   */
  public constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly sendNotification: SendNotificationUseCase,
  ) {}

  /** Registers the subscription when the module boots. */
  public onModuleInit(): void {
    this.eventBus.subscribe<{ userId: string; email: string; displayName: string }>(
      'user.registered',
      async (payload) => {
        await this.sendNotification.execute({
          userId: payload.userId,
          email: payload.email,
          subject: `Üdv a ${BRAND_NAME} világában, ${payload.displayName}!`,
          body: 'A fiókod elkészült. Hozz létre profilokat a családtagoknak, és kezdj el nézni bármit — reklámok nélkül, bármikor lemondható előfizetéssel.',
          href: '/browse',
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        });
      },
    );
  }
}

/** Notifications bounded context: in-app, e-mail, Web Push and realtime. */
@Module({
  controllers: [NotificationsController],
  providers: [
    SendNotificationUseCase,
    ListNotificationsUseCase,
    MarkNotificationReadUseCase,
    RegisterPushSubscriptionUseCase,
    WelcomeMailHandler,
    RealtimeGateway,
    {
      provide: NOTIFICATION_REPOSITORY,
      inject: [ConfigService, PrismaService],
      useFactory: (config: ConfigService<AppConfig, true>, prisma: PrismaService) =>
        config.get('database', { infer: true }).driver === 'prisma'
          ? new PrismaNotificationRepository(prisma)
          : new InMemoryNotificationRepository(),
    },
  ],
  exports: [SendNotificationUseCase, RealtimeGateway],
})
export class NotificationsModule {}
