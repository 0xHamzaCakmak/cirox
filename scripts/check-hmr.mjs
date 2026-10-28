import assert from 'node:assert/strict';
import { readFile, appendFile, writeFile } from 'node:fs/promises';

const base = 'http://localhost:3000';
const client = await fetch(base + '/@vite/client').then(response => response.text());
const token = client.match(/(?:const|let) wsToken\s*=\s*["']([^"']+)["']/)?.[1];
assert.ok(token, 'Vite websocket token was not exposed by the development client');
await fetch(base + '/src/index.css');
const socket = new WebSocket(base.replace('http:', 'ws:') + '/?token=' + encodeURIComponent(token), 'vite-hmr');
const marker = '\n/* CIROX temporary HMR connection check */\n';
let changed = false;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Vite websocket connection timed out')), 8000);
    socket.addEventListener('message', event => {
      if (JSON.parse(String(event.data)).type === 'connected') { clearTimeout(timer); resolve(); }
    });
    socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Vite websocket failed')); });
  });
  const update = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('No live CSS update received')), 8000);
    socket.addEventListener('message', event => {
      const data = JSON.parse(String(event.data));
      if (data.type === 'update' && data.updates.some(item => item.path.includes('/src/index.css'))) { clearTimeout(timer); resolve(); }
    });
  });
  await appendFile('src/index.css', marker); changed = true;
  await update;
  console.log('PASS: Vite HMR websocket receives a live CSS update without manual refresh.');
} finally {
  socket.close();
  if (changed) {
    const current = await readFile('src/index.css', 'utf8');
    await writeFile('src/index.css', current.replace(marker, ''));
  }
}
