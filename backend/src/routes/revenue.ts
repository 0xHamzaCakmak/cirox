import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { appDataSource } from '../database/data-source';
import { BranchEntity, type UserRow } from '../database/entities';
import { requireAuth } from '../auth/session';
import { asyncRoute, HttpError } from '../http';
import { readableBranch, writableBranch } from '../services/branch-access';
import { publicReceipt, revenueRecords, type ReceiptRow } from '../services/revenue';
import { storeReceipt, readReceipt, removeReceiptObject } from '../services/receipt-storage';

export const revenueRouter = Router();
revenueRouter.use(requireAuth);
const money = z.number().finite().min(0).max(999999999.99).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.0001);
const schema = z.object({
  branchId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(value + 'T12:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '1970-01-01' && value <= '2100-12-31';
  }), creditCard: money, cash: money, online: money, other: money,
  notes: z.string().max(5000).default(''), receiptIds: z.array(z.string().uuid()).max(8).default([]),
});
revenueRouter.get('/revenue', asyncRoute(async (req, res) => {
  const branchId = z.string().uuid().parse(req.query.branchId);
  await readableBranch(res.locals.user as UserRow, branchId);
  res.json({ records: await revenueRecords([branchId]) });
}));
revenueRouter.post('/revenue', asyncRoute(async (req, res) => {
  const input = schema.parse(req.body);
  const user = res.locals.user as UserRow;
  const branch = await writableBranch(user, input.branchId);
  const totalCents = [input.creditCard, input.cash, input.online, input.other].reduce((sum, value) => sum + Math.round(value * 100), 0);
  if (totalCents <= 0) throw new HttpError(400, 'En az bir gelir tutarı girin.');
  if (new Set(input.receiptIds).size !== input.receiptIds.length) throw new HttpError(400, 'Aynı fotoğraf birden fazla eklenemez.');
  const id = await appDataSource.transaction(async manager => {
    await manager.findOneOrFail(BranchEntity, { where: { id: branch.id }, lock: { mode: 'pessimistic_write' } });
    const existing: { id: string }[] = await manager.query('SELECT id FROM daily_revenues WHERE branch_id=? AND date=?', [branch.id, input.date]);
    const id = existing[0]?.id ?? randomUUID();
    for (const receiptId of input.receiptIds) {
      const receipts: ReceiptRow[] = await manager.query('SELECT * FROM receipt_files WHERE id=? AND branch_id=? AND company_id=? FOR UPDATE', [receiptId, branch.id, branch.companyId]);
      if (!receipts[0]) throw new HttpError(403, 'Fotoğraf bu işletmeye ait değil.');
      if (receipts[0].expense_id) throw new HttpError(409, 'Fotoğraf bir gider kaydına eklenmiş.');
      if (receipts[0].revenue_id && receipts[0].revenue_id !== id) throw new HttpError(409, 'Fotoğraf başka bir güne eklenmiş.');
    }
    await manager.query(`INSERT INTO daily_revenues (id,company_id,branch_id,date,credit_card,cash,online,other,notes,submitted_by)
      VALUES (?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE credit_card=VALUES(credit_card),cash=VALUES(cash),online=VALUES(online),other=VALUES(other),notes=VALUES(notes),submitted_by=VALUES(submitted_by),updated_at=CURRENT_TIMESTAMP(3)`,
    [id, branch.companyId, branch.id, input.date, ...[input.creditCard, input.cash, input.online, input.other].map(value => (Math.round(value * 100) / 100).toFixed(2)), input.notes, user.id]);
    await manager.query('UPDATE receipt_files SET revenue_id=NULL WHERE revenue_id=?', [id]);
    for (const receiptId of input.receiptIds) await manager.query('UPDATE receipt_files SET revenue_id=? WHERE id=?', [id, receiptId]);
    return id;
  });
  const records = await revenueRecords([branch.id]);
  res.json({ record: records.find(record => record.id === id) });
}));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 1, fields: 1 } });
revenueRouter.post('/:branchId/receipts', rateLimit({ windowMs: 60000, limit: 30, legacyHeaders: false,
  message: { error: 'Çok fazla fotoğraf yüklemesi. Biraz sonra tekrar deneyin.' } }),
asyncRoute(async (req, res, next) => {
  await writableBranch(res.locals.user as UserRow, String(req.params.branchId)); next();
}), upload.single('image'), asyncRoute(async (req, res) => {
  const user = res.locals.user as UserRow;
  const branch = await writableBranch(user, String(req.params.branchId));
  if (!req.file) throw new HttpError(400, 'Fotoğraf seçmelisiniz.');
  const stored = await storeReceipt(req.file.buffer, branch.id);
  const id = randomUUID();
  const name = req.file.originalname.replace(/[\x00-\x1f/\\]/g, '_').slice(0, 255) || 'fis.webp';
  try {
    await appDataSource.query(`INSERT INTO receipt_files (id,company_id,branch_id,bucket,object_key,file_name,byte_size,uploaded_by) VALUES (?,?,?,?,?,?,?,?)`,
      [id, branch.companyId, branch.id, stored.bucket, stored.objectKey, name, stored.byteSize, user.id]);
  } catch (error) {
    await removeReceiptObject(stored.bucket, stored.objectKey).catch(() => {}); throw error;
  }
  res.status(201).json(publicReceipt({ id, file_name: name } as ReceiptRow));
}));
revenueRouter.get('/receipts/:receiptId', asyncRoute(async (req, res) => {
  const [receipt]: ReceiptRow[] = await appDataSource.query('SELECT * FROM receipt_files WHERE id=?', [req.params.receiptId]);
  if (!receipt) throw new HttpError(404, 'Fotoğraf bulunamadı.');
  await readableBranch(res.locals.user as UserRow, receipt.branch_id);
  // Immutable photo ID: authorize first, then let the browser reuse its stored bytes.
  const etag = '"receipt-' + receipt.id + '"';
  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Cache-Control', 'private, no-cache');
  res.setHeader('ETag', etag); res.vary('Cookie');
  if (req.fresh) { res.status(304).end(); return; }
  const image = await readReceipt(receipt.bucket, receipt.object_key);
  res.send(image);
}));
