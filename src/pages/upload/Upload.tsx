import { useContext, useRef, useState } from 'react';
import { OsmChange, parseOsmChangeXml, uploadChangeset } from 'osm-api';
import { AuthContext, AuthGateway } from '../../wrappers';
import { MapPreview } from './MapPreview';
import { TagChanges } from './TagChanges';
import { PlusMinus } from './PlusMinus';
import {
  createOsmChangeFromPatchFile,
  OsmPatch,
} from './createOsmChangeFromPatchFile';
import './Upload.css';

// ❤️‍🔥 This script can be used to upload an osmChange file directly to the API
// In most cases you can upload it to Level0, but this bypasses the 500 feature
// limit, and gives you an breakdown of what's changed.

const DEFAULT_TAGS = {
  attribution: 'https://wiki.openstreetmap.org/wiki/Contributors#LINZ',
  created_by: 'LINZ Data Import 2.0.0',
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
          return [k.trim(), v];
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

const UploadInner: React.FC = () => {
  const { user, logout } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const [result, setResult] = useState<number>();
  const [csTags, setCsTags] = useState(tagsToStr(DEFAULT_TAGS));
  const [diff, setDiff] = useState<OsmChange>();

  const input = useRef<HTMLInputElement>(null);

  const parsedTags = parseCsTags(csTags);

  async function onFileUpload(files: FileList | null) {
    if (!files?.length) return setDiff(undefined); // unselected

    try {
      const isOsmChange = [...files].some((file) => file.name.endsWith('.osc'));
      if (isOsmChange) {
        if (files.length > 1) {
          throw new Error(
            'Only 1 osmChange file can be uploaded at a time. Multiple osmPatch files are allowed',
          );
        }
        const xml = await fileToString(files[0]);
        const json = parseOsmChangeXml(xml);
        return setDiff(json);
      }
      // else, this is a osmPatch file
      const patchFiles: OsmPatch[] = [];
      for (const file of files) {
        patchFiles.push(JSON.parse(await fileToString(file)));
      }
      const merged: OsmPatch =
        patchFiles.length === 1
          ? patchFiles[0]
          : {
              ...patchFiles[0],
              features: patchFiles.flatMap((file) => file.features),
            };

      const json = await createOsmChangeFromPatchFile(merged);
      return setDiff(json);
    } catch (ex) {
      console.error(ex);
      return setError(ex instanceof Error ? ex : new Error(`${ex}`));
    }
  }

  async function upload() {
    setResult(undefined);
    setError(undefined);
    setLoading(true);

    try {
      setResult(await uploadChangeset(parsedTags!, diff!));
      // reset inputs but don't reset the changeset tags
      setDiff(undefined);
    } catch (ex) {
      console.error(ex);
      setError(ex instanceof Error ? ex : new Error(`${ex}`));
    }
    setLoading(false);
  }

  if (loading) return <h2 className="upload-root">Uploading...</h2>;

  return (
    <div className="upload-root">
      {error && <div className="alert error">{error.message}</div>}
      {result && (
        <div className="alert">
          Uploaded! <a href={`https://osm.org/changeset/${result}`}>{result}</a>
        </div>
      )}
      {(error || result) && (
        <>
          <br />
          <br />
        </>
      )}
      Logged in as <code>{user.display_name}</code>.{' '}
      <button type="button" onClick={logout}>
        Logout
      </button>
      <br />
      <br />
      <strong>Upload osmChange or osmPatch file:</strong>
      <br />
      <input
        type="file"
        accept=".osc,.osmPatch.geo.json,.geo.json" // TODO: don't allow any geojson
        multiple
        onChange={(e) => onFileUpload(e.target.files)}
        ref={input}
      />
      {diff && (
        <button
          type="button"
          onClick={() => {
            input.current!.value = '';
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
      <input
        value={parsedTags?.comment || ''}
        onChange={(e) => {
          setCsTags(tagsToStr({ ...parsedTags, comment: e.target.value }));
        }}
        placeholder="Changeset Comment"
        style={{ width: 500 }}
      />
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
          Upload a <code>.osc</code> or <code>.osmPatch.geo.json</code> file to
          see the remaining options
        </>
      )}
    </div>
  );
};

export const Upload: React.FC = () => (
  <AuthGateway>
    <UploadInner />
  </AuthGateway>
);
