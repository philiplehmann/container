import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, unlink } from 'node:fs';
import { cwd } from 'node:process';
import type { Readable, Writable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { z } from 'zod/v4';
import { type DataFieldType, dataFields } from './data-fields';
import { type PdftkOptions, pdftk } from './pdftk';

const fdfHeader = `%FDF-1.2
%����
1 0 obj
<< /FDF << /Version /1.3 /Encoding /utf_8 /Fields [`;

const fdfFooter = `] >> >> endobj
trailer
<< /Root 1 0 R >>
%%EOF`;

const generateFDF = (fields: DataFieldType[], data: Record<string, string>) => {
  return [
    fdfHeader,
    ...Object.entries(data).map(([name, value]) => {
      const field = fields.find((field) => field.name === name);
      if (!field) {
        return null;
      }
      if (field.type === 'button') {
        const checked = value === 'true' ? (field.options?.[1] ?? 'Yes') : (field.options?.[0] ?? 'Off');
        return `<< /T (${name}) /V /${checked} >>`;
      }
      return `<< /T (${name}) /V (${value}) >>`;
    }),
    fdfFooter,
  ].join('\n');
};

export const formFillSchema = z.record(z.string(), z.string()).and(
  z.object({
    flag: z.enum(['flatten', 'need_appearances', 'replacement_font']).optional(),
    fontName: z.string().optional(),
  }),
);

export async function formFillStream(
  {
    input,
    output,
    data,
    flag = 'need_appearances',
    fontName,
  }: {
    input: Readable;
    output: Writable;
    data: Record<string, string>;
    flag?: 'flatten' | 'need_appearances' | 'replacement_font';
    fontName?: string;
  },
  options?: PdftkOptions,
): Promise<void> {
  const tmpDir = `${cwd()}/tmp`;
  const inputFile = `${tmpDir}/${randomUUID()}.pdf`;
  try {
    input.pipe(createWriteStream(inputFile));
    await finished(input);

    const fields = await dataFields({ input: createReadStream(inputFile) });

    const args = [];
    if (flag === 'replacement_font' && fontName) {
      args.push('replacement_font', fontName);
    } else if (['flatten', 'need_appearances'].includes(flag)) {
      args.push(flag);
    }

    const child = pdftk([inputFile, 'fill_form', '-', 'output', '-', ...args], options);

    child.stdin.on('error', (error) => {
      console.error('child.stdin error:', error);
    });

    child.stdin.write(generateFDF(fields, data));
    child.stdin.end();

    child.stdout
      .on('error', (error) => {
        console.error('child.stdout error:', error);
      })
      .pipe(output, { end: true });

    const stderrChunks: Buffer[] = [];
    child.stderr.on('data', (chunk) => {
      stderrChunks.push(Buffer.from(chunk));
    });

    child.stderr.on('error', (error) => {
      console.error('child.stderr error:', error);
    });

    // Set up exit listener before awaiting to avoid race condition
    const exitPromise = new Promise<number | null>((resolve) => {
      child.on('exit', (code) => {
        resolve(code);
      });
    });

    await finished(child.stdout);

    // Wait for the process to exit and check the exit code
    const exitCode = await exitPromise;

    if (exitCode !== 0) {
      const stderrOutput = Buffer.concat(stderrChunks).toString('utf-8');
      throw new Error(`pdftk exited with code ${exitCode}${stderrOutput ? `: ${stderrOutput}` : ''}`);
    }
  } finally {
    if (existsSync(inputFile))
      unlink(inputFile, (error) => {
        if (error) {
          console.error('unlink error:', error);
        }
      });
  }
}
