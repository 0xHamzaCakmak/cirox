// Isolated admin UI test. API requests use fixtures; no customer account is modified.
// Run after npm run build: node --import tsx scripts/center-users.browser.test.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { EMPTY_COMPANY } from '../src/data/emptyData.ts';

class CDP {
  pending = new Map(); listeners = new Map(); seq = 0;
  constructor(socket) {
    this.socket = socket;
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const request = this.pending.get(message.id); this.pending.delete(message.id);
        if (message.error) request?.reject(new Error(message.error.message)); else request?.resolve(message.result);
      } else this.listeners.get(message.method)?.forEach(handler => handler(message.params));
    });
  }
  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    return new CDP(socket);
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.seq;
      const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
      this.pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(error); } });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, handler) { this.listeners.set(method, [...(this.listeners.get(method) || []), handler]); }
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const output = path.resolve('coverage/center-users-qa'); await mkdir(output, { recursive: true });
const dist = path.resolve('dist');
const server = createServer(async (req, res) => {
  const filename = path.resolve(dist, '.' + new URL(req.url, 'http://localhost').pathname);
  if (filename !== dist && !filename.startsWith(dist + path.sep)) { res.writeHead(403).end(); return; }
  try {
    const data = await readFile(filename === dist ? path.join(dist, 'index.html') : filename);
    res.setHeader('Content-Type', filename.endsWith('.js') ? 'text/javascript' : filename.endsWith('.css') ? 'text/css' : filename.endsWith('.webmanifest') ? 'application/manifest+json' : 'text/html'); res.end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const profile = await mkdtemp(path.join(tmpdir(), 'cirox-center-users-test-'));
const browser = spawn(process.env.CIROX_TEST_BROWSER || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let root, page;
const errors = [], writes = [];
const company = { ...EMPTY_COMPANY, id: 'center-test', kind: 'center', name: 'Sarıyer Börekçi', ownerName: 'Test Patron', ownerEmail: 'owner@example.test', createdAt: new Date().toISOString(), branchesCount: 40 };
const branches = Array.from({ length: 40 }, (_, i) => ({ id: `branch-${i + 1}`, name: `Sarıyer Şube ${i + 1}`, city: 'İstanbul', district: 'Sarıyer' }));
const users = Array.from({ length: 5 }, (_, i) => ({ id: `user-${i + 1}`, name: `Ortak ${i + 1}`, username: `ortak${i + 1}`, email: `ortak${i + 1}@example.test`, phone: '', active: true, access: 'selected', branchIds: branches.slice(i, i + 2).map(branch => branch.id) }));
const bootstrap = { user: { id: 'admin-test', role: 'admin', name: 'Test Admin' }, companies: [company], branches: [], managedUsers: [], dailyRevenueRecords: [], expenses: [], staffList: [] };
try {
  let port;
  for (let i = 0; i < 100; i++) { try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await delay(100); } }
  assert.ok(port, 'Chrome started');
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); root = await CDP.connect(version.webSocketDebuggerUrl);
  const { targetId } = await root.send('Target.createTarget', { url: 'about:blank' });
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); page = await CDP.connect(targets.find(target => target.id === targetId).webSocketDebuggerUrl);
  page.on('Runtime.exceptionThrown', value => errors.push(value.exceptionDetails.exception?.description || value.exceptionDetails.text));
  await page.send('Runtime.enable'); await page.send('Page.enable');
  await page.send('Network.enable'); await page.send('Network.setBypassServiceWorker', { bypass: true });
  page.on('Fetch.requestPaused', async event => {
    const url = new URL(event.request.url); let payload;
    if (url.pathname.includes('/centers/center-test/users')) {
      if (event.request.method === 'POST') {
        const input = JSON.parse(event.request.postData); writes.push(input);
        const id = url.pathname.endsWith('/users') ? 'user-new' : url.pathname.split('/').at(-1);
        const existing = users.findIndex(user => user.id === id); const { newPassword: _password, ...fields } = input;
        if (existing < 0) users.push({ ...fields, id }); else users[existing] = { ...fields, id };
        payload = { userId: id };
      } else payload = { center: { id: company.id, name: company.name }, branches, users };
    } else if (url.pathname.endsWith('/auth/me')) payload = bootstrap;
    else if (url.pathname.endsWith('/admin/accounts')) payload = { accounts: [{ ...company, status: 'active', branchLimit: 50, users: [], branches }] };
    else if (url.pathname.endsWith('/notifications')) payload = { events: [], unreadCount: 0, latestId: '0' };
    else payload = { bankAccounts: [], payments: [] };
    await page.send('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(payload)).toString('base64') });
  });
  await page.send('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
  const wait = async expression => { for (let i = 0; i < 100; i++) { if (await page.evaluate(expression)) return; await delay(100); } throw new Error('Timed out: ' + expression); };
  const click = async label => { await page.evaluate(`(() => { const button=[...document.querySelectorAll('button')].find(item=>item.textContent.includes(${JSON.stringify(label)})); if (!button) throw new Error('Missing button'); button.click(); })()`); await delay(100); };
  const set = async (label, value) => { await page.evaluate(`(() => { const input=[...document.querySelectorAll('form label')].find(item=>item.textContent.includes(${JSON.stringify(label)})).querySelector('input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`); await delay(50); };
  for (const width of [390, 1440]) {
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
    await page.send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` });
    await wait(`document.querySelector('aside nav') !== null`);
    // The desktop sidebar is present in the DOM on mobile too.
    await page.evaluate(`document.querySelector('aside nav button').click()`);
    await wait(`document.querySelector('#admin-businesses-title') !== null`);
    await wait(`[...document.querySelectorAll('button')].some(button=>button.textContent.includes('Kullanıcılar ve Şube Yetkileri'))`);
    await click('Kullanıcılar ve Şube Yetkileri');
    await wait(`document.querySelector('input[aria-label="Yetkilendirilecek işletme ara"]') !== null`);
    assert.equal(await page.evaluate(`[...document.querySelectorAll('form label')].filter(label=>label.textContent.includes('Sarıyer Şube')).length`), 40);
    if (width < 1024) {
      await page.evaluate(`(() => { const select=[...document.querySelectorAll('label')].find(label=>label.textContent.includes('Merkez Kullanıcısı')).querySelector('select'); select.value='user-2'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`); await delay(100);
    } else await click('Ortak 2');
    await page.evaluate(`(() => { const row=[...document.querySelectorAll('form label')].find(label=>label.textContent.includes('Sarıyer Şube 2')); row.querySelector('input').click(); })()`); await delay(100);
    await click('Kullanıcı ve Yetkileri Kaydet'); await wait(`document.querySelector('[role=status]')?.textContent.includes('kaydedildi')`);
    assert.deepEqual(writes.at(-1).branchIds, ['branch-3']);
    await click('Yeni Ortak / Kullanıcı Ekle');
    await set('Ad Soyad', 'Yeni Ortak'); await set('Kullanıcı Adı', 'yeniortak'); await set('Giriş E-Postası', 'new@example.test'); await set('Şifre', 'ExamplePassword123');
    await page.evaluate(`(() => { const row=[...document.querySelectorAll('form label')].find(label=>label.textContent.includes('Sarıyer Şube 40')); row.querySelector('input').click(); })()`); await delay(100);
    await click('Kullanıcı ve Yetkileri Kaydet'); await wait(`document.querySelector('[role=status]')?.textContent.includes('kaydedildi')`);
    assert.deepEqual(writes.at(-1).branchIds, ['branch-40']); assert.equal(writes.at(-1).access, 'selected');
    assert.equal(await page.evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, 'No horizontal overflow');
    await writeFile(path.join(output, `center-users-${width}.png`), Buffer.from((await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
    // Reset the existing user before testing the next viewport.
    users[1].branchIds = ['branch-2', 'branch-3'];
  }
  assert.deepEqual(errors, []); console.log('PASS: center user selection, branch changes and new partners at 390px and 1440px');
} catch (error) {
  console.error(JSON.stringify({ errors, body: page ? await page.evaluate('document.body.innerText').catch(() => '') : '' }));
  if (page) await writeFile(path.join(output, 'failure.png'), Buffer.from((await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64')).catch(() => {});
  throw error;
} finally {
  if (root) await root.send('Browser.close').catch(() => {});
  page?.socket.close(); root?.socket.close(); browser.kill();
  await new Promise(resolve => server.close(resolve));
  if (path.dirname(profile) === path.resolve(tmpdir()) && path.basename(profile).startsWith('cirox-center-users-test-')) await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
}
