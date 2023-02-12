export function* chunk<T>(arr: T[], limit: number): Generator<T[], void> {
  for (let i = 0; i < arr.length; i += limit) {
    yield arr.slice(i, i + limit);
  }
}
