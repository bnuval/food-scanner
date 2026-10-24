import { fmt, useStrings } from '@/i18n';
import { common } from '@/i18n/common';
import { isApiError } from '@/lib/api';

/** Maps any thrown error to a short, localized, user-safe message (never server text). */
export function useErrorMessage() {
  const t = useStrings(common);
  return (error: unknown): string => {
    if (!isApiError(error)) return t.errorServer;
    switch (error.kind) {
      case 'network':
        return t.errorOffline;
      case 'timeout':
        return t.errorTimeout;
      case 'cancelled':
        return t.errorCancelled;
      case 'rate_limited':
        if (error.retryAfter === 1) return t.errorRateLimitedOne;
        return error.retryAfter ? fmt(t.errorRateLimited, { seconds: error.retryAfter }) : t.errorRateLimitedShort;
      case 'too_large':
        return t.errorTooLarge;
      case 'upgrade_required':
        return t.errorUpgrade;
      case 'invalid_response':
        return t.errorInvalid;
      case 'not_configured':
        return t.errorConfig;
      case 'bad_request':
      case 'server':
        return t.errorServer;
    }
  };
}

/**
 * Whether a manual "Try again" can possibly succeed. An outdated app, a missing server
 * configuration or an oversized upload fail the same way every time.
 */
export function isRetryable(error: unknown): boolean {
  if (!isApiError(error)) return true;
  return error.kind !== 'upgrade_required' && error.kind !== 'not_configured' && error.kind !== 'too_large';
}
