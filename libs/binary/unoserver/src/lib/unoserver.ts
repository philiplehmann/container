import { spawn } from 'node:child_process';
import type { WriteStream } from 'node:tty';
import { join } from 'node:path';
import { cwd } from 'node:process';

const UNOSERVER_STARTED = 'INFO:unoserver:Server PID';

export const unoserver = () => {
  return new Promise<void>((resolve, reject) => {
    const unoserver = spawn('unoserver', ['--user-installation', join(cwd(), 'tmp')]);
    let data = '';
    let found = false;

    const addData = (stream: WriteStream) => (chunk: Buffer) => {
      if (!found) {
        data += chunk.toString();
        if (data.includes(UNOSERVER_STARTED)) {
          data = '';
          found = true;
          resolve();
        }
      }
      stream.write(chunk);
    };

    unoserver.stdout.on('data', addData(process.stdout));
    unoserver.stderr.on('data', addData(process.stderr));

    process.on('SIGINT', () => {
      reject();
      unoserver.kill();
    });
  });
};
