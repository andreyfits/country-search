import { debounce } from './debounce.js';
import { classifyError } from './errors.js';
export const DEFAULT_DEBOUNCE_MS = 300;
const ERROR_MESSAGES = {
    timeout: 'Сервер долго не отвечает. Проверьте соединение и попробуйте ещё раз.',
    http: 'Сервис временно недоступен. Попробуйте повторить запрос.',
    network: 'Не удалось выполнить запрос. Проверьте подключение к сети.',
};
/**
 * DOM-free search orchestration: debounces input, aborts the in-flight
 * request on every input change and classifies failures.
 *
 * Cancellation is real (`AbortController.abort()`), not a "ignore the late
 * response" flag — a superseded request is killed at the moment the input
 * changes, before the debounced next request even fires.
 */
export class SearchController {
    search;
    onStateChange;
    onSearchStart;
    debouncedPerform;
    inFlight = null;
    lastQuery = '';
    state = { status: 'idle' };
    constructor(options) {
        this.search = options.search;
        this.onStateChange = options.onStateChange ?? (() => undefined);
        this.onSearchStart = options.onSearchStart ?? (() => undefined);
        this.debouncedPerform = debounce(() => void this.performSearch(), options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
    }
    getState() {
        return this.state;
    }
    /** Called on every input change. */
    setQuery(rawQuery) {
        this.abortInFlight();
        this.lastQuery = rawQuery.trim();
        if (this.lastQuery.length === 0) {
            this.setState({ status: 'idle' });
            return;
        }
        this.setState({ status: 'loading' });
        this.debouncedPerform();
    }
    /** Retries exactly the last entered query, bypassing the debounce. */
    retry() {
        if (this.lastQuery.length === 0) {
            return;
        }
        this.abortInFlight();
        this.setState({ status: 'loading' });
        void this.performSearch();
    }
    abortInFlight() {
        this.inFlight?.abort();
        this.inFlight = null;
    }
    setState(state) {
        this.state = state;
        this.onStateChange(state);
    }
    async performSearch() {
        const query = this.lastQuery;
        if (query.length === 0) {
            return;
        }
        const controller = new AbortController();
        this.inFlight = controller;
        this.onSearchStart(query);
        try {
            const countries = await this.search(query, controller.signal);
            if (this.inFlight !== controller) {
                return;
            }
            this.setState(countries.length === 0 ? { status: 'empty' } : { status: 'success', countries });
        }
        catch (error) {
            const classified = classifyError(error);
            // Our own cancellation is not an error — stay silent.
            if (classified.kind === 'aborted' || this.inFlight !== controller) {
                return;
            }
            this.setState({ status: 'error', message: ERROR_MESSAGES[classified.kind] });
        }
        finally {
            if (this.inFlight === controller) {
                this.inFlight = null;
            }
        }
    }
}
//# sourceMappingURL=controller.js.map