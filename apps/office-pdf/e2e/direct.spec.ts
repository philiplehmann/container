// Port of apps/unoserver/src/test/unoserver-direct.spec.ts to the versioned API. unoserver only
// serves `/direct` with UNOSERVER_DIRECT_ONLY=true (and then not `/convert`); here both are
// always available.
import { describe, expect, it } from 'bun:test';
import { currentArch } from '@riwi/docker';
import { useTestContainer } from '@riwi/test/bun';
import { testRequestBuffer } from '@riwi/test/request';
import { asset, containerPort, getPageCount, image } from './helpers';

const jsonOption = (name: string, type: string, value: unknown) =>
  encodeURIComponent(JSON.stringify({ [name]: { type, value } }));

describe('office-pdf', () => {
  [currentArch()].forEach((arch) => {
    describe(`arch: ${arch}`, () => {
      describe('/v1/direct', () => {
        const setup = useTestContainer({
          image: image(arch),
          containerPort,
          hook: (container) => container.withStartupTimeout(30_000),
        });

        const convert = (path: string, file: string) =>
          testRequestBuffer({ method: 'POST', host: 'localhost', port: setup.port, path, file: asset(file) });

        it('should convert doc to pdf per default', async () => {
          const [response, pdf] = await convert('/v1/direct', 'VorlageBusinessplan.doc');

          expect(response.statusCode).toBe(200);
          expect(await getPageCount(pdf)).toBe(7);
        });

        it('should convert doc to pdf with outputFilter', async () => {
          const [response, pdf] = await convert('/v1/direct?outputFilter=writer_pdf_Export', 'VorlageBusinessplan.doc');

          expect(response.statusCode).toBe(200);
          expect(await getPageCount(pdf)).toBe(7);
        });

        it('should convert doc to pdf with outputFilter/filterOptions string(SelectPdfVersion)', async () => {
          const [response, pdf] = await convert(
            `/v1/direct?outputFilter=writer_pdf_Export&filterOptions=${encodeURIComponent('SelectPdfVersion=1')}`,
            'VorlageBusinessplan.doc',
          );

          expect(response.statusCode).toBe(200);
          expect(await getPageCount(pdf)).toBe(7);
        });

        it('should convert doc to pdf with outputFilter/filterOptions string(PageRange)', async () => {
          const [response, pdf] = await convert(
            `/v1/direct?outputFilter=writer_pdf_Export&filterOptions=${encodeURIComponent('PageRange=1-2')}`,
            'VorlageBusinessplan.doc',
          );

          expect(response.statusCode).toBe(200);
          expect(await getPageCount(pdf)).toBe(2);
        });

        it('should convert doc to pdf with outputFilter/filterOptions json(SelectPdfVersion)', async () => {
          const [response, pdf] = await convert(
            `/v1/direct?outputFilter=writer_pdf_Export&filterOptions=${jsonOption('SelectPdfVersion', 'long', 3)}`,
            'VorlageBusinessplan.doc',
          );

          expect(response.statusCode).toBe(200);
          expect(await getPageCount(pdf)).toBe(7);
        });

        it('should convert doc to pdf with outputFilter/filterOptions json(PageRange)', async () => {
          const [response, pdf] = await convert(
            `/v1/direct?outputFilter=writer_pdf_Export&filterOptions=${jsonOption('PageRange', 'string', '1-2')}`,
            'VorlageBusinessplan.doc',
          );

          expect(response.statusCode).toBe(200);
          expect(await getPageCount(pdf)).toBe(2);
        });

        it('should convert pptx to pdf with outputFilter/filterOptions json(PageRange)', async () => {
          const [response, pdf] = await convert(
            `/v1/direct?outputFilter=writer_pdf_Export&filterOptions=${jsonOption('PageRange', 'string', '3-4')}`,
            'dummy.pptx',
          );

          expect(response.statusCode).toBe(200);
          expect(await getPageCount(pdf)).toBe(2);
        });

        it('serves /v1/convert next to /v1/direct', async () => {
          const [response, pdf] = await convert('/v1/convert', 'dummy.docx');

          expect(response.statusCode).toBe(200);
          expect(await getPageCount(pdf)).toBe(1);
        });
      });
    });
  });
});
