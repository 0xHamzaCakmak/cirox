export type BranchInspectionPeriod = 'today' | '7days' | '1month' | '3months' | 'year';

export function istanbulToday(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
}

function monthsBefore(today: string, months: number) {
  const date = new Date(today + 'T12:00:00Z');
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T12:00:00Z'))
  && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;

export function branchInspectionRange(period: BranchInspectionPeriod, today: string, customStart = '', customEnd = '') {
  let start = today;
  if (period === '7days') {
    const date = new Date(today + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() - 6); start = date.toISOString().slice(0, 10);
  }
  if (period === '1month') start = monthsBefore(today, 1);
  if (period === '3months') start = monthsBefore(today, 3);
  if (period === 'year') start = today.slice(0, 4) + '-01-01';
  let error = '';
  if (customStart || customEnd) {
    if (!customStart || !customEnd) error = 'Tarih aralığı için başlangıç ve bitiş tarihini birlikte girin.';
    else if (!validDate(customStart) || !validDate(customEnd)) error = 'Geçerli bir başlangıç ve bitiş tarihi girin.';
    else if (customStart > customEnd) error = 'Başlangıç tarihi bitiş tarihinden sonra olamaz.';
    else return { start: customStart, end: customEnd, custom: true, error: '' };
  }
  return { start, end: today, custom: false, error };
}
