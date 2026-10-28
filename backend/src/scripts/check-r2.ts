import assert from 'node:assert/strict';
import sharp from 'sharp';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { storeReceipt, readReceipt, removeReceiptObject } from '../services/receipt-storage';

async function check() {
  const fixture = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#10b981' } }).png().toBuffer();
  const stored = await storeReceipt(fixture, 'connection-test');
  try {
    const actual = await readReceipt(stored.bucket, stored.objectKey);
    assert.equal((await sharp(actual).metadata()).format, 'webp');
    const client = new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! }, maxAttempts: 1 });
    try {
      await assert.rejects(client.send(new GetObjectCommand({ Bucket: stored.bucket, Key: stored.objectKey })),
        'receipt must not be readable without the separate encryption key');
    } finally { client.destroy(); }
    console.log('PASS: R2 encrypted upload, authenticated read, WebP conversion, and rejection without encryption key.');
  } finally {
    await removeReceiptObject(stored.bucket, stored.objectKey);
    console.log('Only the temporary CIROX connection-test image was removed.');
  }
}
void check().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
