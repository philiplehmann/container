import { spawn } from 'node:child_process';

export interface PdftkOptions {
  binary?: string;
}

export function pdftk(args: string[], { binary = 'pdftk' }: PdftkOptions = {}) {
  return spawn(binary, args);
}
