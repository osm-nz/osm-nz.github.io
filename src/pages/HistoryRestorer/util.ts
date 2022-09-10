import { OsmFeature } from 'osm-api';

export type NWR = 'n' | 'w' | 'r';
export const MAP = <const>{ n: 'node', w: 'way', r: 'relation' };
export type LongNWR = typeof MAP[keyof typeof MAP];

export type Item = {
  type: NWR;
  fromId?: number;
  toId?: number;
};
export type ValidationResult = {
  oldPreset: string;
  oldName?: string;
  newPreset: string;
  newName?: string;
  error: string | false;
  // needed by the save script
  newFeature?: OsmFeature;
  oldId?: number;
  oldVersion: number;
};
