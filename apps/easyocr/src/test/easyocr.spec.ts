import { describe, expect, it } from 'bun:test';
import { resolve } from 'node:path';
import { currentArch } from '@container/docker';
import { useTestContainer } from '@container/test/bun';
import { testRequest } from '@container/test/request';

const containerPort = 5000;

describe('easyocr', () => {
  [currentArch()]
    .filter((arch) => arch === 'amd64')
    .map((arch) => {
      describe(`arch: ${arch}`, async () => {
        const setup = await useTestContainer({
          image: `philiplehmann/easyocr:test-${arch}`,
          containerPort,
          hook: (container) => {
            return container.withStartupTimeout(60_000);
          },
        });

        it('should ocr and detect from agrisano sample', async () => {
          const file = resolve(__dirname, 'assets/agrisano.jpg');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext',
            headers: {
              'Content-Type': 'image/jpeg',
            },
            file,
          });

          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/agrisano.json');
        });

        it('should ocr and detect from agrisano sample with increased batch_size', async () => {
          const file = resolve(__dirname, 'assets/agrisano.jpg');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext?batch_size=20',
            headers: {
              'Content-Type': 'image/jpeg',
            },
            file,
          });

          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/agrisano_batch_size.json');
        });

        it('should ocr and detect from agrisano sample with increased worker', async () => {
          const file = resolve(__dirname, 'assets/agrisano.jpg');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext?worker=4',
            headers: {
              'Content-Type': 'image/jpeg',
            },
            file,
          });

          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/agrisano_worker.json');
        });

        it('should ocr and detect from helsana sample', async () => {
          const file = resolve(__dirname, 'assets/helsana.jpg');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext',
            headers: {
              'Content-Type': 'image/jpeg',
            },
            file,
          });

          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/helsana.json');
        });

        it('should ocr and detect from helsana sample with increased batch_size ', async () => {
          const file = resolve(__dirname, 'assets/helsana.jpg');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext?batch_size=20',
            headers: {
              'Content-Type': 'image/jpeg',
            },
            file,
          });

          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/helsana_batch_size.json');
        });

        it('should ocr and detect from helsana sample with increased worker', async () => {
          const file = resolve(__dirname, 'assets/helsana.jpg');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext?worker=4',
            headers: {
              'Content-Type': 'image/jpeg',
            },
            file,
          });

          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/helsana_worker.json');
        });

        it('should ocr and detect from sanitas sample', async () => {
          const file = resolve(__dirname, 'assets/sanitas.png');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext',
            headers: {
              'Content-Type': 'image/png',
            },
            file,
          });

          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/sanitas.json');
        });

        it('should ocr and detect from sanitas sample with increased batch_size', async () => {
          const file = resolve(__dirname, 'assets/sanitas.png');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext?batch_size=20',
            headers: {
              'Content-Type': 'image/png',
            },
            file,
          });
          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/sanitas_batch_size.json');
        });

        it('should ocr and detect from sanitas sample with increased worker', async () => {
          const file = resolve(__dirname, 'assets/sanitas.png');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext?worker=4',
            headers: {
              'Content-Type': 'image/png',
            },
            file,
          });
          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/sanitas_worker.json');
        });

        it('should ocr and detect from sumiswalder sample', async () => {
          const file = resolve(__dirname, 'assets/sumiswalder.png');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext',
            headers: {
              'Content-Type': 'image/png',
            },
            file,
          });

          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/sumiswalder.json');
        });

        it('should ocr and detect from sumiswalder sample with increased batch_size', async () => {
          const file = resolve(__dirname, 'assets/sumiswalder.png');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext?batch_size=20',
            headers: {
              'Content-Type': 'image/png',
            },
            file,
          });
          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/sumiswalder_batch_size.json');
        });

        it('should ocr and detect from sumiswalder sample with increased worker', async () => {
          const file = resolve(__dirname, 'assets/sumiswalder.png');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext?worker=4',
            headers: {
              'Content-Type': 'image/png',
            },
            file,
          });
          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/sumiswalder_worker.json');
        });

        it('should ocr and detect from sympany sample', async () => {
          const file = resolve(__dirname, 'assets/sympany.png');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext',
            headers: {
              'Content-Type': 'image/png',
            },
            file,
          });

          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/sympany.json');
        });

        it('should ocr and detect from sympany sample with increased batch_size', async () => {
          const file = resolve(__dirname, 'assets/sympany.png');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext?batch_size=20',
            headers: {
              'Content-Type': 'image/png',
            },
            file,
          });
          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/sympany_batch_size.json');
        });

        it('should ocr and detect from sympany sample with increased worker', async () => {
          const file = resolve(__dirname, 'assets/sympany.png');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext?worker=4',
            headers: {
              'Content-Type': 'image/png',
            },
            file,
          });
          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/sympany_worker.json');
        });

        it('should ocr and detect from visana sample', async () => {
          const file = resolve(__dirname, 'assets/visana.jpg');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext',
            headers: {
              'Content-Type': 'image/jpeg',
            },
            file,
          });

          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/visana.json');
        });

        it('should ocr and detect from visana sample with increased batch_size', async () => {
          const file = resolve(__dirname, 'assets/visana.jpg');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext?batch_size=20',
            headers: {
              'Content-Type': 'image/jpeg',
            },
            file,
          });
          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/visana_batch_size.json');
        });

        it('should ocr and detect from visana sample with increased worker', async () => {
          const file = resolve(__dirname, 'assets/visana.jpg');
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/readtext?worker=4',
            headers: {
              'Content-Type': 'image/jpeg',
            },
            file,
          });
          expect(response.statusCode).toBe(200);
          await expect(JSON.parse(text)).toMatchFileSnapshot('snapshots/visana_worker.json');
        });
      });
    });
});
