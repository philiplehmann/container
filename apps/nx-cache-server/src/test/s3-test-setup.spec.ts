import { describe, expect, it } from 'bun:test';
import { s3Backends } from './s3-test-setup';

describe('s3Backends', () => {
  it('excludes MinIO from the default backend matrix', () => {
    expect(s3Backends).toEqual([
      { id: 'garage', name: 'Garage' },
      { id: 'rustfs', name: 'RustFS' },
      { id: 'seaweedfs', name: 'SeaweedFS' },
    ]);
  });
});
