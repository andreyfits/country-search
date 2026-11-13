import { describe, it, expect, vi } from 'vitest';
import { createCachedSearch } from '../src/cache.js';
import type { Country } from '../src/types.js';

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

const signal = (): AbortSignal => new AbortController().signal;

describe('createCachedSearch', () => {
  it('serves a repeated identical query from cache without a second call', async () => {
    const inner = vi.fn().mockResolvedValue([COUNTRY]);
    const search = createCachedSearch(inner);

    await search('spain', signal());
    await search('spain', signal());

    expect(inner).toHaveBeenCalledTimes(1);
  });

  it('deduplicates identical in-flight queries into one request', async () => {
    let resolveInner: ((v: Country[]) => void) | undefined;
    const inner = vi.fn(() => new Promise<Country[]>((r) => (resolveInner = r)));
    const search = createCachedSearch(inner);

    const p1 = search('spain', signal());
    const p2 = search('spain', signal());
    expect(inner).toHaveBeenCalledTimes(1);

    resolveInner?.([COUNTRY]);
    await expect(p1).resolves.toEqual([COUNTRY]);
    await expect(p2).resolves.toEqual([COUNTRY]);
  });

  it('aborting one caller does not break the shared in-flight promise for others', async () => {
    let resolveInner: ((v: Country[]) => void) | undefined;
    const inner = vi.fn(() => new Promise<Country[]>((r) => (resolveInner = r)));
    const search = createCachedSearch(inner);

    const c1 = new AbortController();
    const p1 = search('spain', c1.signal);
    const p2 = search('spain', signal());

    c1.abort();
    await expect(p1).rejects.toMatchObject({ name: 'AbortError' });

    resolveInner?.([COUNTRY]);
    await expect(p2).resolves.toEqual([COUNTRY]);
  });

  it('does not cache failures — the same query can be retried', async () => {
    const inner = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce([COUNTRY]);
    const search = createCachedSearch(inner);

    await expect(search('spain', signal())).rejects.toThrow('network down');
    await expect(search('spain', signal())).resolves.toEqual([COUNTRY]);
    expect(inner).toHaveBeenCalledTimes(2);
  });
});
