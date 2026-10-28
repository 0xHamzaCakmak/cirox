export function calculateWages(basis: 'daily' | 'monthly', amount: number) {
  const cents = Math.round(amount * 100);
  return { dailyWage: (basis === 'daily' ? cents : Math.round(cents / 30)) / 100,
    monthlySalary: (basis === 'monthly' ? cents : cents * 30) / 100 };
}
