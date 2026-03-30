import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExecutorContext } from '@nx/devkit';

const loadVersionFromPackageJson = async () => (await import('./version')).versionFromPackageJson;

const makeContext = (externalNodes: Record<string, { data?: { version?: string } }> = {}, root = '/workspace') =>
  ({ projectGraph: { externalNodes }, root }) as Pick<ExecutorContext, 'projectGraph' | 'root'>;

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

beforeEach(() => {
  mock.restore();
});

describe('versionFromPackageJson', () => {
  it('returns version from exact npm external node', async () => {
    const versionFromPackageJson = await loadVersionFromPackageJson();
    const version = versionFromPackageJson(
      'puppeteer-core',
      makeContext({
        'npm:puppeteer-core': { data: { version: '24.40.0' } },
      }),
    );

    expect(version).toBe('24.40.0');
  });

  it('returns version from versioned npm external node key', async () => {
    const versionFromPackageJson = await loadVersionFromPackageJson();
    const version = versionFromPackageJson(
      'puppeteer-core',
      makeContext({
        'npm:puppeteer-core@24.40.0': { data: { version: '24.40.0' } },
      }),
    );

    expect(version).toBe('24.40.0');
  });

  it('falls back to workspace package.json dependencies', async () => {
    const versionFromPackageJson = await loadVersionFromPackageJson();
    const root = mkdtempSync(join(tmpdir(), 'docker-version-'));
    tempDirs.push(root);

    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ dependencies: { 'puppeteer-core': '^24.40.0' } }),
      'utf8',
    );

    const version = versionFromPackageJson('puppeteer-core', {
      ...makeContext(),
      root,
    });

    expect(version).toBe('^24.40.0');
  });

  it('throws when package version is not found in graph or manifest', async () => {
    const versionFromPackageJson = await loadVersionFromPackageJson();
    const root = mkdtempSync(join(tmpdir(), 'docker-version-'));
    tempDirs.push(root);

    expect(() =>
      versionFromPackageJson('puppeteer-core', {
        ...makeContext(),
        root,
      }),
    ).toThrow('can not find puppeteer-core version');
  });
});
