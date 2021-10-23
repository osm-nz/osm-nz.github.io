function timeSince(
  date: number,
): [num: number, unit: Intl.RelativeTimeFormatUnit] {
  const seconds = Math.floor((+new Date() - date) / 1000);
  const s = (n: number) => Math.floor(seconds / n);

  if (s(60 * 60 * 24 * 365) > 1) return [s(60 * 60 * 24 * 365), 'years'];
  if (s(60 * 60 * 24 * 30) > 1) return [s(60 * 60 * 24 * 30), 'months'];
  if (s(60 * 60 * 24) > 1) return [s(60 * 60 * 24), 'days'];
  if (s(60 * 60) > 1) return [s(60 * 60), 'hours'];
  if (s(60) > 1) return [s(60), 'minutes'];
  return [s(1), 'seconds'];
}

export function getRelativeDate(date: Date): string {
  const [number, units] = timeSince(+date);
  return new Intl.RelativeTimeFormat('en-NZ').format(-number, units);
}
