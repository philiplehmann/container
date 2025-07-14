import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, unlink } from 'node:fs/promises';
import type { Readable, Writable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { type InputType, streamInputToWriteable, streamToBuffer } from '@container/stream';
import type { ConvertTo } from './convert-to';

async function cleanup(dir: string) {
  try {
    const files = await readdir(dir);
    await Promise.all(
      files.map(async (file) => {
        const filePath = `${dir}/${file}`;
        await unlink(filePath);
      }),
    );
    await unlink(dir);
  } catch (error) {
    console.error(`Error cleaning up directory ${dir}:`, error);
  }
}

export async function libreoffice(options: { input: Readable; output: Writable; to: ConvertTo }): Promise<void>;
export async function libreoffice(options: { input: Buffer | string; to: ConvertTo }): Promise<Buffer>;
export async function libreoffice({
  input,
  output,
  to,
}: {
  input: InputType;
  output?: Writable;
  to: ConvertTo;
}): Promise<void | Buffer> {
  const outdir = `/tmp/${randomUUID()}`;
  const unoconvert = spawn(process.env.LIBREOFFICE_EXECUTABLE_PATH ?? 'libreoffice', [
    '--headless',
    '--invisible',
    '--nocrashreport',
    '--nodefault',
    '--nologo',
    '--nofirststartwizard',
    '--norestore',
    `-env:UserInstallation=file:///tmp/${randomUUID()}`,
    `--convert-to=${to}`,
    `--outdir=${outdir}`,
    '-',
  ]);
  await streamInputToWriteable(input, unoconvert.stdin, { end: true });

  const files = await readdir(outdir);
  const convertedFile = files.find((file) => file.endsWith(`.${to}`));
  if (!convertedFile) {
    throw new Error(`Converted file not found in ${outdir}`);
  }
  const convertedFilePath = `${outdir}/${convertedFile}`;
  if (output) {
    await finished(createReadStream(convertedFilePath).pipe(output));
    return cleanup(outdir);
  }
  const buffer = await streamToBuffer(createReadStream(convertedFilePath));
  await cleanup(outdir);
  return buffer;
}
