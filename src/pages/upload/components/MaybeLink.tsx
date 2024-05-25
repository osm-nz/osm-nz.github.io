export function getUrlHost(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

export const MaybeLink: React.FC<{
  value: string;
  formatter: string | undefined;
}> = ({ formatter, value }) => {
  if (!formatter) return value;

  const url = formatter.replaceAll('$1', value);
  return (
    <a
      href={url}
      title={`View on ${getUrlHost(formatter)}`}
      target="_blank"
      rel="noreferrer"
    >
      {value}
    </a>
  );
};
