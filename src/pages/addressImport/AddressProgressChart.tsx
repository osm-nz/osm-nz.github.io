import { useEffect, useMemo, useState } from 'react';
import { Line, type Serie } from '@nivo/line';
import { CDN_BASE_URL } from '../../helpers/const';
import { ADDRESS_CATEGORIES } from './addressCategories';
import type { HistoryFile } from './AddressImportHome';

export const AddressProgressChart: React.FC = () => {
  const [history, setHistory] = useState<HistoryFile>();
  const [min, setMin] = useState(90);

  useEffect(() => {
    fetch(`${CDN_BASE_URL}/stats-history.json`)
      .then((r) => r.json())
      .then(setHistory);
  }, []);

  const chartData = useMemo((): Serie[] => {
    if (!history) return [];

    const series = Object.entries(ADDRESS_CATEGORIES)
      // .filter((cat) => cat !== 'PERFECT' && cat !== 'TOTALLY_MISSING')
      .map(([addressCategory, categoryInfo]): Serie => {
        // eslint-disable-next-line unicorn/no-unreadable-array-destructuring
        const [catNumber, , , colour] = categoryInfo;

        return {
          id: addressCategory,
          color: colour,
          data: history.rows
            .filter((row, index, array) => row.date !== array[index - 1]?.date)
            .map((row) => {
              const percent = +(
                100 *
                (+row.count[catNumber] / +row.total)
              ).toFixed(2);
              return {
                x: row.date.split('T')[0],
                y: Number.isNaN(percent) ? 0 : percent,
              };
            }),
        };
      });
    return series;
  }, [history]);

  if (!chartData.length) return <>Loading…</>;

  console.log({ chartData });

  return (
    <div>
      <Line
        width={window.innerWidth}
        height={500}
        data={chartData}
        margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
        xScale={{
          type: 'time',
          format: '%Y-%m-%d',
          useUTC: false,
        }}
        xFormat="time:%Y-%m-%d"
        yScale={{ type: 'linear', min, max: 'auto', stacked: true }}
        axisBottom={null}
        axisRight={null}
        axisTop={{
          legend: 'Time',
          legendOffset: 36,
          legendPosition: 'middle',
          format: '%Y-%m',
          tickValues: 'every 2 months',
        }}
        axisLeft={{
          legend: 'Percentage',
          legendOffset: -40,
          legendPosition: 'middle',
        }}
        pointSize={0}
        colors={(series) => series.color}
        enableArea
        areaOpacity={1}
      />
      <button type="button" onClick={() => setMin((c) => Math.max(0, c - 2))}>
        ➖
      </button>
      <button type="button" onClick={() => setMin((c) => Math.min(99, c + 2))}>
        ➕
      </button>
    </div>
  );
};
