/* eslint-disable jsx-a11y/control-has-associated-label */
import { useContext, useMemo } from 'react';
import TimeAgo from 'react-timeago-i18n';
import type { OsmFeature } from 'osm-api';
import type { OsmPatchFeature } from '../../../types';
import { MAP } from '../../HistoryRestorer/util';
import { AuthContext } from '../../../wrappers';
import classes from '../Upload.module.css';
import { useTag2link } from '../../../hooks/useTag2link';
import { OpenInLinks } from './OpenInLinks';
import { LatLngDiff } from './LatLngDiff';
import { MaybeLink } from './MaybeLink';

const EMPTY_CELL = <td>&nbsp;</td>;

export const DiffForFeature: React.FC<{
  feature: OsmPatchFeature;
  original: OsmFeature | undefined;
}> = ({ feature, original }) => {
  const tag2link = useTag2link();
  const { user: me } = useContext(AuthContext);

  const type = MAP[`${feature.id}`[0] as keyof typeof MAP];
  const id = +`${feature.id}`.slice(1);

  const [action, , tagDiff] = useMemo(() => {
    const { __action, __members, ...newTags } = feature.properties;
    return [__action, __members, newTags];
  }, [feature]);

  const allKeys = useMemo(() => {
    const keys = new Set([
      ...Object.keys(original?.tags || {}),
      ...Object.keys(tagDiff),
    ]);

    // sort alphabetically
    return [...keys].sort((a, b) => a.localeCompare(b));
  }, [tagDiff, original]);

  return (
    <>
      <header style={{ textTransform: 'capitalize' }}>
        {action ? (
          <>
            {type} {id} – <OpenInLinks type={type} id={id} />
          </>
        ) : (
          <>🆕 {feature.id}</>
        )}
      </header>
      <table className={classes.diffTable}>
        <thead>
          <tr>
            <th />
            <th>Before</th>
            <th>After</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>version</td>
            <td>{original?.version || ''}</td>
            <td>{(original?.version ?? 0) + 1}</td>
          </tr>
          <tr>
            <td>timestamp</td>
            {original ? (
              <td>
                <abbr title={original?.timestamp || ''}>
                  <TimeAgo date={original?.timestamp} />
                </abbr>
              </td>
            ) : (
              EMPTY_CELL
            )}
            <td>
              <em>Now</em>
            </td>
          </tr>
          <tr>
            <td>changeset</td>
            {original ? (
              <td>
                <a
                  href={`https://osm.org/changeset/${original.changeset}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {original.changeset}
                </a>
              </td>
            ) : (
              EMPTY_CELL
            )}
            {EMPTY_CELL}
          </tr>
          <tr>
            <td>user</td>
            {original ? (
              <td>
                <a
                  href={`https://osm.org/user/${original.user}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {original.user}
                </a>
              </td>
            ) : (
              EMPTY_CELL
            )}
            <td>
              <a
                href={`https://osm.org/user/${me.display_name}`}
                target="_blank"
                rel="noreferrer"
              >
                {me.display_name}
              </a>
            </td>
          </tr>
          <tr>
            <th colSpan={3}>Tags</th>
          </tr>
          {allKeys.map((key) => {
            const originalValue = original?.tags?.[key] || '';
            let newValue =
              feature.properties.__action === 'delete'
                ? ''
                : feature.properties[key] || originalValue;
            if (newValue === '🗑️') newValue = '';

            if (!originalValue && !newValue) {
              return null; // skip tag, the osmPatch file requests
              // that this tag be deleted, but the tag doesn't exist.
            }

            const colour = originalValue
              ? newValue
                ? originalValue === newValue
                  ? '' // unchanged
                  : classes.changedNew
                : classes.removed
              : classes.added;

            const formatter = tag2link?.get(key);

            return (
              <tr key={key}>
                <td>{key}</td>
                <td
                  className={
                    colour === classes.changedNew ? classes.changedOld : ''
                  }
                >
                  <MaybeLink value={originalValue} formatter={formatter} />
                </td>
                <td className={colour}>
                  <MaybeLink value={newValue} formatter={formatter} />
                </td>
              </tr>
            );
          })}
          <LatLngDiff feature={feature} original={original} />
        </tbody>
      </table>
      {type === 'relation' && (
        <>
          <header>Members</header>
          {/* TODO: move relation member stuff here */}
        </>
      )}
    </>
  );
};
