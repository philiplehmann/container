import { z } from 'zod/v4';
import { ConvertTo } from './convert-to';

export const schema = z
  .strictObject({
    convertTo: z.enum(ConvertTo).optional().default(ConvertTo.pdf),
    outputFilter: z.string().optional(),
    filterOptions: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .refine(
    (data) => {
      // If filterOptions is provided, outputFilter must also be provided
      if (data.filterOptions !== undefined && data.outputFilter === undefined) {
        return false;
      }
      return true;
    },
    {
      message: 'filterOptions can only be provided when outputFilter is set',
      path: ['filterOptions'],
    },
  );

export type Schema = z.infer<typeof schema>;
