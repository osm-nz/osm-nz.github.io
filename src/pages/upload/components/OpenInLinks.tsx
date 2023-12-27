import type { OsmFeatureType } from 'osm-api';

export const OpenInLinks: React.FC<{
  type: OsmFeatureType;
  id: number;
}> = ({ type, id }) => {
  return (
    <span>
      <a
        href={`https://osm.org/${type}/${id}`}
        target="_blank"
        rel="noreferrer"
      >
        OSM
      </a>{' '}
      |{' '}
      <a
        href={`https://osm.org/edit?${type}=${id}`}
        target="_blank"
        rel="noreferrer"
      >
        iD
      </a>{' '}
      |{' '}
      <a
        href={`https://osmlab.github.io/osm-deep-history/#/${type}/${id}`}
        target="_blank"
        rel="noreferrer"
      >
        Deep History
      </a>{' '}
      |{' '}
      <a
        href={`https://pewu.github.io/osm-history/#/${type}/${id}`}
        target="_blank"
        rel="noreferrer"
      >
        PeWu
      </a>{' '}
    </span>
  );
};
