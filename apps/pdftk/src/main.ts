import { createServer } from 'node:http';

import { connect, post, healthEndpoints } from '@container/http/route';
import { middlewareQuery } from '@container/http/validate';
import {
  decryptSchema,
  encryptSchema,
  decryptStream,
  encryptStream,
  compressStream,
  uncompressStream,
  dataDumpStream,
  dataFdfStream,
  dataFieldsStream,
  formFillStream,
  formFillSchema,
} from '@container/binary/pdftk';

const PORT = process.env.PORT || '3000';

const server = createServer(
  connect(
    post({ path: '/compress' }, async ({ req, res }) => {
      await compressStream({ input: req, output: res });
    }),
    post({ path: '/uncompress' }, async ({ req, res }) => {
      await uncompressStream({ input: req, output: res });
    }),
    post(
      { path: '/encrypt' },
      middlewareQuery(encryptSchema),
      async ({ req, res, query: { password, userPassword, allow } }) => {
        await encryptStream({ input: req, output: res, password, userPassword, allow });
      },
    ),
    post({ path: '/decrypt' }, middlewareQuery(decryptSchema), async ({ req, res, query: { password } }) => {
      await decryptStream({ input: req, output: res, password });
    }),
    post({ path: '/data/fields' }, async ({ req, res }) => {
      await dataFieldsStream({ input: req, output: res });
    }),
    post({ path: '/data/dump' }, async ({ req, res }) => {
      await dataDumpStream({ input: req, output: res });
    }),
    // post({ path: '/data/annots' }, async ({ req, res }) => {
    //   const pdftkSpawn = spawn('java', ['-jar', '/pdftk/pdftk.jar', '-', 'dump_data_annots', '-']);
    //   streamChildProcess(req, res, pdftkSpawn);
    // }),
    // post({ path: '/stamp' }, async ({ req, res }) => {
    //   const pdftkSpawn = spawn('java', ['-jar', '/pdftk/pdftk.jar', '-', 'dump_data_annots', '-']);
    //   streamChildProcess(req, res, pdftkSpawn);
    // }),
    // post({ path: '/background' }, async ({ req, res }) => {
    //   const pdftkSpawn = spawn('java', ['-jar', '/pdftk/pdftk.jar', '-', 'background', '-']);
    //   streamChildProcess(req, res, pdftkSpawn);
    // }),
    post(
      { path: '/form/fill' },
      middlewareQuery(formFillSchema),
      async ({ req, res, query: { flag, fontName, ...data } }) => {
        await formFillStream({ input: req, output: res, flag, fontName, data });
      },
    ),
    post({ path: '/data/fdf' }, async ({ req, res }) => {
      await dataFdfStream({ input: req, output: res });
    }),
    ...healthEndpoints,
  ),
).listen(PORT, () => {
  console.log('start poppler server on ', PORT);
});

process.on('SIGINT', () => {
  server.close();
});
