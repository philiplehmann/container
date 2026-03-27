import { ConvertTo } from '@container/binary/libreoffice';
import { z } from 'zod/v4';

export const schema = z
  .strictObject({
    inputPath: z.string().min(1),
    outputPath: z.string().min(1),
    convertTo: z.enum(ConvertTo).optional().default(ConvertTo.pdf),
    outputFilter: z.string().optional(),
    filterOptions: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .refine(
    (data) => {
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
