import { describe, it, expect, vi, afterEach } from 'vitest';
import { SearchController, type SearchState } from '../src/controller.js';
import { HttpError } from '../src/errors.js';
import type { Country } from '../src/types.js';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const COUNTRY: Country = {
  name: 'Spain',
  nativeName: 'España',
  flagEmoji: '🇪🇸',
  flagUrl: null,
  capital: 'Madrid',
  region: 'Europe',
  subregion: 'Southern Europe',
  population: 47_351_567,
  area: 505_992,
  borders: ['FRA'],
  languages: ['Spanish'],
  currencies: ['Euro (EUR)'],
};

function makeController(search: (q: string, s: AbortSignal) => Promise<Country[]>): {
  controller: SearchController;
  states: SearchState[];
} {
  const states: SearchState[] = [];
  const controller = new SearchController({
    search,
    debounceMs: 1,
    onStateChange: (state) => states.push(state),
  });
  return { controller, states };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SearchController', () => {
  it('emits success state with results', async () => {
    const { controller, states } = makeController(() => Promise.resolve([COUNTRY]));
    controller.setQuery('spain');
    await tick();
    await tick();

    expect(states.at(-1)).toEqual({ status: 'success', countries: [COUNTRY] });
  });

  it('emits empty state when result list is empty', async () => {
    const { controller, states } = makeController(() => Promise.resolve([]));
    controller.setQuery('zzzz');
    await tick();
    await tick();

    expect(states.at(-1)).toEqual({ status: 'empty' });
  });

  it('does not show AbortError to the user', async () => {
    const { controller, states } = makeController(
      (_q, signal) =>
        new Promise((_res, reject) => {
          signal.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          );
        }),
    );
    controller.setQuery('sp');
    await tick();
    controller.setQuery('spain'); // aborts previous
    await tick();
    await tick();

    expect(states.every((s) => s.status !== 'error')).toBe(true);
  });

  it('shows an error for HttpError', async () => {
    const { controller, states } = makeController(() => Promise.reject(new HttpError(500)));
    controller.setQuery('x');
    await tick();
    await tick();

    expect(states.at(-1)?.status).toBe('error');
  });

  it('shows an error for TimeoutError', async () => {
    const { controller, states } = makeController(() =>
      Promise.reject(new DOMException('timed out', 'TimeoutError')),
    );
    controller.setQuery('x');
    await tick();
    await tick();

    expect(states.at(-1)?.status).toBe('error');
  });

  it('retries the last query after an error', async () => {
    const search = vi
      .fn<(q: string, s: AbortSignal) => Promise<Country[]>>()
      .mockRejectedValueOnce(new HttpError(500))
      .mockResolvedValueOnce([COUNTRY]);
    const { controller, states } = makeController(search);

    controller.setQuery('spain');
    await tick();
    await tick();
    expect(states.at(-1)?.status).toBe('error');

    controller.retry();
    await tick();
    await tick();

    expect(search).toHaveBeenLastCalledWith('spain', expect.any(AbortSignal));
    expect(states.at(-1)).toEqual({ status: 'success', countries: [COUNTRY] });
  });
});
