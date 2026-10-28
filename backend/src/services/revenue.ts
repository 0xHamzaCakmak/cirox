import { appDataSource } from '../database/data-source';

export interface RevenueRow {
  id: string; company_id: string; branch_id: string; branch_name: string; date: string;
  credit_card: string; cash: string; online: string; other: string; total: string;
  notes: string; submitted_by_name: string; created_at: Date; updated_at: Date;
}
export interface ReceiptRow {
  expense_id: string | null;
  id: string; company_id: string; branch_id: string; revenue_id: string | null;
  bucket: string; object_key: string; file_name: string; byte_size: number;
}
export function publicReceipt(receipt: ReceiptRow) {
  return { id: receipt.id, url: `/api/v1/branch/receipts/${receipt.id}`, fileName: receipt.file_name };
}
export async function revenueRecords(branchIds: string[]) {
  if (!branchIds.length) return [];
  const placeholders = branchIds.map(() => '?').join(',');
  const rows: RevenueRow[] = await appDataSource.query(`SELECT r.*, DATE_FORMAT(r.date,'%Y-%m-%d') AS date,
    b.name AS branch_name, u.name AS submitted_by_name FROM daily_revenues r
    JOIN branches b ON b.id=r.branch_id JOIN users u ON u.id=r.submitted_by
    WHERE r.branch_id IN (${placeholders}) ORDER BY r.date DESC, r.updated_at DESC`, branchIds);
  const receipts: ReceiptRow[] = await appDataSource.query(`SELECT * FROM receipt_files WHERE branch_id IN (${placeholders}) AND revenue_id IS NOT NULL`, branchIds);
  return rows.map(row => ({
    id: row.id, companyId: row.company_id, branchId: row.branch_id, branchName: row.branch_name,
    date: row.date, creditCard: Number(row.credit_card), cash: Number(row.cash), online: Number(row.online),
    other: Number(row.other), total: Number(row.total), notes: row.notes, submittedBy: row.submitted_by_name,
    createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
    receipts: receipts.filter(receipt => receipt.revenue_id === row.id).map(publicReceipt),
  }));
}
