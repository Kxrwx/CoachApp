import { Injectable } from '@nestjs/common';
import { EnvConfig, validateEnv } from './env.config';

@Injectable()
export class ConfigService {
  private config: EnvConfig;

  constructor() {
    this.config = validateEnv();
  }

  get env(): EnvConfig {
    return this.config;
  }

  get isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  get isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  get isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  get port(): number {
    return this.config.PORT;
  }

  get databaseUrl(): string {
    return this.config.DATABASE_URL;
  }

  get jwtSecret(): string {
    return this.config.JWT_SECRET;
  }

  get jwtExpiration(): number {
    return this.config.JWT_EXPIRATION;
  }

  get stravaClientId(): string | undefined {
    return this.config.STRAVA_CLIENT_ID;
  }

  get stravaClientSecret(): string | undefined {
    return this.config.STRAVA_CLIENT_SECRET;
  }

  get stravaRedirectUri(): string | undefined {
    return this.config.STRAVA_REDIRECT_URI;
  }

  get r2Endpoint(): string | undefined {
    return this.config.R2_ENDPOINT;
  }

  get r2AccessKeyId(): string | undefined {
    return this.config.R2_ACCESS_KEY_ID;
  }

  get r2SecretAccessKey(): string | undefined {
    return this.config.R2_SECRET_ACCESS_KEY;
  }

  get r2BucketName(): string | undefined {
    return this.config.R2_BUCKET_NAME;
  }

  get sentryDsn(): string | undefined {
    return this.config.SENTRY_DSN;
  }

  get sentryEnvironment(): string {
    return this.config.SENTRY_ENVIRONMENT;
  }

  get postHogApiKey(): string | undefined {
    return this.config.POSTHOG_API_KEY;
  }

  get postHogApiUrl(): string | undefined {
    return this.config.POSTHOG_API_URL;
  }

  get frontendUrl(): string {
    return this.config.FRONTEND_URL;
  }
}
