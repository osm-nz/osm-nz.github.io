export const uniqBy = <T>(prop: keyof T, arr: T[]): T[] => [
  ...new Map(arr.map((item) => [item[prop], item])).values(),
];
