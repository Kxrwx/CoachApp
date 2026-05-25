import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initSentry(dsn: string | undefined, environment: string, isDevelopment: boolean) {
  if (!dsn || isDevelopment) {
    console.log('[Sentry] Disabled in development or no DSN provided');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    integrations: [
      nodeProfilingIntegration(),
      Sentry.httpIntegration(),
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
    ],
  });

  console.log(`[Sentry] Initialized for ${environment} environment`);
}

export { Sentry };
