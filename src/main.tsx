import React from 'react';
import ReactDOM from 'react-dom/client';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { MusicProvider } from './context/MusicContext';
import { Desktop } from './components/Desktop';
import { ErrorBoundary } from './components/ErrorBoundary';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import './styles/base.css';
import './styles/desktop.css';
import './styles/apps.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WorkspaceProvider>
        <MusicProvider>
          <Desktop />
        </MusicProvider>
      </WorkspaceProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
