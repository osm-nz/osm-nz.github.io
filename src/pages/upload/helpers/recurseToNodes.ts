import type { OsmFeature, OsmNode } from 'osm-api';
import type { FetchCache } from '../util';
import { isTruthy } from '../../../helpers';

export function recurseToNodes(
  feature: OsmFeature,
  fetchCache: FetchCache | undefined,
): OsmNode[] {
  switch (feature.type) {
    case 'node': {
      return [feature];
    }
    case 'way': {
      return feature.nodes
        .map((nodeId) => fetchCache?.[`n${nodeId}`] as OsmNode | undefined)
        .filter(isTruthy);
    }
    case 'relation': {
      return feature.members.flatMap(({ type, ref }) => {
        const subFeature = fetchCache?.[`${type[0]}${ref}`];
        return subFeature ? recurseToNodes(subFeature, fetchCache) : [];
      });
    }
    default: {
      return []; // impossible
    }
  }
}
