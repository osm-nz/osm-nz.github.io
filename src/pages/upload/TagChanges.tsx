import {
  Fragment,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import clsx from 'clsx';
import type { OsmChange, OsmFeature } from 'osm-api';
import type { OsmId } from '../../types';
import { type FetchCache, type ToFetch, fetchChunked } from './util';
import classes from './Upload.module.css';

type SimpleRecord = {
  [key: string]: { [value: string]: OsmId[] };
};

type Change = {
  added: SimpleRecord;
  removed: SimpleRecord;
  featureDeleted: SimpleRecord;
  changed: SimpleRecord;
};

const ARROW = '→';

const createId = (feature: OsmFeature) =>
  (feature.type[0] + feature.id) as OsmId;

const TagChangeContext = createContext(
  undefined as never as (id: OsmId) => void,
);
TagChangeContext.displayName = 'TagChangeContext';

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
        out.added[key][value] ||= [];
        out.added[key][value].push(createId(f));
      }
    }
  }

  for (const f of diff.delete) {
    if (f.tags) {
      for (const key in f.tags) {
        const value = f.tags[key];
        out.featureDeleted[key] ||= {};
        out.featureDeleted[key][value] ||= [];
        out.featureDeleted[key][value].push(createId(f));
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
        out.added[key][value] ||= [];
        out.added[key][value].push(createId(f));
      } else if (!newTags[key] && oldTags[key]) {
        // removed
        const value = oldTags[key];
        out.removed[key] ||= {};
        out.removed[key][value] ||= [];
        out.removed[key][value].push(createId(f));
      } else if (newTags[key] !== oldTags[key]) {
        // value changed

        const value = `${oldTags[key]} ${ARROW} ${newTags[key]}`;

        out.changed[key] ||= {};
        out.changed[key][value] ||= [];
        out.changed[key][value].push(createId(f));
      }
    }
  }

  return out;
}

const RenderValue: React.FC<{
  value: string;
  className: string;
  ids: OsmId[];
}> = ({ value, className, ids }) => {
  const [index, setIndex] = useState(0);
  const setFocusedFeatureId = useContext(TagChangeContext);

  const props = useMemo(() => {
    return {
      onClick: () => {
        setIndex((c) => {
          setTimeout(() => setFocusedFeatureId(ids[c]), 0);
          return (c + 1) % ids.length;
        });
      },
      // prevent selection on double click
      onMouseDown: (event) => event.detail > 1 && event.preventDefault(),
    } satisfies React.ComponentProps<'span'>;
  }, [ids, setFocusedFeatureId]);

  const isActive = !!index;
  const suffix = isActive && (
    <span
      className={classes.tabHint}
      title="Click here or press \ to jump to the next feature"
    >
      ⌥ [{index - 1}/{ids.length}]
    </span>
  );

  useEffect(() => {
    const onTab = (event: KeyboardEvent) => {
      if (!isActive) return;
      if (event.key === '\\') props.onClick();
    };
    document.addEventListener('keyup', onTab);
    return () => document.removeEventListener('keyup', onTab);
  }, [props, isActive]);

  if (value.includes(ARROW)) {
    const [before, after] = value.split(ARROW);
    return (
      <span className={classes.clickable} {...props}>
        <code className={classes.changedOld}>{before.trim()}</code> {ARROW}{' '}
        <code className={classes.changedNew}>{after.trim()}</code>
        {suffix}
      </span>
    );
  }

  return (
    <span className={classes.clickable} {...props}>
      <code className={className}>{value}</code>
      {suffix}
    </span>
  );
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
      const allAre1 = tags.every(([, ids]) => ids.length === 1);
      if (allAre1) {
        children = tags.map(([value, ids], index) => (
          <Fragment key={value}>
            {!!index && '/'}
            <RenderValue value={value} className={className} ids={ids} />
          </Fragment>
        ));
        keyCount = ` (${tags.length})`;
      } else {
        children = (
          <ul>
            {tags.map(([value, ids]) => (
              <li key={value}>
                <RenderValue value={value} className={className} ids={ids} />
                {ids.length > 1 && `(${ids.length})`}
              </li>
            ))}
          </ul>
        );
        keyCount = '';
      }
    } else {
      children = (
        <RenderValue
          value={tags[0][0]}
          className={className}
          ids={tags[0][1]}
        />
      );
      keyCount = ` (${tags[0][1].length})`;
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
  setFocusedFeatureId(id: OsmId): void;
}> = ({ diff, fetchCache, setFocusedFeatureId }) => {
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
    <TagChangeContext.Provider value={setFocusedFeatureId}>
      <ul className={classes.tagChanges}>
        {renderSimpleSection(changes.added, classes.added, 'Added')}
        {renderSimpleSection(changes.changed, classes.changedOld, 'Changed')}
        {renderSimpleSection(changes.removed, classes.removed, 'Removed')}
        {renderSimpleSection(
          changes.featureDeleted,
          classes.deleted,
          'Deleted',
        )}
      </ul>
    </TagChangeContext.Provider>
  );
};
