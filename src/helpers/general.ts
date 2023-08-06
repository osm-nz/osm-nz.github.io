export const uniqBy = <T>(property: keyof T, array: T[]): T[] => [
  ...new Map(array.map((item) => [item[property], item])).values(),
];
