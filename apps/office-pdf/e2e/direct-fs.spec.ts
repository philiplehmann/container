// Port of apps/unoserver/src/test/unoserver-direct-fs.spec.ts to the versioned API.
// `/v1/direct-fs` is always available (unoserver needs UNOSERVER_FS_ENABLE=true).
import { afterAll, describe, expect, it } from 'bun:test';
import { execSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { currentArch } from '@riwi/docker';
import { useTestContainer } from '@riwi/test/bun';
import { testRequest } from '@riwi/test/request';
import { assets, containerPort, image } from './helpers';

interface DirectFsResponse {
  status: string;
  inputPath: string;
  outputPath: string;
  outputBytes: number;
  durationMs: number;
}

describe('office-pdf', () => {
  [currentArch()].forEach((arch) => {
    describe(`arch: ${arch}`, () => {
      describe('/v1/direct-fs', () => {
        let outputRoot = '';

        afterAll(async () => {
          if (outputRoot) {
            await rm(outputRoot, { recursive: true, force: true }).catch(console.error);
          }
        });

        const setup = useTestContainer({
          image: image(arch),
          containerPort,
          hook: async (container) => {
            outputRoot = await mkdtemp(resolve(tmpdir(), 'office-pdf-out-'));
            execSync(`chmod 777 "${outputRoot}"`);
            return container.withStartupTimeout(30_000).withBindMounts([
              { source: assets, target: '/data/in' },
              { source: outputRoot, target: '/data/out' },
            ]);
          },
          timeout: 60_000,
        });

        const directFs = (body: Record<string, unknown>) =>
          testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/v1/direct-fs',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          });

        it('should convert file from FS input root to FS output root', async () => {
          const [response, text] = await directFs({
            inputPath: 'VorlageBusinessplan.doc',
            outputPath: 'converted/VorlageBusinessplan.pdf',
            convertTo: 'pdf',
          });

          expect(response.statusCode).toBe(200);
          const json = JSON.parse(text) as DirectFsResponse;
          expect(json.status).toBe('complete');
          expect(json.outputPath).toBe('converted/VorlageBusinessplan.pdf');
          expect(json.outputBytes).toBeGreaterThan(0);
        });

        it('should reject path traversal', async () => {
          const [response] = await directFs({
            inputPath: '../outside.doc',
            outputPath: 'converted/out.pdf',
            convertTo: 'pdf',
          });

          expect(response.statusCode).toBe(400);
        });

        it('should reject absolute input path', async () => {
          const [response] = await directFs({
            inputPath: '/etc/passwd',
            outputPath: 'converted/out.pdf',
            convertTo: 'pdf',
          });

          expect(response.statusCode).toBe(400);
        });

        it('should reject missing input file', async () => {
          const [response, text] = await directFs({
            inputPath: 'does-not-exist.doc',
            outputPath: 'converted/out.pdf',
            convertTo: 'pdf',
          });

          expect(response.statusCode).toBe(400);
          const json = JSON.parse(text) as { status: string; message: string };
          expect(json.status).toBe('error');
          expect(json.message).toContain('Input file not found or not readable');
        });
      });
    });
  });
});
