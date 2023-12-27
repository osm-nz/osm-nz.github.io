import { LayersControl, TileLayer } from 'react-leaflet';

export const Layers: React.FC = () => (
  <LayersControl position="topright">
    <LayersControl.BaseLayer checked name="OpenStreetMap">
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </LayersControl.BaseLayer>
    <LayersControl.BaseLayer name="LINZ Aerial Imagery">
      <TileLayer
        attribution='<a href="https://www.linz.govt.nz/data/licensing-and-using-data/attributing-elevation-or-aerial-imagery-data">Sourced from LINZ CC-BY 4.0</a>'
        url="https://basemaps.linz.govt.nz/v1/tiles/aerial/EPSG:3857/{z}/{x}/{y}.jpg?api=d01egend5f8dv4zcbfj6z2t7rs3"
      />
    </LayersControl.BaseLayer>
    <LayersControl.BaseLayer name="LINZ Topo50">
      <TileLayer
        attribution='<a href="https://www.linz.govt.nz/data/licensing-and-using-data/attributing-elevation-or-aerial-imagery-data">Sourced from LINZ CC-BY 4.0</a>'
        url="https://map.cazzaserver.com/linz_topo/{z}/{x}/{y}.png"
      />
    </LayersControl.BaseLayer>
  </LayersControl>
);
