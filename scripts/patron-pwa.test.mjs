// Validate the generated PWA artifact after `npm run build`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import sharp from 'sharp';

test('the installable app has valid regular/maskable icons and Turkish metadata', async () => {
  const manifest = JSON.parse(await readFile('dist/manifest.webmanifest', 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'tr');
  assert.equal(manifest.scope, '/'); assert.equal(manifest.start_url, '/');
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
  for (const icon of manifest.icons) {
    const metadata = await sharp('dist' + icon.src).metadata();
    assert.equal(`${metadata.width}x${metadata.height}`, icon.sizes);
  }
});

test('generated service worker never precaches API data and uses network-only API routing', async () => {
  const routes = []; let precache;
  class NetworkOnly {}
  class NavigationRoute { constructor(handler, options) { this.options = options; } }
  const workbox = { NetworkOnly, NavigationRoute, registerRoute: (...route) => routes.push(route),
    precacheAndRoute: entries => { precache = entries; }, clientsClaim() {}, cleanupOutdatedCaches() {}, createHandlerBoundToURL: () => () => {} };
  const define = (dependencies, factory) => factory(workbox);
  runInNewContext(await readFile('dist/sw.js', 'utf8'), { self: { define, skipWaiting() {} }, define });
  assert.ok(precache.length > 0);
  assert.ok(precache.every(entry => !entry.url.includes('/api/')));
  const navigation = routes.find(([route]) => route instanceof NavigationRoute)[0];
  for (const endpoint of ['/api', '/api/v1/auth/me', '/api/v1/notifications', '/api/v1/branch/receipts/test']) {
    assert.ok(navigation.options.denylist.some(pattern => pattern.test(endpoint)), `API must not use HTML fallback: ${endpoint}`);
  }
  for (const endpoint of ['/api/v1/auth/me', '/api/v1/notifications', '/api/v1/branch/revenue', '/api/v1/branch/receipts/test']) {
    const route = routes.find(([pattern, handler, method]) => handler instanceof NetworkOnly && method === 'GET' && pattern.test(endpoint));
    assert.ok(route, `Sensitive API must be network-only: ${endpoint}`);
  }
});

test('the HTML supports safe areas, user zoom, and iOS home-screen installation', async () => {
  const html = await readFile('dist/index.html', 'utf8');
  assert.match(html, /viewport-fit=cover/);
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1/);
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /rel="apple-touch-icon"/);
  const icon = await sharp('public/apple-touch-icon.png').metadata();
  assert.equal(icon.width, 180); assert.equal(icon.height, 180);
});
