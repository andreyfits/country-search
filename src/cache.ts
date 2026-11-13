import type { Country } from './types.js';
import type { SearchFn } from './controller.js';

function abortReason(signal: AbortSignal): unknown {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException('The operation was aborted.', 'AbortError');
}

/**
 * Detaches the caller's cancellation from the shared promise:
 * aborting `signal` rejects only the returned promise, never `shared`.
 * This lets multiple callers reuse one in-flight request safely.
 */
function detached(shared: Promise<Country[]>, signal: AbortSignal): Promise<Country[]> {
  if (signal.aborted) {
    return Promise.reject(abortReason(signal));
  }
  return new Promise<Country[]>((resolve, reject) => {
    const onAbort = (): void => reject(abortReason(signal));
    signal.addEventListener('abort', onAbort, { once: true });
    shared.then(
      (countries) => {
        signal.removeEventListener('abort', onAbort);
        resolve(countries);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

/**
 * Wraps a search function with a per-query cache and in-flight deduplication.
 *
 * - A repeated identical query resolves from the fulfilled-results cache
 *   without touching the network.
 * - A repeated identical query while one is still in flight reuses the same
 *   underlying promise instead of spawning a second request.
 * - Each caller gets its own detached view: cancelling one caller's signal
 *   does not abort the shared request for the others (the shared request
 *   runs on its own never-aborted controller, still bounded by the timeout
 *   inside `searchCountries`).
 */
export function createCachedSearch(search: SearchFn): SearchFn {
  const fulfilled = new Map<string, Country[]>();
  const inFlight = new Map<string, Promise<Country[]>>();

  return (query: string, signal: AbortSignal): Promise<Country[]> => {
    const cached = fulfilled.get(query);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }

    let shared = inFlight.get(query);
    if (shared === undefined) {
      const inner = new AbortController();
      shared = search(query, inner.signal)
        .then((countries) => {
          fulfilled.set(query, countries);
          inFlight.delete(query);
          return countries;
        })
        .catch((error: unknown) => {
          inFlight.delete(query);
          throw error;
        });
      inFlight.set(query, shared);
    }

    return detached(shared, signal);
  };
}
