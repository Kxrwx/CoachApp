let postHogInstance: any | null = null;

export function initPostHog(apiKey: string | undefined, isDevelopment: boolean): any | null {
  if (!apiKey || isDevelopment) {
    console.log('[PostHog] Disabled in development or no API key provided');
    return null;
  }

  // PostHog initialization (client-side use case)
  // Pour le backend, on utiliserait le capture method directement
  postHogInstance = {
    apiKey,
    host: 'https://us.i.posthog.com',
  };

  console.log('[PostHog] Initialized');
  return postHogInstance;
}

export function getPostHog(): any | null {
  return postHogInstance;
}

export function trackEvent(distinctId: string, event: string, properties?: Record<string, any>) {
  if (!postHogInstance) return;

  // Log event tracking for now (can be extended later)
  console.log(`[PostHog] Event tracked: ${event} for user ${distinctId}`, properties);
}
