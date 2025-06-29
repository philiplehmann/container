import { resolve } from 'node:path';
import { currentArch } from '@container/docker';
import { testRequest } from '@container/test/request';
import { useTestContainer } from '@container/test/server';
import { describe, expect, it } from 'vitest';

const containerPort = 5000;

const expectText =
  "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.";

describe('tesseract', () => {
  [currentArch()].map((arch) => {
    describe(`arch: ${arch}`, async () => {
      const setup = await useTestContainer({ image: `philiplehmann/tesseract:test-${arch}`, containerPort });

      for (const type of ['gif', 'jpg', 'png', 'tiff', 'webp']) {
        it(`should convert ${type} to text`, async () => {
          const file = resolve(__dirname, `assets/dummy_image.${type}`);
          const [response, text] = await testRequest({
            method: 'POST',
            host: 'localhost',
            port: setup.port,
            path: '/image-to-text',
            headers: { 'Content-Type': `image/${type}` },
            file,
          });

          expect(response.statusCode).toBe(200);
          expect(text.split('\n').join(' ').replace('|psum', 'Ipsum').replace('lpsum', 'Ipsum').trim()).toBe(
            expectText,
          );
        });
      }
    });
  });
});
