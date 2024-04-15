import { type RawCreateParams, z } from 'zod';
import type { PaperFormat } from 'puppeteer';

function paperFormatUnion(values: readonly [PaperFormat, PaperFormat, ...PaperFormat[]], params?: RawCreateParams) {
  return z.union(
    [
      z.literal<PaperFormat>(values[0]),
      z.literal<PaperFormat>(values[1]),
      ...values.slice(2).map((value) => z.literal<PaperFormat>(value)),
      ...values.map((value) => z.literal<PaperFormat>(value.toUpperCase() as PaperFormat)),
      ...values.map((value) => z.literal<PaperFormat>(value.toLowerCase() as PaperFormat)),
    ],
    params,
  );
}

const optionSchema = z.strictObject({
  scale: z.number().optional(),
  displayHeaderFooter: z.boolean().optional(),
  headerTemplate: z.string().optional(),
  footerTemplate: z.string().optional(),
  printBackground: z.boolean().optional(),
  landscape: z.boolean().optional(),
  pageRanges: z.string().optional(),
  format: paperFormatUnion([
    'Letter',
    'Legal',
    'Tabloid',
    'Ledger',
    'A0',
    'A1',
    'A2',
    'A3',
    'A4',
    'A5',
    'A6',
  ]).optional(),
  width: z.union([z.string(), z.number()]).optional(),
  height: z.union([z.string(), z.number()]).optional(),
  preferCSSPageSize: z.boolean().optional(),
  margin: z
    .object({
      top: z.union([z.string(), z.number()]).optional(),
      bottom: z.union([z.string(), z.number()]).optional(),
      left: z.union([z.string(), z.number()]).optional(),
      right: z.union([z.string(), z.number()]).optional(),
    })
    .optional(),

  path: z.string().optional(),
  omitBackground: z.boolean().optional(),
  tagged: z.boolean().optional(),
  outline: z.boolean().optional(),
  timeout: z.number().optional(),
});

export const schema = z.union([optionSchema.extend({ url: z.string() }), optionSchema.extend({ html: z.string() })]);
