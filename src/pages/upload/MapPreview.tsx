import { useMemo, useRef } from 'react';
import type { OsmChange } from 'osm-api';
import {
  FeatureGroup,
  GeoJSON,
  MapContainer,
  Marker,
  Polygon,
} from 'react-leaflet';
import { type FeatureGroup as IFeatureGroup, LatLngBounds } from 'leaflet';
import { Layers } from '../map/Layers';
import type { OsmPatch, OsmPatchFeature } from '../../types';
import { ICONS } from '../map/icons';
import type { FetchCache } from './util';
import { type Bbox, getCsBbox } from './helpers/bbox';

const ICON_COLOUR_MAP = {
  delete: 'red',
  move: 'violet',
  edit: 'gold',
  '': 'green',
} as const;

export const MapPreview: React.FC<{
  diff: OsmChange;
  osmPatch?: OsmPatch;
  fetchCache: FetchCache | undefined;
  bboxFromOsmPatch: Bbox | undefined;
  setFocusedFeature(feature: OsmPatchFeature): void;
}> = ({ diff, osmPatch, fetchCache, bboxFromOsmPatch, setFocusedFeature }) => {
  const polygonGroup = useRef<IFeatureGroup>(null);

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
      bounds={
        new LatLngBounds(
          { lat: bbox.minLat, lng: bbox.minLng },
          { lat: bbox.maxLat, lng: bbox.maxLng },
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

      {/* we only support nice previews for osmPatch files */}
      {osmPatch && (
        <FeatureGroup>
          {osmPatch.features.map((feature) => {
            const colour = ICON_COLOUR_MAP[feature.properties.__action || ''];

            if (feature.geometry.type === 'Point') {
              // this one has to be handled seprately
              // if we want to customise the colour, since
              // colour is only customisable by changing the
              // icon itself.
              const [lng, lat] = feature.geometry.coordinates;
              return (
                <Marker
                  position={{ lat, lng }}
                  key={feature.id}
                  icon={ICONS[colour]}
                  eventHandlers={{ click: () => setFocusedFeature(feature) }}
                />
              );
            }

            return (
              <GeoJSON
                key={feature.id}
                data={feature}
                pathOptions={{ color: colour }}
                eventHandlers={{ click: () => setFocusedFeature(feature) }}
              />
            );
          })}
        </FeatureGroup>
      )}
    </MapContainer>
  );
};
