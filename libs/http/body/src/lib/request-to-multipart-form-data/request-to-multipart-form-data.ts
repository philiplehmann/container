import type { IncomingMessage } from 'node:http';
import { Readable, Transform } from 'node:stream';
import { z } from 'zod/v4';
import { validateRequestHeaders } from '../validate-request-headers';
import { getBoundary } from './get-boundary';

enum State {
  INIT = 'INIT',
  HEADERS = 'HEADERS',
  DATA = 'DATA',
  SEPARATOR = 'SEPARATOR',
}

export const multipartFormData = z.object({
  'content-type': z.string().startsWith('multipart/form-data').and(z.string().includes('boundary=')),
});

const lineFeed = 0x0a;
const carriageFeed = 0x0d;

export async function requestToMultipartFormData(
  req: IncomingMessage,
  partCallback: (header: Headers, stream: Readable) => Promise<void>,
): Promise<void> {
  validateRequestHeaders(req, multipartFormData);

  const boundaryLine = `--${getBoundary(req)}`;
  let lastline = '';
  let bytes: number[] = [];
  let lastBytes: number[] = [];
  let state: State = State.INIT;
  let currentPartHeaders: string[] = [];
  let stream = new Transform();
  let headers: Headers = new Headers();
  const callbackPromises: Promise<void>[] = [];

  for await (const chunk of req) {
    for (let i = 0; i < chunk.length; i++) {
      const oneByte: number = chunk[i];
      const prevByte: number | null = i > 0 ? chunk[i - 1] : null;
      const newLineDetected: boolean = oneByte === lineFeed && prevByte === carriageFeed;
      const newLineChar: boolean = oneByte === lineFeed || oneByte === carriageFeed;

      if (!newLineChar) {
        lastline += String.fromCharCode(oneByte);
      }
      bytes.push(oneByte);

      if (State.INIT === state && newLineDetected) {
        if (boundaryLine === lastline) {
          state = State.HEADERS;
        }
        lastline = '';
        bytes = [];
        lastBytes = [];
      } else if (State.HEADERS === state && newLineDetected) {
        if (lastline.length) {
          currentPartHeaders.push(lastline.toString());
        } else {
          headers = new Headers(currentPartHeaders.map((h) => h.split(': ') as [string, string]));

          state = State.DATA;
          stream.end();
          stream = new Transform({
            transform(chunk, _encoding, callback) {
              this.push(chunk);
              callback();
            },
          });
          callbackPromises.push(partCallback(headers, Readable.from(stream)));
        }
        lastline = '';
        bytes = [];
        lastBytes = [];
      } else if (State.DATA === state) {
        if (boundaryLine === lastline) {
          stream.write(new Uint8Array(lastBytes.slice(0, -2)));
          stream.end();
          currentPartHeaders = [];
          lastline = '';
          bytes = [];
          lastBytes = [];
          state = State.SEPARATOR;
        } else if (bytes.length > boundaryLine.length || newLineDetected) {
          stream.write(new Uint8Array(lastBytes));
          lastline = '';
          lastBytes = bytes;
          bytes = [];
        }
      } else if (State.SEPARATOR === state) {
        if (newLineDetected) {
          state = State.HEADERS;
        }
      }
    }
  }
  await Promise.all(callbackPromises);
}
