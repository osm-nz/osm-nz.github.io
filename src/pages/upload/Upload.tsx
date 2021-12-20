import { useContext, useState } from 'react';
import { OsmChange, parseOsmChangeXml, uploadChangeset } from 'osm-api';
import { AuthContext, AuthGateway } from '../../wrappers';
import { MapPreview } from './MapPreview';
import { TagChanges } from './TagChanges';
import { PlusMinus } from './PlusMinus';

// ❤️‍🔥 This script can be used to upload an osmChange file directly to the API
// In most cases you can upload it to Level0, but this bypasses the 500 feature
// limit, and gives you an breakdown of what's changed.

const DEFAULT_TAGS = {
  attribution: 'https://wiki.openstreetmap.org/wiki/Contributors#LINZ',
  created_by: 'LINZ Data Import 1.1.1',
  locale: navigator.language,
  source: 'https://wiki.osm.org/LINZ',
  comment: '',
};

const fileToString = (fileObj: File): Promise<string> =>
  new Promise((resolve) => {
    const r = new FileReader();
    r.readAsText(fileObj, 'UTF-8');
    r.onloadend = () => resolve(r.result as string);
  });

function parseCsTags(str: string): Record<string, string> | undefined {
  try {
    return Object.fromEntries(
      str
        .split('\n')
        .map((x) => {
          if (!x) return [];
          const [k, v] = x.split('=');
          return [k.trim(), v.trim()];
        })
        .filter(([k, v]) => k && v),
    );
  } catch {
    return undefined;
  }
}

const tagsToStr = (tags: Record<string, string>): string =>
  Object.entries(tags)
    .map((v) => v.join('='))
    .join('\n');

const UploadInner: React.VFC = () => {
  const { user, logout } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const [result, setResult] = useState<number>();

  const [csTags, setCsTags] = useState(tagsToStr(DEFAULT_TAGS));
  const [diff, setDiff] = useState<OsmChange>();

  const parsedTags = parseCsTags(csTags);

  async function onFileUpload(files: FileList | null) {
    if (!files?.length) return setDiff(undefined); // unselected

    const xml = await fileToString(files[0]);
    const json = parseOsmChangeXml(xml);
    return setDiff(json);
  }

  async function upload() {
    setResult(undefined);
    setError(undefined);
    setLoading(true);

    try {
      setResult(await uploadChangeset(parsedTags!, diff!));
    } catch (ex) {
      setError(ex as Error);
    }
    setLoading(false);
  }

  if (loading) return <>Uploading...</>;

  return (
    <>
      {error && <strong>{`${error}`}</strong>}
      {result && (
        <strong>
          Uploaded! <a href={`https://osm.org/changeset/${result}`}>{result}</a>
        </strong>
      )}
      <br />
      <br />
      Logged in as <code>{user.display_name}</code>.{' '}
      <button type="button" onClick={logout}>
        Logout
      </button>
      <br />
      <br />
      <strong>Upload OSM Change file:</strong>
      <br />
      <input
        type="file"
        accept=".osc"
        onChange={(e) => onFileUpload(e.target.files)}
      />
      {diff && (
        <button
          type="button"
          onClick={() => {
            (
              document.querySelector('input[type=file]') as HTMLInputElement
            ).value = '';
            setDiff(undefined);
          }}
        >
          Clear
        </button>
      )}
      <br />
      <br />
      <strong>Changeset Tags:</strong>
      <br />
      <textarea
        value={csTags}
        onChange={(e) => setCsTags(e.target.value)}
        onBlur={(e) => {
          const newParsed = parseCsTags(e.target.value);
          if (newParsed) setCsTags(tagsToStr(newParsed));
        }}
        style={{ width: 500, height: 200, color: parsedTags ? 'black' : 'red' }}
      />
      <br />
      <br />
      {diff ? (
        <>
          <PlusMinus diff={diff} />
          <strong>Approximate Extent of nodes:</strong>
          <br />
          <MapPreview diff={diff} />
          <br />
          <br />
          <strong>Tag Changes:</strong>
          <br />
          <TagChanges diff={diff} />
          <br />
          <br />
          <button
            type="button"
            onClick={upload}
            disabled={!parsedTags?.comment}
            style={{ fontSize: 32 }}
          >
            Upload
          </button>
        </>
      ) : (
        <>
          Upload a <code>.osc</code> file to see the remaining options
        </>
      )}
    </>
  );
};

export const Upload: React.VFC = () => (
  <AuthGateway>
    <UploadInner />
  </AuthGateway>
);
