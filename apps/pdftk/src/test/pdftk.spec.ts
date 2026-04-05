import { describe, expect, it } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { currentArch } from '@riwi/docker';
import { wait } from '@riwi/helper';
import { streamLength, streamToBuffer } from '@riwi/stream';
import { useTestContainer } from '@riwi/test/bun';
import { beautifyJson, streamRequest, testRequest } from '@riwi/test/request';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const containerPort = 5000;

const assertSnapshot = (actual: string, relativePath: string): void => {
  const snapshotPath = resolve(__dirname, relativePath);
  const expected = readFileSync(snapshotPath, 'utf8');
  expect(actual).toBe(expected);
};

const expectStatusOk = (statusCode: number | undefined): void => {
  expect(statusCode).toBe(200);
};

const requestSettleDelayMs = 75;

describe('pdftk', () => {
  [currentArch()].forEach((arch) => {
    describe(`arch: ${arch}`, () => {
      const setup = useTestContainer({ image: `philiplehmann/pdftk:test-${arch}`, containerPort, type: 'each' });

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
          expectStatusOk(response.statusCode);
          const size = await streamLength(response);
          await wait(requestSettleDelayMs);

          expect(stats.size > size).toBeTruthy();
        });
      });

      describe.skip('compress parallel', async () => {
        it('pdf file reduces in size', async () => {
          const file = resolve(__dirname, 'assets/uncompressed.pdf');
          const stats = statSync(file);
          const responses = await Promise.all(
            Array.from({ length: 20 }).map(() =>
              streamRequest({
                method: 'POST',
                host: 'localhost',
                port: setup.port,
                path: '/compress',
                headers: { 'Content-Type': 'application/pdf' },
                file,
              }),
            ),
          );
          for (const response of responses) {
            expectStatusOk(response.statusCode);
            const size1 = await streamLength(response);
            expect(stats.size > size1).toBeTruthy();
          }
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
          expectStatusOk(response.statusCode);
          const size = await streamLength(response);
          await wait(requestSettleDelayMs);

          expect(stats.size < size).toBeTruthy();
        });
      });

      describe('encrypt', () => {
        it('pdf file is encrypted', async () => {
          const file = resolve(__dirname, 'assets/form.pdf');
          const encryptResponse = await streamRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/encrypt?password=1234',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });
          expectStatusOk(encryptResponse.statusCode);

          const encryptedPdf = await streamToBuffer(encryptResponse);
          await wait(requestSettleDelayMs);
          const [decryptResponse, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/decrypt?password=1234',
            headers: { 'Content-Type': 'application/pdf' },
            body: encryptedPdf,
          });
          expectStatusOk(decryptResponse.statusCode);
          await wait(requestSettleDelayMs);

          expect(text.includes('/Encrypt')).toBeFalsy();
        });

        it('pdf file is encrypted and has password', async () => {
          const file = resolve(__dirname, 'assets/form.pdf');
          const encryptResponse = await streamRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/encrypt?password=1234&userPassword=5678',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });
          expectStatusOk(encryptResponse.statusCode);

          const encryptedPdf = await streamToBuffer(encryptResponse);
          await wait(requestSettleDelayMs);
          const [decryptResponse, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/decrypt?password=5678',
            headers: { 'Content-Type': 'application/pdf' },
            body: encryptedPdf,
          });
          expectStatusOk(decryptResponse.statusCode);
          await wait(requestSettleDelayMs);

          expect(text.includes('/Encrypt')).toBeFalsy();
        });

        it('pdf file is encrypted, has password and allow is defined', async () => {
          const file = resolve(__dirname, 'assets/form.pdf');
          const encryptResponse = await streamRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/encrypt?password=1234&userPassword=5678&allow=AllFeatures',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });
          expectStatusOk(encryptResponse.statusCode);

          const encryptedPdf = await streamToBuffer(encryptResponse);
          await wait(requestSettleDelayMs);
          const [decryptResponse, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/decrypt?password=1234',
            headers: { 'Content-Type': 'application/pdf' },
            body: encryptedPdf,
          });
          expectStatusOk(decryptResponse.statusCode);
          await wait(requestSettleDelayMs);

          expect(text.includes('/Encrypt')).toBeFalsy();
        });
      });

      describe('decrypt', () => {
        it('pdf file is decrypted', async () => {
          const file = resolve(__dirname, 'assets/encrypted.pdf');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/decrypt?password=1234',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });
          expectStatusOk(response.statusCode);
          await wait(requestSettleDelayMs);

          expect(text.includes('/Encrypt')).toBeFalsy();
        });
      });

      describe('dataFields', () => {
        it('return pdf data fields', async () => {
          const file = resolve(__dirname, 'assets/form.pdf');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/data/fields',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });
          expectStatusOk(response.statusCode);
          await wait(requestSettleDelayMs);

          assertSnapshot(beautifyJson(text), './snapshots/dataFields.json');
        });
      });

      describe('dataDump', () => {
        it('return pdf data dump', async () => {
          const file = resolve(__dirname, 'assets/form.pdf');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/data/dump',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });
          expectStatusOk(response.statusCode);
          await wait(requestSettleDelayMs);

          assertSnapshot(beautifyJson(text), './snapshots/dataDump.json');
        });
      });

      describe('dataFDF', () => {
        it('return pdf generated fdf', async () => {
          const file = resolve(__dirname, 'assets/form.pdf');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/data/fdf',
            headers: { 'Content-Type': 'application/pdf' },
            file,
          });
          expectStatusOk(response.statusCode);
          await wait(requestSettleDelayMs);

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
          expectStatusOk(response.statusCode);

          const pdf = await streamToBuffer(response);
          await wait(requestSettleDelayMs);

          const [dataFieldsResponse, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/data/fields',
            headers: { 'Content-Type': 'application/pdf' },
            body: pdf,
          });
          expectStatusOk(dataFieldsResponse.statusCode);
          await wait(requestSettleDelayMs);
          assertSnapshot(beautifyJson(text), './snapshots/formFill.json');
        });
      });
    });
  });
});
