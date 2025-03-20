import { z } from 'zod';

export enum Locale {
  en = 'en',
  de = 'de',
  fr = 'fr',
  it = 'it',
}

export enum Detail {
  text = 'text',
  textCoordinates = 'text-coordinates',
}

export enum RotationInfo {
  ninety = '90',
  oneEighty = '180',
  twoSeventy = '270',
}

export enum StringBoolean {
  true = 'true',
  false = 'false',
}

export interface ReadtextParams<D extends Detail = Detail> {
  gpu?: boolean;
  locale?: Locale[];
  detail?: D;
  modelStorageDirectory?: string;
  userNetworkDirectory?: string;
  detector?: boolean;
  recognizer?: boolean;
  downloadEnabled?: boolean;
  quantize?: boolean;
  beamWidth?: number;
  batchSize?: number;
  workers?: number;
  allowlist?: string;
  blocklist?: string;
  rotationInfo?: RotationInfo[];
}

export const querySchema = z.strictObject({
  gpu: z.optional(z.nativeEnum(StringBoolean).pipe(z.coerce.boolean())),
  locale: z.array(z.nativeEnum(Locale)).optional(),
  detail: z.nativeEnum(Detail).optional(),
  modelStorageDirectory: z.string().optional(),
  userNetworkDirectory: z.string().optional(),
  detector: z.optional(z.nativeEnum(StringBoolean).pipe(z.coerce.boolean())),
  recognizer: z.optional(z.nativeEnum(StringBoolean).pipe(z.coerce.boolean())),
  downloadEnabled: z.optional(z.nativeEnum(StringBoolean).pipe(z.coerce.boolean())),
  quantize: z.optional(z.nativeEnum(StringBoolean).pipe(z.coerce.boolean())),
  beamWidth: z.optional(z.string().pipe(z.coerce.number())),
  batchSize: z.optional(z.string().pipe(z.coerce.number())),
  workers: z.optional(z.string().pipe(z.coerce.number())),
  allowlist: z.string().optional(),
  blocklist: z.string().optional(),
  rotationInfo: z.array(z.nativeEnum(RotationInfo)).optional(),
});

export const headerSchema = z.object({
  'content-type': z.string().startsWith('image/'),
});
