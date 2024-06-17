import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  './apps/poppler/vite.config.ts',
  './apps/maildev/vite.config.ts',
  './apps/mailhog/vite.config.ts',
  './apps/pdftk/vite.config.ts',
  './apps/tesseract/vite.config.ts',
  './apps/puppeteer/vite.config.ts',
  './apps/unoserver/vite.config.ts',
  './apps/mailcatcher/vite.config.ts',
  './libs/binary/pdftk/vite.config.ts',
  './libs/biomejs/vite.config.ts',
  './libs/docker/vite.config.ts',
  './libs/helper/vite.config.ts',
  './libs/http/body/vite.config.ts',
  './libs/http/error/vite.config.ts',
  './libs/http/multipart-form-data/vite.config.ts',
  './libs/http/route/vite.config.ts',
  './libs/http/validate/vite.config.ts',
  './libs/stream/vite.config.ts',
  './libs/test/request/vite.config.ts',
  './libs/test/server/vite.config.ts',
]);
