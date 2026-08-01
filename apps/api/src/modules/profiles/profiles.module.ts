import { Inject, Injectable, Module, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  CLOCK_PORT,
  EVENT_BUS_PORT,
  ID_GENERATOR_PORT,
  type ClockPort,
  type EventBusPort,
  type IdGeneratorPort,
} from '../../common/application/ports';
import { PrismaService } from '../../common/infrastructure/persistence/prisma.service';
import type { AppConfig } from '../../config/configuration';
import {
  CreateProfileUseCase,
  DeleteProfileUseCase,
  ListProfilesUseCase,
  UpdateProfileUseCase,
} from './application/manage-profiles.use-cases';
import { Profile } from './domain/profile.entity';
import { PROFILE_REPOSITORY, type ProfileRepository } from './domain/profile.repository';
import { InMemoryProfileRepository } from './infrastructure/in-memory-profile.repository';
import { PrismaProfileRepository } from './infrastructure/prisma-profile.repository';
import { ProfilesController } from './presentation/profiles.controller';

/**
 * Reacts to `user.registered` by provisioning the account's first profile.
 *
 * Implemented as an event subscriber instead of a direct call from the identity
 * module: the two contexts stay decoupled and the handler can later move to a
 * separate service without changing the publisher.
 */
@Injectable()
export class ProfileProvisioningHandler implements OnModuleInit {
  /**
   * @param eventBus - Domain event bus.
   * @param profiles - Profile repository.
   * @param ids - Identifier factory.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    @Inject(PROFILE_REPOSITORY) private readonly profiles: ProfileRepository,
    @Inject(ID_GENERATOR_PORT) private readonly ids: IdGeneratorPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /** Registers the subscription when the module boots. */
  public onModuleInit(): void {
    this.eventBus.subscribe<{ userId: string; displayName: string }>(
      'user.registered',
      async (payload) => {
        const profile = Profile.create({
          id: this.ids.generate(),
          userId: payload.userId,
          name: payload.displayName.split(' ')[0] ?? 'Profil',
          avatarKey: 'nebula',
          isKids: false,
          now: this.clock.now(),
        });
        await this.profiles.save(profile);
      },
    );
  }
}

/** Profiles bounded context: multi-profile support and parental controls. */
@Module({
  controllers: [ProfilesController],
  providers: [
    ListProfilesUseCase,
    CreateProfileUseCase,
    UpdateProfileUseCase,
    DeleteProfileUseCase,
    ProfileProvisioningHandler,
    {
      provide: PROFILE_REPOSITORY,
      inject: [ConfigService, PrismaService],
      useFactory: (config: ConfigService<AppConfig, true>, prisma: PrismaService) =>
        config.get('database', { infer: true }).driver === 'prisma'
          ? new PrismaProfileRepository(prisma)
          : new InMemoryProfileRepository(),
    },
  ],
  exports: [PROFILE_REPOSITORY],
})
export class ProfilesModule {}
