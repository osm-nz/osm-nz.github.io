import type {
  OsmPatch as _OsmPatch,
  OsmPatchFeature as _OsmPatchFeature,
} from 'osm-api';

export type { Tags } from 'osm-api';

export type OsmId = `${'n' | 'w' | 'r'}${number}`;

export type OsmPatchFeature = _OsmPatchFeature & {
  /**
   * temporarily added by this app, when we're creating features they don't
   * have a nwrId yet, so we need a way to match features between the osmPatch
   * and osmChange file.
   */
  osmChangeId?: string;
};

export type OsmPatch = Omit<_OsmPatch, 'features'> & {
  features: OsmPatchFeature[];
};
