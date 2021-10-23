import ReactDOM from 'react-dom';
import { StrictMode, useEffect, useState } from 'react';
import { Home, Map, WrappedWhatsup } from './pages';

import './index.css';

const getCurrentRoute = () => window.location.hash.substr(1);

const App: React.VFC = () => {
  const [path, setPath] = useState<string>(getCurrentRoute());

  useEffect(() => {
    const onNavigate = () => setPath(getCurrentRoute());
    window.addEventListener('popstate', onNavigate);
    return () => window.removeEventListener('popstate', onNavigate);
  }, []);

  if (path === '/whatsup') return <WrappedWhatsup />;
  if (path === '/map') return <Map />;

  // all other routes: show home page
  return <Home />;
};

ReactDOM.render(
  <StrictMode>
    <App />
  </StrictMode>,
  document.querySelector('main'),
);
