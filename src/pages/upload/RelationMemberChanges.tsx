import { useEffect, useState } from 'react';
import { OsmChange, OsmRelation } from 'osm-api';
import { diffLines, Change } from 'diff';
import { FetchCache, ToFetch, fetchChunked } from './util';

type MemberChanges = {
  [nwrId: string]: Change[];
};

const renderMember = (m: OsmRelation['members'][number]) =>
  m.role ? `${m.type[0]}${m.ref} as “${m.role}”` : `${m.type[0]}${m.ref}`;

async function calculateMemberChanges(
  diff: OsmChange,
  fetchCache: FetchCache | undefined,
): Promise<MemberChanges> {
  // the next bit requires calling the API to get the old version of each feature
  const toFetch = diff.modify.reduce<ToFetch>(
    (ac, f) => ({ ...ac, [f.type]: [...ac[f.type], f.id] }),
    { node: [], way: [], relation: [] },
  );

  // if this is an osmPatch, then we will have already fetched this data from the API,
  // so we re-use the existing fetchCache
  const oldVersions = await fetchChunked(toFetch, fetchCache);

  const out: MemberChanges = {};

  for (const newVersion of [...diff.modify, ...diff.create]) {
    const nwrId = newVersion.type[0] + newVersion.id;
    const oldVersion = oldVersions[nwrId];
    if (
      newVersion.type === 'relation' &&
      newVersion.tags?.type !== 'multipolygon'
    ) {
      const oldText =
        (oldVersion as OsmRelation)?.members?.map(renderMember).join('\n') ||
        '';
      const newText = newVersion.members.map(renderMember).join('\n');

      out[nwrId] = diffLines(`${oldText}\n`, `${newText}\n`);
    }
  }

  return out;
}

export const RelationMemberChanges: React.FC<{
  diff: OsmChange;
  fetchCache: FetchCache | undefined;
}> = ({ diff, fetchCache }) => {
  const [data, setData] = useState<MemberChanges>();
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    calculateMemberChanges(diff, fetchCache)
      .catch(() => undefined)
      .then(setData);
  }, [diff, fetchCache]);

  const keys = Object.keys(data || {});
  if (data && keys.length === 0) return null;

  const nwrId = keys[cursor];
  const tags = fetchCache?.[nwrId]?.tags || {};

  return (
    <>
      <br />
      <br />
      <strong>Changed Relation Members:</strong>
      <br />
      {data ? (
        <>
          <button
            type="button"
            onClick={() => setCursor((c) => c - 1)}
            disabled={!cursor}
          >
            ⬅️
          </button>
          {cursor + 1}/{keys.length}
          <button
            type="button"
            onClick={() => setCursor((c) => c + 1)}
            disabled={cursor === keys.length - 1}
          >
            ➡️
          </button>
          <br />
          <strong>{tags.name || tags.ref || 'No Name'}</strong>
          <br />
          <pre>
            {data[nwrId].map((part, index) => {
              // gotta use the index, it's safe, the array is never updated
              const key = index + part.value;

              if (part.added) {
                return (
                  <span key={key} className="diff-add">
                    {part.value}
                  </span>
                );
              }
              if (part.removed) {
                return (
                  <span key={key} className="diff-remove">
                    {part.value}
                  </span>
                );
              }
              return part.value;
            })}
          </pre>
        </>
      ) : (
        'Loading…'
      )}
    </>
  );
};
