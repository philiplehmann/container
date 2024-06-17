import type { Readable, Writable } from 'node:stream';
import { pdftk, type PdftkOptions } from './pdftk';
import { type StreamChildProcessOptions, streamChildProcessToBuffer } from '@container/stream';
import { stringOrFirst, toObject } from './helpers/to-object';

export interface DataFieldType {
  type: 'text' | 'choice' | 'button';
  name: string;
  title?: string;
  flags: number;
  justification: 'left' | 'right';
  value?: string;
  defaultValue?: string;
  options?: string[];
}

const fieldMapping = Object.freeze({
  FieldType: 'type',
  FieldName: 'name',
  FieldNameAlt: 'title',
  FieldFlags: 'flags',
  FieldJustification: 'justification',
  FieldValue: 'value',
  FieldValueDefault: 'defaultValue',
  FieldStateOption: 'options',
} as const);

const isTypeValue = (value: string): value is DataFieldType['type'] => {
  return ['text', 'choice', 'button'].includes(value);
};

export function parseDataFields(content: string): DataFieldType[] {
  const stringFields = content.split('---\n').filter(Boolean);
  return stringFields.map((fieldContent) => {
    const lines = fieldContent.split('\n');

    const values = toObject(lines);
    return (Object.keys(fieldMapping) as (keyof typeof fieldMapping)[]).reduce((output, key) => {
      if (values[key] === undefined) {
        return output;
      }
      const mapped = fieldMapping[key] as keyof DataFieldType;
      switch (mapped) {
        case 'type':
          {
            const value = (values[key] as string).toLowerCase();
            if (isTypeValue(value)) {
              output.type = value;
            } else {
              console.warn('Invalid type:', value);
            }
          }
          break;
        case 'justification':
          {
            const value = stringOrFirst(values[key]).toLowerCase();
            output.justification = value === 'right' ? 'right' : 'left';
          }
          break;
        case 'flags':
          {
            output.flags = Number(stringOrFirst(values[key]));
          }
          break;
        case 'options':
          {
            output.options = (Array.isArray(values[key]) ? values[key] : [values[key]]) as string[];
          }
          break;
        case 'name':
        case 'title':
        case 'value':
        case 'defaultValue':
          {
            output[mapped] = stringOrFirst(values[key]);
          }
          break;
        default:
          console.warn(`Unknown field: ${mapped}`);
      }
      return output;
    }, {} as DataFieldType);
  });
}

export async function dataFields(
  { input }: { input: Readable },
  { binary }: PdftkOptions = {},
): Promise<DataFieldType[]> {
  const buffer = await streamChildProcessToBuffer(
    input,
    pdftk(['-', 'dump_data_fields_utf8', 'output', '-'], { binary }),
  );
  const content = buffer.toString('utf-8');
  return parseDataFields(content);
}

export async function dataFieldsStream(
  { input, output }: { input: Readable; output: Writable },
  { end = true, binary }: PdftkOptions & StreamChildProcessOptions = {},
): Promise<void> {
  const fields = await dataFields({ input }, { binary });
  output.write(JSON.stringify(fields));
  if (end) {
    output.end();
  }
}
