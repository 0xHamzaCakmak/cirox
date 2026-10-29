// Isolated Chromium layout checks. All API requests are intercepted; no customer data is used.
// Run: node --import tsx scripts/patron-mobile.browser.test.mjs [http://127.0.0.1:3033]
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { EMPTY_BRANCH, EMPTY_COMPANY } from '../src/data/emptyData.ts';

const base = process.argv[2] || 'http://127.0.0.1:3033';
const output = path.resolve('coverage/patron-mobile-qa');
await mkdir(output, { recursive: true });
const profile = await mkdtemp(path.join(tmpdir(), 'cirox-mobile-test-'));
const browser = spawn(process.env.CIROX_TEST_BROWSER || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
  { windowsHide: true, stdio: 'ignore' });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
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
      const id = ++this.seq; this.pending.set(id, { resolve, reject }); this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, handler) { this.listeners.set(method, [...(this.listeners.get(method) || []), handler]); }
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description);
    return result.result.value;
  }
}
let root, page;
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
const company = { ...EMPTY_COMPANY, id: 'center-test', kind: 'center', name: 'Sarıyer Börek Savcı Usta Uzun İşletme Adı', ownerName: 'Savcı Şahin', ownerEmail: 'patron@example.test', branchesCount: 2 };
const branches = [1, 2].map(index => ({ ...EMPTY_BRANCH, id: `branch-${index}`, companyId: `business-${index}`, centerCompanyId: company.id,
  name: `Savcı Usta Sarıyer Börek ${index} — Uzun Şube Adı ve İşletme Birimi`, code: `SAVCI-${index}`, city: 'İstanbul', district: 'Sarıyer', managerName: 'Savcı Usta', phone: '0532 000 00 00',
  staffCount: 2, dailyRevenue: 15432.75, dailyExpense: 4500, netProfit: 10932.75 }));
const expenses = Array.from({ length: 27 }, (_, index) => ({ id: `expense-${index}`, branchId: branches[0].id, branchName: branches[0].name, date: today,
  categoryId: 'ingredients', categoryName: 'Hammadde ve Ürün Alımları', categoryType: 'single', amount: 100 + index, description: 'Uzun açıklamalı gerçek işlem biçimini temsil eden izole test kaydı', createdAt: new Date(Date.now() - index * 60000).toISOString(),
  receipts: index === 0 ? [{ id: 'photo-test', url: '/api/v1/branch/receipts/photo-test', fileName: 'test-fisi.png' }] : [] }));
const data = { user: { id: 'patron-test', role: 'merkez', companyId: company.id, name: company.ownerName, email: company.ownerEmail, title: 'Patron' }, companies: [company], branches,
  dailyRevenueRecords: [{ id: 'rev-test', branchId: branches[0].id, date: today, total: 15432.75, creditCard: 10000, cash: 5000, online: 432.75, other: 0, submittedBy: 'Şube', createdAt: new Date().toISOString() }],
  expenses, expenseCategories: branches.map(branch => ({ id: 'ingredients', branchId: branch.id, name: 'Hammadde ve Ürün Alımları', isActive: true, type: 'single', iconName: 'Receipt', description: '' })),
  staffList: [{ id: 'staff-test', branchId: branches[0].id, fullName: 'Test Personeli', status: 'active', dailyWage: 1000, monthlySalary: 30000, salaryBasis: 'daily' }] };
const errors = [], requests = [], results = [];
const visible = `e => !!(e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden')`;
async function waitFor(expression, label) {
  for (let attempt = 0; attempt < 100; attempt++) { if (await page.evaluate(expression)) return; await delay(100); }
  throw new Error(`Timed out: ${label}`);
}
async function clickText(text, selector = 'button') {
  const found = await page.evaluate(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(selector)})].filter(${visible}).find(e => e.textContent.trim() === ${JSON.stringify(text)} || [...e.querySelectorAll('span')].some(s=>s.textContent.trim() === ${JSON.stringify(text)})); e?.click(); return !!e; })()`);
  assert.ok(found, `Button not found: ${text}`); await delay(100);
}
async function screenshot(name) {
  const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(path.join(output, name + '.png'), Buffer.from(shot.data, 'base64'));
}
async function checkLayout(label, width) {
  const metrics = await page.evaluate(`(() => {
    const main = document.querySelector('main'), nav = document.querySelector('.patron-bottom-nav');
    const interactive = [...document.querySelectorAll('button, input:not([type="checkbox"]), select, textarea')].filter(${visible});
    const tinyTargets = interactive.filter(e => !e.closest('[data-financial-chart]') && (e.getBoundingClientRect().height < 43.5 || (e.tagName === 'BUTTON' && e.getBoundingClientRect().width < 43.5))).map(e => ({text:e.getAttribute('aria-label') || e.textContent.trim(), w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}));
    const smallInputs = [...document.querySelectorAll('input, select, textarea')].filter(${visible}).filter(e=>parseFloat(getComputedStyle(e).fontSize)<16).map(e=>e.outerHTML.slice(0,90));
    const escaped = [...main.querySelectorAll('*')].filter(${visible}).filter(e=>!e.closest('.overflow-x-auto, .settings-tabs') && !e.closest('[data-financial-chart]') && e.getBoundingClientRect().right > innerWidth + 1).map(e=>({tag:e.tagName,cls:e.className})).slice(0,5);
    return {pageWidth:document.documentElement.scrollWidth,mainWidth:main.scrollWidth,mainClient:main.clientWidth, tinyTargets,smallInputs,escaped, navBottom:nav?.getBoundingClientRect().bottom,paddingBottom:parseFloat(getComputedStyle(main).paddingBottom),kpiColumns:getComputedStyle(document.querySelector('.patron-kpis') || document.querySelector('.center-dashboard-kpis') || main).gridTemplateColumns};
  })()`);
  results.push({ label, width, ...metrics });
  assert.ok(metrics.pageWidth <= width + 1, `${label} ${width}: page overflow ${metrics.pageWidth}`);
  assert.ok(metrics.mainWidth <= metrics.mainClient + 1, `${label} ${width}: main overflow ${metrics.mainWidth}/${metrics.mainClient}`);
  assert.deepEqual(metrics.escaped, [], `${label} ${width}: elements outside screen`);
  if (width < 768) {
    assert.deepEqual(metrics.smallInputs, [], `${label} ${width}: input fonts below 16px`);
    assert.deepEqual(metrics.tinyTargets, [], `${label} ${width}: touch targets below 44px`);
    assert.ok(metrics.paddingBottom >= 70, `${label}: bottom navigation clearance`);
  }
}
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await delay(100); }
  }
  assert.ok(port, 'Isolated Chrome did not start');
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  root = await CDP.connect(version.webSocketDebuggerUrl);
  const { targetId } = await root.send('Target.createTarget', { url: 'about:blank' });
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  page = await CDP.connect(targets.find(target => target.id === targetId).webSocketDebuggerUrl);
  page.on('Runtime.exceptionThrown', value => errors.push(value.exceptionDetails.exception?.description || value.exceptionDetails.text));
  await page.send('Runtime.enable'); await page.send('Page.enable');
  page.on('Fetch.requestPaused', async event => {
    const url = new URL(event.request.url);
    requests.push({ path: url.pathname, method: event.request.method });
    if (url.pathname.includes('/receipts/')) {
      const image = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="440"><rect width="320" height="440" fill="white"/><text x="25" y="50" fill="black" font-size="20">CIROX TEST RECEIPT</text></svg>';
      await page.send('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/svg+xml' }, { name: 'Cache-Control', value: 'no-store' }], body: Buffer.from(image).toString('base64') });
      return;
    }
    const feed = { events: [{ id: '1', branchId: branches[0].id, branchName: branches[0].name, title: 'Günlük ciro kaydedildi', detail: 'İzole tarayıcı testi bildirimi', tone: 'income', kind: 'revenue_created', amount: 15432.75, actorName: 'Şube Kullanıcısı', createdAt: new Date().toISOString(), read: false }], unreadCount: 1, latestId: '1' };
    const payload = url.pathname.endsWith('/auth/me') ? data : url.pathname.endsWith('/notifications') ? feed : { error: 'Test intercepted this request.' };
    await page.send('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: event.request.method === 'GET' ? 200 : 403,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Cache-Control', value: 'no-store' }], body: Buffer.from(JSON.stringify(payload)).toString('base64') });
  });
  await page.send('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
  for (const width of [320, 360, 375, 390, 430, 768, 1024, 1440, 1920]) {
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: width < 768 ? 844 : 1000, deviceScaleFactor: 1, mobile: width < 768 });
    await page.send('Page.navigate', { url: base });
    await waitFor(`document.querySelector('.center-dashboard-overview') !== null`, 'dashboard'); await delay(400);
    await checkLayout('dashboard', width);
    if (width < 768) {
      await clickText('Şubeler', '.patron-bottom-nav button');
      await waitFor(`document.querySelector('.branches-page') !== null`, 'branches');
      assert.ok(await page.evaluate(`!!document.querySelector('.branches-page [role="button"]')`), 'Mobile defaults to cards');
      await checkLayout('branch-cards', width);
      await page.evaluate(`(() => { const input=document.querySelector('input[aria-label="Şube ara"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'bulunmayan-şube'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`); await delay(100);
      assert.equal(await page.evaluate(`document.querySelectorAll('.branches-page [role="button"]').length`), 0, 'Mobile branch search filters records');
      await page.evaluate(`(() => { const input=document.querySelector('input[aria-label="Şube ara"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,''); input.dispatchEvent(new Event('input',{bubbles:true})); })()`); await delay(100);
      await clickText('Tablo'); await checkLayout('branch-table', width);
      await clickText('Kartlar');
      await page.evaluate(`document.querySelector('.branches-page [role="button"]').click()`); await delay(100);
      await waitFor(`document.querySelector('.patron-branch-inspection') !== null`, 'branch inspection');
      await checkLayout('inspection', width);
      await page.evaluate(`(() => { const select=document.querySelector('.patron-period-fields select'); select.value='7days'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`); await delay(100);
      assert.ok(await page.evaluate(`document.querySelector('.patron-kpis').textContent.includes('Dönem Cirosu')`), 'Period preset updates summary');
      await page.evaluate(`(() => { const fields=[...document.querySelectorAll('.patron-period-fields input')]; for(const [index,value] of [${JSON.stringify(today.slice(0, 8) + '01')},${JSON.stringify(today)}].entries()) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(fields[index],value); fields[index].dispatchEvent(new Event('input',{bubbles:true})); fields[index].dispatchEvent(new Event('change',{bubbles:true})); } })()`); await delay(100);
      assert.ok(await page.evaluate(`document.querySelector('.patron-period-fields select').value === 'custom'`), 'Custom dates override preset');
      const columns = await page.evaluate(`({ kpi: getComputedStyle(document.querySelector('.patron-kpis')).gridTemplateColumns.split(' ').length, distributions: getComputedStyle(document.querySelector('.patron-distributions')).gridTemplateColumns.split(' ').length, staff: getComputedStyle(document.querySelector('.patron-staff-grid')).gridTemplateColumns.split(' ').length })`);
      assert.deepEqual(columns, { kpi: 2, distributions: 1, staff: 1 }, `Inspection mobile grids ${width}`);
      await page.evaluate(`document.querySelector('main').scrollTop = document.querySelector('main').scrollHeight`); await delay(50);
      const clear = await page.evaluate(`document.querySelector('.patron-staff-grid').getBoundingClientRect().bottom <= document.querySelector('.patron-bottom-nav').getBoundingClientRect().top`);
      assert.ok(clear, `Personnel summary clears bottom nav ${width}`);
      await screenshot(`inspection-${width}-bottom`);
      await page.evaluate(`document.querySelector('main').scrollTop = 0`); await screenshot(`inspection-${width}`);
      await clickText('Son İşlemler');
      await waitFor(`document.querySelector('.branch-expense-history') !== null`, 'history');
      await checkLayout('history', width);
      assert.equal(await page.evaluate(`document.querySelectorAll('.branch-expense-history tbody tr').length`), 10);
      await page.evaluate(`document.querySelector('.branch-expense-history button[aria-label$="fişlerini görüntüle"]').click()`);
      await waitFor(`!!document.querySelector('.receipt-modal-body img')?.complete`, 'receipt image');
      assert.ok(await page.evaluate(`(() => { const r=document.querySelector('.receipt-modal-panel').getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth && r.bottom<=innerHeight; })()`), `Receipt viewer fits ${width}`);
      await screenshot(`receipt-${width}`);
      await page.evaluate(`document.querySelector('.receipt-modal button[title="Kapat"]').click()`);
      await page.evaluate(`(() => { const select=document.querySelector('.branch-expense-history select'); select.value='25'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`); await delay(100);
      assert.equal(await page.evaluate(`document.querySelectorAll('.branch-expense-history tbody tr').length`), 25);
      await page.evaluate(`document.querySelector('button[aria-label="Sonraki sayfa"]').click()`); await delay(100);
      assert.equal(await page.evaluate(`document.querySelectorAll('.branch-expense-history tbody tr').length`), 2);
      await page.evaluate(`(() => { const select=document.querySelector('.branch-expense-history select'); select.value='50'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`); await delay(100);
      assert.equal(await page.evaluate(`document.querySelectorAll('.branch-expense-history tbody tr').length`), 27);
      await page.evaluate(`document.querySelector('button[aria-label="Şube incelemeye geri dön"]').click()`); await delay(100);
      assert.deepEqual(await page.evaluate(`[...document.querySelectorAll('.patron-period-fields input')].map(e=>e.value)`), [today.slice(0, 8) + '01', today], 'Back preserves date interval');
      await page.evaluate(`(() => { const select=document.querySelector('.patron-mobile-branch-select select'); select.value='branch-2'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`); await delay(100);
      assert.ok(await page.evaluate(`document.querySelector('.patron-mobile-branch-select select').value==='branch-2' && document.querySelector('.patron-kpis').textContent.includes('0')`), 'Branch selection updates inspection');
      await page.evaluate(`document.querySelector('.patron-mobile-header-row button[aria-label="Menüyü Aç"]').click()`); await delay(100);
      assert.ok(await page.evaluate(`!!document.querySelector('[role="dialog"]')`));
      await screenshot(`drawer-${width}`);
      await clickText('Ayarlar', '.patron-drawer-panel nav button');
      await waitFor(`document.querySelector('.settings-page') !== null`, 'settings');
      await checkLayout('settings', width);
      await screenshot(`settings-${width}`);
      await page.evaluate(`document.querySelector('button[aria-label^="Bildirimler"]').click()`); await delay(100);
      const notificationFits = await page.evaluate(`(() => { const r=document.querySelector('[data-notification-popover]').getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth && r.bottom<=innerHeight; })()`);
      assert.ok(notificationFits, `Notification popup ${width}`);
      await page.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
      await clickText('Panel', '.patron-bottom-nav button');
      await page.evaluate(`document.querySelector('button[aria-label="Gündüz moduna geç"]')?.click()`); await delay(100);
      await checkLayout('dashboard-light', width); await screenshot(`dashboard-${width}`);
      await page.send('Page.reload');
      await waitFor(`document.querySelector('.app-shell')?.dataset.theme === 'light'`, 'saved light theme');
      await page.evaluate(`document.querySelector('button[aria-label="Gece moduna geç"]')?.click()`); await delay(100);
    } else {
      assert.equal(await page.evaluate(`getComputedStyle(document.querySelector('.patron-bottom-nav')).display`), 'none');
      await clickText('Şubeler', 'aside nav button');
      await waitFor(`document.querySelector('.branches-page') !== null`, 'desktop branches');
      assert.ok(await page.evaluate(`!!document.querySelector('.patron-branches-table')`), 'Desktop defaults to table independently');
      await screenshot(`desktop-branches-${width}`);
      await page.evaluate(`document.querySelector('.patron-branches-table tbody tr').click()`); await delay(100);
      await checkLayout('inspection-tablet-desktop', width);
    }
  }
  data.dailyRevenueRecords = []; data.expenses = [];
  await page.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 844, deviceScaleFactor: 1, mobile: true });
  await page.send('Page.reload');
  await waitFor(`document.querySelector('.patron-dashboard-empty') !== null`, 'empty ledger message');
  assert.equal(await page.evaluate(`getComputedStyle(document.querySelector('.patron-dashboard-empty')).display`), 'flex');
  await checkLayout('empty-dashboard', 375); await screenshot('empty-dashboard-375');
  for (const role of ['sube', 'admin']) {
    data.user = { ...data.user, role, companyId: role === 'sube' ? 'business-1' : company.id, branchId: role === 'sube' ? 'branch-1' : undefined, branchName: role === 'sube' ? branches[0].name : undefined };
    if (role === 'sube') data.companies.push({ ...company, id: 'business-1', kind: 'business', name: branches[0].name });
    await page.send('Page.reload');
    await waitFor(`document.querySelector('.app-shell')?.dataset.ownerRole === ${JSON.stringify(role)}`, `${role} isolation`);
    assert.equal(await page.evaluate(`!!document.querySelector('.patron-mobile-header, .patron-bottom-nav')`), false, `${role} must retain its existing header and navigation`);
    await screenshot(`other-role-${role}-375`);
  }
  assert.deepEqual(errors, [], 'Browser runtime errors');
  assert.deepEqual(requests.filter(request => request.method !== 'GET'), [], 'Layout checks must not write data');
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ browser: version.Browser, results, requests, errors }, null, 2));
  console.log(`PASS: ${results.length} layout checks at 9 widths; screenshots in ${output}`);
} catch (error) {
  if (page) { await screenshot('failure').catch(() => {}); await writeFile(path.join(output, 'failure.json'), JSON.stringify({ error: error.message, results, errors }, null, 2)); }
  throw error;
} finally {
  if (root) await root.send('Browser.close').catch(() => {});
  page?.socket.close(); root?.socket.close(); browser.kill();
  if (path.dirname(profile) === path.resolve(tmpdir()) && path.basename(profile).startsWith('cirox-mobile-test-')) await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
}
