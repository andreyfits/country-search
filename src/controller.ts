import { debounce } from './debounce.js';
import { classifyError } from './errors.js';
import type { Country } from './types.js';

export const DEFAULT_DEBOUNCE_MS = 300;

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; countries: Country[] }
  | { status: 'empty' }
  | { status: 'error'; message: string };

export type SearchFn = (query: string, signal: AbortSignal) => Promise<Country[]>;

export interface SearchControllerOptions {
  search: SearchFn;
  debounceMs?: number;
  onStateChange?: (state: SearchState) => void;
  onSearchStart?: (query: string) => void;
}

const ERROR_MESSAGES: Record<'timeout' | 'http' | 'network', string> = {
  timeout: 'Сервер долго не отвечает. Проверьте соединение и попробуйте ещё раз.',
  http: 'Сервис временно недоступен. Попробуйте повторить запрос.',
  network: 'Не удалось выполнить запрос. Проверьте подключение к сети.',
};

/**
 * DOM-free search orchestration: debounces input, aborts the in-flight
 * request on every input change and classifies failures.
 *
 * Cancellation is real (`AbortController.abort()`), not a "ignore the late
 * response" flag — a superseded request is killed at the moment the input
 * changes, before the debounced next request even fires.
 */
export class SearchController {
  private readonly search: SearchFn;
  private readonly onStateChange: (state: SearchState) => void;
  private readonly onSearchStart: (query: string) => void;
  private readonly debouncedPerform: () => void;

  private inFlight: AbortController | null = null;
  private lastQuery = '';
  private state: SearchState = { status: 'idle' };

  constructor(options: SearchControllerOptions) {
    this.search = options.search;
    this.onStateChange = options.onStateChange ?? ((): void => undefined);
    this.onSearchStart = options.onSearchStart ?? ((): void => undefined);
    this.debouncedPerform = debounce(
      (): void => void this.performSearch(),
      options.debounceMs ?? DEFAULT_DEBOUNCE_MS,
    );
  }

  getState(): SearchState {
    return this.state;
  }

  /** Called on every input change. */
  setQuery(rawQuery: string): void {
    this.abortInFlight();
    this.lastQuery = rawQuery.trim();

    if (this.lastQuery.length === 0) {
      this.setState({ status: 'idle' });
      return;
    }
    this.setState({ status: 'loading' });
    this.debouncedPerform();
  }

  /** Retries exactly the last entered query, bypassing the debounce. */
  retry(): void {
    if (this.lastQuery.length === 0) {
      return;
    }
    this.abortInFlight();
    this.setState({ status: 'loading' });
    void this.performSearch();
  }

  private abortInFlight(): void {
    this.inFlight?.abort();
    this.inFlight = null;
  }

  private setState(state: SearchState): void {
    this.state = state;
    this.onStateChange(state);
  }

  private async performSearch(): Promise<void> {
    const query = this.lastQuery;
    if (query.length === 0) {
      return;
    }

    const controller = new AbortController();
    this.inFlight = controller;
    this.onSearchStart(query);

    try {
      const countries = await this.search(query, controller.signal);
      if (this.inFlight !== controller) {
        return;
      }
      this.setState(
        countries.length === 0 ? { status: 'empty' } : { status: 'success', countries },
      );
    } catch (error) {
      const classified = classifyError(error);
      // Our own cancellation is not an error — stay silent.
      if (classified.kind === 'aborted' || this.inFlight !== controller) {
        return;
      }
      this.setState({ status: 'error', message: ERROR_MESSAGES[classified.kind] });
    } finally {
      if (this.inFlight === controller) {
        this.inFlight = null;
      }
    }
  }
}
