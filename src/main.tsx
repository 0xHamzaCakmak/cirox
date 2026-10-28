import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

async function startApp() {
  if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const appWorker = (worker: ServiceWorker | null) => worker && new URL(worker.scriptURL).origin === location.origin
        && /\/(dev-sw|sw)\.js$/.test(new URL(worker.scriptURL).pathname);
      const stale = registrations.filter(registration => appWorker(registration.active) || appWorker(registration.waiting) || appWorker(registration.installing));
      for (const registration of stale) await registration.unregister();
      if (stale.length && appWorker(navigator.serviceWorker.controller) && !sessionStorage.getItem('cirox-dev-worker-reset')) {
        sessionStorage.setItem('cirox-dev-worker-reset', '1'); location.reload(); return;
      }
    } catch { /* HMR still works if this browser does not expose service workers. */ }
  }
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
}
void startApp();
