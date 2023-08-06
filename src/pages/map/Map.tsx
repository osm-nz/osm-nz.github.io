import { useEffect, useState, Fragment } from 'react';
import { MapContainer, Polygon, Tooltip } from 'react-leaflet';
import { LeafletMouseEvent } from 'leaflet';
import { uniqBy } from '../../helpers';
import { Layers } from './Layers';
import { MapErrorBoundary } from './MapErrorBoundary';

import 'leaflet/dist/leaflet.css';

const baseUrl = 'https://linz-addr-cdn.kyle.kiwi';

// if rapid has opened this page in a popup
const fromRapiD = !!window.opener;

type Locked = undefined | [user: string, minutes: 'done' | number];
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

type Data = [
  layers: {
    results: Layer[];
  },
  locked: {
    [datasetId: string]: Locked;
  },
];

function returnToRapiD(id: string, locked: Locked) {
  if (locked) {
    const [user, minutesAgo] = locked;
    const suffix =
      'Check back in a day.\n\nIf you continue, you might override or duplicate their work!';
    const message =
      minutesAgo === 'done'
        ? `This dataset may already have been uploaded by someone else! ${suffix}`
        : `Someone else (${user}) started editing this dataset ${minutesAgo} minutes ago. ${suffix}`;

    // eslint-disable-next-line no-restricted-globals, no-alert
    if (!confirm(message)) return;
  }

  window.opener.postMessage(`ADD_SECTOR=${id}`);
  window.close();
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

function getPolygon(x: Layer, isLocked: Locked) {
  const color = isLocked ? '#aaaaaa' : getColor(x.totalCount);
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
const headers = {
  Expires: 'Tue, 01 Jan 1980 1:00:00 GMT',
  'Cache-Control': 'no-cache, no-store, max-age=0',
  Pragma: 'no-cache',
};

export const Map: React.FC = () => {
  const [showPreview, setShowPreview] = useState(false);
  const [layer, setLayer] = useState<string>();
  const [error, setError] = useState();
  const [data, setData] = useState<Data>();
  const [layersToHide, setLayersToHide] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`${baseUrl}/index.json?nocache=${Math.random()}`, { headers }).then(
        (r) => r.json(),
      ),
      fetch(`${baseUrl}/__locked?nocache=${Math.random()}`, { headers })
        .then((r) => r.json())
        .catch(() => ({})),
    ])
      .then(setData)
      .catch(setError);
  }, []);

  if (error) return <>Error</>;
  if (!data) return <>Loading...</>;

  const layers = uniqBy(
    'name',
    data[0].results
      .map((t) => ({
        name: t.name.split(' - ').slice(0, -1).join(' - '),
        isPreview: t.groupCategories[0] === '/Categories/Preview',
      }))
      .filter((x) => showPreview || !x.isPreview),
  );

  const getLockedMessage = (x: Layer) =>
    data[1][x.id]
      ? `Someone else ${
          data[1][x.id]![1] === 'done'
            ? 'may have already uploaded'
            : 'is working on'
        } this dataset! Check back in one day.`
      : '';

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
            data[0].results
              .filter((x) => x.name.startsWith(layer))
              .filter((x) => !layersToHide.includes(x.id))
              .map((x) => (
                <Polygon
                  key={x.id}
                  pathOptions={getPolygon(x, data[1][x.id])}
                  positions={bboxToPoly(x.extent)}
                  eventHandlers={{
                    click: () => {
                      if (fromRapiD) returnToRapiD(x.id, data[1][x.id]);
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
                    <br />
                    {getLockedMessage(x)}
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
