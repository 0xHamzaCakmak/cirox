import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { ReceiptCache } from '../services/receipt-cache';
import { optimizeReceipt } from '../services/receipt-image';

test('receipt optimization preserves small dimensions, rotates, bounds resolution and strips metadata', async () => {
  const source = await sharp({ create: { width: 5000, height: 2000, channels: 3, background: '#f0f0f0' } })
    .jpeg({ quality: 96 }).withMetadata({ orientation: 6 }).toBuffer();
  const optimized = await optimizeReceipt(source);
  const meta = await sharp(optimized).metadata();
  assert.equal(meta.format, 'webp'); assert.equal(meta.height, 4096); assert.equal(meta.width, 1638);
  assert.equal(meta.exif, undefined); assert.equal(meta.orientation, undefined);
  assert.ok(optimized.length < source.length);
  const small = await sharp({ create: { width: 300, height: 800, channels: 3, background: 'white' } }).png().toBuffer();
  const smallMeta = await sharp(await optimizeReceipt(small)).metadata();
  assert.equal(smallMeta.width, 300); assert.equal(smallMeta.height, 800);
  await assert.rejects(() => optimizeReceipt(Buffer.from('invalid image')), /Görsel okunamadı/);
});

test('receipt cache coalesces reads, limits bytes, evicts LRU, expires and retries failed reads', async () => {
  let now = 0, loads = 0;
  const cache = new ReceiptCache(6, 50, () => now);
  const load = async () => { loads++; return Buffer.from('123'); };
  await Promise.all([cache.get('a', load), cache.get('a', load)]); assert.equal(loads, 1);
  await cache.get('b', load); await cache.get('a', load); assert.equal(loads, 2);
  await cache.get('c', load); await cache.get('b', load); assert.equal(loads, 4);
  now = 51; await cache.get('b', load); assert.equal(loads, 5);
  cache.delete('b'); await cache.get('b', load); assert.equal(loads, 6);
  let largeLoads = 0;
  const large = async () => { largeLoads++; return Buffer.alloc(7); };
  await cache.get('large', large); await cache.get('large', large); assert.equal(largeLoads, 2);
  await assert.rejects(() => cache.get('failed', async () => { throw new Error('offline'); }), /offline/);
  assert.equal((await cache.get('failed', load)).length, 3);
});
