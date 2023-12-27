import type { OsmChange } from 'osm-api';

export const PlusMinus: React.FC<{ diff: OsmChange }> = ({ diff }) => {
  return (
    <div style={{ padding: 4, color: '#fff' }}>
      <span style={{ background: '#4caf50', padding: 4 }}>
        +{diff.create.length}
      </span>
      <span style={{ background: '#ff9800', padding: 4 }}>
        {diff.modify.length}
      </span>
      <span style={{ background: '#f44336', padding: 4 }}>
        -{diff.delete.length}
      </span>
    </div>
  );
};
