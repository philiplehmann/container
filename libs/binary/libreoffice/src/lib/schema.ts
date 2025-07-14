import { z } from 'zod/v4';
import { ConvertTo } from './convert-to';

export const schema = z.strictObject({
  convertTo: z.enum(ConvertTo).optional().default(ConvertTo.pdf),
});
