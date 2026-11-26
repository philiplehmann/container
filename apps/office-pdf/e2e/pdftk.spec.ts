// Port of apps/pdftk/src/test/pdftk.spec.ts to the versioned API, against the same snapshots
// (copied to tests/snapshots). Two answers differ on purpose, see `pdftkSnapshot`.
import { describe, expect, it } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { currentArch } from '@riwi/docker';
import { streamLength, streamToBuffer } from '@riwi/stream';
import { createProcessEndpointTests, useTestContainer } from '@riwi/test/bun';
import { streamRequest, testRequest } from '@riwi/test/request';
import { asset, assets, containerPort, image } from './helpers';

type Field = Record<string, unknown> & { name: string };

const snapshot = <T>(name: string): T => JSON.parse(readFileSync(resolve(assets, '../snapshots', name), 'utf8')) as T;

/**
 * The pdftk image's snapshot, where this server answers differently: `Button7` keeps its
 * field's tooltip (pdftk drops it when a field has several widgets), and `Group6=true` selects
 * the radio group's choice (the pdftk image maps `true` to the state `Off` for this group).
 */
const pdftkSnapshot = (name: string, group6?: string): Field[] =>
  snapshot<Field[]>(name).map((field) => {
    if (field.name === 'Button7') {
      return { ...field, title: 'Click here to save this document' };
    }
    if (field.name === 'Group6' && group6) {
      return { ...field, value: group6 };
    }
    return field;
  });

describe('office-pdf', () => {
  [currentArch()].forEach((arch) => {
    describe(`arch: ${arch} - pdftk`, () => {
      const setup = useTestContainer({
        image: image(arch),
        containerPort,
        hook: (container) => container.withStartupTimeout(30_000),
      });

      const post = (path: string, file: string) =>
        testRequest({
          method: 'POST',
          host: 'localhost',
          port: setup.port,
          path,
          headers: { 'Content-Type': 'application/pdf' },
          file: asset(file),
        });

      describe('compress', () => {
        it('pdf file reduces in size', async () => {
          const file = asset('uncompressed.pdf');
          const response = await streamRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/v1/compress',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });
          expect(statSync(file).size).toBeGreaterThan(await streamLength(response));
        });
      });

      describe('uncompress', () => {
        it('pdf file increases in size', async () => {
          const file = asset('compressed.pdf');
          const response = await streamRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/v1/uncompress',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });
          expect(statSync(file).size).toBeLessThan(await streamLength(response));
        });
      });

      describe('encrypt', () => {
        for (const query of [
          'password=1234',
          'password=1234&userPassword=5678',
          'password=1234&userPassword=5678&allow=AllFeatures',
        ]) {
          it(`pdf file is encrypted (${query})`, async () => {
            const [, text] = await post(`/v1/encrypt?${query}`, 'form.pdf');
            expect(text).toInclude('/Encrypt');
          });
        }
      });

      describe('decrypt', () => {
        it('pdf file is decrypted', async () => {
          const [, text] = await post('/v1/decrypt?password=1234', 'encrypted.pdf');
          expect(text).not.toInclude('/Encrypt');
        });
      });

      describe('dataFields', () => {
        it('return pdf data fields', async () => {
          const [, text] = await post('/v1/data/fields', 'form.pdf');
          expect(JSON.parse(text)).toEqual(pdftkSnapshot('dataFields.json'));
        });
      });

      describe('dataDump', () => {
        it('return pdf data dump', async () => {
          const [, text] = await post('/v1/data/dump', 'form.pdf');
          expect(JSON.parse(text)).toEqual(snapshot('dataDump.json'));
        });
      });

      describe('dataFDF', () => {
        it('return pdf generated fdf', async () => {
          const [response, text] = await post('/v1/data/fdf', 'form.pdf');
          expect(response.statusCode).toBe(200);
          expect(text.startsWith('%FDF-1.2')).toBeTruthy();
          for (const field of snapshot<Field[]>('dataFields.json')) {
            expect(text).toInclude(`/T (${field.name})`);
          }
        });
      });

      describe('formFill', () => {
        it('fill form and check values afterwards', async () => {
          const searchParams = new URLSearchParams({
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
          });
          searchParams.append('flag', 'need_appearances');
          const response = await streamRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: `/v1/form/fill?${searchParams.toString()}`,
            headers: { 'Content-Type': 'application/pdf' },
            file: asset('form.pdf'),
          });
          expect(response.statusCode).toBe(200);
          const pdf = await streamToBuffer(response);

          const [, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/v1/data/fields',
            headers: { 'Content-Type': 'application/pdf' },
            body: pdf,
          });
          expect(JSON.parse(text)).toEqual(pdftkSnapshot('formFill.json', 'Choice1'));
        });
      });

      describe('process management', () => {
        createProcessEndpointTests(
          () => setup.port,
          async (port) => {
            await streamRequest({
              method: 'POST',
              host: 'localhost',
              port,
              path: '/v1/compress',
              headers: { 'Content-Type': 'application/pdf' },
              file: asset('compressed.pdf'),
            });
          },
          { basePath: '/v1' },
        );
      });
    });
  });
});
