import { describe, expect, it } from 'bun:test';
import { s3Backends } from './s3-test-setup';

describe('s3Backends', () => {
  it('includes MinIO in the default backend matrix', () => {
    expect(s3Backends).toContainEqual({ id: 'minio', name: 'MinIO' });
  });
});
