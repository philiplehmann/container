import { handleDirectFsConvert } from '@container/binary/libreoffice-fs';
import { HttpError } from '@container/http/error';
import type { NextResponse } from '@container/http/route';
import { post } from '@container/http/route';
import { middlewareBody } from '@container/http/validate';
import type { DirectFsBodySchema } from '../schema/direct-fs';
import { directFsBodySchema } from '../schema/direct-fs';

export interface HandleDirectFsRouteOptions {
  body: DirectFsBodySchema;
  inputRoot: string;
  outputRoot: string;
}

export async function handleDirectFsRoute({
  body,
  inputRoot,
  outputRoot,
}: HandleDirectFsRouteOptions): Promise<NextResponse> {
  try {
    const { outputBytes, durationMs } = await handleDirectFsConvert({
      inputRoot,
      outputRoot,
      inputPath: body.inputPath,
      outputPath: body.outputPath,
      convertTo: body.convertTo,
      outputFilter: body.outputFilter,
      filterOptions: body.filterOptions,
    });

    return {
      statusCode: 200,
      contentType: 'application/json',
      body: {
        status: 'complete',
        inputPath: body.inputPath,
        outputPath: body.outputPath,
        outputBytes,
        durationMs,
      },
    };
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError ? error.message : 'internal server error';

    if (!(error instanceof HttpError)) {
      console.error('Unhandled error in directFsRoute:', error);
    }

    return {
      statusCode,
      contentType: 'application/json',
      body: {
        status: 'error',
        message,
      },
    };
  }
}

export function createDirectFsRoute(
  inputRoot: string = process.env.UNOSERVER_FS_INPUT_ROOT || '/data/in',
  outputRoot: string = process.env.UNOSERVER_FS_OUTPUT_ROOT || '/data/out',
): ReturnType<typeof post> {
  return post('/direct-fs', middlewareBody(directFsBodySchema), async ({ body }) => {
    return await handleDirectFsRoute({
      body,
      inputRoot,
      outputRoot,
    });
  });
}
