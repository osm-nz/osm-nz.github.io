import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AddressImportHome,
  HistoryRestorer,
  Home,
  LinzLink,
  Map,
  Upload,
  WrappedWhatsup,
  layerKey,
} from './pages';

import './index.css';

const getCurrentRoute = () => window.location.hash.slice(1);

// eslint-disable-next-line no-useless-assignment -- false positive
const App: React.FC = () => {
  const [path, setPath] = useState<string>(getCurrentRoute());

  useEffect(() => {
    const onNavigate = () => setPath(getCurrentRoute());
    window.addEventListener('popstate', onNavigate);
    return () => window.removeEventListener('popstate', onNavigate);
  }, []);

  // has priority over the URL hash
  if (layerKey) return <LinzLink />;

  if (path === '/whatsup') return <WrappedWhatsup />;
  if (path === '/upload') return <Upload />;
  if (path === '/map') return <Map />;
  if (path === '/restore-history') return <HistoryRestorer />;
  if (path === '/address-import') return <AddressImportHome />;

  // all other routes: show home page
  return <Home />;
};

createRoot(document.querySelector('main')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
