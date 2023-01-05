import { useEffect, useState } from 'react';

const META = {
  PERFECT: [1, 'Data is already perfect', 'No action required'],
  EXISTS_BUT_WRONG_DATA: [
    2,
    'Address exists but the data is wrong',
    'Select a suburb in the tool',
    'data-wrong.txt',
  ],
  EXISTS_BUT_NO_LINZ_REF: [
    3,
    'Address exists but no linz ref',
    'Select a suburb in the tool',
    'needs-linz-ref.txt',
  ],
  MULTIPLE_EXIST_BUT_NO_LINZ_REF: [
    4,
    'Multiple addresses exists, none have linz ref',
    'manual action required',
    'needs-linz-ref-but-multiple.txt',
  ],
  MULTIPLE_EXIST: [
    5,
    'Multiple addresses exists with same linz ref',
    'manual action required',
    'duplicate-linz-ref.txt',
  ],
  EXISTS_BUT_LOCATION_WRONG: [
    6,
    'Addresses exist but location is very wrong',
    'Select the suburb called "ZZ Special Location Wrong".',
    'location-wrong.txt',
  ],
  TOTALLY_MISSING: [
    7,
    'Addresses totally missing from OSM',
    'Select a suburb in the tool',
  ],
  NEEDS_DELETE: [
    8,
    'Addresses in OSM that have been deleted by LINZ',
    'Select a suburb in the tool',
    'needs-delete.txt',
  ],
  NEEDS_DELETE_NON_TRIVIAL: [
    9,
    'Addresses in OSM that have been deleted by LINZ, but are on a OSM business/POI',
    'manual action required',
    'needs-delete-non-trivial.txt',
  ],
  CORRUPT: [
    10,
    'There are multiple LINZ refs on the same OSM node',
    'manual action required',
    'corrupt.txt',
  ],
  LINZ_REF_CHANGED: [
    11,
    'LINZ has changed their ID for an address, but not the data',
    "Select the suburb called 'ZZ Special Linz Ref Changed'",
    'linz-ref-changed.txt',
  ],
  COULD_BE_STACKED: [
    13,
    'Addresses in OSM that are perfect, but the flats/units could be stacked if this is desired.',
    'N/A. Just for statistics',
    'could-be-stacked.txt',
  ],
  NEEDS_DELETE_ON_BUILDING: [
    14,
    'Addresses in OSM that have been deleted by LINZ, but are on a OSM building',
    'Select a suburb in the tool',
    'needs-delete-on-building.txt',
  ],
  REPLACED_BY_BUILDING: [
    15,
    'Addresses in OSM that exist twice - once on a building and once on an imported node',
    'Select a suburb in the tool',
    'replaced-by-building.txt',
  ],
};

const CDN_BASE_URL = 'https://linz-addr-cdn.kyle.kiwi';

type Data = {
  date: number;
  count: Record<keyof typeof META, number>;
  total: number;
};

export const Home: React.FC = () => {
  const [error, setError] = useState<Error>();
  const [data, setData] = useState<Data>();

  useEffect(() => {
    fetch(`${CDN_BASE_URL}/stats.json`)
      .then((r) => r.json())
      .then(setData)
      .catch(setError);
  }, []);

  if (error) return <>Error.</>;
  if (!data) return <>Loading...</>;

  const d = new Date(data.date);
  const hours = Math.round((+new Date() - +d) / 1000 / 60 / 60);

  return (
    <div style={{ margin: 15 }}>
      <a href="./RapiD/" className="start">
        ✨ Click to start mapping!
      </a>
      <table className="busy">
        <thead>
          <tr style={{ fontWeight: 600 }}>
            <td>Code</td>
            <td>Data Category</td>
            <td>No. of addresses</td>
            <td>Percentage of total</td>
            <td>How to action</td>
            <td>Raw data</td>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.count).map(([status, count]) => {
            const [n, category, howToAction, rawFile] =
              META[status as keyof typeof META];
            return (
              <tr>
                <td>{n}</td>
                <td>{category}</td>
                <td>{count.toLocaleString('en-nz')}</td>
                <td>{((count / data.total) * 100).toFixed(2)}%</td>
                <td>{howToAction}</td>
                {rawFile && (
                  <td>
                    <a href={`${CDN_BASE_URL}/${rawFile}`}>download</a>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p style={{ margin: 12 }}>
        Statistics last updated on {d.toLocaleString('en-nz')} ({hours} hours
        ago)
      </p>
      <footer>
        For more infomation, see:
        <ul>
          <li>
            <a href="https://wiki.openstreetmap.org/wiki/Import/New_Zealand_Street_Addresses_(2021)">
              the wiki page
            </a>
          </li>
          <li>
            <a href="https://github.com/osm-nz/linz-address-import">
              the repository containing the source code
            </a>
          </li>
          <li>
            <a href="https://osmcha.org/?aoi=5a4d6cbe-37f9-4b5b-a6d6-0c69dd488a07">
              All changesets uploaded so far
            </a>
          </li>
          <li>
            <a href="https://github.com/osm-nz/linz-address-import/issues/1">
              The import progress
            </a>
          </li>
          <li>
            <a href="#/map">A map of all the sectors requiring attention</a>
          </li>
        </ul>
      </footer>
    </div>
  );
};
