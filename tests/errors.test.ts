import { describe, it, expect } from 'vitest';
import { classifyError, HttpError } from '../src/errors.js';

describe('HttpError', () => {
  it('is an Error carrying the HTTP status', () => {
    const error = new HttpError(503);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('HttpError');
    expect(error.status).toBe(503);
  });
});

describe('classifyError', () => {
  it('recognises a DOMException AbortError (cancelled by us)', () => {
    const error = new DOMException('The operation was aborted.', 'AbortError');
    expect(classifyError(error)).toEqual({ kind: 'aborted' });
  });

  it('recognises AbortError produced by AbortController.abort()', () => {
    const controller = new AbortController();
    controller.abort();
    expect(classifyError(controller.signal.reason)).toEqual({ kind: 'aborted' });
  });

  it('recognises TimeoutError produced by AbortSignal.timeout', () => {
    const signal = AbortSignal.timeout(0);
    return new Promise<void>((resolve) => {
      signal.addEventListener('abort', () => {
        expect(classifyError(signal.reason)).toEqual({ kind: 'timeout' });
        resolve();
      });
    });
  });

  it('recognises HttpError and exposes its status', () => {
    expect(classifyError(new HttpError(500))).toEqual({ kind: 'http', status: 500 });
    expect(classifyError(new HttpError(429))).toEqual({ kind: 'http', status: 429 });
  });

  it('treats a fetch TypeError as a network error', () => {
    expect(classifyError(new TypeError('Failed to fetch'))).toEqual({ kind: 'network' });
  });

  it('treats unknown values as network errors', () => {
    expect(classifyError('oops')).toEqual({ kind: 'network' });
    expect(classifyError(undefined)).toEqual({ kind: 'network' });
  });

  it('does not confuse AbortError with TimeoutError', () => {
    const abort = new DOMException('x', 'AbortError');
    const timeout = new DOMException('x', 'TimeoutError');
    expect(classifyError(abort).kind).not.toBe(classifyError(timeout).kind);
  });
});
