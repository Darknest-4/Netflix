import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../common/infrastructure/persistence/prisma.service';
import { PASSWORD_HASHER, TOKEN_SERVICE, TOTP_SERVICE } from './application/identity.ports';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import {
  DisableTwoFactorUseCase,
  EnableTwoFactorUseCase,
  SetupTwoFactorUseCase,
} from './application/use-cases/manage-two-factor.use-cases';
import { OAuthLoginUseCase } from './application/use-cases/oauth-login.use-case';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { USER_REPOSITORY } from './domain/user.repository';
import { InMemoryUserRepository } from './infrastructure/persistence/in-memory-user.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import {
  BcryptPasswordHasher,
  JwtTokenService,
  OtplibTotpService,
} from './infrastructure/security/security.adapters';
import { AuthController } from './presentation/auth.controller';
import { JwtStrategy } from './presentation/jwt.strategy';

/**
 * Identity bounded context: accounts, sessions, 2FA and federated login.
 *
 * The repository binding is resolved at boot: with a configured database the
 * Prisma adapter is used, otherwise the in-memory one. Everything above the
 * repository interface is unaware of that choice.
 */
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    RegisterUserUseCase,
    LoginUserUseCase,
    RefreshSessionUseCase,
    SetupTwoFactorUseCase,
    EnableTwoFactorUseCase,
    DisableTwoFactorUseCase,
    OAuthLoginUseCase,
    {
      provide: USER_REPOSITORY,
      inject: [ConfigService, PrismaService],
      useFactory: (config: ConfigService<AppConfig, true>, prisma: PrismaService) =>
        config.get('database', { infer: true }).driver === 'prisma'
          ? new PrismaUserRepository(prisma)
          : new InMemoryUserRepository(),
    },
    {
      provide: PASSWORD_HASHER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) =>
        new BcryptPasswordHasher(config.get('auth', { infer: true }).bcryptRounds),
    },
    {
      provide: TOKEN_SERVICE,
      inject: [JwtService, ConfigService],
      useFactory: (jwt: JwtService, config: ConfigService<AppConfig, true>) => {
        const auth = config.get('auth', { infer: true });
        return new JwtTokenService(jwt, {
          accessSecret: auth.accessSecret,
          refreshSecret: auth.refreshSecret,
          accessTtlSeconds: auth.accessTtlSeconds,
          refreshTtlSeconds: auth.refreshTtlSeconds,
        });
      },
    },
    { provide: TOTP_SERVICE, useClass: OtplibTotpService },
    {
      provide: JwtStrategy,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) =>
        new JwtStrategy(config.get('auth', { infer: true }).accessSecret),
    },
  ],
  exports: [USER_REPOSITORY, TOKEN_SERVICE, PASSWORD_HASHER],
})
export class IdentityModule {}
