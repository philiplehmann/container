import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { constants, createReadStream, createWriteStream, existsSync } from 'node:fs';
import { access, copyFile, mkdir, readdir, rename, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, resolve } from 'node:path';
import type { Readable, Writable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { type InputType, streamInputToWriteable, streamToBuffer } from '@container/stream';
import type { Schema } from './schema';

async function cleanup(filePath: string, type: 'file' | 'dir'): Promise<void> {
  try {
    if (!existsSync(filePath)) {
      return;
    }
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

const moveFile = async (sourcePath: string, targetPath: string): Promise<void> => {
  const sourceAbsolutePath = resolve(sourcePath);
  const targetAbsolutePath = resolve(targetPath);

  if (sourceAbsolutePath === targetAbsolutePath) {
    return;
  }

  await mkdir(dirname(targetAbsolutePath), { recursive: true });

  try {
    await rename(sourceAbsolutePath, targetAbsolutePath);
  } catch (error) {
    const errorWithCode = error as NodeJS.ErrnoException;
    if (errorWithCode.code !== 'EXDEV') {
      throw error;
    }
    await copyFile(sourceAbsolutePath, targetAbsolutePath);
    await unlink(sourceAbsolutePath);
  }
};

export async function libreoffice(options: { input: Readable; output: Writable } & Schema): Promise<undefined>;
export async function libreoffice(options: { input: string; output: string } & Schema): Promise<undefined>;
export async function libreoffice(options: { input: Buffer | string } & Schema): Promise<Buffer>;
export async function libreoffice({
  input,
  output,
  convertTo,
  outputFilter,
  filterOptions,
}: {
  input: InputType;
  output?: Writable | string;
} & Schema): Promise<undefined | Buffer> {
  if (filterOptions && !outputFilter) {
    throw new Error('filterOptions requires outputFilter');
  }
  const filesystemMode = typeof input === 'string' && typeof output === 'string';
  const outputAbsolutePath = typeof output === 'string' ? resolve(output) : undefined;
  const inFile = filesystemMode ? input : `${tmpdir()}/${randomUUID()}`;
  const outDir =
    filesystemMode && outputAbsolutePath
      ? resolve(dirname(outputAbsolutePath), `.libreoffice-${randomUUID()}`)
      : `${tmpdir()}/${randomUUID()}`;
  const userInstallationDir = `${tmpdir()}/${randomUUID()}`;

  try {
    if (filesystemMode) {
      await access(inFile, constants.R_OK);
    } else {
      await streamInputToWriteable(input, createWriteStream(inFile), { end: true });
    }
    await mkdir(outDir, { recursive: true });

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
      `-env:UserInstallation=file://${userInstallationDir}`,
      '--convert-to',
      `${convertTo}${outputFilter ? `:${outputFilter}${filterOptions ? `:${Array.isArray(filterOptions) ? filterOptions.join(',') : filterOptions}` : ''}` : ''}`,
      '--outdir',
      outDir,
      inFile,
    ]);

    await new Promise<void>((resolve, reject) => {
      unoconvert.stdout.on('data', (data) => {
        console.info(`libreoffice.stdout: ${data}`);
      });
      let stderr = '';
      unoconvert.stderr.on('data', (data) => {
        console.error(`libreoffice.stderr: ${data}`);
        stderr += data.toString();
      });
      unoconvert.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`LibreOffice conversion failed with exit code ${code}`));
        } else if (!existsSync(outDir)) {
          reject(new Error(`LibreOffice conversion failed, output directory not found: ${outDir}`));
        } else {
          resolve();
        }
      });
      unoconvert.on('error', (error) => {
        reject(new Error(`LibreOffice process error: ${error.message}: ${stderr}`));
      });
    });

    const expectedConvertedFile = `${basename(inFile, extname(inFile))}.${convertTo}`;
    const files = await readdir(outDir);
    const convertedFile =
      files.find((file) => file === expectedConvertedFile) ?? files.find((file) => file.endsWith(`.${convertTo}`));
    if (!convertedFile) {
      throw new Error(`Converted file not found in ${outDir}`);
    }
    const convertedFilePath = `${outDir}/${convertedFile}`;
    if (outputAbsolutePath) {
      await moveFile(convertedFilePath, outputAbsolutePath);
      return;
    }
    if (output) {
      await finished(createReadStream(convertedFilePath).pipe(output));
      return;
    }
    const buffer = await streamToBuffer(createReadStream(convertedFilePath));

    return buffer;
  } finally {
    if (!filesystemMode) {
      await cleanup(inFile, 'file');
    }
    await cleanup(outDir, 'dir');
    await cleanup(userInstallationDir, 'dir');
  }
}
