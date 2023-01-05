import { getConfig } from 'osm-api';
import { useContext, useState } from 'react';
import { AuthContext, AuthGateway } from '../../wrappers';
import { save, validate } from './api';
import { Item, NWR, ValidationResult } from './util';
import classes from './HistoryRestorer.module.css';

const NEW_FEATURE = (): Item => ({ type: 'n' });

const SelectNWR: React.FC<{ value: NWR; onChange(newVal: NWR): void }> = ({
  value,
  onChange,
}) => {
  return (
    <select
      className={classes.smallInput}
      value={value}
      onChange={(e) => onChange(e.target.value as NWR)}
    >
      <option value="n">Node</option>
      <option value="w">Way</option>
      <option value="r">Relation</option>
    </select>
  );
};

const HistoryRestorerInner: React.FC = () => {
  const { user, logout } = useContext(AuthContext);

  const [items, setItems] = useState<Item[]>([NEW_FEATURE()]);
  const [reload, setReload] = useState(0);
  const [validationResults, setValidationResults] =
    useState<ValidationResult[]>();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<number>();

  function updateVal<T extends keyof Item>(
    index: number,
    attribute: T,
    newValue: Item[T],
  ) {
    setItems((list) =>
      list.map((x, j) => (index === j ? { ...x, [attribute]: newValue } : x)),
    );
    setValidationResults(undefined); // invalidate
  }

  async function onSubmit() {
    setLoading(true);
    try {
      if (!validationResults) {
        // validate
        setValidationResults(await validate(items));
      } else {
        // save to OSM
        setDone(await save(validationResults));
      }
    } catch (ex) {
      console.error(ex);
      alert(`${ex}`); // eslint-disable-line no-alert
    }
    setLoading(false);
  }

  if (done) {
    return (
      <div className={classes.main}>
        <a
          href={`${getConfig().apiUrl}/changeset/${done}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Done!
        </a>
        <br />
        <br />
        <button
          type="button"
          className={classes.btn}
          onClick={() => {
            setItems([NEW_FEATURE()]);
            setValidationResults(undefined);
            setDone(undefined);
            setReload((x) => x + 1);
          }}
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className={classes.main}>
      <h2>Restore OSM History</h2>
      <p>
        If an OSM Feature was deleted and redrawn, you can restore the history
        of the original feature using this tool.
        <br />
        <br />
        <a
          href="https://wiki.osm.org/HistoryRestorer"
          target="_blank"
          rel="noopener noreferrer"
        >
          Wiki
        </a>{' '}
        |{' '}
        <a
          href="https://github.com/osm-nz/osm-nz.github.io/tree/main/src/pages/HistoryRestorer"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source Code
        </a>
        <br />
        <br />
      </p>
      <div className={classes.list}>
        <div className={classes.item} key={0}>
          <strong>Deleted Feature</strong>
          <strong>New Feature</strong>
        </div>
        {items.map((item, i) => {
          const v = validationResults?.[i];
          return (
            // eslint-disable-next-line react/no-array-index-key -- `reload` makes this safe
            <div className={classes.item} key={reload + i}>
              <div>
                <SelectNWR
                  value={item.type}
                  onChange={(newType) => updateVal(i, 'type', newType)}
                />
                <input
                  className={classes.smallInput}
                  type="tel"
                  value={item.fromId || ''}
                  onChange={(e) => updateVal(i, 'fromId', +e.target.value)}
                />
                {v && (
                  <small>
                    <br />
                    <strong>{v.oldPreset}</strong> &nbsp; {v.oldName}
                    {v.error && (
                      <span className={classes.error}>
                        <br />
                        {v.error}
                      </span>
                    )}
                  </small>
                )}
              </div>
              <div>➡️</div>
              <div>
                <SelectNWR
                  value={item.type}
                  onChange={(newType) => updateVal(i, 'type', newType)}
                />
                <input
                  className={classes.smallInput}
                  type="tel"
                  value={item.toId || ''}
                  onChange={(e) => updateVal(i, 'toId', +e.target.value)}
                />
                {v && (
                  <small>
                    <br />
                    <strong>{v.newPreset}</strong> &nbsp; {v.newName}
                  </small>
                )}
              </div>
              <div>
                <button
                  type="button"
                  disabled={items.length === 1}
                  className={`${classes.btn} ${classes.smallInput}`}
                  onClick={() => {
                    setReload((x) => x + 1);
                    setValidationResults(undefined); // invalidate
                    setItems((list) => {
                      const newList = [...list];
                      newList.splice(i, 1);
                      return newList;
                    });
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <br />
      <button
        type="button"
        className={classes.btn}
        onClick={() => {
          setItems((i) => [...i, NEW_FEATURE()]);
          setValidationResults(undefined); // invalidate
        }}
      >
        Add Another feature
      </button>
      <br />
      <br />
      {loading && <>Loading...</>}
      <button
        type="submit"
        disabled={loading}
        onClick={onSubmit}
        className={`${classes.btn} ${validationResults ? classes.saveBtn : ''}`}
      >
        {validationResults ? 'Save' : 'Next'}
      </button>
      <br />
      <br />
      Logged in as <code>{user.display_name}</code>.{' '}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/anchor-is-valid */}
      <a onClick={logout}>Logout</a>
    </div>
  );
};

export const HistoryRestorer: React.FC = () => (
  <AuthGateway>
    <HistoryRestorerInner />
  </AuthGateway>
);
