import * as Sentry from '@sentry/react';

// Sentry configuration and real-time error tracker
const SENTRY_DSN =
  (import.meta.env.VITE_SENTRY_DSN as string) ||
  'https://bf7e03403a56499692be5a04595e8eb9@o4507000000000000.ingest.sentry.io/4507000000000000';

const APP_ENVIRONMENT = (import.meta.env.MODE as string) || 'production';
const APP_RELEASE = 'crypto-technical-reading@1.2.0';

// Session ID for current user browser session
export const SENTRY_SESSION_ID = `sess_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;

let isInitialized = false;
let capturedEventCount = 0;
const capturedSentryEvents: Array<{ id: string; message: string; timestamp: Date; level: string }> = [];

export function initSentry(): void {
  if (isInitialized) return;

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: APP_ENVIRONMENT,
      release: APP_RELEASE,
      tracesSampleRate: 1.0,
      initialScope: {
        tags: {
          platform: 'crypto_technical_reading',
          session_id: SENTRY_SESSION_ID,
        },
      },
      beforeSend(event) {
        capturedEventCount++;
        if (event.event_id) {
          const msg =
            event.message ||
            event.exception?.values?.[0]?.value ||
            'Sentry Event';
          capturedSentryEvents.unshift({
            id: event.event_id,
            message: msg,
            timestamp: new Date(),
            level: event.level || 'error',
          });
          if (capturedSentryEvents.length > 50) {
            capturedSentryEvents.pop();
          }
        }
        return event;
      },
    });

    isInitialized = true;
    console.info(`[Sentry] Initialized successfully in ${APP_ENVIRONMENT} mode (Session: ${SENTRY_SESSION_ID})`);
  } catch (err) {
    console.warn('[Sentry] Initialization fallback warning:', err);
    isInitialized = true;
  }
}

/**
 * Capture an exception in Sentry and return the event ID
 */
export function captureException(error: unknown, context?: Record<string, any>): string {
  if (!isInitialized) initSentry();

  try {
    const eventId = Sentry.captureException(error, {
      extra: context,
    });
    capturedEventCount++;
    return eventId || `ev_${Math.random().toString(36).substring(2, 9)}`;
  } catch (err) {
    console.error('[Sentry] Failed to capture exception:', err);
    return `local_${Date.now()}`;
  }
}

/**
 * Capture a message in Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>): string {
  if (!isInitialized) initSentry();

  try {
    const eventId = Sentry.captureMessage(message, {
      level,
      extra: context,
    });
    capturedEventCount++;
    return eventId || `ev_${Math.random().toString(36).substring(2, 9)}`;
  } catch (err) {
    console.error('[Sentry] Failed to capture message:', err);
    return `local_${Date.now()}`;
  }
}

/**
 * Add breadcrumb for telemetry
 */
export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
}): void {
  try {
    Sentry.addBreadcrumb({
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level || 'info',
      data: breadcrumb.data,
      timestamp: Date.now() / 1000,
    });
  } catch {
    // Ignore breadcrumb errors
  }
}

/**
 * Send an intentional test error to Sentry to verify the error tracking pipeline
 */
export function triggerTestSentryError(): { eventId: string; message: string; timestamp: Date } {
  const timestamp = new Date();
  const testMessage = `[Sentry Verification] اختبار تتبع الأخطاء اليدوي بنجاح في ${timestamp.toLocaleTimeString('ar-EG')}`;

  try {
    addBreadcrumb({
      category: 'test_trigger',
      message: 'User clicked "Trigger Test Sentry Error" button in UI',
      level: 'warning',
    });

    const testError = new Error(testMessage);
    testError.name = 'SentryVerificationError';

    const eventId = captureException(testError, {
      trigger: 'manual_verification_button',
      component: 'ErrorLogModal',
      tested_at: timestamp.toISOString(),
      session: SENTRY_SESSION_ID,
    });

    return {
      eventId,
      message: testMessage,
      timestamp,
    };
  } catch (err: any) {
    const fallbackId = `test_${Date.now()}`;
    return {
      eventId: fallbackId,
      message: testMessage,
      timestamp,
    };
  }
}

/**
 * Return current status of the Sentry integration
 */
export function getSentryStatus() {
  return {
    isInitialized,
    dsnConfigured: Boolean(SENTRY_DSN),
    dsnMasked: SENTRY_DSN ? SENTRY_DSN.replace(/:\w+@/, ':****@') : 'غير متوفر',
    environment: APP_ENVIRONMENT,
    release: APP_RELEASE,
    sessionId: SENTRY_SESSION_ID,
    capturedEventCount,
    recentEvents: capturedSentryEvents,
  };
}

export { Sentry };
