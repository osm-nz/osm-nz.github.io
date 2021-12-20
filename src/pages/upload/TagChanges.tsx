import { useEffect, useState } from 'react';
import { getFeatures, OsmChange, OsmFeature, OsmFeatureType } from 'osm-api';

type SimpleRecord = {
  [key: string]: { [value: string]: number };
};

type Change = {
  added: SimpleRecord;
  removed: SimpleRecord;
  featureDeleted: SimpleRecord;
  changed: {
    [key: string]: { [toFromValue: string]: number };
  };
};

async function calcTagChanges(diff: OsmChange): Promise<Change> {
  const out: Change = {
    added: {},
    removed: {},
    featureDeleted: {},
    changed: {},
  };

  for (const f of diff.create) {
    if (f.tags) {
      for (const key in f.tags) {
        const value = f.tags[key];
        out.added[key] ||= {};
        out.added[key][value] ||= 0;
        out.added[key][value] += 1;
      }
    }
  }

  for (const f of diff.delete) {
    if (f.tags) {
      for (const key in f.tags) {
        const value = f.tags[key];
        out.featureDeleted[key] ||= {};
        out.featureDeleted[key][value] ||= 0;
        out.featureDeleted[key][value] += 1;
      }
    }
  }

  // the next bit requires calling the API to get the old version of each feature
  const toFetch = diff.modify.reduce(
    (ac, f) => ({
      ...ac,
      [f.type]: [...(ac[f.type] || []), f.id],
    }),
    {} as Record<OsmFeatureType, number[] | undefined>,
  );

  const features = [
    ...(toFetch.node ? await getFeatures('node', toFetch.node) : []),
    ...(toFetch.way ? await getFeatures('way', toFetch.way) : []),
    ...(toFetch.relation
      ? await getFeatures('relation', toFetch.relation)
      : []),
  ];

  const oldVersions: Record<string, OsmFeature> = {};
  for (const f of features) oldVersions[f.type + f.id] = f;

  for (const f of diff.modify) {
    const oldTags = oldVersions[f.type + f.id].tags || {};
    const newTags = f.tags || {};
    const allKeys = Object.keys({ ...oldTags, ...newTags });
    for (const key of allKeys) {
      if (newTags[key] && !oldTags[key]) {
        // added
        const value = newTags[key];
        out.added[key] ||= {};
        out.added[key][value] ||= 0;
        out.added[key][value] += 1;
      } else if (!newTags[key] && oldTags[key]) {
        // removed
        const value = oldTags[key];
        out.removed[key] ||= {};
        out.removed[key][value] ||= 0;
        out.removed[key][value] += 1;
      } else if (newTags[key] !== oldTags[key]) {
        // value changed

        const value = `${oldTags[key]} ~~> ${newTags[key]}`;

        out.changed[key] ||= {};
        out.changed[key][value] ||= 0;
        out.changed[key][value] += 1;
      }
    }
  }

  return out;
}

const renderSimpleSection = (
  list: SimpleRecord,
  prefix: string,
  color: string,
) =>
  Object.entries(list).map(([key, vals]) => {
    const tags = Object.entries(vals);
    return (
      <li key={prefix + key} style={{ color }}>
        {prefix} <code>{key}=</code>
        {tags.length > 1 ? (
          <ul>
            {tags.map(([val, count]) => (
              <li key={val}>
                <code>{val}</code> {count > 1 && `(${count})`}
              </li>
            ))}
          </ul>
        ) : (
          <code>{tags[0][0]}</code>
        )}
      </li>
    );
  });

export const TagChanges: React.VFC<{ diff: OsmChange }> = ({ diff }) => {
  const [error, setError] = useState<Error>();
  const [changes, setChanges] = useState<Change>();

  useEffect(() => {
    calcTagChanges(diff).then(setChanges).catch(setError);
  }, [diff]);

  if (error) return <>Failed to calculate tag changes</>;
  if (!changes) return <>Loading tag changes...</>;

  console.log('c', changes);

  return (
    <ul>
      {renderSimpleSection(changes.added, 'Added', 'green')}
      {renderSimpleSection(changes.changed, 'Changed', 'orange')}
      {renderSimpleSection(changes.removed, 'Removed', 'red')}
      {renderSimpleSection(changes.featureDeleted, 'Deleted', 'maroon')}
    </ul>
  );
};
