import { z } from 'zod';
import { ScreenshotType } from './screenshot-type';

export const querySchema = z.strictObject({
  type: z.nativeEnum(ScreenshotType).optional().default(ScreenshotType.png),
});
