import { OsmChange, OsmNode } from 'osm-api';
import { useRef } from 'react';
import { FeatureGroup, MapContainer, Polygon } from 'react-leaflet';
import type { FeatureGroup as IFeatureGroup } from 'leaflet';
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

  Object.values(osmChange)
    .flat()
    .filter((x): x is OsmNode => x.type === 'node')
    .forEach((node) => {
      if (node.lat < bbox.minLat) bbox.minLat = node.lat;
      if (node.lon < bbox.minLng) bbox.minLng = node.lon;
      if (node.lat > bbox.maxLat) bbox.maxLat = node.lat;
      if (node.lon > bbox.maxLng) bbox.maxLng = node.lon;
    });

  return bbox;
}

export const MapPreview: React.VFC<{ diff: OsmChange }> = ({ diff }) => {
  const polygonGroup = useRef<IFeatureGroup>(null);

  const bbox = getCsBbox(diff);
  return (
    <MapContainer
      style={{ width: 500, height: 500 }}
      scrollWheelZoom
      whenCreated={(map) => map.fitBounds(polygonGroup.current!.getBounds())}
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
