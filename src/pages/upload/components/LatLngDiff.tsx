import type { OsmFeature } from 'osm-api';
import classes from '../Upload.module.css';
import type { OsmPatchFeature } from '../../../types';

const DP = 5;

const getColour = (oldValue: string, newValue: string) => {
  if (oldValue && !newValue) return classes.removed;
  if (!oldValue && newValue) return classes.added;
  if (oldValue !== newValue) return classes.changedNew;
  return ''; // unchanged
};

/**
 * TODO: This is pretty crude at the moment. It doesn't handle
 * action=move, and relies on the osmPatch geometry, which is arbitrary.
 */
export const LatLngDiff: React.FC<{
  original: OsmFeature | undefined;
  feature: OsmPatchFeature;
}> = ({ original, feature }) => {
  if (
    feature.geometry.type !== 'Point' ||
    (original && original.type !== 'node')
  ) {
    return null;
  }

  const isDelete = feature.properties.__action === 'delete';
  const isCreate = !feature.properties.__action;

  const oldLat = original ? original.lat.toFixed(DP) : '';
  const newLat = isDelete
    ? ''
    : isCreate
      ? feature.geometry.coordinates[1].toFixed(DP)
      : oldLat;

  const oldLon = original ? original.lon.toFixed(DP) : '';
  const newLon = isDelete
    ? ''
    : isCreate
      ? feature.geometry.coordinates[0].toFixed(DP)
      : oldLon;

  const latColour = getColour(oldLat, newLat);
  const lonColour = getColour(oldLon, newLon);

  return (
    <>
      <tr>
        <th colSpan={3}>Position</th>
      </tr>
      <tr>
        <td>Latitude</td>
        <td
          className={latColour === classes.changedNew ? classes.changedOld : ''}
        >
          {oldLat}
        </td>
        <td className={latColour}>{newLat}</td>
      </tr>
      <tr>
        <td>Longitude</td>
        <td
          className={lonColour === classes.changedNew ? classes.changedOld : ''}
        >
          {oldLon}
        </td>
        <td className={lonColour}>{newLon}</td>
      </tr>
    </>
  );
};
