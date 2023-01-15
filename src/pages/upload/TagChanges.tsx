import React, { Fragment, useEffect, useState } from 'react';
import { getFeatures, OsmChange, OsmFeature, OsmFeatureType } from 'osm-api';

type SimpleRecord = {
  [key: string]: { [value: string]: number };
};

type Change = {
  added: SimpleRecord;
  removed: SimpleRecord;
  featureDeleted: SimpleRecord;
  changed: SimpleRecord;
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
  const toFetch = diff.modify.reduce<
    Partial<Record<OsmFeatureType, number[] | undefined>>
  >((ac, f) => ({ ...ac, [f.type]: [...(ac[f.type] || []), f.id] }), {});

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

const renderSimpleSection = (list: SimpleRecord, prefix: string) =>
  Object.entries(list).map(([key, vals]) => {
    const tags = Object.entries(vals);

    let children: React.ReactNode;
    if (tags.length > 1) {
      const allAre1 = tags.every(([, count]) => count === 1);
      if (allAre1) {
        children = tags.map(([val], i) => (
          <Fragment key={val}>
            {!!i && '/'}
            <code>{val}</code>
          </Fragment>
        ));
      } else {
        children = (
          <ul>
            {tags.map(([val, count]) => (
              <li key={val}>
                <code>{val}</code> {count > 1 && `(${count})`}
              </li>
            ))}
          </ul>
        );
      }
    } else {
      children = <code>{tags[0][0]}</code>;
    }
    return (
      <li key={prefix + key} className={prefix}>
        {prefix} <code>{key}=</code>
        {children}
      </li>
    );
  });

export const TagChanges: React.FC<{ diff: OsmChange }> = ({ diff }) => {
  const [error, setError] = useState<Error>();
  const [changes, setChanges] = useState<Change>();

  useEffect(() => {
    calcTagChanges(diff).then(setChanges).catch(setError);
  }, [diff]);

  if (error) return <>Failed to calculate tag changes</>;
  if (!changes) return <>Loading tag changes...</>;

  const noChanges = Object.values(changes).every((x) => !Object.keys(x).length);
  if (noChanges) {
    return <div className="alert error">No tags changed!</div>;
  }

  return (
    <ul className="tagChanges">
      {renderSimpleSection(changes.added, 'Added')}
      {renderSimpleSection(changes.changed, 'Changed')}
      {renderSimpleSection(changes.removed, 'Removed')}
      {renderSimpleSection(changes.featureDeleted, 'Deleted')}
    </ul>
  );
};
