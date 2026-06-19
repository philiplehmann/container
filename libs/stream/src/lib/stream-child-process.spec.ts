import { describe, expect, it } from 'bun:test';
import { isEpipeError } from './stream-child-process';

describe('streamChildProcess', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });

  it('detects epipe error', () => {
    const error = { code: 'EPIPE' } as NodeJS.ErrnoException;
    expect(isEpipeError(error)).toBe(true);
  });

  it('does not treat other errors as epipe', () => {
    const error = { code: 'ECONNRESET' } as NodeJS.ErrnoException;
    expect(isEpipeError(error)).toBe(false);
  });
});
