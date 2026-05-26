// src/main.ts
import { NestFactory } from '@nestjs/core';
import { Logger as NestLogger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import * as Sentry from '@sentry/node';
import { initSentry } from './config/sentry.config';
import { initPostHog } from './config/posthog.config';
import { ConfigService } from './config/config.service';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

const logger = new NestLogger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Initialiser Sentry ASAP
  const configService = app.get(ConfigService);
  initSentry(configService.sentryDsn, configService.sentryEnvironment, configService.isDevelopment);
  Sentry.setupExpressErrorHandler(app.getHttpAdapter().getInstance());

  // Initialiser PostHog
  initPostHog(configService.postHogApiKey, configService.isDevelopment);

  // ============ LOGGING ============
  app.useLogger(app.get(Logger));

  // ============ SECURITY (Helmet) ============
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // ============ COMPRESSION (gzip/brotli) ============
  app.use(compression());

  // ============ VALIDATION ============
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // ============ TIMEOUTS (Interceptor global) ============
  app.useGlobalInterceptors(new TimeoutInterceptor());

  // ============ PROXY & SECURITY ============
  app.getHttpAdapter().getInstance().set('trust proxy', 1);


  // ============ CORS - Whitelist propre ============
 const cleanFrontendUrl = configService.frontendUrl?.replace(/\/$/, '');

const allowedOrigins = [
  cleanFrontendUrl,
  'http://localhost:3001',
].filter(Boolean);

  if (configService.isProduction) {
    // Production: uniquement les domaines explicites
    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS not allowed'));
        }
      },
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      credentials: true,
      maxAge: 3600,
    });
  } else {
    // Development: plus permissif
    app.enableCors({
      origin: allowedOrigins,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      credentials: true,
    });
  }

  // ============ COOKIES ============
  app.use(cookieParser());

  // ============ GRACEFUL SHUTDOWN ============
  app.enableShutdownHooks();

  // ============ DÉMARRAGE ============
  const port = configService.port;
  await app.listen(port, '0.0.0.0', () => {
    logger.log(`🚀 Server running on port ${port}`);
    logger.log(`📍 Environment: ${configService.env.NODE_ENV}`);
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});