import { searchCountries } from './api.js';
import { SearchController } from './controller.js';
import { mountUi } from './ui.js';
import type { Country } from './types.js';

const ui = mountUi(document.body, {
  onInput: (value) => controller.setQuery(value),
  onRetry: () => controller.retry(),
  onSelectCountry: (country: Country) => ui.showDetail(country),
  onCloseDetail: () => ui.hideDetail(),
  onHistoryPick: (query) => {
    ui.input.value = query;
    controller.setQuery(query);
  },
});

const controller = new SearchController({
  search: searchCountries,
  onStateChange: (state) => ui.renderState(state),
});

ui.input.focus();
