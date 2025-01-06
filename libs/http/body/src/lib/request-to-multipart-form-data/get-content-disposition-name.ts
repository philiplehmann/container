export function getContentDispositionName(header: Headers): { filename?: string; name: string } {
  const { filename, name } = Object.fromEntries(
    header
      .get('content-disposition')
      ?.split(';')
      .map((part) => {
        const [key, value = ''] = part.trim().split('=');
        return [key, value.replace(/^"(.*)"$/, '$1')];
      }) ?? [],
  );
  return {
    filename,
    name,
  };
}
