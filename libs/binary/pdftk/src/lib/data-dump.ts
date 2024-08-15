import type { Readable, Writable } from 'node:stream';
import { pdftk, type PdftkOptions } from './pdftk';
import {
  streamToString,
  streamChildProcess,
  type StreamChildProcessOptions,
  streamChildProcessToBuffer,
} from '@container/stream';
import { splitLine } from './helpers/split-line';
import { stringOrFirst, toObject } from './helpers/to-object';
import { Page } from 'puppeteer-core';

export interface DataDumpPage {
  number: number;
  rotation: number;
  rect: [number, number, number, number];
  dimensions: [number, number];
}

export interface DataDumpMeta {
  id0: string;
  id1: string;
  numberOfPages: number;
}

export interface DataDumpInfo {
  keywords: string;
  creator: string;
  autor: string;
  creationDate: Date;
  producer: string;
  title: string;
}

const metaMappingString = Object.freeze({
  PdfID0: 'id0',
  PdfID1: 'id1',
} as const);

const metaMappingNumber = Object.freeze({
  NumberOfPages: 'numberOfPages',
} as const);

const infoMapping = Object.freeze({
  Keywords: 'keywords',
  Creator: 'creator',
  Author: 'author',
  CreationDate: 'creationDate',
  ModDate: 'modDate',
  Producer: 'producer',
  Title: 'title',
} as const);

const dateRegex =
  /D:(?<year>[\d]{4})(?<month>[\d]{2})(?<day>[\d]{2})(?<hour>[\d]{2})(?<minute>[\d]{2})(?<second>[\d]{2})(?<timezone>(\+|-)[\d]{2}'[\d]{2})/;
const parseDate = (date: string | undefined): Date | null => {
  if (!date) {
    return null;
  }

  const match = date.match(dateRegex);
  if (match) {
    const { year, month, day, hour, minute, second, timezone } = match.groups || {};
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${timezone.replace("'", ':')}`);
  }
  console.warn('Invalid date format:', date);
  return null;
};

const isInfoKey = (key: string): key is keyof typeof infoMapping => {
  return Object.keys(infoMapping).includes(key);
};
const isMetaKeyNumber = (key: string): key is keyof typeof metaMappingNumber => {
  return Object.keys(metaMappingNumber).includes(key);
};
const isMetaKeyString = (key: string): key is keyof typeof metaMappingString => {
  return Object.keys(metaMappingString).includes(key);
};

const infoToObject = (lines: string[]): Partial<DataDumpInfo> => {
  let { InfoKey, InfoValue } = toObject(lines);
  InfoKey = stringOrFirst(InfoKey);
  InfoValue = stringOrFirst(InfoValue);
  if (InfoKey === 'CreationDate' || InfoKey === 'ModDate') {
    return {
      [infoMapping[InfoKey]]: parseDate(stringOrFirst(InfoValue)),
    };
  }
  if (!isInfoKey(InfoKey)) {
    console.warn(`Unknown InfoKey: ${InfoKey}`);
    return {};
  }
  return {
    [infoMapping[InfoKey]]: stringOrFirst(InfoValue),
  };
};

const pageToObject = (lines: string[]): DataDumpPage => {
  let { PageMediaNumber, PageMediaRotation, PageMediaRect, PageMediaDimensions } = toObject(lines);
  PageMediaNumber = stringOrFirst(PageMediaNumber);
  PageMediaRotation = stringOrFirst(PageMediaRotation);
  PageMediaRect = stringOrFirst(PageMediaRect);
  PageMediaDimensions = stringOrFirst(PageMediaDimensions);
  return {
    number: Number(PageMediaNumber),
    rotation: Number(PageMediaRotation),
    rect: PageMediaRect.split(' ').map(Number) as [number, number, number, number],
    dimensions: PageMediaDimensions.split(' ').map(Number) as [number, number],
  };
};

export function parseDataDump(content: string): {
  info: Partial<DataDumpInfo>;
  meta: Partial<DataDumpMeta>;
  pages: DataDumpPage[];
} {
  const lines = content.split('\n');
  let info: Partial<DataDumpInfo> = {};
  const meta: Partial<DataDumpMeta> = {};
  const pages: DataDumpPage[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === 'InfoBegin') {
      info = {
        ...info,
        ...infoToObject([lines[i + 1], lines[i + 2]]),
      };
      i += 2;
    } else if (line === 'PageMediaBegin') {
      pages.push(pageToObject([lines[i + 1], lines[i + 2], lines[i + 3], lines[i + 4]]));
      i += 4;
    } else {
      const [key, value] = splitLine(line);
      if (isMetaKeyNumber(key)) {
        meta[metaMappingNumber[key]] = Number(value);
      } else if (isMetaKeyString(key)) {
        meta[metaMappingString[key]] = value;
      } else if (key !== '') {
        console.warn(`Unknown key: ${key}`);
      }
    }
  }
  return { info, meta, pages };
}

export async function dataDump(
  { input }: { input: Readable },
  { binary }: PdftkOptions = {},
): Promise<{
  info: Partial<DataDumpInfo>;
  meta: Partial<DataDumpMeta>;
  pages: DataDumpPage[];
}> {
  const buffer = await streamChildProcessToBuffer(input, pdftk(['-', 'dump_data_utf8', 'output', '-'], { binary }));
  const content = buffer.toString('utf-8');
  return parseDataDump(content);
}

export async function dataDumpStream(
  { input, output }: { input: Readable; output: Writable },
  { end = true, binary }: PdftkOptions & StreamChildProcessOptions = {},
): Promise<void> {
  const data = await dataDump({ input }, { binary });
  output.write(JSON.stringify(data));
  if (end) {
    output.end();
  }
}
