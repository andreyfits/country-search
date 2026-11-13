import type { Country, RawCountryApiResponse } from './types.js';

const EMPTY = '—';

/**
 * Pure mapping from a raw API country object to the UI model.
 * Time complexity: O(L + C + B) where L/C/B are the lengths of the
 * languages / currencies / borders arrays — all bounded small lists,
 * so effectively O(1) per country.
 */
export function mapCountryResponse(raw: RawCountryApiResponse): Country {
  return {
    name: raw.name,
    nativeName: raw.nativeName ?? raw.name,
    flagEmoji: raw.flag ?? '',
    flagUrl: raw.flags?.png ?? raw.flags?.svg ?? null,
    capital: raw.capital ?? EMPTY,
    region: raw.region ?? EMPTY,
    subregion: raw.subregion ?? EMPTY,
    population: raw.population ?? 0,
    area: raw.area ?? null,
    borders: raw.borders ?? [],
    languages: (raw.languages ?? []).map((language) => language.name),
    currencies: (raw.currencies ?? []).map((currency) =>
      currency.code ? `${currency.name} (${currency.code})` : currency.name,
    ),
  };
}
