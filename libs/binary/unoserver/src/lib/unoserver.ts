import { spawn } from 'node:child_process';

export function unoserver() {
  const unoserver = spawn('unoserver', { stdio: 'inherit' });

  process.on('SIGINT', () => {
    unoserver.kill();
  });
}
