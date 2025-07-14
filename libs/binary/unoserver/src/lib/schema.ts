import { z } from 'zod/v4';
import { ConvertTo } from './convert-to';

const booleanLiteral = z
  .literal('true')
  .optional()
  .transform((val) => val === 'true');

export const schema = z.strictObject({
  convertTo: z.enum(ConvertTo).optional().default(ConvertTo.pdf),
  inputFilter: z.string().optional(),
  outputFilter: z.string().optional(),
  filterOptions: z.union([z.string(), z.array(z.string())]).optional(),
  updateIndex: booleanLiteral,
  dontUpdateIndex: booleanLiteral,
  verbose: booleanLiteral,
  quiet: booleanLiteral,
});

export type Schema = z.infer<typeof schema>;
