export const uniqBy = <T>(property: keyof T, array: T[]): T[] => [
  ...new Map(array.map((item) => [item[property], item])).values(),
];

export const isTruthy = <T>(x: T | undefined | null | false | 0 | ''): x is T =>
  !!x;
