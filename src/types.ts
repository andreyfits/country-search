/** Raw shape of one country object as returned by the countries.dev API. */
export interface RawLanguage {
  name: string;
  iso639_1?: string;
  iso639_2?: string;
  nativeName?: string;
}

export interface RawCurrency {
  code?: string;
  name: string;
  symbol?: string;
}

export interface RawCountryApiResponse {
  name: string;
  nativeName?: string;
  flag?: string;
  flags?: {
    png?: string;
    svg?: string;
  };
  capital?: string;
  region?: string;
  subregion?: string;
  population?: number;
  area?: number;
  borders?: string[];
  languages?: RawLanguage[];
  currencies?: RawCurrency[];
  alpha3Code?: string;
}

/** Normalized country model consumed by the UI. */
export interface Country {
  name: string;
  nativeName: string;
  flagEmoji: string;
  flagUrl: string | null;
  capital: string;
  region: string;
  subregion: string;
  population: number;
  area: number | null;
  borders: string[];
  languages: string[];
  currencies: string[];
}
