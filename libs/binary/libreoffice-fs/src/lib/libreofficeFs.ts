import { HttpError } from '@riwi/http/error';
import type { NextResponse } from '@riwi/http/route';
import { convert } from './convert';
import type { Schema } from './schema';

export interface HandleDirectFsRouteOptions {
  body: Schema;
  inputRoot: string;
  outputRoot: string;
}

export async function libreofficeFs({
  body,
  inputRoot,
  outputRoot,
}: HandleDirectFsRouteOptions): Promise<NextResponse> {
  try {
    const { outputBytes, durationMs } = await convert({
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
