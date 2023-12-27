import { Fragment, useEffect, useState } from 'react';
import clsx from 'clsx';
import type { OsmChange } from 'osm-api';
import { type FetchCache, type ToFetch, fetchChunked } from './util';
import classes from './Upload.module.css';

type SimpleRecord = {
  [key: string]: { [value: string]: number };
};

type Change = {
  added: SimpleRecord;
  removed: SimpleRecord;
  featureDeleted: SimpleRecord;
  changed: SimpleRecord;
};

const ARROW = '→';

async function calcTagChanges(
  diff: OsmChange,
  fetchCache: FetchCache | undefined,
): Promise<Change> {
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
  const toFetch = diff.modify.reduce<ToFetch>(
    (ac, f) => ({ ...ac, [f.type]: [...ac[f.type], f.id] }),
    { node: [], way: [], relation: [] },
  );

  // if this is an osmPatch, then we will have already fetched this data from the API,
  // so we re-use the existing fetchCache
  const oldVersions = await fetchChunked(toFetch, fetchCache);

  for (const f of diff.modify) {
    const oldTags = oldVersions[f.type[0] + f.id].tags || {};
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

        const value = `${oldTags[key]} ${ARROW} ${newTags[key]}`;

        out.changed[key] ||= {};
        out.changed[key][value] ||= 0;
        out.changed[key][value] += 1;
      }
    }
  }

  return out;
}

const RenderValue: React.FC<{ value: string; className: string }> = ({
  value,
  className,
}) => {
  if (value.includes(ARROW)) {
    const [before, after] = value.split(ARROW);
    return (
      <span>
        <code className={classes.changedOld}>{before.trim()}</code> {ARROW}{' '}
        <code className={classes.changedNew}>{after.trim()}</code>
      </span>
    );
  }

  return <code className={className}>{value}</code>;
};

const renderSimpleSection = (
  list: SimpleRecord,
  className: string,
  label: string,
) =>
  Object.entries(list).map(([key, vals]) => {
    const tags = Object.entries(vals);

    let keyCount: React.ReactNode;
    let children: React.ReactNode;
    if (tags.length > 1) {
      const allAre1 = tags.every(([, count]) => count === 1);
      if (allAre1) {
        children = tags.map(([value], index) => (
          <Fragment key={value}>
            {!!index && '/'}
            <RenderValue value={value} className={className} />
          </Fragment>
        ));
        keyCount = ` (${tags.length})`;
      } else {
        children = (
          <ul>
            {tags.map(([value, count]) => (
              <li key={value}>
                <RenderValue value={value} className={className} />
                {count > 1 && `(${count})`}
              </li>
            ))}
          </ul>
        );
        keyCount = '';
      }
    } else {
      children = <RenderValue value={tags[0][0]} className={className} />;
      keyCount = ` (${tags[0][1]})`;
    }
    return (
      <li key={className + key}>
        {label}
        {keyCount} <code className={className}>{key}=</code>
        {children}
      </li>
    );
  });

export const TagChanges: React.FC<{
  diff: OsmChange;
  fetchCache: FetchCache | undefined;
}> = ({ diff, fetchCache }) => {
  const [error, setError] = useState<Error>();
  const [changes, setChanges] = useState<Change>();

  useEffect(() => {
    calcTagChanges(diff, fetchCache).then(setChanges).catch(setError);
  }, [diff, fetchCache]);

  if (error) return <>Failed to calculate tag changes</>;
  if (!changes) return <>Loading tag changes...</>;

  const noChanges = Object.values(changes).every((x) => !Object.keys(x).length);
  if (noChanges) {
    return (
      <div className={clsx(classes.alert, classes.error)}>No tags changed!</div>
    );
  }

  return (
    <ul className={classes.tagChanges}>
      {renderSimpleSection(changes.added, classes.added, 'Added')}
      {renderSimpleSection(changes.changed, classes.changedOld, 'Changed')}
      {renderSimpleSection(changes.removed, classes.removed, 'Removed')}
      {renderSimpleSection(changes.featureDeleted, classes.deleted, 'Deleted')}
    </ul>
  );
};
