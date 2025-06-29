import type { Stats } from 'node:fs';
import { type FileHandle, open } from 'node:fs/promises';
import { basename } from 'node:path';

export class StreamableFile extends File {
  private constructor(
    public path: string,
    private handle: FileHandle,
    private stats: Stats,
  ) {
    super([], basename(path));
  }

  static async from(path: string): Promise<StreamableFile> {
    const handle = await open(path, 'r');
    const stats = await handle.stat();
    return new StreamableFile(path, handle, stats);
  }

  get size() {
    return this.stats.size;
  }

  stream() {
    return this.handle.readableWebStream() as ReadableStream<Uint8Array<ArrayBufferLike>>;
  }
}
