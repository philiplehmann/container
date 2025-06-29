import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, unlink } from 'node:fs';
import { cwd } from 'node:process';
import type { Readable, Writable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { z } from 'zod';
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
    child.stdout.pipe(output, { end: true }).on('error', (error) => {
      console.error('child.stdout', error);
    });

    child.stdin.write(generateFDF(fields, data));
    child.stdin.end();

    child.stderr.pipe(process.stderr).on('error', (error) => {
      console.error('child.stderr', error);
    });

    input.on('close', () => {
      child.kill();
    });
    await finished(output);
  } finally {
    if (existsSync(inputFile))
      unlink(inputFile, (error) => {
        if (error) {
          console.error('unlink', error);
        }
      });
  }
}
