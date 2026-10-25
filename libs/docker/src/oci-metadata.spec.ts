import { describe, expect, it } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ociLabels } from './oci-metadata';

const now = new Date('2026-10-25T08:00:00.000Z');

const rootWithLicense = (license?: string) => {
  const root = mkdtempSync(join(tmpdir(), 'oci-metadata-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify(license ? { license } : {}));
  return root;
};

describe('ociLabels', () => {
  it('builds labels from github env, version and package.json license', () => {
    const labels = ociLabels({
      title: 'pdftk',
      version: '3.3.3',
      root: rootWithLicense('MIT'),
      env: {
        GITHUB_SERVER_URL: 'https://github.com',
        GITHUB_REPOSITORY: 'philiplehmann/container',
        GITHUB_SHA: 'abc123',
      },
      now,
    });

    expect(labels).toEqual({
      'org.opencontainers.image.title': 'pdftk',
      'org.opencontainers.image.version': '3.3.3',
      'org.opencontainers.image.created': '2026-10-25T08:00:00.000Z',
      'org.opencontainers.image.source': 'https://github.com/philiplehmann/container',
      'org.opencontainers.image.url': 'https://github.com/philiplehmann/container',
      'org.opencontainers.image.revision': 'abc123',
      'org.opencontainers.image.licenses': 'MIT',
    });
  });

  it('omits labels without a value outside of github actions', () => {
    const labels = ociLabels({ root: rootWithLicense(), env: {}, now });

    expect(labels).toEqual({ 'org.opencontainers.image.created': '2026-10-25T08:00:00.000Z' });
  });

  it('lets custom labels override the defaults', () => {
    const labels = ociLabels({
      title: 'pdftk',
      root: rootWithLicense('MIT'),
      labels: { 'org.opencontainers.image.title': 'pdftk server', 'com.example.team': 'docs' },
      env: {},
      now,
    });

    expect(labels['org.opencontainers.image.title']).toBe('pdftk server');
    expect(labels['com.example.team']).toBe('docs');
    expect(labels['org.opencontainers.image.licenses']).toBe('MIT');
  });

  it('works without a package.json', () => {
    const root = mkdtempSync(join(tmpdir(), 'oci-metadata-'));

    expect(ociLabels({ root, env: {}, now })['org.opencontainers.image.licenses']).toBeUndefined();
  });
});
