import { FeatureCollection, Geometry, Position } from 'geojson';
import {
  getFeatures,
  OsmBaseFeature,
  OsmChange,
  OsmFeature,
  OsmFeatureType,
  OsmNode,
  OsmRelation,
  OsmWay,
} from 'osm-api';
import { MAP, NWR } from '../HistoryRestorer/util';

const TEMPLATE_OSM_FEATURE: Omit<OsmFeature, 'id' | 'type'> = {
  // crap that just gets ignored by the API for new features
  changeset: -1,
  timestamp: '',
  uid: -1,
  user: '',
  version: 0,
};

const DEPRECATED_TAGS: Record<string, true | Record<string, true>> = {
  source_ref: {
    'http://www.nzopengps.org/': true,
    'http://www.linz.govt.nz/topography/topo-maps/': true,
    'http://www.linz.govt.nz/topography/topo-maps/index.aspx': true,
    'http://www.linz.govt.nz/about-linz/linz-data-service/dataset-information':
      true,
  },
  attribution: {
    'http://wiki.osm.org/wiki/Attribution#LINZ': true,
    'http://wiki.openstreetmap.org/wiki/Attribution#LINZ': true,
    'http://www.aucklandcouncil.govt.nz/EN/ratesbuildingproperty/propertyinformation/GIS_maps/Pages/opendata.aspx':
      true,
  },
  'linz2osm:objectid': true,
  'LINZ2OSM:dataset': true,
  'LINZ2OSM:layer': true,
  'LINZ:layer': true,
  'LINZ2OSM:source_version': true,
  'LINZ:source_version': true,
  'LINZ:dataset': true,
};

function* chunk<T>(arr: T[], limit: number): Generator<T[], void> {
  for (let i = 0; i < arr.length; i += limit) {
    yield arr.slice(i, i + limit);
  }
}

const nextId: Record<OsmFeatureType, number> = {
  node: -1,
  way: -1,
  relation: -1,
};

const coordToNode = (v: Position): OsmNode => ({
  ...TEMPLATE_OSM_FEATURE,
  type: 'node',
  id: nextId.node++,
  lat: v[1],
  lon: v[0],
});

function geojsonToOsmGeometry(
  geom: Geometry,
  baseFeature: Omit<OsmBaseFeature, 'type' | 'id'>,
): OsmFeature[] | undefined {
  switch (geom.type) {
    case 'Point': {
      return [
        {
          ...baseFeature,
          type: 'node',
          id: nextId.node++,
          lat: geom.coordinates[1],
          lon: geom.coordinates[0],
        },
      ];
    }

    case 'MultiPoint': {
      const nodes = geom.coordinates.map(coordToNode);
      return [
        {
          ...baseFeature,
          tags: { ...baseFeature.tags, type: 'site' },
          type: 'relation',
          id: nextId.relation++,
          members: nodes.map((n) => ({ role: '', type: n.type, ref: n.id })),
        },
        ...nodes,
      ];
    }

    case 'LineString': {
      const nodes = geom.coordinates.map(coordToNode);
      return [
        {
          ...baseFeature,
          type: 'way',
          id: nextId.way++,
          nodes: nodes.map((n) => n.id),
        },
        ...nodes,
      ];
    }

    case 'MultiLineString': {
      const ways: OsmWay[] = [];
      const nodes: OsmNode[] = [];
      for (const segment of geom.coordinates) {
        const segmentNodes = segment.map(coordToNode);
        ways.push({
          ...TEMPLATE_OSM_FEATURE,
          type: 'way',
          id: nextId.way++,
          nodes: segmentNodes.map((n) => n.id),
        });
        nodes.push(...segmentNodes);
      }
      const relation: OsmRelation = {
        ...baseFeature,
        tags: { ...baseFeature.tags, type: 'multilinestring' },
        type: 'relation',
        id: nextId.relation++,
        members: ways.map((w) => ({ role: '', type: w.type, ref: w.id })),
      };
      return [relation, ...ways, ...nodes];
    }

    // TODO: support other geometries
    case 'Polygon':
    case 'MultiPolygon':
    case 'GeometryCollection':
    default:
      return undefined;
  }
}

function updateTags(
  original: OsmFeature,
  tagDiff: Record<string, string>,
): OsmFeature {
  const out: OsmFeature = { ...original };
  out.tags ||= {};
  for (const [key, value] of Object.entries(tagDiff)) {
    if (value === '🗑️') {
      delete out.tags[key];
    } else {
      out.tags[key] = value;
    }
  }

  // remove deprecated tags like iD does if we're touching the feature anyway
  for (const [key, value] of Object.entries(out.tags)) {
    const deprecated = DEPRECATED_TAGS[key];
    if (deprecated === true || deprecated?.[value]) {
      delete out.tags[key];
    }
  }

  return out;
}

type Tags = {
  __action: 'edit' | 'move' | 'delete' | '';
  [key: string]: string;
};
export type OsmPatch = FeatureCollection<Geometry, Tags>;

export async function createOsmChangeFromPatchFile(
  osmPatch: OsmPatch,
): Promise<OsmChange> {
  const osmChange: OsmChange = {
    create: [],
    delete: [],
    modify: [],
  };

  // group feature IDs by node/way/relation
  const toFetch: Record<OsmFeatureType, number[]> = {
    node: [],
    way: [],
    relation: [],
  };
  for (const f of osmPatch.features) {
    if (f.properties.__action) {
      const type = MAP[(f.id as string)[0] as NWR];
      const id = +(f.id as string).slice(1);
      toFetch[type].push(id);
    }
  }

  const fetched: Record<string, OsmFeature> = {};
  for (const _type in toFetch) {
    const type = _type as OsmFeatureType;
    for (const ids of chunk(toFetch[type], 100)) {
      console.log(`Fetching ${ids.length} ${type}s...`);
      const features = await getFeatures(type, ids);
      for (const feature of features) {
        const nwrId = feature.type[0] + feature.id;
        fetched[nwrId] = feature;
      }
    }
  }

  for (const f of osmPatch.features) {
    const { __action, ...tags } = f.properties;
    switch (__action) {
      case 'edit': {
        const edited = updateTags(fetched[f.id!], tags);
        osmChange.modify.push(edited);
        break;
      }

      case 'move': {
        // unlike RapiD, we can change tags and move it in the same changeset
        const edited = updateTags(fetched[f.id!], tags);
        if (edited.type !== 'node' || f.geometry.type !== 'LineString') {
          throw new Error('trying to move a non-node');
        }
        const [newLng, newLat] = f.geometry.coordinates[1];
        edited.lat = newLat;
        edited.lon = newLng;
        osmChange.modify.push(edited);
        break;
      }

      case 'delete': {
        osmChange.delete.push(fetched[f.id!]);
        break;
      }

      default: {
        // add
        const features = geojsonToOsmGeometry(f.geometry, {
          ...TEMPLATE_OSM_FEATURE,
          tags,
        });
        if (features) {
          osmChange.create.push(...features);
        } else {
          console.warn(`Can't create a ${f.geometry.type}`);
        }
      }
    }
  }

  return osmChange;
}
