// copied from https://github.com/openstreetmap/iD/blob/575046c/modules/services/tag2Link.js

import { useEffect, useState } from 'react';

type RawTag2Link = {
  key: `Key:${string}`;
  url: string;
  source: `${'osmwiki' | 'wikidata'}:P${number}`;
  rank: 'preferred' | 'normal' | 'deprecated';
};

const RANKS = ['deprecated', 'normal', 'preferred'];

async function getTag2Link() {
  const array: RawTag2Link[] = await fetch(
    'https://cdn.jsdelivr.net/gh/JOSM/tag2link@master/index.json',
  ).then((r) => r.json());

  const map = new Map<string, string>();

  const allKeys = new Set(array.map((item) => item.key));

  for (const key of allKeys) {
    // find an item with the best rank
    const bestDefinition = array
      .filter((item) => item.key === key)
      .sort((a, b) => RANKS.indexOf(b.rank) - RANKS.indexOf(a.rank))[0];

    map.set(key.replace('Key:', ''), bestDefinition.url);
  }

  return map;
}

let promise: ReturnType<typeof getTag2Link> | undefined;

export function useTag2link() {
  const [value, setValue] = useState<Map<string, string>>();

  useEffect(() => {
    (promise ||= getTag2Link()).then(setValue).catch(console.error);
  }, []);

  return value;
}
