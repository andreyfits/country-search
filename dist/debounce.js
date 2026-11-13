/**
 * Returns a debounced version of `fn`: the call is postponed by `delay` ms
 * and the timer is reset on every subsequent call within the delay window.
 */
export function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
        if (timer !== null) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            timer = null;
            fn(...args);
        }, delay);
    };
}
//# sourceMappingURL=debounce.js.map