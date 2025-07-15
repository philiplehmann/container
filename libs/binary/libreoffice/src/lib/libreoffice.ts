import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { constants, createReadStream, createWriteStream } from 'node:fs';
import { access, readdir, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import type { Readable, Writable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { type InputType, streamInputToWriteable, streamToBuffer } from '@container/stream';
import type { ConvertTo } from './convert-to';

async function cleanup(filePath: string, type: 'file' | 'dir'): Promise<void> {
  try {
    if (type === 'file') {
      await unlink(filePath);
      return;
    }
    await rm(filePath, { recursive: true });
  } catch (error) {
    if (error instanceof Error) {
      console.warn(`Failed to cleanup ${type}: ${error.message}`);
    } else {
      console.warn(`Failed to cleanup ${type}: unknown error`, error);
    }
  }
}

export async function libreoffice(options: { input: Readable; output: Writable; to: ConvertTo }): Promise<undefined>;
export async function libreoffice(options: { input: Buffer | string; to: ConvertTo }): Promise<Buffer>;
export async function libreoffice({
  input,
  output,
  to,
}: {
  input: InputType;
  output?: Writable;
  to: ConvertTo;
}): Promise<undefined | Buffer> {
  const inFile = `${tmpdir()}/${randomUUID()}`;
  const outDir = `${tmpdir()}/${randomUUID()}`;

  try {
    await streamInputToWriteable(input, createWriteStream(inFile), { end: true });

    try {
      await access(process.env.LIBREOFFICE_EXECUTABLE_PATH ?? 'libreoffice', constants.X_OK);
    } catch {
      const execPath = process.env.LIBREOFFICE_EXECUTABLE_PATH ?? 'libreoffice';
      throw new Error(`LibreOffice executable not found or not executable: ${execPath}`);
    }

    const unoconvert = spawn(process.env.LIBREOFFICE_EXECUTABLE_PATH ?? 'libreoffice', [
      '--headless',
      '--invisible',
      '--nocrashreport',
      '--nodefault',
      '--nologo',
      '--nofirststartwizard',
      '--norestore',
      `-env:UserInstallation=file://${tmpdir()}/${randomUUID()}`,
      '--convert-to',
      to,
      '--outdir',
      outDir,
      inFile,
    ]);

    await new Promise<void>((resolve, reject) => {
      unoconvert.stdout.on('data', (data) => {
        if (output) {
          console.log(data.toString());
        }
      });
      unoconvert.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`LibreOffice conversion failed with exit code ${code}`));
        } else {
          resolve();
        }
      });
      unoconvert.on('error', (error) => {
        reject(new Error(`LibreOffice process error: ${error.message}`));
      });
    });

    const files = await readdir(outDir);
    const convertedFile = files.find((file) => file.endsWith(`.${to}`));
    if (!convertedFile) {
      throw new Error(`Converted file not found in ${outDir}`);
    }
    const convertedFilePath = `${outDir}/${convertedFile}`;
    if (output) {
      await finished(createReadStream(convertedFilePath).pipe(output));
      return;
    }
    const buffer = await streamToBuffer(createReadStream(convertedFilePath));

    return buffer;
  } finally {
    await cleanup(inFile, 'file');
    await cleanup(outDir, 'dir');
  }
}
