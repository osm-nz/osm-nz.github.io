import { featuresContaining } from '@rapideditor/country-coder';

export const getCountry = (coord: [lng: number, lat: number]): string =>
  featuresContaining(coord).find((x) => x.properties.iso1A2)?.properties
    .nameEn || 'Unknown';
