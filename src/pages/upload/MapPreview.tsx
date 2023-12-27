import { useMemo, useRef } from 'react';
import type { OsmChange } from 'osm-api';
import { FeatureGroup, MapContainer, Polygon } from 'react-leaflet';
import { type FeatureGroup as IFeatureGroup, LatLngBounds } from 'leaflet';
import { Layers } from '../map/Layers';
import type { FetchCache } from './util';
import { type Bbox, getCsBbox } from './helpers/bbox';

export const MapPreview: React.FC<{
  diff: OsmChange;
  fetchCache: FetchCache | undefined;
  bboxFromOsmPatch: Bbox | undefined;
}> = ({ diff, fetchCache, bboxFromOsmPatch }) => {
  const polygonGroup = useRef<IFeatureGroup>(null);

  // TODO: react hook to download all nodes of ways/relations that were touched
  // for small features. Render each feature on the map
  const bbox = useMemo(
    () => getCsBbox(diff, fetchCache, bboxFromOsmPatch),
    [diff, fetchCache, bboxFromOsmPatch],
  );

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
