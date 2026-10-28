import { EntitySchema } from 'typeorm';

export interface CompanyRow {
  kind: 'center' | 'business';
  id: string; name: string; code: string; sector: string;
  ownerName: string; ownerEmail: string; ownerPhone: string;
  status: 'active' | 'passive' | 'trial' | 'past_due';
  planTier: 'starter' | 'growth' | 'enterprise'; planName: string;
  licensePrice: string; billingCycle: 'monthly' | 'yearly';
  billingMethod: 'credit_card' | 'bank_transfer' | 'manual';
  branchLimit: number; startDate: string; nextBillingDate: string;
  autoRenew: boolean; notes: string | null; createdAt: Date;
}
export interface BranchRow {
  legalName: string; tradeRegisterNo: string; taxOffice: string; taxNumber: string; contactEmail: string;
  centerCompanyId: string | null;
  id: string; companyId: string; code: string; name: string; city: string;
  district: string; managerName: string; phone: string;
  status: 'active' | 'review' | 'passive'; royaltyRate: string; createdAt: Date;
}
export interface UserRow {
  username: string | null;
  id: string; companyId: string | null; branchId: string | null;
  name: string; email: string; passwordHash: string;
  role: 'admin' | 'merkez' | 'sube'; title: string; phone: string;
  active: boolean; createdAt: Date;
}
export interface SessionRow { id: string; userId: string; expiresAt: Date; createdAt: Date }

const id = { type: String, length: 64, primary: true } as const;
const createdAt = { name: 'created_at', type: 'datetime', precision: 3, createDate: true } as const;

export const CompanyEntity = new EntitySchema<CompanyRow>({
  name: 'Company', tableName: 'companies', columns: {
    kind: { type: 'enum', enum: ['center', 'business'], default: 'center' },
    id, name: { type: String, length: 255 }, code: { type: String, length: 32, unique: true },
    sector: { type: String, length: 128 }, ownerName: { name: 'owner_name', type: String, length: 128 },
    ownerEmail: { name: 'owner_email', type: String, length: 128 }, ownerPhone: { name: 'owner_phone', type: String, length: 32 },
    status: { type: 'enum', enum: ['active', 'passive', 'trial', 'past_due'] },
    planTier: { name: 'plan_tier', type: 'enum', enum: ['starter', 'growth', 'enterprise'] },
    planName: { name: 'plan_name', type: String, length: 64 },
    licensePrice: { name: 'license_price', type: 'decimal', precision: 12, scale: 2 },
    billingCycle: { name: 'billing_cycle', type: 'enum', enum: ['monthly', 'yearly'] },
    billingMethod: { name: 'billing_method', type: 'enum', enum: ['credit_card', 'bank_transfer', 'manual'] },
    branchLimit: { name: 'branch_limit', type: Number }, startDate: { name: 'start_date', type: 'date' },
    nextBillingDate: { name: 'next_billing_date', type: 'date' }, autoRenew: { name: 'auto_renew', type: Boolean },
    notes: { type: 'text', nullable: true }, createdAt,
  },
});
export const BranchEntity = new EntitySchema<BranchRow>({
  name: 'Branch', tableName: 'branches', columns: {
    legalName: { name: 'legal_name', type: String, length: 255, default: '' },
    tradeRegisterNo: { name: 'trade_register_no', type: String, length: 64, default: '' },
    taxOffice: { name: 'tax_office', type: String, length: 128, default: '' },
    taxNumber: { name: 'tax_number', type: String, length: 11, default: '' },
    contactEmail: { name: 'contact_email', type: String, length: 128, default: '' },
    centerCompanyId: { name: 'center_company_id', type: String, length: 64, nullable: true },
    id, companyId: { name: 'company_id', type: String, length: 64 }, code: { type: String, length: 32 },
    name: { type: String, length: 128 }, city: { type: String, length: 64 }, district: { type: String, length: 64 },
    managerName: { name: 'manager_name', type: String, length: 128 }, phone: { type: String, length: 32 },
    status: { type: 'enum', enum: ['active', 'review', 'passive'] },
    royaltyRate: { name: 'royalty_rate', type: 'decimal', precision: 5, scale: 2 }, createdAt,
  },
});
export const UserEntity = new EntitySchema<UserRow>({
  name: 'User', tableName: 'users', columns: {
    username: { type: String, length: 32, nullable: true, unique: true },
    id, companyId: { name: 'company_id', type: String, length: 64, nullable: true },
    branchId: { name: 'branch_id', type: String, length: 64, nullable: true },
    name: { type: String, length: 128 }, email: { type: String, length: 128, unique: true },
    passwordHash: { name: 'password_hash', type: String, length: 255, select: false },
    role: { type: 'enum', enum: ['admin', 'merkez', 'sube'] }, title: { type: String, length: 128 },
    phone: { type: String, length: 32 }, active: { type: Boolean }, createdAt,
  },
});
export const SessionEntity = new EntitySchema<SessionRow>({
  name: 'Session', tableName: 'auth_sessions', columns: {
    id, userId: { name: 'user_id', type: String, length: 64 },
    expiresAt: { name: 'expires_at', type: 'datetime', precision: 3 }, createdAt,
  },
});
