import type { Readable } from 'node:stream';

export async function streamIncludes(stream: Readable, find: string | Buffer): Promise<boolean> {
  const search = typeof find === 'string' ? Buffer.from(find) : find;
  let previous = Buffer.from('');
  for await (const chunk of stream) {
    const content = Buffer.concat([previous, chunk]);
    if (content.includes(search)) {
      return true;
    }
    previous = chunk;
  }
  return false;
}
