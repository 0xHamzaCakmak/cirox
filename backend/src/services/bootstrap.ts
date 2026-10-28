import { In } from 'typeorm';
import { appDataSource } from '../database/data-source';
import { BranchEntity, CompanyEntity, UserEntity, type BranchRow, type CompanyRow, type UserRow } from '../database/entities';
import { revenueRecords } from './revenue';
import { expenseRecords, expenseCategories, staffRecords } from './expenses';

export function publicUser(user: UserRow, company?: CompanyRow, branch?: BranchRow) {
  return {
    id: user.id, name: user.name, email: user.email, username: user.username, role: user.role,
    title: user.title, phone: user.phone,
    companyId: user.companyId ?? undefined, companyName: company?.name,
    branchId: user.branchId ?? undefined, branchName: branch?.name,
    centerCompanyId: branch?.centerCompanyId ?? null,
  };
}

export async function bootstrapData(user: UserRow) {
  const companies = await appDataSource.getRepository(CompanyEntity).find({
    where: user.role === 'admin' ? {} : { id: user.companyId! }, order: { createdAt: 'DESC' },
  });
  const branches = await appDataSource.getRepository(BranchEntity).find({
    where: user.role === 'admin' ? {} : user.role === 'sube'
      ? { id: user.branchId!, companyId: user.companyId! } : { centerCompanyId: user.companyId! },
    order: { createdAt: 'DESC' },
  });
  const branchUsers = branches.length ? await appDataSource.getRepository(UserEntity).find({
    where: { branchId: In(branches.map(branch => branch.id)), role: 'sube' },
  }) : [];
  const centerIds = [...new Set(branches.map(branch => branch.centerCompanyId).filter((id): id is string => !!id))];
  const centers = centerIds.length ? await appDataSource.getRepository(CompanyEntity).find({ where: { id: In(centerIds), kind: 'center' } }) : [];
  const records = await revenueRecords(branches.map(branch => branch.id));
  const [expenses, categories, staff] = await Promise.all([
    expenseRecords(branches.map(branch => branch.id)),
    expenseCategories(branches),
    staffRecords(branches.map(branch => branch.id)),
  ]);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  return {
    dailyRevenueRecords: records,
    expenses, expenseCategories: categories, staffList: staff,
    staffPayments: expenses.filter(expense => expense.staffId && expense.categoryType === 'staff_based').map(expense => ({
      id: expense.id, expenseId: expense.id, staffId: expense.staffId!, staffName: expense.staffName || 'Personel', branchId: expense.branchId,
      date: expense.date, amount: expense.amount, type: expense.staffPaymentType ?? (expense.paymentBasis === 'monthly' ? 'maas' : 'yevmiye'),
      paymentBasis: expense.paymentBasis, description: expense.description,
    })),
    user: publicUser(user, companies.find(item => item.id === user.companyId), branches.find(item => item.id === user.branchId)),
    companies: companies.map(company => ({
      id: company.id, kind: company.kind, name: company.name, code: company.code, sector: company.sector,
      ownerName: company.ownerName, ownerEmail: company.ownerEmail, ownerPhone: company.ownerPhone,
      branchesCount: branches.filter(branch => company.kind === 'center' ? branch.centerCompanyId === company.id : branch.companyId === company.id).length,
      ownedBranchesCount: branches.filter(branch => branch.companyId === company.id).length,
      createdAt: company.createdAt.toISOString(), notes: company.notes ?? undefined,
      subscription: {
        planTier: company.planTier, planName: company.planName, price: Number(company.licensePrice),
        billingCycle: company.billingCycle, billingMethod: company.billingMethod, status: company.status,
        branchLimit: company.branchLimit, startDate: company.startDate, nextBillingDate: company.nextBillingDate,
        daysRemaining: Math.ceil((Date.parse(company.nextBillingDate + 'T00:00:00+03:00') - Date.now()) / 86400000),
        autoRenew: company.autoRenew,
      },
    })),
    branches: branches.map(branch => {
      const daily = records.find(record => record.branchId === branch.id && record.date === today);
      const dailyExpenses = expenses.filter(expense => expense.branchId === branch.id && expense.date === today);
      const dailyExpense = dailyExpenses.reduce((sum, expense) => sum + Math.round(expense.amount * 100), 0) / 100;
      const breakdown = { personel: 0, kasap: 0, icecek: 0, sebzeMeyve: 0, temizlik: 0, nakliye: 0, kira: 0, elektrik: 0, diger: 0 };
      const keys: Record<string, keyof typeof breakdown> = { 'cat-2': 'kasap', 'cat-3': 'icecek', 'cat-4': 'sebzeMeyve', 'cat-5': 'temizlik', 'cat-6': 'nakliye', 'cat-7': 'kira', 'cat-8': 'elektrik' };
      for (const expense of dailyExpenses) {
        const key = expense.categoryType === 'staff_based' ? 'personel' : keys[expense.categoryId] ?? 'diger'; breakdown[key] = (Math.round(breakdown[key] * 100) + Math.round(expense.amount * 100)) / 100;
      }
      return ({
      ...branch, royaltyRate: undefined, createdAt: undefined,
      centerCompanyId: branch.centerCompanyId,
      centerName: centers.find(center => center.id === branch.centerCompanyId)?.name ?? 'Merkez yok',
      readOnly: user.role === 'merkez',
      dailyRevenue: daily?.total ?? 0, dailyExpense, netProfit: (Math.round((daily?.total ?? 0) * 100) - Math.round(dailyExpense * 100)) / 100,
      revenueBreakdown: { creditCard: daily?.creditCard ?? 0, cash: daily?.cash ?? 0, online: daily?.online ?? 0, other: daily?.other ?? 0 },
      expenseBreakdown: breakdown,
      staffCount: staff.filter(person => person.branchId === branch.id && person.status === 'active').length,
      dailyTotalWage: staff.filter(person => person.branchId === branch.id && person.status === 'active').reduce((sum, person) => sum + person.dailyWage, 0),
      monthlyStaffCost: expenses.filter(expense => expense.branchId === branch.id && expense.date.slice(0, 7) === today.slice(0, 7) && expense.categoryType === 'staff_based').reduce((sum, expense) => sum + Math.round(expense.amount * 100), 0) / 100,
      performanceScore: 0,
      siparisIntegration: { externalBranchId: '', productCost: 0, returnedCost: 0, netProductCost: 0, expectedSalesAmount: 0, branchDebt: 0 },
      loginEmail: branchUsers.find(item => item.branchId === branch.id)?.email,
      username: branchUsers.find(item => item.branchId === branch.id)?.username ?? undefined,
    }); }),
  };
}
