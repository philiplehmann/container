import { splitLine } from './split-line';

export const toObject = (lines: string[]): Record<string, string | string[]> => {
  return lines.reduce(
    (output, line) => {
      const [key, value] = splitLine(line);
      if (output[key]) {
        output[key] = (Array.isArray(output[key]) ? [...output[key], value] : [output[key], value]) as string[];
      } else {
        output[key] = value;
      }
      return output;
    },
    {} as Record<string, string | string[]>,
  );
};

export const stringOrFirst = (value: string | string[] = ''): string => {
  return Array.isArray(value) ? (value[0] ?? '') : value;
};
