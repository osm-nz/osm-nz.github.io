import type { Feature, Geometry } from 'geojson';
import type { OsmFeatureType } from 'osm-api';

export type Tags = { [key: string]: string };

export type OsmPatchFeature = Feature<
  Geometry,
  Tags & {
    __action?: 'edit' | 'move' | 'delete';
    __members?: { type: OsmFeatureType; ref: number; role: string }[];
  }
> & {
  /**
   * temporarily added by this app, when we're creating features they don't
   * have a nwrId yet, so we need a way to match features between the osmPatch
   * and osmChange file.
   */
  osmChangeId?: string;
};

export type OsmPatch = {
  type: 'FeatureCollection';
  features: OsmPatchFeature[];
  __comment?: string;
  size?: 'small' | 'medium' | 'large';
  instructions?: string;
  changesetTags?: Tags;
};
