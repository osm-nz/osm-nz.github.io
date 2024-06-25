export const Home: React.FC = () => (
  <div style={{ margin: 16 }}>
    <h1>OpenStreetMap NZ</h1>
    <ul>
      <li>
        <a href="#/address-import">LINZ Address Import</a>
        <ul>
          <li>
            <a href="#/map">Map</a>
          </li>

          <li>
            <a href="/RapiD/">RapiD</a>
          </li>
        </ul>
      </li>
      <li>
        <a href="/missing-streets">Missing Streets</a>
      </li>
      <li>
        <a href="/place-name-conflation">Place Name Conflation</a>
      </li>
      <li>
        For advanced mappers:
        <ul>
          <li>
            <a href="#/upload">OsmPatch Upload Tool</a>
          </li>
          <li>
            <a href="#/restore-history">History Restorer Tool</a>
          </li>
        </ul>
      </li>
    </ul>
  </div>
);
