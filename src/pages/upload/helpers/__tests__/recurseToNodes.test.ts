import type { OsmNode, OsmRelation, OsmWay } from 'osm-api';
import type { FetchCache } from '../../util';
import { recurseToNodes } from '../recurseToNodes';

describe('recurseToNodes', () => {
  it('recurses thru way/relation dependencies to find all nodes', () => {
    const fetchCache: FetchCache = {
      n1: <OsmNode>{ type: 'node', id: 1 },
      n2: <OsmNode>{ type: 'node', id: 2 },
      w1: <OsmWay>{ type: 'way', id: 1, nodes: [1, 2] },
      r1: <OsmRelation>{
        type: 'relation',
        id: 1,
        members: [
          { type: 'node', ref: 1 },
          { type: 'node', ref: 3 }, // can't be resolved
          { type: 'way', ref: 1 },
        ],
      },
      r2: <OsmRelation>{
        type: 'relation',
        id: 2,
        members: [{ type: 'relation', ref: 1 }],
      },
    };
    expect(recurseToNodes(fetchCache.r2, fetchCache)).toStrictEqual([
      fetchCache.n1,
      fetchCache.n1, // we don't are about duplicates
      fetchCache.n2,
    ]);
  });
});
