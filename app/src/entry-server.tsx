import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App, { preloadRoute } from './App';

export { pages, notFoundMeta, adminMeta } from './lib/meta';
export { site, categories, getPhoto } from './lib/content';

/** Renders a route to HTML. Code-split pages are preloaded so nothing suspends. */
export async function render(url: string): Promise<string> {
  await preloadRoute(url);
  const html = renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  );
  if (html.includes('<!--$?-->') || html.includes('<!--$!-->')) {
    throw new Error(`Prerender of ${url} suspended; content would be missing without JS.`);
  }
  return html;
}
