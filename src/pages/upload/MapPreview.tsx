import { useRef } from 'react';
import type { OsmChange, OsmNode } from 'osm-api';
import { FeatureGroup, MapContainer, Polygon } from 'react-leaflet';
import { type FeatureGroup as IFeatureGroup, LatLngBounds } from 'leaflet';
import { Layers } from '../map/Layers';

/**
 * this doesn't work for ways or relations, so it's pretty dumb.
 * It only considers the nodes that exist in the osmChange file.
 * See https://wiki.osm.org/API_v0.6#Bounding_box_computation
 */
function getCsBbox(osmChange: OsmChange) {
  const bbox = {
    minLat: Infinity,
    minLng: Infinity,
    maxLat: -Infinity,
    maxLng: -Infinity,
  };

  const filteredNodes = Object.values(osmChange)
    .flat()
    .filter((x): x is OsmNode => x.type === 'node');

  for (const node of filteredNodes) {
    if (node.lat < bbox.minLat) bbox.minLat = node.lat;
    if (node.lon < bbox.minLng) bbox.minLng = node.lon;
    if (node.lat > bbox.maxLat) bbox.maxLat = node.lat;
    if (node.lon > bbox.maxLng) bbox.maxLng = node.lon;
  }

  return bbox;
}

export const MapPreview: React.FC<{ diff: OsmChange }> = ({ diff }) => {
  const polygonGroup = useRef<IFeatureGroup>(null);

  // TODO: react hook to download all nodes of ways/relations that were touched
  // for small features. Render each feature on the map
  const bbox = getCsBbox(diff);

  if (Object.values(bbox).some((n) => !Number.isFinite(n))) {
    return <>No preview available</>;
  }

  return (
    <MapContainer
      style={{ width: 500, height: 500, margin: 'auto' }}
      scrollWheelZoom
      ref={(map) =>
        map?.fitBounds(
          new LatLngBounds(
            [bbox.minLat, bbox.minLng],
            [bbox.maxLat, bbox.maxLng],
          ),
        )
      }
    >
      <Layers />

      <FeatureGroup ref={polygonGroup}>
        <Polygon
          positions={[
            [bbox.maxLat, bbox.minLng], // NW
            [bbox.maxLat, bbox.maxLng], // NE
            [bbox.minLat, bbox.maxLng], // SE
            [bbox.minLat, bbox.minLng], // SW
          ]}
        />
      </FeatureGroup>
    </MapContainer>
  );
};
