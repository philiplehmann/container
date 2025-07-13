import { z } from 'zod/v4';
import { ScreenshotType } from './screenshot-type';

export const querySchema = z.strictObject({
  type: z.enum(ScreenshotType).optional().default(ScreenshotType.png),
});
