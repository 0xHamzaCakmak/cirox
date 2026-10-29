export function subscriptionRenewalDate(start: string, cycle: 'monthly' | 'yearly'): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return '';
  const date = new Date(start + 'T12:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== start) return '';
  const year = date.getUTCFullYear() + (cycle === 'yearly' ? 1 : 0);
  const month = date.getUTCMonth() + (cycle === 'monthly' ? 1 : 0);
  const day = Math.min(date.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return new Date(Date.UTC(year, month, day, 12)).toISOString().slice(0, 10);
}
