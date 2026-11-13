import { describe, it, expect, vi, afterEach } from 'vitest';
import { SearchController, type SearchState } from '../src/controller.js';
import { searchCountries } from '../src/api.js';

interface PendingRequest {
  url: string;
  signal: AbortSignal | undefined;
  resolve: (response: Response) => void;
}

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('request race', () => {
  it('aborts the stale in-flight request and keeps only the latest response', async () => {
    const pending = new Map<string, PendingRequest>();

    // Mock fetch that honours the abort signal: reject with AbortError
    // when abort() fires before the response is resolved.
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        return new Promise<Response>((resolve, reject) => {
          const key = decodeURIComponent(url.split('/name/')[1] ?? '');
          pending.set(key, { url, signal: init?.signal, resolve });
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      }),
    );

    const states: SearchState[] = [];
    const controller = new SearchController({
      search: searchCountries,
      debounceMs: 1,
      onStateChange: (state) => states.push(state),
    });

    controller.setQuery('sp');
    await tick();
    controller.setQuery('spain');
    await tick();

    const spRequest = pending.get('sp');
    const spainRequest = pending.get('spain');
    expect(spRequest).toBeDefined();
    expect(spainRequest).toBeDefined();

    // The stale request must be REALLY aborted — not just ignored later.
    expect(spRequest?.signal?.aborted).toBe(true);
    expect(spainRequest?.signal?.aborted).toBe(false);

    // Resolve out of order: the OLD query "responds" after the new one.
    spainRequest?.resolve(
      okResponse([{ name: 'Spain', capital: 'Madrid', region: 'Europe', population: 1 }]),
    );
    spRequest?.resolve(
      okResponse([{ name: 'Spratly Islands', capital: '—', region: 'Stale', population: 0 }]),
    );
    await tick();
    await tick();

    const last = states.at(-1);
    expect(last?.status).toBe('success');
    if (last?.status === 'success') {
      expect(last.countries.map((c) => c.name)).toEqual(['Spain']);
    }
    expect(states.some((s) => s.status === 'error')).toBe(false);
  });

  it('does not send any request when input is cleared', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    const states: SearchState[] = [];
    const controller = new SearchController({
      search: searchCountries,
      debounceMs: 1,
      onStateChange: (state) => states.push(state),
    });

    controller.setQuery('   ');
    await tick();
    controller.setQuery('');
    await tick();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(states.at(-1)?.status).toBe('idle');
  });

  it('aborts the in-flight request immediately on input change, before debounce fires', async () => {
    let observedSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        observedSignal = init?.signal;
        return new Promise<Response>(() => undefined); // never resolves
      }),
    );

    const controller = new SearchController({ search: searchCountries, debounceMs: 1 });
    controller.setQuery('sp');
    await tick();
    expect(observedSignal?.aborted).toBe(false);

    // New keystroke — previous request must die NOW, not at next debounce fire.
    controller.setQuery('spa');
    expect(observedSignal?.aborted).toBe(true);
  });
});
