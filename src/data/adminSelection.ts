import type { Branch, Company } from '../types';

export function adminCenters(companies: Company[]): Company[] {
  return companies.filter(company => company.kind === 'center');
}

export function adminBranchOptions(branches: Branch[], centerId: string): Branch[] {
  return branches.filter(branch => centerId ? branch.centerCompanyId === centerId : !branch.centerCompanyId);
}

export function adminSelectedBranch(branches: Branch[], centerId: string, branchId: string): Branch | undefined {
  return adminBranchOptions(branches, centerId).find(branch => branch.id === branchId);
}
