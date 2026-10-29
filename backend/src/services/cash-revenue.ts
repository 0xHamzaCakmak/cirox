import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { z } from 'zod';
import { appDataSource } from '../database/data-source';
import type { UserRow } from '../database/entities';

export const denominations = [5, 10, 20, 50, 100, 200] as const;
const quantity = z.number().int().min(0).max(1000000).default(0);
export const banknoteSchema = z.object({ '5': quantity, '10': quantity, '20': quantity, '50': quantity, '100': quantity, '200': quantity }).strict();
export type Banknotes = z.infer<typeof banknoteSchema>;
export const cashDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '1970-01-01' && value <= '2100-12-31';
});
export function banknoteTotal(counts: Banknotes) { return denominations.reduce((sum, value) => sum + value * counts[String(value) as keyof Banknotes], 0); }
export interface CashEntryRow { id: string; revenue_id: string; branch_id: string; record_date: string; kind: 'banknotes' | 'manual_adjustment' | 'opening_balance';
  amount: string; banknotes: string | Banknotes | null; actor_id: string | null; actor_name: string; note: string; created_at: Date }
export const countsOf = (row: CashEntryRow): Banknotes | null => row.banknotes == null ? null : typeof row.banknotes === 'string' ? JSON.parse(row.banknotes) : row.banknotes;
export async function cashEntries(branchId: string, date: string) {
  const rows: CashEntryRow[] = await appDataSource.query(`SELECT *,DATE_FORMAT(record_date,'%Y-%m-%d') AS record_date FROM cash_revenue_entries WHERE branch_id=? AND record_date=? ORDER BY created_at DESC,id DESC`, [branchId, date]);
  return rows.map(row => ({ id: row.id, branchId: row.branch_id, date: row.record_date, kind: row.kind, amount: Number(row.amount), banknotes: countsOf(row), actorName: row.actor_name, note: row.note, createdAt: row.created_at.toISOString() }));
}
export async function recordManualCash(manager: EntityManager, input: { revenueId: string; branchId: string; companyId: string; date: string; difference: number }, actor: UserRow) {
  if (!input.difference) return;
  await manager.query(`INSERT INTO cash_revenue_entries (id,revenue_id,company_id,branch_id,record_date,kind,amount,actor_id,actor_name,note) VALUES (?,?,?,?,?,'manual_adjustment',?,?,?,?)`,
    [randomUUID(), input.revenueId, input.companyId, input.branchId, input.date, input.difference.toFixed(2), actor.id, actor.name, input.difference > 0 ? 'Günlük ciro formundan nakit girişi' : 'Günlük ciro formundan nakit düzeltmesi']);
}
