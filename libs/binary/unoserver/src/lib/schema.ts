import { z } from 'zod';
import { ConvertTo } from './convert-to';

export const schema = z.strictObject({
  convertTo: z.nativeEnum(ConvertTo).optional().default(ConvertTo.pdf),
});
