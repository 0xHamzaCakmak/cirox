import type { Branch, Company } from '../types';

// Safe display defaults for an admin with no companies yet; these are never persisted.
export const EMPTY_COMPANY: Company = {
  id: '', name: 'Merkez seçilmedi', code: '—', sector: '', ownerName: '', ownerEmail: '', ownerPhone: '',
  branchesCount: 0, createdAt: '', subscription: {
    planTier: 'growth', planName: '', price: 0, billingCycle: 'monthly', billingMethod: 'bank_transfer',
    status: 'active', branchLimit: 5, startDate: '', nextBillingDate: '', daysRemaining: 0, autoRenew: false,
  },
};
export const EMPTY_BRANCH: Branch = {
  id: '', companyId: '', name: 'Şube seçilmedi', code: '', city: '', district: '', managerName: '', phone: '', status: 'active',
  dailyRevenue: 0, dailyExpense: 0, netProfit: 0, staffCount: 0, dailyTotalWage: 0, monthlyStaffCost: 0, performanceScore: 0,
  revenueBreakdown: { creditCard: 0, cash: 0, online: 0, other: 0 },
  expenseBreakdown: { personel: 0, kasap: 0, icecek: 0, sebzeMeyve: 0, temizlik: 0, nakliye: 0, kira: 0, elektrik: 0, diger: 0 },
  siparisIntegration: { externalBranchId: '', productCost: 0, returnedCost: 0, netProductCost: 0, expectedSalesAmount: 0, branchDebt: 0 },
};
