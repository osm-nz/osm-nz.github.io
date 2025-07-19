import { useEffect, useRef, useState } from 'react';
import { GeoJSON, MapContainer } from 'react-leaflet';
import {
  type LatLng,
  type GeoJSON as LeafletGeoJSON,
  type Map,
  marker,
} from 'leaflet';
import type { GeoJsonObject } from 'geojson';
import { Layers } from '../map/Layers';
import { ICONS } from '../map/icons';
import classes from './LinzLink.module.css';
import 'leaflet/dist/leaflet.css';

/** map of the OSM key to the LINZ layer ID and primary key */
const LAYERS = {
  address_id: [105689, 'address_id'],
  building_id: [101290, 'building_id'],
  // place_id: already hanlded by the NZGB
  // topo50_id: can't link, refers to multiple layers and sometimes it's our own constructed value
  // hydrographic_id: can't link, refers to multiple layers
  pastoral_lease_id: [51572, 'id'],
  napalis_id: [53564, 'napalis_id'],
} satisfies Record<string, [layerId: number, primaryKey: string]>;

type LayerKey = keyof typeof LAYERS;

const isLayerKey = (layer: string): layer is LayerKey => layer in LAYERS;

interface QueryResponse {
  items: Record<string, unknown>[];
  numRows: number;
  numRowsEstimated: boolean;
}

async function query(key: LayerKey, value: string) {
  const [layerId, primaryKey] = LAYERS[key];
  const qs = new URLSearchParams({
    start: '0',
    count: '4', // idk what this means
    query: JSON.stringify({ [primaryKey]: value }),
    v: '1.3',
    include_geom: 'true',
    key: import.meta.env.VITE_LDS_KEY,
  }).toString();
  const response: QueryResponse = await fetch(
    `https://data.linz.govt.nz/services/query/v1/feature.json/${layerId}/?${qs}`,
  ).then((r) => r.json());

  return response;
}

function datasetLink(lat: number, lon: number, zoom: number, layer: number) {
  const qs = new URLSearchParams({
    'mv.basemap': 'Streets',
    'mv.centre': `${lon},${lat}`,
    'mv.content': `layer.${layer}.color:003399.opacity:100`,
    'mv.panes': [
      'pane.0.id:807f2ac9-89f9-4e7c-b49f-5af433222b55',
      `pane.0.centre:[${lon},${lat}]`,
      `pane.0.zoom:${zoom}`,
      'pane.0.pitch:0',
      'pane.0.bearing:0',
      'pane.0.resolution:93.06224038506281',
      `pane.0.extent:${JSON.stringify({
        minx: lon - 0.001,
        miny: lat - 0.001,
        maxx: lon + 0.001,
        maxy: lat + 0.001,
      })}`,
      '',
    ].join(';'),
    'mv.panesViewOption': 'map-pane-single',
    'mv.zoom': `${zoom}`,
  }).toString();
  return `https://data.linz.govt.nz/mapviewer/?${qs}`;
}

const urlQs = new URLSearchParams(window.location.search);
export const layerKey = [...urlQs.keys()].find(isLayerKey);
const layerValue = layerKey && urlQs.get(layerKey);
const promise = layerKey && query(layerKey, layerValue!);

export const LinzLink: React.FC = () => {
  const [data, setData] = useState<QueryResponse>();
  const [error, setError] = useState<Error>();

  const [centre, setCentre] = useState<LatLng>();
  const map = useRef<Map>();
  const feature = useRef<LeafletGeoJSON>();

  function onMapLoad(ref: { map: Map } | { feature: LeafletGeoJSON }) {
    // these two might fire onLoad at different times, so wait for both to be ready
    if ('map' in ref) map.current = ref.map;
    if ('feature' in ref) feature.current = ref.feature;

    if (map.current && feature.current && !centre) {
      // both are ready
      setCentre(feature.current.getBounds().getCenter());
      map.current.fitBounds(feature.current.getBounds());
    }
  }

  useEffect(() => {
    document.title = `${layerKey} · ${layerValue}`;
    promise?.then(setData).catch(setError);
  }, []);

  if (!promise || !layerKey) {
    return `URL does not contain any a valid key, the options are: ${Object.keys(LAYERS).join(', ')}`;
  }
  if (error) return `${error}`;
  if (!data) return <>Loading…</>;
  if (!data.items.length) {
    return (
      <>
        <kbd>{layerValue}</kbd> is not a valid <kbd>{layerKey}</kbd>
      </>
    );
  }

  const defaultZoom = 18;

  return (
    <main className={classes.LinzLink}>
      <div>
        {centre && (
          <a
            href={datasetLink(
              centre.lat,
              centre.lng,
              map.current?.getZoom() || defaultZoom,
              LAYERS[layerKey][0],
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <button type="button">Go To LINZ Data Service</button>
          </a>
        )}
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data.items[0])
              .filter(([k]) => k !== '__geometry__')
              .map(([k, v]) => (
                <tr key={k}>
                  <td>
                    {k === LAYERS[layerKey][1] ? (
                      <a
                        href={`https://taginfo.osm.org/keys/ref:linz:${layerKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {k}
                      </a>
                    ) : (
                      k
                    )}
                  </td>
                  <td>{}</td>
                  <td>
                    {v === null ? (
                      ''
                    ) : k === LAYERS[layerKey][1] ? (
                      <mark>
                        <a
                          href={`https://taginfo.osm.org/tags/ref:linz:${layerKey}=${v}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {`${v}`}
                        </a>
                      </mark>
                    ) : (
                      `${v}`
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <MapContainer
        style={{ width: '100%', height: '100vh' }}
        scrollWheelZoom
        zoom={defaultZoom}
        center={[0, 0]}
        ref={(m) => m && onMapLoad({ map: m })}
      >
        <Layers />
        <GeoJSON
          data={data.items[0].__geometry__ as GeoJsonObject}
          ref={(f) => f && onMapLoad({ feature: f })}
          // leaflet's default icon isn't bundled by vite in production
          pointToLayer={(_, location) =>
            marker(location, { icon: ICONS.green })
          }
        />
      </MapContainer>
    </main>
  );
};
