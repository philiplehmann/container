import { exec } from 'node:child_process';
import { finished } from 'node:stream/promises';
import type { InputType } from '@container/stream';
import { randomUUID } from 'node:crypto';
import { cwd } from 'node:process';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Locale, type Detail, type ReadtextParams } from './schema';

/**
 *
 * usage: easyocr [-h] -l LANG [LANG ...] [--gpu {True,False}] [--model_storage_directory MODEL_STORAGE_DIRECTORY]
 *                [--user_network_directory USER_NETWORK_DIRECTORY] [--recog_network RECOG_NETWORK] [--download_enabled {True,False}]
 *                [--detector {True,False}] [--recognizer {True,False}] [--verbose {True,False}] [--quantize {True,False}] -f FILE
 *                [--decoder {greedy,beamsearch,wordbeamsearch}] [--beamWidth BEAMWIDTH] [--batch_size BATCH_SIZE] [--workers WORKERS]
 *                [--allowlist ALLOWLIST] [--blocklist BLOCKLIST] [--detail {0,1}] [--rotation_info ROTATION_INFO] [--paragraph {True,False}]
 *                [--min_size MIN_SIZE] [--contrast_ths CONTRAST_THS] [--adjust_contrast ADJUST_CONTRAST] [--text_threshold TEXT_THRESHOLD]
 *                [--low_text LOW_TEXT] [--link_threshold LINK_THRESHOLD] [--canvas_size CANVAS_SIZE] [--mag_ratio MAG_RATIO]
 *                [--slope_ths SLOPE_THS] [--ycenter_ths YCENTER_THS] [--height_ths HEIGHT_THS] [--width_ths WIDTH_THS] [--y_ths Y_THS]
 *                [--x_ths X_THS] [--add_margin ADD_MARGIN] [--output_format {standard,dict,json}]
 *
 * Process EasyOCR.
 *
 * options:
 *   -h, --help            show this help message and exit
 *   -l LANG [LANG ...], --lang LANG [LANG ...]
 *                         for languages
 *   --gpu {True,False}    Using GPU (default: True)
 *   --model_storage_directory MODEL_STORAGE_DIRECTORY
 *                         Directory for model (.pth) file
 *   --user_network_directory USER_NETWORK_DIRECTORY
 *                         Directory for custom network files
 *   --recog_network RECOG_NETWORK
 *                         Recognition networks
 *   --download_enabled {True,False}
 *                         Enable Download
 *   --detector {True,False}
 *                         Initialize text detector module
 *   --recognizer {True,False}
 *                         Initialize text recognizer module
 *   --verbose {True,False}
 *                         Print detail/warning
 *   --quantize {True,False}
 *                         Use dynamic quantization
 *   -f FILE, --file FILE  input file
 *   --decoder {greedy,beamsearch,wordbeamsearch}
 *                         decoder algorithm
 *   --beamWidth BEAMWIDTH
 *                         size of beam search
 *   --batch_size BATCH_SIZE
 *                         batch_size
 *   --workers WORKERS     number of processing cpu cores
 *   --allowlist ALLOWLIST
 *                         Force EasyOCR to recognize only subset of characters
 *   --blocklist BLOCKLIST
 *                         Block subset of character. This argument will be ignored if allowlist is given.
 *   --detail {0,1}        simple output (default: 1)
 *   --rotation_info ROTATION_INFO
 *                         Allow EasyOCR to rotate each text box and return the one with the best confident score. Eligible values are 90, 180
 *                         and 270. For example, try [90, 180 ,270] for all possible text orientations.
 *   --paragraph {True,False}
 *                         Combine result into paragraph
 *   --min_size MIN_SIZE   Filter text box smaller than minimum value in pixel
 *   --contrast_ths CONTRAST_THS
 *                         Text box with contrast lower than this value will be passed into model 2 times. First is with original image and
 *                         second with contrast adjusted to 'adjust_contrast' value. The one with more confident level will be returned as a
 *                         result.
 *   --adjust_contrast ADJUST_CONTRAST
 *                         target contrast level for low contrast text box
 *   --text_threshold TEXT_THRESHOLD
 *                         Text confidence threshold
 *   --low_text LOW_TEXT   Text low-bound score
 *   --link_threshold LINK_THRESHOLD
 *                         Link confidence threshold
 *   --canvas_size CANVAS_SIZE
 *                         Maximum image size. Image bigger than this value will be resized down.
 *   --mag_ratio MAG_RATIO
 *                         Image magnification ratio
 *   --slope_ths SLOPE_THS
 *                         Maximum slope (delta y/delta x) to considered merging. Low value means tiled boxes will not be merged.
 *   --ycenter_ths YCENTER_THS
 *                         Maximum shift in y direction. Boxes with different level should not be merged.
 *   --height_ths HEIGHT_THS
 *                         Maximum different in box height. Boxes with very different text size should not be merged.
 *   --width_ths WIDTH_THS
 *                         Maximum horizontal distance to merge boxes.
 *   --y_ths Y_THS         Maximum vertical distance to merge boxes (when paragraph = True).
 *   --x_ths X_THS         Maximum horizontal distance to merge boxes (when paragraph = True).
 *   --add_margin ADD_MARGIN
 *                         Extend bounding boxes in all direction by certain value. This is important for language with complex script (E.g.
 *                         Thai).
 *   --output_format {standard,dict,json}
 *                         output format.
 */

const toBoolean = (value: boolean) => (value ? 'True' : 'False');

export interface DetailTextCoordinates {
  boxes: [[number, number], [number, number], [number, number], [number, number]];
  text: string;
  confident: number;
}

export async function readtext<
  D extends Detail,
  T extends D extends (typeof Detail)['text'] ? string[] : DetailTextCoordinates[],
>({ input, params = {} }: { input: InputType; params?: ReadtextParams<D> }): Promise<T> {
  const {
    gpu = false,
    locale = Object.values(Locale),
    detail,
    modelStorageDirectory,
    userNetworkDirectory,
    downloadEnabled = false,
    detector,
    recognizer,
    quantize,
    beamWidth,
    batchSize,
    workers,
    allowlist,
    blocklist,
    rotationInfo,
  } = params;

  const tmpDir = `${cwd()}/tmp`;
  if (!existsSync(tmpDir)) {
    await mkdir(tmpDir, { recursive: true });
  }
  const inputFile = `${tmpDir}/${randomUUID()}.pdf`;

  const writeStream = createWriteStream(inputFile);

  if (typeof input === 'string' || Buffer.isBuffer(input)) {
    await finished(writeStream.end(input));
  } else {
    await finished(input.pipe(writeStream));
  }

  try {
    const easyocr = await new Promise<string>((pResolve, pReject) => {
      exec(
        `easyocr ${[
          ...['--lang', locale.join(' ')],
          ...['--file', inputFile],
          ...['--detail', detail === 'text' ? '0' : '1'],
          ...['--gpu', toBoolean(gpu)],
          ...['--output_format', 'json'],
          ...(modelStorageDirectory !== undefined ? ['--model_storage_directory', resolve(modelStorageDirectory)] : []),
          ...(userNetworkDirectory !== undefined ? ['--user_network_directory', resolve(userNetworkDirectory)] : []),
          ...['--download_enabled', toBoolean(downloadEnabled)],
          ...(detector !== undefined ? ['--detector', toBoolean(detector)] : []),
          ...(recognizer !== undefined ? ['--recognizer', toBoolean(recognizer)] : []),
          ...(quantize !== undefined ? ['--quantize', toBoolean(quantize)] : []),
          ...(beamWidth !== undefined ? ['--beamWidth', String(beamWidth)] : []),
          ...(batchSize !== undefined ? ['--batch_size', String(batchSize)] : []),
          ...(workers !== undefined ? ['--workers', String(workers)] : []),
          ...(allowlist !== undefined ? ['--allowlist', allowlist] : []),
          ...(blocklist !== undefined ? ['--blocklist', blocklist] : []),
          ...(rotationInfo !== undefined ? ['--rotation_info', rotationInfo.join(' ')] : []),
        ].join(' ')}`,
        {},
        (error, stdout, stderr) => {
          if (error) {
            pReject(error);
          }
          console.error(stderr);
          pResolve(stdout);
        },
      );
    });
    return JSON.parse(`[${easyocr.trim().split('\n').join(',\n')}]`);
  } finally {
    if (existsSync(inputFile)) {
      unlink(inputFile);
    }
  }
}
