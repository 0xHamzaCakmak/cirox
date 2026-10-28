export function calculateWages(basis: 'daily' | 'monthly', amount: number) {
  const cents = Math.round(amount * 100);
  const daily = basis === 'daily' ? cents : Math.round(cents / 30);
  const monthly = basis === 'monthly' ? cents : cents * 30;
  return { dailyWage: daily / 100, monthlySalary: monthly / 100 };
}
