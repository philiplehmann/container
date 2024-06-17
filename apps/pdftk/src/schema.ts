import { type RawCreateParams, z } from 'zod';

export const outputSchema = z.strictObject({
  owner_pw: z.string().optional(),
  user_pw: z.string().optional(),
  compress: z.boolean().optional(),
  uncompress: z.boolean().optional(),
  allow: z.enum([
    'Printing', // Top Quality Printing
    'DegradedPrinting', // Lower Quality Printing
    'ModifyContents', // Also allows Assembly
    'Assembly',
    'CopyContents', // Also allows ScreenReaders
    'ScreenReaders',
    'ModifyAnnotations', // Also allows FillIn
    'FillIn',
    'AllFeatures', // Allows the user to perform all of the above, and top quality printing.
  ]),
  encrypt: z.enum(['40bit', '128bit', 'aes128']).optional(),
});

export const fillFormSchema = z.strictObject({
  owner_pw: z.string().optional(),
  user_pw: z.string().optional(),
  flatten: z.boolean().optional(),
  need_appearances: z.boolean().optional(),
  compress: z.boolean().optional(),
  uncompress: z.boolean().optional(),
  allow: z.enum(['printing']),
  encrypt: z.enum(['40bit', '128bit', 'aes128']).optional(),
});
