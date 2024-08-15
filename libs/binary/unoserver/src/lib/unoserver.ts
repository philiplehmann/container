import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { cwd } from 'node:process';

export function unoserver() {
  const unoserver = spawn('unoserver', ['--user-installation', join(cwd(), 'tmp')], { stdio: 'inherit' });

  process.on('SIGINT', () => {
    unoserver.kill();
  });
}
