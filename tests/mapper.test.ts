import { describe, it, expect } from 'vitest';
import { mapCountryResponse } from '../src/mapper.js';
import type { RawCountryApiResponse } from '../src/types.js';

const RAW_SPAIN: RawCountryApiResponse = {
  name: 'Spain',
  nativeName: 'España',
  flag: '🇪🇸',
  flags: { png: 'https://flagcdn.com/w320/es.png', svg: 'https://flagcdn.com/es.svg' },
  capital: 'Madrid',
  region: 'Europe',
  subregion: 'Southern Europe',
  population: 47351567,
  area: 505992,
  borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
  languages: [{ name: 'Spanish', iso639_1: 'es', nativeName: 'Español' }],
  currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
};

describe('mapCountryResponse', () => {
  it('maps a full API object to the card model', () => {
    const country = mapCountryResponse(RAW_SPAIN);

    expect(country).toEqual({
      name: 'Spain',
      nativeName: 'España',
      flagEmoji: '🇪🇸',
      flagUrl: 'https://flagcdn.com/w320/es.png',
      capital: 'Madrid',
      region: 'Europe',
      subregion: 'Southern Europe',
      population: 47351567,
      area: 505992,
      borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
      languages: ['Spanish'],
      currencies: ['Euro (EUR)'],
    });
  });

  it('extracts language names from the objects array', () => {
    const country = mapCountryResponse({
      ...RAW_SPAIN,
      languages: [{ name: 'Spanish' }, { name: 'Catalan' }, { name: 'Basque' }],
    });
    expect(country.languages).toEqual(['Spanish', 'Catalan', 'Basque']);
  });

  it('falls back to placeholders for missing optional fields', () => {
    const country = mapCountryResponse({ name: 'Nowhere' });

    expect(country.capital).toBe('—');
    expect(country.region).toBe('—');
    expect(country.population).toBe(0);
    expect(country.area).toBeNull();
    expect(country.flagUrl).toBeNull();
    expect(country.borders).toEqual([]);
    expect(country.languages).toEqual([]);
    expect(country.currencies).toEqual([]);
  });

  it('falls back to svg flag when png is absent', () => {
    const country = mapCountryResponse({
      ...RAW_SPAIN,
      flags: { svg: 'https://flagcdn.com/es.svg' },
    });
    expect(country.flagUrl).toBe('https://flagcdn.com/es.svg');
  });

  it('is pure: does not mutate the input', () => {
    const raw: RawCountryApiResponse = structuredClone(RAW_SPAIN);
    mapCountryResponse(raw);
    expect(raw).toEqual(RAW_SPAIN);
  });
});
