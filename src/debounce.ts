/**
 * Returns a debounced version of `fn`: the call is postponed by `delay` ms
 * and the timer is reset on every subsequent call within the delay window.
 */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  delay: number,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: A): void => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delay);
  };
}
