import { spawn } from 'node:child_process';
import type { Writable } from 'node:stream';
import { type InputType, processTracker, streamChildProcess, streamChildProcessToBuffer } from '@riwi/stream';
import type { Schema } from './schema';

export function unoconvert(options: { input: InputType; output: Writable } & Schema): void;
export function unoconvert(options: { input: InputType } & Schema): Promise<Buffer>;
export function unoconvert({
  input,
  output,
  convertTo,
  inputFilter,
  outputFilter,
  filterOptions,
  timeoutMs,
  updateIndex,
  dontUpdateIndex,
  verbose,
  quiet,
}: { input: InputType; output?: Writable } & Schema) {
  const args: string[] = ['--convert-to', convertTo, '-', '-'];
  if (inputFilter) {
    args.push('--input-filter', inputFilter);
  }
  if (outputFilter) {
    args.push('--output-filter', outputFilter);
  }
  if (filterOptions) {
    (Array.isArray(filterOptions) ? filterOptions : [filterOptions]).forEach((option) => {
      args.push('--filter-option', option);
    });
  }
  if (updateIndex) {
    args.push('--update-index');
  }
  if (dontUpdateIndex) {
    args.push('--dont-update-index');
  }
  if (verbose) {
    args.push('--verbose');
  }
  if (quiet) {
    args.push('--quiet');
  }

  // Spawn the unoconvert process with the provided arguments
  const unoconvert = spawn('unoconvert', args);
  const trackedProcessId = processTracker.register(unoconvert);
  const timeoutHandle =
    timeoutMs !== undefined
      ? setTimeout(() => {
          processTracker.kill(trackedProcessId, 'SIGKILL');
        }, timeoutMs)
      : undefined;

  const clearTimeoutHandle = () => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  };

  if (output) {
    return streamChildProcess(input, output, unoconvert, { track: false }).finally(clearTimeoutHandle);
  }
  return streamChildProcessToBuffer(input, unoconvert, { track: false }).finally(clearTimeoutHandle);
}
