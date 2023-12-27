import type { OsmChange } from 'osm-api';
import type { FetchCache } from '../util';
import type { OsmPatch } from '../../../types';
import { recurseToNodes } from './recurseToNodes';

export const createEmptyBbox = () => ({
  minLat: Infinity,
  minLng: Infinity,
  maxLat: -Infinity,
  maxLng: -Infinity,
});

export type Bbox = ReturnType<typeof createEmptyBbox>;

/**
 * This will try to get the geometry of all ways/relations,
 * but in most cases, these nodes won't be in the fetchCache.
 *
 * For osmPatch files only, we can also use the geometry
 * from the geojson file.
 */
export function getCsBbox(
  osmChange: OsmChange,
  fetchCache: FetchCache | undefined,
  initialBbox: Bbox | undefined,
): Bbox {
  const bbox = initialBbox || createEmptyBbox();

  const filteredNodes = Object.values(osmChange)
    .flat()
    .flatMap((x) => recurseToNodes(x, fetchCache));

  for (const node of filteredNodes) {
    if (node.lat < bbox.minLat) bbox.minLat = node.lat;
    if (node.lon < bbox.minLng) bbox.minLng = node.lon;
    if (node.lat > bbox.maxLat) bbox.maxLat = node.lat;
    if (node.lon > bbox.maxLng) bbox.maxLng = node.lon;
  }

  return bbox;
}

/**
 * Gets the bbox based on the geometry defined in an
 * osmPatch file, which may or may not match the osm
 * geometry (for edit and delete actions).
 */
export function getGeoJsonBbox(osmPatch: OsmPatch): Bbox {
  const allCoords: number[] = [];
  for (const f of osmPatch.features) {
    if ('coordinates' in f.geometry) {
      const flatCoords = f.geometry.coordinates.flat(3);
      allCoords.push(...flatCoords);
    }
  }

  const bbox = createEmptyBbox();
  for (let index = 0; index < allCoords.length; index++) {
    // we can safely use odd vs even, no matter how deep
    // the array of coordinates was.
    if (index % 2) {
      // this is a lat
      const lat = allCoords[index];
      if (lat < bbox.minLat) bbox.minLat = lat;
      if (lat > bbox.maxLat) bbox.maxLat = lat;
    } else {
      // this is a lng
      const lon = allCoords[index];
      if (lon < bbox.minLng) bbox.minLng = lon;
      if (lon > bbox.maxLng) bbox.maxLng = lon;
    }
  }

  return bbox;
}
