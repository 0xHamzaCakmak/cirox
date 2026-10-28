import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  UserCheck,
  UserX,
  History,
  Building,
  Briefcase,
  DollarSign,
  Phone,
  Calendar,
  X,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Edit2,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Staff } from '../../types';
import { calculateWages } from '../../data/staffWages';
import { createClientId } from '../../services/clientId';

export const StaffPage: React.FC = () => {
  const {
    staffList, activeTab, setActiveTab, currentUser, showNotification,
    branches,
    selectedBranchId,
    addStaff,
    updateStaff,
    toggleStaffStatus,
    staffPayments,
    addStaffPayment,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'passive'>('all');

  // Modals state
  const isAddModalOpen = activeTab === 'staff_new' || activeTab === 'staff_edit';
  const setIsAddModalOpen = (_open: boolean) => setActiveTab('staff');
  const readOnly = currentUser?.role !== 'sube';
  const [editing, setEditing] = useState<Staff | null>(null);
  const [salaryBasis, setSalaryBasis] = useState<'daily' | 'monthly'>('daily');
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const requestId = useRef(createClientId());
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  const notifyError = (error: unknown) => showNotification(error instanceof Error ? error.message : 'İşlem tamamlanamadı.', 'warning');
  const changeWage = (basis: 'daily' | 'monthly', value: string) => {
    setSalaryBasis(basis);
    if (value === '') { setFormDailyWage(''); setFormMonthlySalary(''); return; }
    const wages = calculateWages(basis, Number(value));
    setFormDailyWage(wages.dailyWage); setFormMonthlySalary(wages.monthlySalary);
  };
  const [selectedStaffForHistory, setSelectedStaffForHistory] = useState<Staff | null>(null);
  const isPaymentModalOpen = activeTab === 'staff_payment';
  const setIsPaymentModalOpen = (open: boolean) => setActiveTab(open ? 'staff_payment' : 'staff_history');
  const [paymentBasis, setPaymentBasis] = useState<'daily' | 'monthly'>('daily');
  const [payDate, setPayDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }));

  // Add staff form state
  const [formBranchId, setFormBranchId] = useState(currentUser?.branchId || selectedBranchId || branches[0]?.id || '');
  const [formFullName, setFormFullName] = useState('');
  const [formRole, setFormRole] = useState('Garson');
  const [formDailyWage, setFormDailyWage] = useState<number | ''>('');
  const [formMonthlySalary, setFormMonthlySalary] = useState<number | ''>('');
  const [formPhone, setFormPhone] = useState('');

  // Payment form state
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payType, setPayType] = useState<'yevmiye' | 'avans' | 'maas' | 'prim'>('yevmiye');
  const [payDescription, setPayDescription] = useState('');

  const roles = useMemo(() => {
    return Array.from(new Set(staffList.map((s) => s.role)));
  }, [staffList]);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchesSearch =
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.branchName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBranch = branchFilter === 'all' || s.branchId === branchFilter;
      const matchesRole = roleFilter === 'all' || s.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesBranch && matchesRole && matchesStatus;
    });
  }, [staffList, searchQuery, branchFilter, roleFilter, statusFilter]);

  const handleOpenAdd = (staff?: Staff) => {
    if (readOnly) return;
    setEditing(staff || null); setFormBranchId(staff?.branchId || currentUser?.branchId || selectedBranchId || branches[0]?.id || '');
    setFormFullName(staff?.fullName || ''); setFormPhone(staff?.phone || ''); setFormRole(staff?.role || 'Garson');
    setSalaryBasis(staff?.salaryBasis || 'monthly'); setFormDailyWage(staff?.dailyWage ?? ''); setFormMonthlySalary(staff?.monthlySalary ?? '');
    requestId.current = createClientId(); setActiveTab(staff ? 'staff_edit' : 'staff_new');
  };
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (submitting.current || readOnly || !formFullName.trim()) return;
    const b = branches.find(br => br.id === formBranchId); if (!b) return;
    submitting.current = true; setSaving(true);
    try {
      const data = { branchId: b.id, branchName: b.name, fullName: formFullName.trim(), role: formRole,
        dailyWage: Number(formDailyWage) || 0, monthlySalary: Number(formMonthlySalary) || 0, salaryBasis,
        status: editing?.status || 'active' as const, phone: formPhone.trim(), hireDate: editing?.hireDate || today(), clientRequestId: requestId.current };
      if (editing) await updateStaff(editing.id, data); else await addStaff(data);
      if (mounted.current) setActiveTab('staff');
    } catch (error) { notifyError(error); }
    finally { submitting.current = false; if (mounted.current) setSaving(false); }
  };
  const handleOpenHistory = (staff: Staff) => { setSelectedStaffForHistory(staff); setActiveTab('staff_history'); };
  const changePaymentBasis = (basis: 'daily' | 'monthly') => {
    setPaymentBasis(basis); setPayType(basis === 'daily' ? 'yevmiye' : 'maas');
    setPayAmount(basis === 'daily' ? selectedStaffForHistory?.dailyWage ?? '' : selectedStaffForHistory?.monthlySalary ?? '');
  };
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || submitting.current || !selectedStaffForHistory || !payAmount || Number(payAmount) <= 0) return;
    submitting.current = true; setSaving(true);
    try {
      await addStaffPayment({ staffId: selectedStaffForHistory.id, staffName: selectedStaffForHistory.fullName,
        branchId: selectedStaffForHistory.branchId, date: payDate, amount: Number(payAmount), type: payType,
        paymentBasis, clientRequestId: requestId.current, description: payDescription || (paymentBasis === 'daily' ? 'Günlük' : 'Aylık') + ' personel ödemesi' });
      if (mounted.current) { setActiveTab('staff_history'); setPayAmount(''); setPayDescription(''); }
    } catch (error) { notifyError(error); }
    finally { submitting.current = false; if (mounted.current) setSaving(false); }
  };

  const staffPaymentsList = useMemo(() => {
    if (!selectedStaffForHistory) return [];
    return staffPayments.filter((p) => p.staffId === selectedStaffForHistory.id);
  }, [staffPayments, selectedStaffForHistory]);

  return (
    <div className="space-y-6 pb-12">
      {(activeTab === 'staff_history' || activeTab === 'staff_payment') && !selectedStaffForHistory && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-xs text-zinc-400">
          <button onClick={() => setActiveTab('staff')} className="flex items-center gap-2 mb-3 text-sky-400"><ArrowLeft className="w-4 h-4" />Personel Listesine Dön</button>
          İşlem yapmak için listeden bir personel seçin.
        </div>
      )}
      {activeTab === 'staff' && <>
      {/* Header */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-zinc-100">
              Personel & Yevmiye Yönetimi
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Şubelerdeki aşçı, garson, kasiyer, kurye kadrosu, günlük yevmiyeler ve geçmiş hakedişler
          </p>
        </div>

        <button
          disabled={readOnly} onClick={() => handleOpenAdd()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-sky-500/10 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Personel Ekle</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Ad soyad, görev veya şube ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Branch filter */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300">
            <Building className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900">Tüm Şubeler</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-zinc-900">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role filter */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300">
            <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900">Tüm Görevler</option>
              {roles.map((r) => (
                <option key={r} value={r} className="bg-zinc-900">
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900">Tüm Durumlar</option>
              <option value="active" className="bg-zinc-900">Aktif Personeller</option>
              <option value="passive" className="bg-zinc-900">Pasif / Ayrılmış</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/40">
                <th className="py-3 px-4">Ad Soyad</th>
                <th className="py-3 px-4">Görev</th>
                <th className="py-3 px-4">Şube</th>
                <th className="py-3 px-4 text-right">Günlük Yevmiye</th>
                <th className="py-3 px-4 text-right">Aylık Maaş</th>
                <th className="py-3 px-4 text-center">Durum</th>
                <th className="py-3 px-4 text-right">Ödeme Geçmişi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {filteredStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-zinc-850/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300 text-xs">
                        {staff.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-zinc-200">{staff.fullName}</span>
                        <div className="text-[10px] text-zinc-500 font-mono">{staff.phone}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-300">
                      {staff.role}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-zinc-300 font-medium">{staff.branchName}</td>

                  <td className="py-3 px-4 text-right font-mono font-semibold text-amber-400">
                    {(staff.dailyWage ?? 0).toLocaleString('tr-TR')} ₺
                  </td>

                  <td className="py-3 px-4 text-right font-mono text-zinc-300">
                    {(staff.monthlySalary ?? 0).toLocaleString('tr-TR')} ₺
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      disabled={readOnly || saving} onClick={() => { if (submitting.current) return; submitting.current = true; setSaving(true); void toggleStaffStatus(staff.id).catch(notifyError).finally(() => { submitting.current = false; setSaving(false); }); }}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                        staff.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-750'
                      }`}
                      title="Durumu Değiştir"
                    >
                      {staff.status === 'active' ? (
                        <>
                          <UserCheck className="w-3 h-3" />
                          <span>Aktif</span>
                        </>
                      ) : (
                        <>
                          <UserX className="w-3 h-3" />
                          <span>Pasif</span>
                        </>
                      )}
                    </button>
                  </td>

                  <td className="py-3 px-4 text-right">
                    {!readOnly && <button aria-label="Personeli düzenle" className="p-2 text-sky-400" onClick={() => handleOpenAdd(staff)}><Edit2 className="w-4 h-4" /></button>}
                    <button
                      onClick={() => handleOpenHistory(staff)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs font-medium border border-zinc-700/60 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <History className="w-3.5 h-3.5 text-sky-400" />
                      <span>Geçmiş Ödemeler</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      </>}
      {/* Personel form sayfası */}
      {isAddModalOpen && (
        <div className="w-full">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full p-4 md:p-6">
            <div className="flex flex-wrap gap-3 items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-zinc-100">{editing ? 'Personeli Düzenle' : 'Yeni Personel Tanımla'}</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <span className="flex items-center gap-2 text-xs"><ArrowLeft className="w-4 h-4" />Personel Listesine Dön</span>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Şube</label>
                <select
                  value={formBranchId}
                  onChange={(e) => setFormBranchId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Ad Soyad</label>
                <input
                  type="text"
                  placeholder="Örn: Ahmet Yılmaz"
                  value={formFullName}
                  maxLength={128}
                  onChange={(e) => setFormFullName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Görev / Ünvan</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none"
                  >
                    <option value="Şube Müdürü">Şube Müdürü</option>
                    <option value="Şef Aşçı">Şef Aşçı</option>
                    <option value="Aşçı Yardımcısı">Aşçı Yardımcısı</option>
                    <option value="Kasiyer">Kasiyer</option>
                    <option value="Kıdemli Garson">Kıdemli Garson</option>
                    <option value="Garson">Garson</option>
                    <option value="Barista">Barista</option>
                    <option value="Motorlu Kurye">Motorlu Kurye</option>
                    <option value="Temizlik Personeli">Temizlik Personeli</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Telefon</label>
                  <input
                    type="text"
                    placeholder="0532 000 00 00"
                    value={formPhone}
                    maxLength={32}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Günlük Yevmiye (₺)</label>
                  <input
                    type="number"
                    min="0" step="0.01" max="99999999.99"
                    value={formDailyWage}
                    onChange={(e) => changeWage('daily', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Aylık Maaş Tabanı (₺)</label>
                  <input
                    type="number"
                    min="0" step="0.01" max="99999999.99"
                    value={formMonthlySalary}
                    onChange={(e) => changeWage('monthly', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <p className="text-zinc-400">Aylık ücret 30 gün üzerinden hesaplanır. Son girdiğiniz ücret esas alınır.</p>
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit" disabled={saving || readOnly}
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-zinc-950 font-bold shadow-lg shadow-sky-500/20"
                >
                  Personeli Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Payment History Modal */}
      {activeTab === 'staff_history' && selectedStaffForHistory && (
        <div className="w-full">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full p-4 md:p-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-bold text-zinc-100">
                  {selectedStaffForHistory.fullName} - Ödeme ve Yevmiye Hareketleri
                </h3>
                <p className="text-xs text-zinc-400">
                  {selectedStaffForHistory.role} • {selectedStaffForHistory.branchName}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('staff')}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <span className="flex items-center gap-2 text-xs"><ArrowLeft className="w-4 h-4" />Personel Listesine Dön</span>
              </button>
            </div>

            {/* Quick Action: New Payment */}
            <div className="my-4 flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800">
              <div className="text-xs">
                <span className="text-zinc-400">Kayıtlı Günlük Yevmiye: </span>
                <span className="font-mono font-bold text-amber-400">
                  {(selectedStaffForHistory.dailyWage ?? 0).toLocaleString('tr-TR')} ₺
                </span>
              </div>
              <button
                onClick={() => {
                  setPaymentBasis('daily'); setPayDate(today()); requestId.current = createClientId();
                  setPayAmount(selectedStaffForHistory.dailyWage);
                  setPayType('yevmiye');
                  setPayDescription(`${new Date().toLocaleDateString('tr-TR')} Günlük Yevmiye`);
                  setIsPaymentModalOpen(true);
                }}
                disabled={readOnly || selectedStaffForHistory.status !== 'active'} className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ödeme İşle</span>
              </button>
            </div>

            {/* Payment History List */}
            <div className="space-y-2">
              {staffPaymentsList.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500">
                  Bu personele ait henüz kayıtlı geçmiş ödeme bulunmuyor.
                </div>
              ) : (
                staffPaymentsList.map((pay) => (
                  <div
                    key={pay.id}
                    className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-400">{pay.date}</span>
                        <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold font-mono">
                          {pay.paymentBasis === 'monthly' ? 'Aylık' : pay.paymentBasis === 'daily' ? 'Günlük' : ''} {pay.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 mt-0.5">{pay.description}</p>
                    </div>

                    <div className="font-mono font-bold text-emerald-400 text-sm">
                      {(pay.amount ?? 0).toLocaleString('tr-TR')} ₺
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setActiveTab('staff')}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-medium hover:bg-zinc-700"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini Payment Form Modal */}
      {isPaymentModalOpen && selectedStaffForHistory && (
        <div className="w-full">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full p-4 md:p-6">
            <h4 className="text-sm font-bold text-zinc-100 mb-3">
              {selectedStaffForHistory.fullName} için Ödeme İşle
            </h4>
            <button className="text-xs text-zinc-400 flex items-center gap-2 mb-4" onClick={() => setActiveTab('staff_history')}><ArrowLeft className="w-4 h-4" />Ödeme Geçmişine Dön</button>
            <form onSubmit={handlePaymentSubmit} className="space-y-3 text-xs">
              <div><label className="block text-zinc-400 mb-1">Ödeme Dönemi</label><select value={paymentBasis} onChange={e => changePaymentBasis(e.target.value as 'daily' | 'monthly')} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2"><option value="daily">Günlük</option><option value="monthly">Aylık (30 gün)</option></select></div>
              <div><label className="block text-zinc-400 mb-1">Ödeme Tarihi</label><input required type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2" /></div>
              <p className="text-zinc-400">Ödenen tutar, bu tarihte tek gider olarak kaydedilir.</p>
              <div>
                <label className="block text-zinc-400 mb-1">Ödeme Türü</label>
                <select
                  value={payType}
                  onChange={(e) => {
                    const type = e.target.value as 'yevmiye' | 'maas' | 'avans' | 'prim';
                    if (type === 'maas') changePaymentBasis('monthly');
                    if (type === 'yevmiye') changePaymentBasis('daily');
                    setPayType(type);
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none"
                >
                  <option value="yevmiye">Günlük Yevmiye</option>
                  <option value="avans">Avans</option>
                  <option value="maas">Aylık Maaş</option>
                  <option value="prim">Prim / İkramiye</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Tutar (TRY / ₺)</label>
                <input
                  type="number"
                  min="0.01" step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 font-mono text-zinc-100 text-base font-bold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Açıklama</label>
                <input
                  type="text"
                  value={payDescription}
                  onChange={(e) => setPayDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit" disabled={saving || readOnly}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-bold"
                >
                  Ödemeyi Onayla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
