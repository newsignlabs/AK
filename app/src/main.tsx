import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/fraunces/wght-italic.css';
import '@fontsource-variable/inter';
import 'lenis/dist/lenis.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import App, { preloadRoute } from './App';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// Hydrate only when the prerendered HTML is for this exact route. A host may
// serve another page's HTML (SPA fallback, 404.html) — then render fresh.
const path = window.location.pathname.replace(/\/+$/, '') || '/';
if (root.hasChildNodes() && root.dataset.route === path) {
  // Load the page's own chunk first so hydration matches the server HTML.
  preloadRoute(path).finally(() => hydrateRoot(root, app));
} else {
  root.replaceChildren();
  createRoot(root).render(app);
}
