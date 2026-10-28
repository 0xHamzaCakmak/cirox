import { createHash, randomUUID } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { optimizeReceipt } from './receipt-image';
import { ReceiptCache } from './receipt-cache';
import { HttpError } from '../http';
import '../config/env';
const receiptCache = new ReceiptCache();

function storage() {
  const { R2_ACCOUNT_ID: account, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket, R2_RECEIPT_ENCRYPTION_KEY: encoded } = process.env;
  if (!account || !accessKeyId || !secretAccessKey || !bucket || !encoded) throw new HttpError(503, 'Fiş saklama bağlantısı yapılandırılmamış.');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw new HttpError(503, 'Fiş saklama anahtarı geçersiz.');
  const encryption = { SSECustomerAlgorithm: 'AES256', SSECustomerKey: encoded, SSECustomerKeyMD5: createHash('md5').update(key).digest('base64') };
  return { bucket, encryption, client: new S3Client({
    region: 'auto', endpoint: `https://${account}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey }, maxAttempts: 2,
  }) };
}
export async function storeReceipt(source: Buffer, branchId: string) {
  const image = await optimizeReceipt(source);
  const { client, bucket, encryption } = storage();
  const objectKey = `cirox/receipts/${branchId}/${randomUUID()}.webp`;
  try {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: image,
      ContentType: 'image/webp', CacheControl: 'private, no-store', ...encryption }));
  } catch { throw new HttpError(503, 'Fotoğraf R2 alanına yüklenemedi. Kaydınız henüz tamamlanmadı.'); }
  finally { client.destroy(); }
  return { bucket, objectKey, byteSize: image.length };
}
export async function readReceipt(bucket: string, objectKey: string) {
  return receiptCache.get(bucket + '/' + objectKey, () => loadReceipt(bucket, objectKey));
}
async function loadReceipt(bucket: string, objectKey: string) {
  const { client, encryption } = storage();
  try {
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey, ...encryption }));
    if (!result.Body) throw new Error('Empty object');
    return Buffer.from(await result.Body.transformToByteArray());
  } catch { throw new HttpError(503, 'Fotoğraf şu anda okunamıyor.'); }
  finally { client.destroy(); }
}
export async function removeReceiptObject(bucket: string, objectKey: string) {
  if (!objectKey.startsWith('cirox/receipts/')) throw new Error('Unexpected receipt prefix');
  const { client } = storage();
  try { await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey })); }
  finally { receiptCache.delete(bucket + '/' + objectKey); client.destroy(); }
}
