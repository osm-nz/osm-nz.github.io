import { Fragment, useEffect, useState } from 'react';
import { MapContainer, Polygon, Tooltip } from 'react-leaflet';
import type { LeafletMouseEvent } from 'leaflet';
import { uniqBy } from '../../helpers';
import { downloadFile } from '../upload/util';
import { CDN_BASE_URL } from '../../helpers/const';
import { Layers } from './Layers';
import { MapErrorBoundary } from './MapErrorBoundary';

import 'leaflet/dist/leaflet.css';

// if rapid has opened this page in a popup
const fromRapiD = !!window.opener;

type BBox = [
  [minLng: number, minLat: number],
  [maxLng: number, maxLat: number],
];
type Layer = {
  extent: BBox;
  groupCategories: string[];
  id: string;
  name: string;
  osmChangeAvailable: boolean;
  snippet: string;
  source: '';
  title: string;
  totalCount: number;
  url: string;
};

type Data = {
  results: Layer[];
};

function returnToRapiD(id: string) {
  window.opener.postMessage(`ADD_SECTOR=${id}`);
  window.close();
}

async function downloadLayer(layer: Layer) {
  const blob = await fetch(layer.url).then((r) => r.blob());
  downloadFile(blob, layer.url.split('/').at(-1)!);
}

// Return a deeper red for changesets with more changes
function getColor(d: number) {
  return d > 1000
    ? '#3a0000'
    : d > 500
      ? '#67001f'
      : d > 200
        ? '#980043'
        : d > 100
          ? '#ce1256'
          : d > 60
            ? '#e7298a'
            : d > 40
              ? '#df65b0'
              : d > 20
                ? '#c994c7'
                : '#d4b9da';
}

function getPolygon(x: Layer) {
  const color = getColor(x.totalCount);
  const fillOpacity = 0.3;
  const stroke = true;
  const opacity = 1;
  const weight = 2;

  return {
    color,
    fillOpacity,
    opacity,
    stroke,
    weight,
  };
}

let beforeHoveredColor = 'orange'; // store colour of the hovered polygon
function toggleFeatureHighlight(event: LeafletMouseEvent, on: boolean) {
  // highlight polygon on mouse hover
  if (on) {
    beforeHoveredColor = event.target.options.color;
    event.target.setStyle({ color: 'yellow' });
  } else {
    event.target.setStyle({ color: beforeHoveredColor });
  }
}

function bboxToPoly([[minLng, minLat], [maxLng, maxLat]]: BBox): [
  lng: number,
  lat: number,
][] {
  return [
    [maxLat, minLng], // NW
    [maxLat, maxLng], // NE
    [minLat, maxLng], // SE
    [minLat, minLng], // SW
  ];
}

export const Map: React.FC = () => {
  const [showPreview, setShowPreview] = useState(false);
  const [layer, setLayer] = useState<string>();
  const [error, setError] = useState();
  const [data, setData] = useState<Data>();
  const [layersToHide, setLayersToHide] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${CDN_BASE_URL}/index.json`)
      .then((r) => r.json())
      .then(setData)
      .catch(setError);
  }, []);

  if (error) return <>Error</>;
  if (!data) return <>Loading...</>;

  const layers = uniqBy(
    'name',
    data.results
      .map((t) => ({
        name: t.name.split(' - ').slice(0, -1).join(' - '),
        isPreview: t.groupCategories[0] === '/Categories/Preview',
      }))
      .filter((x) => showPreview || !x.isPreview),
  );

  return (
    <>
      <div style={{ height: 200 }}>
        {fromRapiD && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: 0 }}>Please select a suburb to edit</h3>
            You can close this page and use the list if you prefer
          </div>
        )}
        <input
          type="checkbox"
          checked={showPreview}
          onChange={(event) => setShowPreview(event.target.checked)}
        />
        Show Preview Layers
        <br />
        <br />
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {layers.map((l) => (
            <button
              key={l.name}
              type="button"
              className={[
                layer === l.name ? 'active-layer' : 'inactive-layer',
                l.isPreview ? 'preview-layer' : '',
              ].join(' ')}
              onClick={() => setLayer(l.name)}
            >
              {l.name}
            </button>
          ))}
        </div>
      </div>
      <MapErrorBoundary key={layer}>
        <MapContainer
          style={{ width: '100vw', height: 'calc(100vh - 200px)' }}
          center={[-40.98, 166.9]}
          zoom={6}
          scrollWheelZoom
        >
          <Layers />

          {layer &&
            data.results
              .filter((x) => x.name.startsWith(layer))
              .filter((x) => !layersToHide.includes(x.id))
              .map((x) => (
                <Polygon
                  key={x.id}
                  pathOptions={getPolygon(x)}
                  positions={bboxToPoly(x.extent)}
                  eventHandlers={{
                    click: () => {
                      if (fromRapiD) returnToRapiD(x.id);
                      else downloadLayer(x);
                    },
                    contextmenu: () =>
                      setLayersToHide((existing) => [...existing, x.id]),
                    mouseover: (event) => toggleFeatureHighlight(event, true),
                    mouseout: (event) => toggleFeatureHighlight(event, false),
                  }}
                >
                  <Tooltip direction="bottom" sticky>
                    <strong>{x.name}</strong>
                    <br />
                    {x.snippet}
                  </Tooltip>
                </Polygon>
              ))}
          <div
            className="legend leaflet-bottom leaflet-left"
            style={{ margin: 20 }}
          >
            <strong># of changes</strong>
            <br />
            {[0, 20, 40, 60, 100, 200, 500, 1000].map((_, index, grades) => (
              <Fragment key={_}>
                <i style={{ background: getColor(grades[index] + 1) }} />
                {grades[index]}
                {grades[index + 1] ? (
                  <>
                    &ndash;{grades[index + 1]}
                    <br />
                  </>
                ) : (
                  '+'
                )}
              </Fragment>
            ))}
          </div>
        </MapContainer>
      </MapErrorBoundary>
    </>
  );
};
