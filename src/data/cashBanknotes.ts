import type { CashBanknotes } from '../types';
export const cashDenominations = [5, 10, 20, 50, 100, 200] as const;
export const emptyBanknoteFields = (): Record<typeof cashDenominations[number], string> => ({ 5: '', 10: '', 20: '', 50: '', 100: '', 200: '' });
export function banknotesFromFields(fields: ReturnType<typeof emptyBanknoteFields>): CashBanknotes {
  return Object.fromEntries(cashDenominations.map(value => [value, Number(fields[value]) || 0])) as CashBanknotes;
}
export function cashBanknoteTotal(counts: CashBanknotes) { return cashDenominations.reduce((total, value) => total + value * counts[value], 0); }
