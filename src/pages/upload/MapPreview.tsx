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
  setFocusedFeatureId(id: string | number): void;
  removeFeatureFromPatch(id: string | number): Promise<void>;
  moveNode:
    | ((feature: OsmPatchFeature, lat: number, lng: number) => void)
    | false;
}> = ({
  diff,
  osmPatch,
  fetchCache,
  bboxFromOsmPatch,
  setFocusedFeatureId,
  removeFeatureFromPatch,
  moveNode,
}) => {
  const allowEdit = !!moveNode;
  const polygonGroup = useRef<IFeatureGroup>(null);

  const bbox = useMemo(
    () => getCsBbox(diff, fetchCache, bboxFromOsmPatch),
    [diff, fetchCache, bboxFromOsmPatch],
  );

  if (Object.values(bbox).some((n) => !Number.isFinite(n))) {
    return <>No preview available</>;
  }

  const onDragEnd = (event: L.DragEndEvent, feature: OsmPatchFeature) => {
    if (!allowEdit) return;

    const marker: L.Marker = event.target;
    const position = marker.getLatLng();
    moveNode(feature, position.lat, position.lng);
  };

  return (
    <MapContainer
      style={{ width: '50vw', height: '50vw', margin: 'auto' }}
      scrollWheelZoom
      maxZoom={21}
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
                  eventHandlers={{
                    click: () => setFocusedFeatureId(feature.id!),
                    dragstart: () => setFocusedFeatureId(feature.id!),
                    dragend: (event) => onDragEnd(event, feature),
                    dblclick: async () => {
                      if (
                        // this is not for end users, so the UX can be a bit crude
                        // eslint-disable-next-line no-restricted-globals, no-alert
                        confirm('u want to remove this feature from the diff?')
                      ) {
                        await removeFeatureFromPatch(feature.id!);
                      }
                    },
                  }}
                  draggable={allowEdit && !feature.properties.__action}
                />
              );
            }

            return (
              <GeoJSON
                key={feature.id}
                data={feature}
                pathOptions={{ color: colour }}
                eventHandlers={{
                  click: () => setFocusedFeatureId(feature.id!),
                }}
              />
            );
          })}
        </FeatureGroup>
      )}
    </MapContainer>
  );
};
