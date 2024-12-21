import { useEffect, useState } from 'react';
import TimeAgo from 'react-timeago-i18n';
import { CDN_BASE_URL } from '../../helpers/const';
import { ADDRESS_CATEGORIES, type AddressCategory } from './addressCategories';
import { AddressProgressChart } from './AddressProgressChart';

type Data = {
  date: number;
  count: Record<AddressCategory, number>;
  total: number;
};

export const AddressImportHome: React.FC = () => {
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
            const [n, category, howToAction, backgroundColor, rawFile] =
              ADDRESS_CATEGORIES[status as AddressCategory];
            return (
              <tr key={status}>
                <td style={{ backgroundColor }}>{n}</td>
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
      <AddressProgressChart />

      <p style={{ margin: 12 }}>
        Statistics last updated{' '}
        <strong>
          <TimeAgo date={d} />
        </strong>
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
            <a href="#/map">A map of all the sectors requiring attention</a>
          </li>
        </ul>
      </footer>
    </div>
  );
};
