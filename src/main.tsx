import '@fontsource-variable/unbounded';
import '@fontsource-variable/onest';
import '@fontsource-variable/jetbrains-mono';
import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { FeedbackProvider } from './components/Feedback';

// All data lives in this browser's IndexedDB: ask Chrome not to evict it under storage pressure.
navigator.storage
  ?.persisted?.()
  .then((persisted) => persisted || navigator.storage.persist())
  .catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </HashRouter>
  </StrictMode>,
);
