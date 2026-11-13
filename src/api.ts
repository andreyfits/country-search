import { HttpError } from './errors.js';
import { mapCountryResponse } from './mapper.js';
import type { Country, RawCountryApiResponse } from './types.js';

export const API_BASE_URL = 'https://countries.dev';
export const REQUEST_TIMEOUT_MS = 8_000;

/** HTTP 404 from countries.dev means "no matches" — an empty result, not an error. */
const NOT_FOUND_STATUS = 404;

/**
 * Merges several abort signals into one.
 * Uses the native `AbortSignal.any` where available, with a manual fallback.
 */
function combineSignals(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(signals);
  }
  const controller = new AbortController();
  const onAbort = (event: Event): void => {
    controller.abort((event.target as AbortSignal).reason);
  };
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
}

/**
 * Searches countries by name.
 *
 * - Empty/whitespace query resolves to `[]` without hitting the network.
 * - HTTP 404 resolves to `[]` (no matches is not an error).
 * - Any other non-OK status rejects with `HttpError`.
 * - The caller's `signal` is composed with an internal `AbortSignal.timeout`,
 *   so a hung request rejects with a `TimeoutError` DOMException while an
 *   explicit `abort()` rejects with `AbortError` — the two stay distinguishable.
 */
export async function searchCountries(
  query: string,
  signal: AbortSignal,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Country[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const combinedSignal = combineSignals([signal, AbortSignal.timeout(timeoutMs)]);
  const response = await fetch(`${API_BASE_URL}/name/${encodeURIComponent(trimmed)}`, {
    signal: combinedSignal,
  });

  if (response.status === NOT_FOUND_STATUS) {
    return [];
  }
  if (!response.ok) {
    throw new HttpError(response.status);
  }

  const raw = (await response.json()) as RawCountryApiResponse[];
  return raw.map(mapCountryResponse);
}
