export const splitLine = (line = ''): [string, string] => {
  const [key = '', ...valueArr] = line.split(': ');
  const value = valueArr.join(': ');
  return [key, value];
};
