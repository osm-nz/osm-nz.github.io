import type { FeatureCollection, Geometry } from 'geojson';
import type { OsmFeatureType } from 'osm-api';

export type Tags = { [key: string]: string };

export type OsmPatch = FeatureCollection<
  Geometry,
  Tags & {
    __action?: 'edit' | 'move' | 'delete';
    __members?: { type: OsmFeatureType; ref: number; role: string }[];
  }
> & {
  __comment?: string;
  size?: 'small' | 'medium' | 'large';
  instructions?: string;
  changesetTags?: Tags;
};

export type OsmPatchFeature = OsmPatch['features'][number];
