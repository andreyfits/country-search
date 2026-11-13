function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}
function clear(node) {
    while (node.firstChild !== null) {
        node.removeChild(node.firstChild);
    }
}
function formatPopulation(population) {
    return population.toLocaleString('ru-RU');
}
function formatArea(area) {
    return area === null ? '—' : `${area.toLocaleString('ru-RU')} км²`;
}
function buildCard(country, onSelect) {
    const card = el('button', 'card');
    card.type = 'button';
    const flagWrap = el('span', 'card__flag');
    if (country.flagUrl !== null) {
        const img = el('img', 'card__flag-img');
        img.src = country.flagUrl;
        img.alt = `Флаг: ${country.name}`;
        img.loading = 'lazy';
        flagWrap.append(img);
    }
    else {
        flagWrap.textContent = country.flagEmoji;
    }
    const body = el('span', 'card__body');
    body.append(el('span', 'card__name', country.name));
    body.append(el('span', 'card__meta', `Столица: ${country.capital}`));
    body.append(el('span', 'card__meta', `Регион: ${country.region}`));
    body.append(el('span', 'card__meta', `Население: ${formatPopulation(country.population)}`));
    card.append(flagWrap, body);
    card.addEventListener('click', () => onSelect(country));
    return card;
}
function buildStatusView(state, onRetry) {
    switch (state.status) {
        case 'loading': {
            const box = el('div', 'status status--loading');
            box.setAttribute('role', 'status');
            const spinner = el('span', 'spinner');
            spinner.setAttribute('aria-hidden', 'true');
            box.append(spinner, el('span', '', 'Ищем страны…'));
            return box;
        }
        case 'empty': {
            const box = el('div', 'status status--empty');
            box.append(el('p', 'status__title', 'Ничего не найдено'), el('p', 'status__hint', 'Попробуйте изменить запрос — например, «spain» или «island»'));
            return box;
        }
        case 'error': {
            const box = el('div', 'status status--error');
            box.setAttribute('role', 'alert');
            const retry = el('button', 'status__retry', 'Повторить');
            retry.type = 'button';
            retry.addEventListener('click', onRetry);
            box.append(el('p', 'status__title', 'Что-то пошло не так'), el('p', 'status__hint', state.message), retry);
            return box;
        }
        default:
            return null;
    }
}
function buildDetail(country, onClose) {
    const panel = el('div', 'detail');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    const header = el('div', 'detail__header');
    const title = el('h2', 'detail__title', country.name);
    const close = el('button', 'detail__close', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Закрыть');
    close.addEventListener('click', onClose);
    header.append(title, close);
    const rows = [
        ['Официально', country.nativeName],
        ['Столица', country.capital],
        ['Регион', `${country.region}, ${country.subregion}`],
        ['Население', formatPopulation(country.population)],
        ['Площадь', formatArea(country.area)],
        ['Языки', country.languages.length > 0 ? country.languages.join(', ') : '—'],
        ['Валюта', country.currencies.length > 0 ? country.currencies.join(', ') : '—'],
        [
            'Граничит с',
            country.borders.length > 0 ? country.borders.join(', ') : 'Нет сухопутных границ',
        ],
    ];
    const list = el('dl', 'detail__list');
    for (const [term, value] of rows) {
        list.append(el('dt', 'detail__term', term), el('dd', 'detail__value', value));
    }
    panel.append(header, list);
    return panel;
}
/** Builds the whole app DOM (index.html body is empty by requirement). */
export function mountUi(root, handlers) {
    const container = el('main', 'app');
    const title = el('h1', 'app__title', 'Поиск стран');
    const subtitle = el('p', 'app__subtitle', 'Начните вводить название — результаты появятся по мере набора');
    const searchWrap = el('div', 'app__search');
    const input = el('input', 'app__input');
    input.type = 'search';
    input.placeholder = 'Название страны, например Spain';
    input.setAttribute('aria-label', 'Название страны');
    input.autocomplete = 'off';
    input.spellcheck = false;
    searchWrap.append(input);
    const historyBlock = el('section', 'history');
    const historyTitle = el('h2', 'history__title', 'Недавние запросы');
    const historyList = el('div', 'history__list');
    historyBlock.append(historyTitle, historyList);
    const statusRegion = el('div', 'app__status');
    const resultsList = el('section', 'results');
    resultsList.setAttribute('aria-live', 'polite');
    const detailOverlay = el('div', 'detail-overlay');
    detailOverlay.hidden = true;
    detailOverlay.addEventListener('click', (event) => {
        if (event.target === detailOverlay) {
            handlers.onCloseDetail();
        }
    });
    container.append(title, subtitle, searchWrap, historyBlock, statusRegion, resultsList);
    root.append(container, detailOverlay);
    input.addEventListener('input', () => handlers.onInput(input.value));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            handlers.onCloseDetail();
        }
    });
    const renderState = (state) => {
        clear(statusRegion);
        clear(resultsList);
        const statusView = buildStatusView(state, handlers.onRetry);
        if (statusView !== null) {
            statusRegion.append(statusView);
        }
        if (state.status === 'success') {
            for (const country of state.countries) {
                resultsList.append(buildCard(country, handlers.onSelectCountry));
            }
        }
    };
    const renderHistory = (entries) => {
        clear(historyList);
        historyBlock.hidden = entries.length === 0;
        for (const entry of entries) {
            const chip = el('button', 'history__chip', entry);
            chip.type = 'button';
            chip.addEventListener('click', () => handlers.onHistoryPick(entry));
            historyList.append(chip);
        }
    };
    const showDetail = (country) => {
        clear(detailOverlay);
        detailOverlay.append(buildDetail(country, handlers.onCloseDetail));
        detailOverlay.hidden = false;
    };
    const hideDetail = () => {
        detailOverlay.hidden = true;
        clear(detailOverlay);
    };
    renderHistory([]);
    return {
        input,
        historyList,
        statusRegion,
        resultsList,
        detailOverlay,
        renderState,
        renderHistory,
        showDetail,
        hideDetail,
    };
}
//# sourceMappingURL=ui.js.map