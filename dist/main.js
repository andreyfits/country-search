import { searchCountries } from './api.js';
import { createCachedSearch } from './cache.js';
import { SearchController } from './controller.js';
import { loadHistory, pushHistory } from './history.js';
import { mountUi } from './ui.js';
const root = document.body;
const ui = mountUi(root, {
    onInput: (value) => controller.setQuery(value),
    onRetry: () => controller.retry(),
    onSelectCountry: (country) => ui.showDetail(country),
    onCloseDetail: () => ui.hideDetail(),
    onHistoryPick: (query) => {
        ui.input.value = query;
        controller.setQuery(query);
    },
});
const cachedSearch = createCachedSearch(searchCountries);
const controller = new SearchController({
    search: cachedSearch,
    onStateChange: (state) => ui.renderState(state),
    onSearchStart: (query) => ui.renderHistory(pushHistory(query)),
});
ui.renderHistory(loadHistory());
ui.input.focus();
//# sourceMappingURL=main.js.map