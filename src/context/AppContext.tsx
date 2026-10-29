import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from 'react';
import { api, advanceSessionVersion, type BootstrapData, type EstablishmentResult, type CenterAccountInput, type CenterAccountResult } from '../services/api';
import { EMPTY_BRANCH, EMPTY_COMPANY } from '../data/emptyData';
import { createClientId } from '../services/clientId';
import { homePage, resolvePageForRole } from '../data/pageAccess';
import { adminBranchOptions, adminSelectedBranch } from '../data/adminSelection';
import { useMobileViewport } from '../hooks/useMobileViewport';
import {
  Branch,
  BranchListSort,
  BranchSettings,
  OwnProfileUpdate,
  DailyRevenueRecord,
  ExpenseCategory,
  ExpenseRecord,
  PageTab,
  SubscriptionUpdate,
  BankAccount,
  BankAccountInput,
  CollectionOptions,
  CashBanknotes,
  Staff,
  StaffPaymentHistory,
  User,
  UserRole,
  Company,
  CompanySubscription,
  PaymentRecord,
  BillingMethod,
  PlanTier,
  ReceiptAttachment,
} from '../types';


interface AppContextType {
  branchListSort: BranchListSort;
  setBranchListSort: (sort: BranchListSort) => void;
  branchListViewMode: 'grid' | 'table';
  setBranchListViewMode: (mode: 'grid' | 'table') => void;
  viewUser: User | null;
  adminCenterId: string;
  selectableBranches: Branch[];
  selectAdminCenter: (id: string) => void;
  selectAdminBranch: (id: string) => void;
  returnToAdmin: () => void;
  isAdminCustomerView: boolean;
  adminBranches: Branch[];
  createCenterAccount: (data: CenterAccountInput) => Promise<string>;
  updateBranchCenter: (branchId: string, centerCompanyId: string | null) => Promise<void>;
  saveBranchSettings: (data: BranchSettings) => Promise<void>;
  saveOwnProfile: (data: OwnProfileUpdate) => Promise<void>;
  currentUser: User | null;
  isLoggedIn: boolean;
  branches: Branch[];
  selectedBranchId: string;
  selectedBranch: Branch;
  activeTab: PageTab;
  dailyRevenueRecords: DailyRevenueRecord[];
  expenses: ExpenseRecord[];
  expenseCategories: ExpenseCategory[];
  staffList: Staff[];
  staffPayments: StaffPaymentHistory[];
  notification: { message: string; type: 'success' | 'info' | 'warning' } | null;

  // Multi-Company (Tenant) & License Management
  companies: Company[];
  activeCompanyId: string;
  activeCompany: Company;
  payments: PaymentRecord[];
  registeredUsers: User[];
  loginWithCredentials: (email: string, password?: string) => Promise<boolean>;
  createEstablishmentAndStart: (data: {
    merkezOption: 'existing' | 'new' | 'none';
    selectedCompanyId?: string;
    newMerkezName?: string;
    newMerkezCode?: string;
    establishmentName: string;
    establishmentCode?: string;
    city?: string;
    district?: string;
    sector?: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword?: string;
    ownerPhone?: string;
    price?: number;
    billingMethod?: BillingMethod;
    notes?: string;
    autoLaunch?: boolean;
  }) => Promise<{
    company: Company;
    branch: Branch;
    user: User;
    temporaryPassword: string;
  }>;
  setActiveCompanyId: (id: string) => void;
  createCompany: (data: {
    name: string;
    code: string;
    sector: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string;
    planTier: PlanTier;
    price: number;
    branchLimit: number;
    billingMethod: BillingMethod;
    initialBranchesCount?: number;
    notes?: string;
  }) => void;
  toggleCompanyStatus: (companyId: string) => void;
  updateCompanySubscription: (companyId: string, data: SubscriptionUpdate) => Promise<void>;
  bankAccounts: BankAccount[];
  addBankAccount: (input: BankAccountInput) => Promise<void>;
  refreshAdminFinance: () => Promise<void>;
  chargeCompany: (companyId: string, amount: number, method: BillingMethod, notes?: string, options?: CollectionOptions) => Promise<void>;

  // Actions
  logout: () => void;
  setActiveTab: (tab: PageTab) => void;
  setSelectedBranchId: (id: string) => void;
  addDailyRevenue: (data: Omit<DailyRevenueRecord, 'id' | 'createdAt'>) => Promise<void>;
  addCashRevenueEntry: (branchId: string, date: string, banknotes: CashBanknotes, clientRequestId: string) => Promise<DailyRevenueRecord>;
  uploadReceipt: (branchId: string, file: File) => Promise<ReceiptAttachment>;
  addExpense: (data: Omit<ExpenseRecord, 'id' | 'createdAt'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addExpenseCategory: (data: Omit<ExpenseCategory, 'id'>) => Promise<void>;
  updateExpenseCategory: (id: string, data: Partial<ExpenseCategory>) => Promise<void>;
  deleteExpenseCategory: (id: string) => Promise<void>;
  addStaff: (data: Omit<Staff, 'id'>) => Promise<void>;
  updateStaff: (id: string, data: Partial<Staff>) => Promise<void>;
  toggleStaffStatus: (id: string) => Promise<void>;
  addStaffPayment: (data: Omit<StaffPaymentHistory, 'id'>) => Promise<void>;
  showNotification: (message: string, type?: 'success' | 'info' | 'warning') => void;
  switchPerspective: (role: UserRole, branchId?: string, companyId?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mobileViewport = useMobileViewport();
  // Companies / Tenants State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string>('');
  const [adminCenterId, setAdminCenterId] = useState('');
  const [managedUsers, setManagedUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [branchListViewMode, setBranchListViewMode] = useState<'grid' | 'table'>('table');
  const [mobileBranchListViewMode, setMobileBranchListViewMode] = useState<'grid' | 'table'>('grid');
  const [branchListSort, setBranchListSort] = useState<BranchListSort>('revenue-desc');

  const activeCompany = useMemo(() => {
    return companies.find((c) => c.id === activeCompanyId) || EMPTY_COMPANY;
  }, [companies, activeCompanyId]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const pendingBackendMessage = currentUser?.role === 'merkez'
    ? 'Merkez erişimi yalnızca görüntüleme amaçlıdır. İşletme kayıtları değiştirilemez.'
    : 'Bu işlemin backend bağlantısı sonraki adımda hazırlanacak.';
  const sessionMode = useRef<'none' | 'demo' | 'live'>('none');
  const authEpoch = useRef(0);

  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);

  const [activeTab, setActiveTabState] = useState<PageTab>('admin_tenants');
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  const selectableBranches = useMemo(() => currentUser?.role === 'admin'
    ? adminBranchOptions(allBranches, adminCenterId)
    : allBranches.filter(branch => branch.companyId === activeCompanyId || branch.centerCompanyId === activeCompanyId),
  [allBranches, adminCenterId, activeCompanyId, currentUser?.role]);
  
  // Scoped branches for currently active center / company
  const branches = useMemo(() => {
    if (currentUser?.role === 'admin') return selectedBranchId
      ? selectableBranches.filter(branch => branch.id === selectedBranchId)
      : adminCenterId ? selectableBranches : [];
    return selectableBranches;
  }, [selectableBranches, selectedBranchId, adminCenterId, currentUser?.role]);

  const [allDailyRevenueRecords, setAllDailyRevenueRecords] = useState<DailyRevenueRecord[]>([]);
  const [allExpenses, setAllExpenses] = useState<ExpenseRecord[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [staffPayments, setStaffPayments] = useState<StaffPaymentHistory[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Scoped data items
  const dailyRevenueRecords = useMemo(() => {
    const activeBranchIds = new Set(branches.map((b) => b.id));
    return allDailyRevenueRecords.filter((r) => activeBranchIds.has(r.branchId));
  }, [allDailyRevenueRecords, branches, activeCompanyId]);

  const expenses = useMemo(() => {
    const activeBranchIds = new Set(branches.map((b) => b.id));
    return allExpenses.filter((e) => activeBranchIds.has(e.branchId));
  }, [allExpenses, branches, activeCompanyId]);

  const staffList = useMemo(() => {
    const activeBranchIds = new Set(branches.map((b) => b.id));
    return allStaff.filter((s) => activeBranchIds.has(s.branchId));
  }, [allStaff, branches, activeCompanyId]);

  const selectedBranch = useMemo(() => {
    return branches.find((b) => b.id === selectedBranchId) || (currentUser?.role === 'admin' ? EMPTY_BRANCH : branches[0]) || EMPTY_BRANCH;
  }, [branches, selectedBranchId, allBranches]);

  const viewUser = useMemo(() => {
    if (currentUser?.role !== 'admin') return currentUser;
    const branch = adminSelectedBranch(allBranches, adminCenterId, selectedBranchId);
    if (branch) return managedUsers.find(user => user.role === 'sube' && user.branchId === branch.id) || {
      id: branch.id, role: 'sube' as const, branchId: branch.id, branchName: branch.name,
      companyId: branch.companyId, name: branch.managerName || branch.name, username: branch.username,
      email: branch.loginEmail || '', phone: branch.phone, title: branch.name + ' Sorumlusu',
    };
    if (adminCenterId) return managedUsers.find(user => user.role === 'merkez' && user.companyId === adminCenterId) || {
      id: adminCenterId, role: 'merkez' as const, companyId: adminCenterId, name: activeCompany.ownerName,
      email: activeCompany.ownerEmail, phone: activeCompany.ownerPhone, title: activeCompany.name,
    };
    return currentUser;
  }, [currentUser, managedUsers, allBranches, selectedBranchId, adminCenterId, activeCompany]);
  const isAdminCustomerView = currentUser?.role === 'admin' && viewUser?.role !== 'admin' && !activeTab.startsWith('admin_');

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    if (adminCenterId && !companies.some(company => company.id === adminCenterId && company.kind === 'center')) {
      setAdminCenterId(''); setActiveCompanyIdState(''); setSelectedBranchId('');
      setActiveTabState(previous => previous.startsWith('admin_') ? previous : 'admin_businesses');
    } else if (selectedBranchId && !adminSelectedBranch(allBranches, adminCenterId, selectedBranchId)) {
      setSelectedBranchId(''); setActiveCompanyIdState(adminCenterId);
      setActiveTabState(previous => previous.startsWith('admin_') ? previous : adminCenterId ? 'dashboard' : 'admin_businesses');
    }
  }, [currentUser?.role, companies, allBranches, adminCenterId, selectedBranchId]);

  const selectAdminCenter = (id: string) => {
    if (currentUser?.role !== 'admin' || (id && !companies.some(company => company.id === id && company.kind === 'center'))) return;
    setAdminCenterId(id); setActiveCompanyIdState(id); setSelectedBranchId('');
    setActiveTabState(id ? 'dashboard' : 'admin_businesses');
  };
  const selectAdminBranch = (id: string) => {
    if (currentUser?.role !== 'admin') return;
    const branch = selectableBranches.find(item => item.id === id);
    if (id && !branch) return;
    setSelectedBranchId(id); setActiveCompanyIdState(branch?.companyId || adminCenterId);
    setActiveTabState(id ? 'revenue_entry' : adminCenterId ? 'dashboard' : 'admin_businesses');
  };
  const returnToAdmin = () => {
    if (currentUser?.role !== 'admin') return;
    setAdminCenterId(''); setActiveCompanyIdState(''); setSelectedBranchId(''); setActiveTabState('admin_tenants');
  };

  const showNotification = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const setActiveCompanyId = (id: string) => {
    if (sessionMode.current === 'live' && currentUser?.role !== 'admin') return;
    const targetComp = companies.find((c) => c.id === id);
    if (!targetComp) return;
    if (currentUser?.role === 'admin') {
      if (targetComp.kind === 'center') selectAdminCenter(id);
      else {
        const branch = allBranches.find(item => item.companyId === id);
        setAdminCenterId(branch?.centerCompanyId || ''); setActiveCompanyIdState(id); setSelectedBranchId(branch?.id || '');
        setActiveTabState(branch ? 'revenue_entry' : 'admin_businesses');
      }
      return;
    }
    setActiveCompanyIdState(id);

    const targetBranches = allBranches.filter((b) => b.companyId === id || b.centerCompanyId === id);
    setSelectedBranchId(targetBranches[0]?.id || '');

    if (currentUser) {
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              companyId: targetComp.id,
              companyName: targetComp.name,
            }
          : null
      );
    }
    showNotification(`Aktif Merkez: "${targetComp.name}" seçildi (${targetBranches.length} Şube/Birim)`, 'info');
  };

  const setActiveTab = (tab: PageTab) => {
    if (sessionMode.current !== 'live' || !currentUser) return;
    const allowed = resolvePageForRole(currentUser.role, tab);
    if (allowed) {
      if (currentUser.role === 'admin' && allowed.startsWith('admin_')) {
        setAdminCenterId(''); setActiveCompanyIdState(''); setSelectedBranchId('');
      }
      setActiveTabState(allowed);
    }
  };

  const applyBootstrap = (data: BootstrapData, preserveNavigation = false) => {
    advanceSessionVersion();
    sessionMode.current = 'live';
    setCompanies(data.companies);
    setAllBranches(data.branches);
    if (!preserveNavigation) {
      setBranchListViewMode('table');
      setMobileBranchListViewMode('grid');
      setBranchListSort('revenue-desc');
      setAdminCenterId('');
      setActiveCompanyIdState(data.user.role === 'admin' ? '' : data.user.companyId || data.companies[0]?.id || '');
      setSelectedBranchId(data.user.role === 'admin' ? '' : data.user.branchId || data.branches[0]?.id || '');
    }
    setAllDailyRevenueRecords(data.dailyRevenueRecords ?? []);
    setAllExpenses(data.expenses ?? []);
    setAllStaff(data.staffList ?? []);
    setStaffPayments(data.staffPayments ?? []);
    setPayments(data.payments ?? []);
    setBankAccounts(data.bankAccounts ?? []);
    setExpenseCategories(data.expenseCategories ?? []);
    setRegisteredUsers([]);
    setManagedUsers(data.managedUsers ?? []);
    setCurrentUser(data.user);
    if (!preserveNavigation) setActiveTabState(homePage(data.user.role));
  };

  useEffect(() => {
    if (sessionMode.current !== 'none') return;
    let cancelled = false;
    const epoch = authEpoch.current;
    void api<BootstrapData>('/auth/me').then(data => {
      if (!cancelled && authEpoch.current === epoch) applyBootstrap(data);
    }).catch(() => { /* No active session: keep the existing login screen. */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const expire = () => {
      if (sessionMode.current !== 'live') return;
      ++authEpoch.current; advanceSessionVersion(); sessionMode.current = 'none';
      setCurrentUser(null); setCompanies([]); setAllBranches([]); setAllDailyRevenueRecords([]);
      setAdminCenterId(''); setManagedUsers([]);
      setAllExpenses([]); setAllStaff([]); setStaffPayments([]); setPayments([]); setBankAccounts([]); setExpenseCategories([]); setRegisteredUsers([]);
      setActiveCompanyIdState(''); setSelectedBranchId('');
    };
    window.addEventListener('cirox:session-expired', expire);
    const resume = (event: PageTransitionEvent) => {
      if (!event.persisted || sessionMode.current !== 'live') return;
      const epoch = ++authEpoch.current;
      advanceSessionVersion();
      setCurrentUser(null);
      void api<BootstrapData>('/auth/me').then(data => {
        if (epoch === authEpoch.current) applyBootstrap(data);
      }).catch(() => { if (epoch === authEpoch.current) expire(); });
    };
    window.addEventListener('pageshow', resume);
    return () => { window.removeEventListener('cirox:session-expired', expire); window.removeEventListener('pageshow', resume); };
  }, []);

  const loginWithCredentials = async (email: string, password = ''): Promise<boolean> => {
    const epoch = ++authEpoch.current;
    advanceSessionVersion();
    const data = await api<BootstrapData>('/auth/login', { identifier: email, password });
    if (epoch !== authEpoch.current) return false;
    applyBootstrap(data);
    showNotification('Hoş geldiniz, ' + data.user.name, 'success');
    return true;
  };

  const logout = async () => {
    ++authEpoch.current;
    advanceSessionVersion();
    if (sessionMode.current === 'live') {
      try { await api('/auth/logout', {}); }
      catch (error) { showNotification(error instanceof Error ? error.message : 'Çıkış yapılamadı.', 'warning'); return; }
    }
    sessionMode.current = 'none';
    setCurrentUser(null);
    setAdminCenterId(''); setManagedUsers([]);
    setRegisteredUsers([]);
    setCompanies([]);
    setAllBranches([]);
    setActiveCompanyIdState('');
    setSelectedBranchId('');
    setAllDailyRevenueRecords([]);
    setAllExpenses([]);
    setAllStaff([]);
    setStaffPayments([]);
    setPayments([]); setBankAccounts([]);
    setExpenseCategories([]);
  };

  const switchPerspective = (role: UserRole, branchId?: string, companyId?: string) => {
    if (sessionMode.current === 'live' && currentUser?.role === 'admin') {
      if (companyId) setActiveCompanyId(companyId);
      if (branchId) setSelectedBranchId(branchId);
      setActiveTab(role === 'admin' ? 'admin_tenants' : role === 'merkez' ? 'dashboard' : 'branch_detail');
      return;
    }
    showNotification('Başka bir hesaba erişmek için o hesabın bilgileriyle giriş yapın.', 'info');
  };

  const createCenterAccount = async (data: CenterAccountInput) => {
    if (sessionMode.current !== 'live' || currentUser?.role !== 'admin') throw new Error('Admin oturumu gerekiyor.');
    const result = await api<CenterAccountResult>('/admin/centers', data);
    applyBootstrap(result.bootstrap, true);
    showNotification('Merkez / patron hesabı oluşturuldu. Şubeleri bu hesaba bağlayabilirsiniz.', 'success');
    return result.companyId;
  };

  const updateBranchCenter = async (branchId: string, centerCompanyId: string | null) => {
    if (sessionMode.current !== 'live' || currentUser?.role !== 'admin') throw new Error('Admin oturumu gerekiyor.');
    const result = await api<BootstrapData>(`/admin/establishments/${encodeURIComponent(branchId)}/center`, { centerCompanyId });
    applyBootstrap(result, true);
    showNotification(centerCompanyId ? 'Şube merkeze bağlandı.' : 'Şube merkezden ayrıldı; bağımsız çalışıyor.', 'success');
  };

  // Company / Tenant Actions
  const createCompany = (data: {
    name: string;
    code: string;
    sector: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string;
    planTier: PlanTier;
    price: number;
    branchLimit: number;
    billingMethod: BillingMethod;
    initialBranchesCount?: number;
    notes?: string;
  }) => {
    if (sessionMode.current === 'live') {
      showNotification(pendingBackendMessage, 'info');
      return;
    }
    const newCompanyId = `comp-${Date.now()}`;
    const todayStr = new Date().toISOString().split('T')[0];
    
    // next billing in 30 days
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);
    const nextBillingDateStr = nextDate.toISOString().split('T')[0];

    const planNames: Record<PlanTier, string> = {
      starter: `Başlangıç Starter (${data.branchLimit} Şube)`,
      growth: `Büyüme Growth (${data.branchLimit} Şube)`,
      enterprise: `Kurumsal Enterprise (${data.branchLimit}+ Şube)`,
    };

    const newCompany: Company = {
      id: newCompanyId,
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      sector: data.sector.trim(),
      ownerName: data.ownerName.trim(),
      ownerEmail: data.ownerEmail.trim(),
      ownerPhone: data.ownerPhone.trim(),
      branchesCount: data.initialBranchesCount || 1,
      notes: data.notes || 'Yeni oluşturulan merkez işletmesi.',
      createdAt: todayStr,
      subscription: {
        planTier: data.planTier,
        planName: planNames[data.planTier] || `${data.branchLimit} Şube Paketi`,
        price: data.price,
        billingCycle: 'monthly',
        billingMethod: data.billingMethod,
        status: 'active',
        branchLimit: data.branchLimit,
        startDate: todayStr,
        nextBillingDate: nextBillingDateStr,
        daysRemaining: 30,
        autoRenew: data.billingMethod === 'credit_card',
        creditCardLast4: data.billingMethod === 'credit_card' ? '1234' : undefined,
      },
    };

    setCompanies((prev) => [newCompany, ...prev]);
    showNotification(`Yeni Merkez Hesabı: "${newCompany.name}" başarıyla oluşturuldu ve lisanslandı!`, 'success');
  };

  const createEstablishmentAndStart = async (data: {
    merkezOption: 'existing' | 'new' | 'none';
    selectedCompanyId?: string;
    newMerkezName?: string;
    newMerkezCode?: string;
    establishmentName: string;
    establishmentCode?: string;
    city?: string;
    district?: string;
    sector?: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword?: string;
    ownerPhone?: string;
    price?: number;
    billingMethod?: BillingMethod;
    notes?: string;
    autoLaunch?: boolean;
  }) => {
    if (sessionMode.current === 'live') {
      if (currentUser?.role !== 'admin') throw new Error('Admin yetkisi gerekiyor.');
      const { establishmentCode: username, ...payload } = data;
      const result = await api<EstablishmentResult>('/admin/establishments', { ...payload, username });
      applyBootstrap(result.bootstrap);
      const company = result.bootstrap.companies.find(item => item.id === result.companyId)!;
      const branch = result.bootstrap.branches.find(item => item.id === result.branchId)!;
      const user: User = { id: result.userId, name: data.ownerName, email: data.ownerEmail, role: 'sube',
        username: username?.trim().toLowerCase(),
        title: branch.name + ' Sorumlusu', companyId: company.id, branchId: branch.id };
      if (data.autoLaunch !== false) {
        try { await loginWithCredentials(username || data.ownerEmail, data.ownerPassword); }
        catch { showNotification('Şube hesabı oluşturuldu. Çıkış yapıp yeni hesapla giriş yapabilirsiniz.', 'info'); }
      } else {
        setActiveCompanyIdState(company.id);
        setSelectedBranchId(branch.id);
        showNotification('Şube ve kullanıcı hesabı kaydedildi.', 'success');
      }
      return { company, branch, user, temporaryPassword: data.ownerPassword || '' };
    }
    let targetCompany: Company;
    const todayStr = new Date().toISOString().split('T')[0];
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);
    const nextBillingDateStr = nextDate.toISOString().split('T')[0];

    if (data.merkezOption === 'none' || (data.merkezOption === 'new' && data.newMerkezName?.trim())) {
      const newCompId = `comp-${Date.now()}`;
      const newComp: Company = {
        id: newCompId,
        kind: data.merkezOption === 'none' ? 'business' : 'center',
        name: (data.merkezOption === 'none' ? data.establishmentName : data.newMerkezName!).trim(),
        code: (data.newMerkezCode || data.establishmentName.substring(0, 4)).trim().toUpperCase(),
        sector: data.sector || 'Restoran & Yeme-İçme',
        ownerName: data.ownerName.trim(),
        ownerEmail: data.ownerEmail.trim(),
        ownerPhone: data.ownerPhone?.trim() || '',
        branchesCount: 1,
        createdAt: todayStr,
        notes: data.notes || `Yeni oluşturulan merkez. İlk işletme: ${data.establishmentName.trim()}`,
        subscription: {
          planTier: 'growth',
          planName: 'Büyüme Growth (5 Şube)',
          price: data.price || 15000,
          billingCycle: 'yearly',
          billingMethod: data.billingMethod || 'bank_transfer',
          status: 'active',
          branchLimit: 5,
          startDate: todayStr,
          nextBillingDate: nextBillingDateStr,
          daysRemaining: 30,
          autoRenew: data.billingMethod === 'credit_card',
        },
      };
      targetCompany = newComp;
      setCompanies((prev) => [newComp, ...prev]);
    } else {
      const found = companies.find((c) => c.id === data.selectedCompanyId) || companies[0];
      targetCompany = {
        ...found,
        branchesCount: (found.branchesCount || 0) + 1,
      };
      setCompanies((prev) =>
        prev.map((c) => (c.id === targetCompany.id ? targetCompany : c))
      );
    }

    const newBranchId = `branch-${targetCompany.id}-${Date.now()}`;
    const code = (data.establishmentCode || data.establishmentName.substring(0, 5)).trim().toUpperCase();
    const password = data.ownerPassword?.trim() || '123456';
    const email = data.ownerEmail.trim().toLowerCase();

    const newBranch: Branch = {
      centerCompanyId: data.merkezOption === 'none' ? null : targetCompany.id,
      centerName: data.merkezOption === 'none' ? 'Merkez yok' : targetCompany.name,
      id: newBranchId,
      companyId: targetCompany.id,
      code,
      name: data.establishmentName.trim(),
      city: data.city?.trim() || 'İstanbul',
      district: data.district?.trim() || 'Merkez',
      managerName: data.ownerName.trim(),
      phone: data.ownerPhone?.trim() || '0532 000 00 00',
      loginEmail: email,
      loginPassword: password,
      status: 'active',
      dailyRevenue: 28500,
      dailyExpense: 15400,
      netProfit: 13100,
      revenueBreakdown: { creditCard: 19500, cash: 6500, online: 2500, other: 0 },
      expenseBreakdown: {
        personel: 5400,
        kasap: 4500,
        icecek: 1400,
        sebzeMeyve: 1300,
        temizlik: 700,
        nakliye: 600,
        kira: 1000,
        elektrik: 500,
        diger: 0,
      },
      staffCount: 4,
      dailyTotalWage: 5400,
      monthlyStaffCost: 162000,
      siparisIntegration: {
        externalBranchId: `EXT-BR-${code}`,
        externalOrderId: `SIP-2026-${Date.now().toString().slice(-4)}`,
        orderDate: todayStr,
        productCost: 8900,
        returnedCost: 200,
        netProductCost: 8700,
        expectedSalesAmount: 24000,
        branchDebt: 12000,
        lastSyncTime: 'Yeni Başlatıldı (Otomasyon Aktif)',
        varianceNote: 'İşletme başarıyla sisteme bağlandı. Satış ve ciro girişi bekleniyor.',
      },
      performanceScore: 94,
    };

    setAllBranches((prev) => [newBranch, ...prev]);

    const newUser: User = {
      id: `user-${newBranch.id}`,
      name: data.ownerName.trim(),
      email,
      password,
      phone: data.ownerPhone?.trim(),
      role: 'sube',
      branchId: newBranch.id,
      branchName: newBranch.name,
      companyId: targetCompany.id,
      companyName: targetCompany.name,
      title: `${newBranch.name} Sorumlusu`,
    };

    setRegisteredUsers((prev) => [newUser, ...prev]);
    setActiveCompanyIdState(targetCompany.id);
    setSelectedBranchId(newBranch.id);

    if (data.autoLaunch !== false) {
      setCurrentUser(newUser);
      setActiveTab('revenue_entry');
      showNotification(
        `"${newBranch.name}" (${targetCompany.name}) işletmesi başarıyla oluşturuldu ve başlatıldı! Giriş Şifresi: ${password}`,
        'success'
      );
    } else {
      showNotification(
        `"${newBranch.name}" işletmesi "${targetCompany.name}" merkezine başarıyla eklendi!`,
        'success'
      );
    }

    return {
      company: targetCompany,
      branch: newBranch,
      user: newUser,
      temporaryPassword: password,
    };
  };

  const toggleCompanyStatus = (companyId: string) => {
    if (sessionMode.current === 'live') {
      showNotification(pendingBackendMessage, 'info');
      return;
    }
    setCompanies((prev) =>
      prev.map((c) => {
        if (c.id === companyId) {
          const newStatus = c.subscription.status === 'active' ? 'passive' : 'active';
          return {
            ...c,
            subscription: {
              ...c.subscription,
              status: newStatus,
            },
          };
        }
        return c;
      })
    );
    const comp = companies.find((c) => c.id === companyId);
    showNotification(
      `"${comp?.name}" işletmesinin lisans durumu değiştirildi: ${
        comp?.subscription.status === 'active' ? 'Pasife Alındı (Askıda)' : 'Aktif Edildi'
      }`,
      'warning'
    );
  };

  const updateCompanySubscription = async (companyId: string, data: SubscriptionUpdate) => {
    if (sessionMode.current !== 'live' || currentUser?.role !== 'admin') throw new Error('Bu işlem yalnızca süper admin içindir.');
    const epoch = authEpoch.current;
    const result = await api<{ bootstrap: BootstrapData }>('/admin/companies/' + encodeURIComponent(companyId) + '/subscription', data);
    if (epoch !== authEpoch.current || sessionMode.current !== 'live') return;
    applyBootstrap(result.bootstrap, true);
    showNotification('Abonelik ve lisans bilgileri kaydedildi.', 'success');
  };

  const addBankAccount = async (input: BankAccountInput) => {
    if (sessionMode.current !== 'live' || currentUser?.role !== 'admin') throw new Error('Bu işlem yalnızca süper admin içindir.');
    const epoch = authEpoch.current;
    const result = await api<{ bootstrap: BootstrapData }>('/admin/bank-accounts', input);
    if (epoch !== authEpoch.current || sessionMode.current !== 'live') return;
    applyBootstrap(result.bootstrap, true);
    showNotification('Banka hesabı kaydedildi.', 'success');
  };
  const chargeCompany = async (companyId: string, amount: number, method: BillingMethod, notes = '', options?: CollectionOptions) => {
    if (sessionMode.current !== 'live' || currentUser?.role !== 'admin') throw new Error('Bu işlem yalnızca süper admin içindir.');
    if (!options) throw new Error('Tahsilat bilgileri eksik.');
    const epoch = authEpoch.current;
    const result = await api<{ bootstrap: BootstrapData }>('/admin/collections', { companyId, amount, method, notes, ...options });
    if (epoch !== authEpoch.current || sessionMode.current !== 'live') return;
    applyBootstrap(result.bootstrap, true);
    showNotification('Tahsilat kaydedildi.', 'success');
  };
  const refreshAdminFinance = async () => {
    if (currentUser?.role !== 'admin') return;
    const epoch = authEpoch.current;
    const result = await api<{ bankAccounts: BankAccount[]; payments: PaymentRecord[] }>('/admin/finance');
    if (epoch !== authEpoch.current || sessionMode.current !== 'live') return;
    setBankAccounts(result.bankAccounts); setPayments(result.payments);
  };

  const uploadReceipt = async (branchId: string, file: File): Promise<ReceiptAttachment> => {
    if (sessionMode.current === 'demo') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ id: createClientId(), url: String(reader.result), fileName: file.name });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    const form = new FormData(); form.append('image', file);
    return api<ReceiptAttachment>('/branch/' + branchId + '/receipts', form);
  };
  const applyRevenueRecord = (record: DailyRevenueRecord) => {
    setAllDailyRevenueRecords(previous => [record, ...previous.filter(item => item.id !== record.id)]);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    if (record.date === today) setAllBranches(previous => previous.map(branch => branch.id === record.branchId ? {
      ...branch, dailyRevenue: record.total, netProfit: record.total - branch.dailyExpense,
      revenueBreakdown: { creditCard: record.creditCard, cash: record.cash, online: record.online, other: record.other },
    } : branch));
  };
  const addCashRevenueEntry = async (branchId: string, date: string, banknotes: CashBanknotes, clientRequestId: string) => {
    if (sessionMode.current !== 'live') throw new Error('Nakit girişini kaydetmek için oturum açın.');
    const epoch = authEpoch.current;
    const result = await api<{ record: DailyRevenueRecord }>('/branch/cash-entries', { branchId, date, banknotes, clientRequestId });
    if (epoch !== authEpoch.current || sessionMode.current !== 'live') throw new Error('Oturum değişti. Nakit geçmişini yeniden yükleyin.');
    applyRevenueRecord(result.record);
    showNotification('Banknot sayımı nakit hasılatına eklendi.', 'success');
    return result.record;
  };
  const addDailyRevenue = async (data: Omit<DailyRevenueRecord, 'id' | 'createdAt'>) => {
    if (sessionMode.current === 'live') {
      const epoch = authEpoch.current;
      const result = await api<{ record: DailyRevenueRecord }>('/branch/revenue', {
        branchId: data.branchId, date: data.date, creditCard: data.creditCard, cash: data.cash,
        cashExpected: data.cashExpected ?? dailyRevenueRecords.find(record => record.branchId === data.branchId && record.date === data.date)?.cash ?? 0,
        online: data.online, other: data.other, notes: data.notes ?? '', receiptIds: data.receiptIds ?? [],
      });
      if (epoch !== authEpoch.current || sessionMode.current !== 'live') return;
      applyRevenueRecord(result.record);
      showNotification('Günlük ciro veritabanına kaydedildi.', 'success');
      return;
    }
    const newRecord: DailyRevenueRecord = {
      ...data,
      companyId: activeCompanyId,
      id: `rev-rec-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    setAllDailyRevenueRecords((prev) => [newRecord, ...prev]);

    // Update branch figures
    setAllBranches((prev) =>
      prev.map((b) => {
        if (b.id === data.branchId) {
          const updatedRev = data.total;
          const updatedNet = updatedRev - b.dailyExpense;
          return {
            ...b,
            dailyRevenue: updatedRev,
            netProfit: updatedNet,
            revenueBreakdown: {
              creditCard: data.creditCard,
              cash: data.cash,
              online: data.online,
              other: data.other,
            },
          };
        }
        return b;
      })
    );

    showNotification(`${data.branchName} için ${data.total.toLocaleString('tr-TR')} ₺ günlük ciro başarıyla kaydedildi`);
  };

  const applyOperationalData = (data: BootstrapData) => {
    setPayments(data.payments ?? []);
    setBankAccounts(data.bankAccounts ?? []);
    setManagedUsers(data.managedUsers ?? []);
    setAllBranches(data.branches);
    setAllDailyRevenueRecords(data.dailyRevenueRecords ?? []);
    setAllExpenses(data.expenses ?? []);
    setAllStaff(data.staffList ?? []);
    setExpenseCategories(data.expenseCategories ?? []);
    setStaffPayments(data.staffPayments ?? []);
  };
  useEffect(() => {
    if (sessionMode.current !== 'live' || !currentUser) return;
    let disposed = false, refreshing = false;
    const refresh = async () => {
      if (refreshing || document.visibilityState === 'hidden') return;
      const epoch = authEpoch.current;
      refreshing = true;
      try {
        const data = await api<BootstrapData>('/auth/me');
        if (!disposed && authEpoch.current === epoch) {
          applyOperationalData(data); setCurrentUser(data.user); setCompanies(data.companies);
          if (data.user.role !== 'admin') {
            setActiveCompanyIdState(data.user.companyId || ''); setRegisteredUsers([]);
          }
          setSelectedBranchId(previous => data.user.role === 'admin'
            ? (data.branches.some(branch => branch.id === previous) ? previous : '')
            : data.user.branchId || (data.branches.some(branch => branch.id === previous) ? previous : data.branches[0]?.id || ''));
          setActiveTabState(previous => resolvePageForRole(data.user.role, previous) || homePage(data.user.role));
        }
      } catch { /* Keep current records if the network is temporarily unavailable. */ }
      finally { refreshing = false; }
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('cirox:branch-activity', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { disposed = true; window.removeEventListener('focus', refresh); window.removeEventListener('cirox:branch-activity', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [currentUser?.id]);
  const addExpense = async (data: Omit<ExpenseRecord, 'id' | 'createdAt'>) => {
    if (sessionMode.current === 'live') {
      const epoch = authEpoch.current;
      const result = await api<{ bootstrap: BootstrapData }>('/branch/expenses', {
        branchId: data.branchId, categoryId: data.categoryId, amount: data.amount, date: data.date,
        description: data.description, vatRate: data.vatRate ?? 0, staffId: data.staffId || undefined,
        receiptNumber: data.receiptNumber, receiptIds: data.receiptIds ?? [], clientRequestId: data.clientRequestId ?? createClientId(),
        paymentBasis: data.paymentBasis, staffPaymentType: data.staffPaymentType,
      });
      if (epoch === authEpoch.current) {
        applyOperationalData(result.bootstrap); showNotification('Gider veritabanına kaydedildi.', 'success');
      }
      return;
    }
    const newExpense: ExpenseRecord = {
      ...data,
      companyId: activeCompanyId,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    setAllExpenses((prev) => [newExpense, ...prev]);

    // Update branch total expenses
    setAllBranches((prev) =>
      prev.map((b) => {
        if (b.id === data.branchId) {
          const newDailyExpense = b.dailyExpense + data.amount;
          return {
            ...b,
            dailyExpense: newDailyExpense,
            netProfit: b.dailyRevenue - newDailyExpense,
          };
        }
        return b;
      })
    );

    showNotification(`${data.categoryName} için ${data.amount.toLocaleString('tr-TR')} ₺ gider kaydı eklendi`);
  };

  const deleteExpense = async (id: string) => {
    if (sessionMode.current === 'live') {
      const epoch = authEpoch.current;
      const result = await api<{ bootstrap: BootstrapData }>('/branch/expenses/' + id + '/delete', {});
      if (epoch === authEpoch.current) {
        applyOperationalData(result.bootstrap); showNotification('Gider listeden kaldırıldı; arşiv kaydı korundu.', 'info');
      }
      return;
    }
    const exp = allExpenses.find((e) => e.id === id);
    if (!exp) return;

    setAllExpenses((prev) => prev.filter((e) => e.id !== id));
    setAllBranches((prev) =>
      prev.map((b) => {
        if (b.id === exp.branchId) {
          const newDailyExpense = Math.max(0, b.dailyExpense - exp.amount);
          return {
            ...b,
            dailyExpense: newDailyExpense,
            netProfit: b.dailyRevenue - newDailyExpense,
          };
        }
        return b;
      })
    );
    showNotification('Gider kaydı silindi', 'info');
  };

  const addExpenseCategory = async (data: Omit<ExpenseCategory, 'id'>) => {
    if (sessionMode.current === 'live') {
      const epoch = authEpoch.current;
      const result = await api<{ bootstrap: BootstrapData }>('/branch/expense-categories', {
        branchId: data.branchId || currentUser?.branchId || selectedBranchId, name: data.name, type: data.type,
        description: data.description, iconName: data.iconName, defaultVatRate: data.defaultVatRate ?? (data.type === 'staff_based' ? 0 : 20), isActive: data.isActive ?? true,
      });
      if (epoch === authEpoch.current) { applyOperationalData(result.bootstrap); showNotification('Gider kalemi eklendi.', 'success'); }
      return;
    }
    const newCat: ExpenseCategory = {
      ...data,
      id: createClientId(), branchId: data.branchId || currentUser?.branchId || selectedBranchId, isActive: data.isActive ?? true,
    };
    setExpenseCategories((prev) => [...prev, newCat]);
    showNotification(`"${data.name}" gider kalemi başarıyla oluşturuldu`);
  };

  const updateExpenseCategory = async (id: string, data: Partial<ExpenseCategory>) => {
    if (sessionMode.current === 'live') {
      const epoch = authEpoch.current;
      const result = await api<{ bootstrap: BootstrapData }>('/branch/expense-categories/' + id + '/update', {
        branchId: data.branchId || currentUser?.branchId || selectedBranchId, name: data.name, type: data.type,
        description: data.description, iconName: data.iconName, defaultVatRate: data.defaultVatRate, isActive: data.isActive,
      });
      if (epoch === authEpoch.current) { applyOperationalData(result.bootstrap); showNotification('Gider kalemi güncellendi.', 'success'); }
      return;
    }
    setExpenseCategories(previous => previous.map(category => category.id === id ? { ...category, ...data } : category));
    showNotification('Gider kalemi güncellendi.', 'success');
  };
  const deleteExpenseCategory = async (id: string) => updateExpenseCategory(id, { isActive: false });

  const addStaff = async (data: Omit<Staff, 'id'>) => {
    if (sessionMode.current === 'live') {
      const epoch = authEpoch.current;
      const basis = data.salaryBasis ?? 'monthly';
      const result = await api<{ bootstrap: BootstrapData }>('/branch/staff', {
        branchId: data.branchId, clientRequestId: data.clientRequestId ?? createClientId(), fullName: data.fullName, role: data.role,
        phone: data.phone, hireDate: data.hireDate, salaryBasis: basis, salaryAmount: basis === 'daily' ? data.dailyWage : data.monthlySalary,
      });
      if (epoch === authEpoch.current) { applyOperationalData(result.bootstrap); showNotification('Personel kaydedildi.', 'success'); }
      return;
    }
    const newStaff: Staff = {
      ...data,
      companyId: activeCompanyId,
      id: createClientId(),
    };
    setAllStaff((prev) => [newStaff, ...prev]);

    // Update branch staff count
    setAllBranches((prev) =>
      prev.map((b) => {
        if (b.id === data.branchId) {
          const newCount = b.staffCount + 1;
          const newWage = b.dailyTotalWage + data.dailyWage;
          return {
            ...b,
            staffCount: newCount,
            dailyTotalWage: newWage,
            monthlyStaffCost: Math.round(newWage * 30 * 1.35),
          };
        }
        return b;
      })
    );
    showNotification(`${data.fullName} şube personeli olarak kaydedildi`);
  };

  const updateStaff = async (id: string, data: Partial<Staff>) => {
    if (sessionMode.current === 'live') {
      const current = allStaff.find(person => person.id === id); if (!current) throw new Error('Personel bulunamadı.');
      const next = { ...current, ...data }; const basis = next.salaryBasis ?? 'monthly'; const epoch = authEpoch.current;
      const result = await api<{ bootstrap: BootstrapData }>('/branch/staff/' + id + '/update', { fullName: next.fullName, role: next.role, phone: next.phone,
        hireDate: next.hireDate, salaryBasis: basis, salaryAmount: basis === 'daily' ? next.dailyWage : next.monthlySalary });
      if (epoch === authEpoch.current) { applyOperationalData(result.bootstrap); showNotification('Personel bilgileri güncellendi.', 'success'); }
      return;
    }
    setAllStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
    showNotification('Personel bilgileri güncellendi');
  };

  const toggleStaffStatus = async (id: string) => {
    if (sessionMode.current === 'live') {
      const current = allStaff.find(person => person.id === id); if (!current) throw new Error('Personel bulunamadı.');
      const epoch = authEpoch.current;
      const result = await api<{ bootstrap: BootstrapData }>('/branch/staff/' + id + '/status', { status: current.status === 'active' ? 'passive' : 'active' });
      if (epoch === authEpoch.current) { applyOperationalData(result.bootstrap); showNotification('Personel durumu güncellendi.', 'success'); }
      return;
    }
    setAllStaff((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextStatus = s.status === 'active' ? 'passive' : 'active';
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
    showNotification('Personel çalışma durumu güncellendi', 'info');
  };

  const addStaffPayment = async (data: Omit<StaffPaymentHistory, 'id'>) => {
    if (sessionMode.current === 'live') {
      const person = allStaff.find(person => person.id === data.staffId);
      if (!person) throw new Error('Personel bulunamadı.');
      const category = expenseCategories.find(category => category.type === 'staff_based' && category.isActive !== false && (!category.branchId || category.branchId === person.branchId));
      if (!category) throw new Error('Önce Gider Kalemleri sayfasından personel bazlı bir kalemi etkinleştirin.');
      await addExpense({ branchId: person.branchId, branchName: person.branchName, date: data.date, categoryId: category.id, categoryName: category.name,
        amount: data.amount, description: data.description, vatRate: 0, staffId: person.id, staffName: person.fullName,
        clientRequestId: data.clientRequestId, paymentBasis: data.paymentBasis ?? (data.type === 'maas' ? 'monthly' : 'daily'), staffPaymentType: data.type, receiptIds: [] });
      return;
    }
    const newPayment: StaffPaymentHistory = {
      ...data,
      id: `sp-${Date.now()}`,
    };
    setStaffPayments((prev) => [newPayment, ...prev]);
    showNotification(`${data.staffName} için ${data.amount.toLocaleString('tr-TR')} ₺ ödeme işlendi`);
  };

  const saveBranchSettings = async (data: BranchSettings) => {
    if (sessionMode.current === 'live') {
      const epoch = authEpoch.current;
      const result = await api<{ bootstrap: BootstrapData }>('/settings/business', { ...data, ...(currentUser?.role === 'admin' ? { branchId: selectedBranchId } : {}) });
      if (epoch === authEpoch.current) { applyOperationalData(result.bootstrap); setCurrentUser(result.bootstrap.user); showNotification('Şube bilgileri kaydedildi.', 'success'); }
      return;
    }
    setAllBranches(prev => prev.map(branch => branch.id === currentUser?.branchId ? { ...branch, ...data } : branch));
    showNotification('Şube bilgileri demo oturumunda güncellendi.', 'info');
  };
  const saveOwnProfile = async (data: OwnProfileUpdate) => {
    if (sessionMode.current === 'live') {
      const epoch = authEpoch.current;
      const { currentPassword, ...adminData } = data;
      const result = currentUser?.role === 'admin'
        ? await api<{ bootstrap: BootstrapData }>(`/admin/users/${encodeURIComponent(viewUser?.id || '')}/profile`, adminData)
        : await api<{ bootstrap: BootstrapData }>('/settings/profile', data);
      if (epoch === authEpoch.current) {
        ++authEpoch.current; advanceSessionVersion();
        applyOperationalData(result.bootstrap); setCurrentUser(result.bootstrap.user); showNotification('Kullanıcı bilgileriniz güncellendi.', 'success');
      }
      return;
    }
    setCurrentUser(prev => prev ? { ...prev, name: data.name, username: data.username, email: data.email, phone: data.phone } : prev);
    showNotification('Profil demo oturumunda güncellendi. Giriş şifresi değiştirilmedi.', 'info');
  };
  return (
    <AppContext.Provider
      value={{
        branchListSort, setBranchListSort,
        branchListViewMode: currentUser?.role === 'merkez' && mobileViewport ? mobileBranchListViewMode : branchListViewMode,
        setBranchListViewMode: currentUser?.role === 'merkez' && mobileViewport ? setMobileBranchListViewMode : setBranchListViewMode,
        viewUser, adminCenterId, selectableBranches, selectAdminCenter, selectAdminBranch, returnToAdmin, isAdminCustomerView,
        saveBranchSettings,
        saveOwnProfile,
        currentUser,
        isLoggedIn: !!currentUser && sessionMode.current === 'live',
        branches,
        selectedBranchId,
        selectedBranch,
        activeTab,
        dailyRevenueRecords,
        expenses,
        expenseCategories: expenseCategories.filter(category => !category.branchId || branches.some(branch => branch.id === category.branchId)),
        staffList,
        staffPayments: staffPayments.filter(payment => branches.some(branch => branch.id === payment.branchId)),
        notification,
        companies,
        activeCompanyId,
        activeCompany,
        payments,
        registeredUsers,
        loginWithCredentials,
        createEstablishmentAndStart,
        adminBranches: currentUser?.role === 'admin' ? allBranches : [],
        createCenterAccount,
        updateBranchCenter,
        setActiveCompanyId,
        createCompany,
        toggleCompanyStatus,
        updateCompanySubscription,
        bankAccounts, addBankAccount, refreshAdminFinance,
        chargeCompany,
        logout,
        setActiveTab,
        setSelectedBranchId: currentUser?.role === 'admin' ? selectAdminBranch : setSelectedBranchId,
        addDailyRevenue, addCashRevenueEntry,
        uploadReceipt,
        addExpense,
        deleteExpense,
        addExpenseCategory,
        updateExpenseCategory,
        deleteExpenseCategory,
        addStaff,
        updateStaff,
        toggleStaffStatus,
        addStaffPayment,
        showNotification,
        switchPerspective,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
