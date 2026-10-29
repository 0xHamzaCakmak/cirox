import assert from 'node:assert/strict';
import { test } from 'node:test';
import { subscriptionRenewalDate } from '../src/data/subscriptionDates';

test('monthly and yearly license periods clamp leap years and short months', () => {
  assert.equal(subscriptionRenewalDate('2026-01-31', 'monthly'), '2026-02-28');
  assert.equal(subscriptionRenewalDate('2024-01-31', 'monthly'), '2024-02-29');
  assert.equal(subscriptionRenewalDate('2024-02-29', 'yearly'), '2025-02-28');
  assert.equal(subscriptionRenewalDate('2026-12-20', 'monthly'), '2027-01-20');
  assert.equal(subscriptionRenewalDate('2027-02-01', 'yearly'), '2028-02-01');
});
test('invalid or incomplete input is never normalized into a different license date', () => {
  for (const value of ['', '2026-02-30', '2026-99-01', '2026-2-1', 'not-a-date']) assert.equal(subscriptionRenewalDate(value, 'yearly'), '');
});
