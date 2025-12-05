import { strict as assert } from 'node:assert';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { currentArch } from '@container/docker';
import { streamLength, streamToBuffer } from '@container/stream';
import { beautifyJson, streamRequest, testRequest } from '@container/test/request';
import { useTestContainer } from '@container/test/server';

const containerPort = 5000;

const assertSnapshot = (actual: string, relativePath: string): void => {
  const snapshotPath = resolve(__dirname, relativePath);
  const expected = readFileSync(snapshotPath, 'utf8');
  assert.strictEqual(actual, expected);
};

describe('pdftk', { timeout: 10_000 }, () => {
  [currentArch()].forEach((arch) => {
    describe(`arch: ${arch}`, async () => {
      const setup = await useTestContainer({ image: `philiplehmann/pdftk:test-${arch}`, containerPort });

      describe('compress', async () => {
        it('pdf file reduces in size', async () => {
          const file = resolve(__dirname, 'assets/uncompressed.pdf');
          const stats = statSync(file);
          const response = await streamRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/compress',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });
          const size = await streamLength(response);

          assert.ok(stats.size > size);
        });
      });

      describe('uncompress', () => {
        it('pdf file increases in size', async () => {
          const file = resolve(__dirname, 'assets/compressed.pdf');
          const stats = statSync(file);
          const response = await streamRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/uncompress',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });
          const size = await streamLength(response);

          assert.ok(stats.size < size);
        });
      });

      describe('encrypt', () => {
        it('pdf file is encrypted', async () => {
          const file = resolve(__dirname, 'assets/form.pdf');
          const [, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/encrypt?password=1234',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });

          assert.ok(text.includes('/Encrypt'));
        });

        it('pdf file is encrypted and has password', async () => {
          const file = resolve(__dirname, 'assets/form.pdf');
          const [, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/encrypt?password=1234&userPassword=5678',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });

          assert.ok(text.includes('/Encrypt'));
        });

        it('pdf file is encrypted, has password and allow is defined', async () => {
          const file = resolve(__dirname, 'assets/form.pdf');
          const [, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/encrypt?password=1234&userPassword=5678&allow=AllFeatures',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });

          assert.ok(text.includes('/Encrypt'));
        });
      });

      describe('decrypt', () => {
        it('pdf file is decrypted', async () => {
          const file = resolve(__dirname, 'assets/encrypted.pdf');
          const [, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/decrypt?password=1234',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });

          assert.ok(!text.includes('/Encrypt'));
        });
      });

      describe('dataFields', () => {
        it('return pdf data fields', async () => {
          const file = resolve(__dirname, 'assets/form.pdf');
          const [, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/data/fields',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });

          assertSnapshot(beautifyJson(text), './snapshots/dataFields.json');
        });
      });

      describe('dataDump', () => {
        it('return pdf data dump', async () => {
          const file = resolve(__dirname, 'assets/form.pdf');
          const [, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/data/dump',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });

          assertSnapshot(beautifyJson(text), './snapshots/dataDump.json');
        });
      });

      describe('dataFDF', () => {
        it('return pdf generated fdf', async () => {
          const file = resolve(__dirname, 'assets/form.pdf');
          const [, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/data/fdf',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });

          assertSnapshot(text, './snapshots/dataFdf.fdf');
        });
      });

      describe('formFill', () => {
        it('fill form and check values afterwards', async () => {
          const file = resolve(__dirname, 'assets/form.pdf');
          const data = {
            Group6: 'true',
            'Check Box1': 'false',
            'Check Box2': 'true',
            'Check Box3': 'false',
            'Check Box4': 'true',
            Dropdown1: '20',
            Dropdown2: 'Jun',
            Dropdown3: '2018',
            Address: '123 Main St',
            Name: 'John Doe',
          };
          const searchParams = new URLSearchParams(data);
          searchParams.append('flag', 'need_appearances');
          const response = await streamRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: `/form/fill?${searchParams.toString()}`,
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });
          assert.strictEqual(response.statusCode, 200);

          const pdf = await streamToBuffer(response);

          const [, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/data/fields',
            headers: { 'Content-Type': 'application/pdf' },
            body: pdf,
          });
          assertSnapshot(beautifyJson(text), './snapshots/formFill.json');
        });
      });
    });
  });
});
