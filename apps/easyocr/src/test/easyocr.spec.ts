import { resolve } from 'node:path';
import { testRequest } from '@container/test/request';
import { describe, it, expect } from 'vitest';
import { useTestContainer } from '@container/test/server';
import { currentArch } from '@container/docker';

const containerPort = 5000;

describe('easyocr', () => {
  [currentArch()].map((arch) => {
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
          path: '/swiss-health-card',
          headers: {
            'Content-Type': 'image/jpg',
          },
          file,
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(text)).toEqual({ detectedLanguage: 'de', insuranceCode: '01560', expiryDate: '31/03/2093' });
      });

      it('should ocr and detect from helsana sample', async () => {
        const file = resolve(__dirname, 'assets/helsana.jpg');
        const [response, text] = await testRequest({
          method: 'POST',
          host: 'localhost',
          port: setup.port,
          path: '/swiss-health-card',
          headers: {
            'Content-Type': 'image/jpg',
          },
          file,
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(text)).toEqual({
          detectedLanguage: 'de',
          birthDate: '26/04/1987',
          personalNumber: '756.756.0006.4893.68',
          cardNumber: '80756520220920110917',
          expiryDate: '30/09/2028',
          surname: 'EUROPAISCHE KRANKENVERSICHERUNGSKARTE',
          firstName: 'HUBERLI ROBERT',
        });
      });

      it('should ocr and detect from sanitas sample', async () => {
        const file = resolve(__dirname, 'assets/sanitas.png');
        const [response, text] = await testRequest({
          method: 'POST',
          host: 'localhost',
          port: setup.port,
          path: '/swiss-health-card',
          headers: {
            'Content-Type': 'image/png',
          },
          file,
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(text)).toEqual({
          detectedLanguage: 'de',
          insuranceCode: '01509',
          insuranceName: 'Sanitas',
          surname: 'EUROPAISCHE KRANKENVERSICHERUNGSKARTE',
        });
      });

      it('should ocr and detect from sumiswalder sample', async () => {
        const file = resolve(__dirname, 'assets/sumiswalder.png');
        const [response, text] = await testRequest({
          method: 'POST',
          host: 'localhost',
          port: setup.port,
          path: '/swiss-health-card',
          headers: {
            'Content-Type': 'image/png',
          },
          file,
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(text)).toEqual({
          detectedLanguage: 'de',
          birthDate: '31/12/2021',
          personalNumber: '756.756.6290.1234.56',
          insuranceCode: '0194',
          insuranceName: 'Sumiswalder',
          surname: 'EUROPAISCHE KRANKENVERSICHERUNGSKARTE',
          firstName: 'MAX MUSTER',
        });
      });

      it('should ocr and detect from sympany sample', async () => {
        const file = resolve(__dirname, 'assets/sympany.png');
        const [response, text] = await testRequest({
          method: 'POST',
          host: 'localhost',
          port: setup.port,
          path: '/swiss-health-card',
          headers: {
            'Content-Type': 'image/jpeg',
          },
          file,
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(text)).toEqual({
          detectedLanguage: 'de',
          birthDate: '08/10/1964',
          personalNumber: '756.756.1234.1234.56',
          insuranceCode: '0509',
          insuranceName: 'Vivao',
          cardNumber: '80756005090012312345',
          expiryDate: '31/03/2025',
          surname: 'EUROPAISCHE KRANKENVERSICHERUNGSKARTE',
          firstName: 'MUSTERMANN HANS',
        });
      });

      it('should ocr and detect from visana sample', async () => {
        const file = resolve(__dirname, 'assets/visana.jpg');
        const [response, text] = await testRequest({
          method: 'POST',
          host: 'localhost',
          port: setup.port,
          path: '/swiss-health-card',
          headers: {
            'Content-Type': 'image/jpg',
          },
          file,
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(text)).toEqual({
          detectedLanguage: 'de',
          personalNumber: '756.756.3047.5009.62',
          insuranceCode: '01555',
          cardNumber: '807560156202452130',
          surname: 'MUSTER',
        });
      });
    });
  });
});
