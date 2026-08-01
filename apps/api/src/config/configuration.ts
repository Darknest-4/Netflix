/**
 * Strongly typed runtime configuration.
 *
 * Every environment variable is read exactly once, here, and exposed to the
 * rest of the application through `ConfigService<AppConfig>`. Optional
 * integrations (PostgreSQL, Redis, Stripe, SMTP, S3, Web Push) degrade to
 * in-process adapters when their variables are absent, which is what makes the
 * API runnable with a bare `npm run dev` while still being production ready.
 */
export interface AppConfig {
  app: {
    env: 'development' | 'test' | 'production';
    port: number;
    apiPrefix: string;
    corsOrigins: string[];
    webAppUrl: string;
  };
  database: {
    url: string | null;
    /** `prisma` when a database is configured, otherwise `memory`. */
    driver: 'prisma' | 'memory';
  };
  redis: {
    url: string | null;
    ttlSeconds: number;
  };
  auth: {
    accessSecret: string;
    refreshSecret: string;
    accessTtlSeconds: number;
    refreshTtlSeconds: number;
    bcryptRounds: number;
    oauth: {
      google: { clientId: string | null; clientSecret: string | null };
      github: { clientId: string | null; clientSecret: string | null };
    };
  };
  billing: {
    stripeSecretKey: string | null;
    stripeWebhookSecret: string | null;
  };
  mail: {
    host: string | null;
    port: number;
    user: string | null;
    password: string | null;
    from: string;
  };
  storage: {
    endpoint: string | null;
    region: string;
    bucket: string;
    accessKeyId: string | null;
    secretAccessKey: string | null;
    publicBaseUrl: string;
  };
  push: {
    publicKey: string | null;
    privateKey: string | null;
    subject: string;
  };
  streaming: {
    /** Base URL of the packaged HLS/DASH assets served by the CDN. */
    cdnBaseUrl: string;
    /** Fallback asset used by the demo catalog. */
    demoHlsUrl: string;
  };
}

/**
 * Reads a required string variable, falling back to a development default.
 *
 * @param key - Environment variable name.
 * @param fallback - Value used when the variable is not set.
 * @returns The resolved value.
 */
function str(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

/**
 * Reads an optional string variable.
 *
 * @param key - Environment variable name.
 * @returns The value, or `null` when unset/empty.
 */
function optional(key: string): string | null {
  const value = process.env[key];
  return value === undefined || value === '' ? null : value;
}

/**
 * Reads a numeric variable.
 *
 * @param key - Environment variable name.
 * @param fallback - Value used when unset or not a finite number.
 * @returns The parsed number.
 */
function num(key: string, fallback: number): number {
  const parsed = Number(process.env[key]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Builds the application configuration object from `process.env`.
 *
 * Registered as the single `ConfigModule` factory in `AppModule`.
 *
 * @returns The immutable application configuration.
 */
export function configuration(): AppConfig {
  const databaseUrl = optional('DATABASE_URL');

  return {
    app: {
      env: (str('NODE_ENV', 'development') as AppConfig['app']['env']) ?? 'development',
      port: num('PORT', 4000),
      apiPrefix: str('API_PREFIX', 'api/v1'),
      corsOrigins: str('CORS_ORIGINS', 'http://localhost:3000')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
      webAppUrl: str('WEB_APP_URL', 'http://localhost:3000'),
    },
    database: {
      url: databaseUrl,
      driver: (optional('PERSISTENCE_DRIVER') as 'prisma' | 'memory' | null) ??
        (databaseUrl ? 'prisma' : 'memory'),
    },
    redis: {
      url: optional('REDIS_URL'),
      ttlSeconds: num('CACHE_TTL_SECONDS', 60),
    },
    auth: {
      accessSecret: str('JWT_ACCESS_SECRET', 'nova-dev-access-secret-change-me'),
      refreshSecret: str('JWT_REFRESH_SECRET', 'nova-dev-refresh-secret-change-me'),
      accessTtlSeconds: num('JWT_ACCESS_TTL', 900),
      refreshTtlSeconds: num('JWT_REFRESH_TTL', 2_592_000),
      bcryptRounds: num('BCRYPT_ROUNDS', 10),
      oauth: {
        google: {
          clientId: optional('GOOGLE_CLIENT_ID'),
          clientSecret: optional('GOOGLE_CLIENT_SECRET'),
        },
        github: {
          clientId: optional('GITHUB_CLIENT_ID'),
          clientSecret: optional('GITHUB_CLIENT_SECRET'),
        },
      },
    },
    billing: {
      stripeSecretKey: optional('STRIPE_SECRET_KEY'),
      stripeWebhookSecret: optional('STRIPE_WEBHOOK_SECRET'),
    },
    mail: {
      host: optional('SMTP_HOST'),
      port: num('SMTP_PORT', 587),
      user: optional('SMTP_USER'),
      password: optional('SMTP_PASSWORD'),
      from: str('MAIL_FROM', 'NOVA <no-reply@nova.example>'),
    },
    storage: {
      endpoint: optional('S3_ENDPOINT'),
      region: str('S3_REGION', 'eu-central-1'),
      bucket: str('S3_BUCKET', 'nova-media'),
      accessKeyId: optional('S3_ACCESS_KEY_ID'),
      secretAccessKey: optional('S3_SECRET_ACCESS_KEY'),
      publicBaseUrl: str('S3_PUBLIC_BASE_URL', 'http://localhost:9000/nova-media'),
    },
    push: {
      publicKey: optional('WEB_PUSH_PUBLIC_KEY'),
      privateKey: optional('WEB_PUSH_PRIVATE_KEY'),
      subject: str('WEB_PUSH_SUBJECT', 'mailto:ops@nova.example'),
    },
    streaming: {
      cdnBaseUrl: str('CDN_BASE_URL', 'http://localhost:4000/api/v1/playback/assets'),
      demoHlsUrl: str(
        'DEMO_HLS_URL',
        'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      ),
    },
  };
}
