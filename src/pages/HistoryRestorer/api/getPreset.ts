const presetsPromise = fetch(
  'https://cdn.jsdelivr.net/gh/openstreetmap/id-tagging-schema@main/dist/presets.min.json',
).then((r) => r.json());

const presetNamesPromise = fetch(
  'https://cdn.jsdelivr.net/gh/openstreetmap/id-tagging-schema@main/dist/translations/en.min.json',
).then((r) => r.json());

export async function getPreset(
  tags?: Record<string, string>,
): Promise<string> {
  if (!tags) return 'No Tags';

  const [presets, presetNames] = [
    await presetsPromise,
    await presetNamesPromise,
  ];

  const matches: { presetId: string; matchScore: number }[] = [];
  for (const presetId in presets) {
    const { matchScore, tags: theseTags } = presets[presetId];
    const match =
      !!Object.keys(theseTags).length &&
      Object.entries(theseTags).every(
        ([k, v]) => k in tags && (v === '*' || v === tags[k]),
      );
    if (match) {
      matches.push({
        presetId,
        // used the defined rank, + 0.x where x is the number of primary tags in the preset
        // this allows us to prefer the preset for `amenity=theatre` over `amenity=*`
        matchScore:
          (matchScore ?? 1) +
          Object.values(theseTags).filter((x) => x !== '*').length / 10,
      });
    }
  }

  matches.sort((a, b) => b.matchScore - a.matchScore);
  const bestId = matches[0]?.presetId;
  return presetNames.en.presets.presets[bestId]?.name || 'Unknown';
}

export const getName = (tags?: Record<string, string>): string | undefined =>
  tags?.name ||
  tags?.ref ||
  tags?.official_name ||
  tags?.alt_name ||
  tags?.loc_name ||
  tags?.['addr:housename'] ||
  tags?.['seamark:name'];
