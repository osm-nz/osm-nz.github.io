import { useContext, useRef, useState } from 'react';
import {
  type OsmChange,
  createOsmChangeXml,
  parseOsmChangeXml,
  uploadChangeset,
} from 'osm-api';
import { parse } from 'jsonc-parser';
import { AuthContext, AuthGateway } from '../../wrappers';
import type { OsmPatch, Tags } from '../../types';
import { MapPreview } from './MapPreview';
import { TagChanges } from './TagChanges';
import { PlusMinus } from './PlusMinus';
import { createOsmChangeFromPatchFile } from './createOsmChangeFromPatchFile';
import './Upload.css';
import { type FetchCache, downloadFile } from './util';
import { RelationMemberChanges } from './RelationMemberChanges';

const DEFAULT_TAGS = {
  attribution: 'https://wiki.openstreetmap.org/wiki/Contributors#LINZ',
  created_by: 'LINZ Data Import 2.0.0',
  locale: navigator.language,
  source: 'https://wiki.osm.org/LINZ',
  comment: '',
};

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
  const [fetchCache, setFetchCache] = useState<FetchCache>();
  const [fileName, setFileName] = useState<string>();
  const [messages, setMessages] = useState<string[]>([]);

  const input = useRef<HTMLInputElement>(null);

  const parsedTags = parseCsTags(csTags);

  async function onFileUpload(files: FileList | null) {
    if (!files?.length) {
      // the user unselected the current file, so reset
      setMessages([]); // reset messages
      // don't reset changeset tags
      return setDiff(undefined);
    }

    try {
      setFileName(files[0].name);
      const isOsmChange = [...files].some((file) => file.name.endsWith('.osc'));
      if (isOsmChange) {
        if (files.length > 1) {
          throw new Error(
            'Only 1 osmChange file can be uploaded at a time. Multiple osmPatch files are allowed',
          );
        }
        const xml = await files[0].text();
        const json = parseOsmChangeXml(xml);
        return setDiff(json);
      }
      // else, this is a osmPatch file
      const patchFiles: OsmPatch[] = [];
      for (const file of files) {
        patchFiles.push(parse(await file.text()));
      }
      const merged: OsmPatch =
        patchFiles.length === 1
          ? patchFiles[0]
          : {
              ...patchFiles[0],
              features: patchFiles.flatMap((file) => file.features),
            };

      // if the user uploads multiple patch files, we merge
      // all the changeset tags with semicolons
      const changesetTags: Tags = {};
      for (const patchFile of patchFiles) {
        if (patchFile.changesetTags) {
          for (const [key, value] of Object.entries(patchFile.changesetTags)) {
            if (changesetTags[key]) {
              // join with a semicolon, avoid duplicate values
              const existing = new Set(changesetTags[key].split(';'));
              existing.add(value);
              changesetTags[key] = [...existing].join(';');
            } else {
              // add new tag
              changesetTags[key] = value;
            }
          }
        }
      }

      if (Object.keys(changesetTags).length) {
        // if created_by is missing, set it to our default value
        changesetTags.created_by ||= DEFAULT_TAGS.created_by;

        setCsTags(tagsToStr(changesetTags));
      }

      const instructions = new Set(
        patchFiles.map((patchFile) => patchFile.instructions || ''),
      );
      instructions.delete('');

      setMessages([...instructions]);

      const { osmChange, fetched } = await createOsmChangeFromPatchFile(merged);
      setFetchCache(fetched);
      return setDiff(osmChange);
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
      console.log('Uploaded!');
    } catch (ex) {
      console.error(ex);
      setError(ex instanceof Error ? ex : new Error(`${ex}`));
    }
    setLoading(false);
  }

  function downloadOsc() {
    const xml = createOsmChangeXml(-1, diff!);
    const xmlBlob = new Blob([xml], { type: 'application/xml' });
    downloadFile(xmlBlob, `${fileName?.split('.')[0]}.osc`);
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
        onChange={(event) => onFileUpload(event.target.files)}
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
        onChange={(event) => {
          setCsTags(tagsToStr({ ...parsedTags, comment: event.target.value }));
        }}
        placeholder="Changeset Comment"
        style={{ width: 500 }}
      />
      <br />
      <textarea
        value={csTags}
        onChange={(event) => setCsTags(event.target.value)}
        onBlur={(event) => {
          const newParsed = parseCsTags(event.target.value);
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
          <TagChanges diff={diff} fetchCache={fetchCache} />
          <RelationMemberChanges diff={diff} fetchCache={fetchCache} />
          <br />
          <br />
          {!!messages.length && (
            <>
              {messages.map((message) => (
                <div key={message}>⚠️ {message}</div>
              ))}
              <br />
              <br />
            </>
          )}
          <button
            type="button"
            onClick={upload}
            disabled={!parsedTags?.comment}
            style={{ fontSize: 32 }}
          >
            Upload
          </button>
          <button type="button" onClick={downloadOsc} style={{ fontSize: 32 }}>
            Download as .osc
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
