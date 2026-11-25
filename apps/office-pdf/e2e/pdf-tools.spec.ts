// pdftk operations the pdftk image doesn't expose: cat, split, merge, rotate, stamp.
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { currentArch } from '@riwi/docker';
import { useTestContainer } from '@riwi/test/bun';
import { testRequestBuffer } from '@riwi/test/request';
import { asset, containerPort, getPageCount, image } from './helpers';

describe('office-pdf', () => {
  [currentArch()].forEach((arch) => {
    describe(`arch: ${arch} - pdf tools`, () => {
      const setup = useTestContainer({
        image: image(arch),
        containerPort,
        hook: (container) => container.withStartupTimeout(30_000),
      });

      const url = (path: string) => `http://localhost:${setup.port}${path}`;
      const sevenPages = async () => {
        const [, pdf] = await testRequestBuffer({
          method: 'POST',
          host: 'localhost',
          port: setup.port,
          path: '/v1/convert',
          file: asset('VorlageBusinessplan.doc'),
        });
        return pdf;
      };
      const post = async (path: string, body: FormData | Uint8Array | Buffer) => {
        const response = await fetch(url(path), { method: 'POST', body });
        return [response, new Uint8Array(await response.arrayBuffer())] as const;
      };

      it('selects and reorders pages', async () => {
        const [response, pdf] = await post('/v1/cat?pages=7,1-2', await sevenPages());
        expect(response.status).toBe(200);
        expect(await getPageCount(pdf)).toBe(3);
      });

      it('splits into a zip of single pages', async () => {
        const [response, zip] = await post('/v1/split', await sevenPages());
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('application/zip');
        expect([...zip.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
      });

      it('merges files in order', async () => {
        const form = new FormData();
        form.append('a', new Blob([readFileSync(asset('dummy.pdf'))], { type: 'application/pdf' }), 'a.pdf');
        form.append('b', new Blob([await sevenPages()], { type: 'application/pdf' }), 'b.pdf');
        const [response, pdf] = await post('/v1/merge', form);
        expect(response.status).toBe(200);
        expect(await getPageCount(pdf)).toBe(8);
      });

      it('rotates pages', async () => {
        const [response, pdf] = await post('/v1/rotate?angle=90', readFileSync(asset('dummy.pdf')));
        expect(response.status).toBe(200);
        const [, dump] = await post('/v1/data/dump', pdf);
        expect(JSON.parse(new TextDecoder().decode(dump)).pages[0].rotation).toBe(90);
      });

      it('stamps every page', async () => {
        const form = new FormData();
        form.append('file', new Blob([await sevenPages()], { type: 'application/pdf' }), 'file.pdf');
        form.append('stamp', new Blob([readFileSync(asset('dummy.pdf'))], { type: 'application/pdf' }), 'stamp.pdf');
        const [response, pdf] = await post('/v1/stamp', form);
        expect(response.status).toBe(200);
        const [, text] = await post('/v1/pdf-to-text?pages=4', pdf);
        expect(new TextDecoder().decode(text)).toInclude('Dummy PDF file');
      });
    });
  });
});
