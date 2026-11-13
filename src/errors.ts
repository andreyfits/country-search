/** HTTP error thrown by `searchCountries` for non-OK, non-404 responses. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Request failed with status ${status}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

export type ClassifiedError =
  | { kind: 'aborted' }
  | { kind: 'timeout' }
  | { kind: 'http'; status: number }
  | { kind: 'network' };

function hasErrorName(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name;
}

/**
 * Classifies a rejected search promise reason:
 * - `aborted`  — cancelled by us (new input / cleared field). Not a user-facing error.
 * - `timeout`  — `AbortSignal.timeout` fired. A real, retriable error.
 * - `http`     — server answered with a non-OK status (`HttpError`).
 * - `network`  — everything else (offline, DNS, CORS, unexpected failures).
 */
export function classifyError(error: unknown): ClassifiedError {
  if (hasErrorName(error, 'AbortError')) {
    return { kind: 'aborted' };
  }
  if (hasErrorName(error, 'TimeoutError')) {
    return { kind: 'timeout' };
  }
  if (error instanceof HttpError) {
    return { kind: 'http', status: error.status };
  }
  return { kind: 'network' };
}
