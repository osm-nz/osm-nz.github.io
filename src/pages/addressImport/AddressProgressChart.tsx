import { useState, useMemo, useEffect } from 'react';
import { Line, Serie } from '@nivo/line';
import { ADDRESS_CATEGORIES, AddressCategory } from './addressCategories';

type MarkdownTableRow = {
  [K in AddressCategory]: string;
} & {
  Sync_Date: string;
  Total: string;
  Comment: string;
};

function parseMarkdownTable(markdown: string) {
  const rows = markdown.replaceAll('\r', '').split('---')[1].trim().split('\n');

  const headers = rows[0]
    .split('|')
    .map((header) => header.replaceAll(' ', '_'));

  const table = rows
    .slice(2) // skip header and dividor row
    .map(
      (row) =>
        Object.fromEntries(
          row.split('|').map((cell, index) => [headers[index], cell]),
        ) as MarkdownTableRow,
    );
  return table;
}

export const AddressProgressChart: React.FC = () => {
  const [markdown, setMarkdown] = useState<string>();
  const [min, setMin] = useState(90);

  useEffect(() => {
    fetch('https://api.github.com/repos/osm-nz/linz-address-import/issues/1')
      .then((r) => r.json())
      .then((issue) => setMarkdown(issue.body));
  }, []);

  const chartData = useMemo((): Serie[] => {
    if (!markdown) return [];

    const table = parseMarkdownTable(markdown);

    const series = Object.entries(ADDRESS_CATEGORIES)
      // .filter((cat) => cat !== 'PERFECT' && cat !== 'TOTALLY_MISSING')
      .map(([_addressCategory, categoryInfo]): Serie => {
        const addressCategory = _addressCategory as AddressCategory; // TS is dumb
        const [, , , colour] = categoryInfo;

        return {
          id: addressCategory,
          color: colour,
          data: table
            .filter(
              (row, index) => row.Sync_Date !== table[index - 1]?.Sync_Date,
            )
            .map((row) => {
              const percent = +(
                100 *
                (+row[addressCategory] / +row.Total)
              ).toFixed(2);
              return {
                x: row.Sync_Date,
                y: Number.isNaN(percent) ? 0 : percent,
              };
            }),
        };
      });
    return series;
  }, [markdown]);

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
