export const ADDRESS_CATEGORIES = {
  PERFECT: [1, 'Data is already perfect', 'No action required', '#76d9a1'],
  EXISTS_BUT_WRONG_DATA: [
    2,
    'Address exists but the data is wrong',
    'Select a suburb in the tool',
    '#fada5e',
    'data-wrong.txt',
  ],
  EXISTS_BUT_NO_LINZ_REF: [
    3,
    'Address exists but no linz ref',
    'Select a suburb in the tool',
    '#fada5e',
    'needs-linz-ref.txt',
  ],
  MULTIPLE_EXIST_BUT_NO_LINZ_REF: [
    4,
    'Multiple addresses exists, none have linz ref',
    'manual action required',
    '#fada5e',
    'needs-linz-ref-but-multiple.txt',
  ],
  MULTIPLE_EXIST: [
    5,
    'Multiple addresses exists with same linz ref',
    'manual action required',
    '#ff7272',
    'duplicate-linz-ref.txt',
  ],
  EXISTS_BUT_LOCATION_WRONG: [
    6,
    'Addresses exist but location is very wrong',
    'Select the suburb called "ZZ Special Location Wrong".',
    '#fada5e',
    'location-wrong.txt',
  ],
  TOTALLY_MISSING: [
    7,
    'Addresses totally missing from OSM',
    'Select a suburb in the tool',
    '#fada5e',
  ],
  NEEDS_DELETE: [
    8,
    'Addresses in OSM that have been deleted by LINZ',
    'Select a suburb in the tool',
    '#fada5e',
    'needs-delete.txt',
  ],
  NEEDS_DELETE_NON_TRIVIAL: [
    9,
    'Addresses in OSM that have been deleted by LINZ, but are on a OSM business/POI',
    'manual action required',
    '#ff7272',
    'needs-delete-non-trivial.txt',
  ],
  CORRUPT: [
    10,
    'There are multiple LINZ refs on the same OSM node',
    'manual action required',
    '#fada5e',
    'corrupt.txt',
  ],
  LINZ_REF_CHANGED: [
    11,
    'LINZ has changed their ID for an address, but not the data',
    "Select the suburb called 'ZZ Special Linz Ref Changed'",
    '#fada5e',
    'linz-ref-changed.txt',
  ],
  COULD_BE_STACKED: [
    13,
    'Addresses in OSM that are perfect, but the flats/units could be stacked if this is desired.',
    'N/A. Just for statistics',
    '#76d9a1',
    'could-be-stacked.txt',
  ],
  NEEDS_DELETE_ON_BUILDING: [
    14,
    'Addresses in OSM that have been deleted by LINZ, but are on a OSM building',
    'Select a suburb in the tool',
    '#fada5e',
    'needs-delete-on-building.txt',
  ],
  REPLACED_BY_BUILDING: [
    15,
    'Addresses in OSM that exist twice - once on a building and once on an imported node',
    'Select a suburb in the tool',
    '#fada5e',
    'replaced-by-building.txt',
  ],
} satisfies {
  [statusCode: string]: [
    statusCodeNumber: number,
    description: string,
    actionDescription: string,
    colour: string,
    file?: string,
  ];
};

export type AddressCategory = keyof typeof ADDRESS_CATEGORIES;
