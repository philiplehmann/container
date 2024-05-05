import { z } from 'zod';

export const schema = z.strictObject({
  convertTo: z.union([z.literal('pdf'), z.literal('png'), z.literal('jpeg')]).optional(),
});
