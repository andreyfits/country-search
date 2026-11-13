import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchCountries } from '../src/api.js';
import { HttpError } from '../src/errors.js';
import type { RawCountryApiResponse } from '../src/types.js';

const RAW_SPAIN: RawCountryApiResponse = {
  name: 'Spain',
  flag: '🇪🇸',
  flags: { png: 'https://flagcdn.com/w320/es.png' },
  capital: 'Madrid',
  region: 'Europe',
  population: 47351567,
  languages: [{ name: 'Spanish' }],
  currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const signal = (): AbortSignal => new AbortController().signal;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('searchCountries', () => {
  it('requests the name endpoint and returns mapped countries', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, [RAW_SPAIN]));
    vi.stubGlobal('fetch', fetchMock);

    const result = await searchCountries('spain', signal());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://countries.dev/name/spain');
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Spain');
    expect(result[0]?.capital).toBe('Madrid');
  });

  it('passes an abortable signal to fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);

    await searchCountries('spain', signal());

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns an empty array on HTTP 404 (no matches is not an error)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(404, { message: 'Not Found' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(searchCountries('zzzz', signal())).resolves.toEqual([]);
  });

  it('throws HttpError with status on other non-OK responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(500, {}));
    vi.stubGlobal('fetch', fetchMock);

    const error = await searchCountries('spain', signal()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(500);
  });

  it('throws HttpError on 400/403 too — only 404 is "empty result"', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(400, {}));
    vi.stubGlobal('fetch', fetchMock);

    await expect(searchCountries('sp', signal())).rejects.toBeInstanceOf(HttpError);
  });

  it('propagates AbortError when the caller aborts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(
                init.signal?.reason instanceof Error
                  ? init.signal.reason
                  : new DOMException('The operation was aborted.', 'AbortError'),
              ),
            );
          }),
      ),
    );

    const controller = new AbortController();
    const promise = searchCountries('spain', controller.signal);
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects with TimeoutError when the request exceeds the timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
          }),
      ),
    );

    await expect(searchCountries('spain', signal(), 30)).rejects.toMatchObject({
      name: 'TimeoutError',
    });
  });

  it('does not fetch for empty or whitespace-only query', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(searchCountries('   ', signal())).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
