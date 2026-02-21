import {
  compressStream,
  dataDumpStream,
  dataFdfStream,
  dataFieldsStream,
  decryptSchema,
  decryptStream,
  encryptSchema,
  encryptStream,
  formFillSchema,
  formFillStream,
  uncompressStream,
} from '@container/binary/pdftk';
import { connect, healthEndpoints, post } from '@container/http/route';
import { httpServer } from '@container/http/server';
import { middlewareQuery } from '@container/http/validate';

const PORT = process.env.PORT || '3000';

httpServer(
  connect(
    post({ path: '/compress' }, async ({ req, res }) => {
      try {
        await compressStream({ input: req, output: res });
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : 'pdftk failed');
      }
    }),
    post({ path: '/uncompress' }, async ({ req, res }) => {
      try {
        await uncompressStream({ input: req, output: res });
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : 'pdftk failed');
      }
    }),
    post(
      { path: '/encrypt' },
      middlewareQuery(encryptSchema),
      async ({ req, res, query: { password, userPassword, allow } }) => {
        try {
          await encryptStream({ input: req, output: res, password, userPassword, allow });
        } catch (error) {
          res.statusCode = 500;
          res.end(error instanceof Error ? error.message : 'pdftk failed');
        }
      },
    ),
    post({ path: '/decrypt' }, middlewareQuery(decryptSchema), async ({ req, res, query: { password } }) => {
      try {
        await decryptStream({ input: req, output: res, password });
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : 'pdftk failed');
      }
    }),
    post({ path: '/data/fields' }, async ({ req, res }) => {
      try {
        await dataFieldsStream({ input: req, output: res });
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : 'pdftk failed');
      }
    }),
    post({ path: '/data/dump' }, async ({ req, res }) => {
      try {
        await dataDumpStream({ input: req, output: res });
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : 'pdftk failed');
      }
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
        try {
          await formFillStream({ input: req, output: res, flag, fontName, data });
        } catch (error) {
          res.statusCode = 500;
          res.end(error instanceof Error ? error.message : 'pdftk failed');
        }
      },
    ),
    post({ path: '/data/fdf' }, async ({ req, res }) => {
      try {
        await dataFdfStream({ input: req, output: res });
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : 'pdftk failed');
      }
    }),
    ...healthEndpoints,
  ),
  { port: PORT, name: 'pdftk' },
);
