import { getFeatureHistory, getFeatures, OsmFeature } from 'osm-api';
import { Item, ValidationResult, LongNWR, MAP } from '../util';
import { getName, getPreset } from './getPreset';

export async function validate(items: Item[]): Promise<ValidationResult[]> {
  if (!items.length) throw new Error('No data entered');
  if (items.some((i) => !i.fromId || !i.toId)) {
    throw new Error('Some fields are blank');
  }

  const toFetch: Record<LongNWR, (string | number)[]> = {
    node: items.filter((i) => i.type === 'n').map((i) => i.toId!),
    way: items.filter((i) => i.type === 'w').map((i) => i.toId!),
    relation: items.filter((i) => i.type === 'r').map((i) => i.toId!),
  };
  // process the deleted features one-by-one
  for (const deleted of items) {
    const type = MAP[deleted.type];
    const res = await getFeatureHistory(type, deleted.fromId!);

    const latestVersion = res.slice(-1)[0];
    const secondLastVersion = res.slice(-2)[0];

    if (latestVersion.visible !== false) {
      throw new Error(`${type} ${deleted.fromId} is not deleted`);
    }

    toFetch[type].push(`${deleted.fromId}v${secondLastVersion.version}`);
  }

  const results: OsmFeature[] = [];

  for (const type in toFetch) {
    const IDs = toFetch[type as LongNWR];
    if (IDs.length) {
      results.push(...(await getFeatures(type as LongNWR, IDs)));
    }
  }

  const visitedIds: Record<string, true> = {};
  return Promise.all(
    items.map(async (item): Promise<ValidationResult> => {
      let error: string | false = false;

      if (visitedIds[item.type + item.fromId]) {
        error = 'Duplicate deleted feature';
      }
      if (visitedIds[item.type + item.toId]) error = 'Duplicate new feature';

      const oldFeature = results.find(
        (t) => t.type === MAP[item.type] && t.id === item.fromId,
      );
      if (!oldFeature) error = 'Invalid old feature';
      const newFeature = results.find(
        (t) => t.type === MAP[item.type] && t.id === item.toId,
      );
      if (!newFeature) error = 'Invalid new feature';

      return {
        oldPreset: await getPreset(oldFeature?.tags),
        oldName: getName(oldFeature?.tags),
        newPreset: await getPreset(newFeature?.tags),
        newName: getName(newFeature?.tags),
        newFeature,
        oldId: oldFeature?.id,
        oldVersion: (oldFeature?.version ?? -2) + 1,
        error,
      };
    }),
  );
}
