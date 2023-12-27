import { uploadChangeset } from 'osm-api';
import type { ValidationResult } from '../util';

// exclude the URL query params
const host =
  window.location.origin + window.location.pathname + window.location.hash;

/** returns the changeset number */
export async function save(validation: ValidationResult[]): Promise<number> {
  return uploadChangeset(
    {
      comment: 'Restore deleted features',
      created_by: 'HistoryRestorer',
      host,
    },
    {
      create: [],
      modify: validation.map((v) => ({
        ...v.newFeature!,
        id: v.oldId!,
        version: v.oldVersion!,
      })),
      delete: validation.map((v) => v.newFeature!),
    },
  );
}
