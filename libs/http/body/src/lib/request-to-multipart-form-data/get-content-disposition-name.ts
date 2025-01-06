export function getContentDispositionName(header: Headers): { filename?: string; name: string } {
  const contentDisposition = header.get('content-disposition');
  if (!contentDisposition) {
    throw new Error('Missing content-disposition header');
  }

  const { filename, name } = Object.fromEntries(
    contentDisposition.split(';').map((part) => {
      const [key, value = ''] = part.trim().split('=');
      return [key, value.replace(/^"(.*)"$/, '$1')];
    }),
  );

  if (!name) {
    throw new Error('Missing name in content-disposition header');
  }

  return {
    filename,
    name,
  };
}
