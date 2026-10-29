import assert from 'node:assert/strict';
import { test } from 'node:test';
import { banknotesFromFields, cashBanknoteTotal, emptyBanknoteFields } from '../src/data/cashBanknotes';
test('banknote fields start empty and do not invent a starting count', () => {
  const fields = emptyBanknoteFields();
  assert.deepEqual(Object.values(fields), ['', '', '', '', '', '']);
  assert.equal(cashBanknoteTotal(banknotesFromFields(fields)), 0);
});
test('all supported denominations contribute their count to the cash total', () => {
  const fields = { 5: '2', 10: '3', 20: '4', 50: '5', 100: '6', 200: '7' };
  assert.equal(cashBanknoteTotal(banknotesFromFields(fields)), 2370);
  assert.equal(cashBanknoteTotal(banknotesFromFields({ ...emptyBanknoteFields(), 200: '3', 5: '2' })), 610);
});
