const STORAGE_KEY = 'country-search:history';
const MAX_ENTRIES = 10;
function storageAvailable() {
    try {
        return typeof localStorage !== 'undefined';
    }
    catch {
        return false;
    }
}
export function loadHistory() {
    if (!storageAvailable()) {
        return [];
    }
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw === null ? [] : JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((e) => typeof e === 'string') : [];
    }
    catch {
        return [];
    }
}
/** Prepends `query` (deduplicated), trims to MAX_ENTRIES and persists. */
export function pushHistory(query) {
    const trimmed = query.trim();
    const next = [trimmed, ...loadHistory().filter((entry) => entry !== trimmed)].slice(0, MAX_ENTRIES);
    if (storageAvailable()) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        catch {
            // Quota/serialization issues must not break search.
        }
    }
    return next;
}
//# sourceMappingURL=history.js.map