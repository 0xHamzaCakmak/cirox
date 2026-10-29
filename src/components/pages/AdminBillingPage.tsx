import React, { useState, useMemo } from 'react';
import {
  Receipt,
  CreditCard,
  Building,
  DollarSign,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  FileText,
  Plus,
  ArrowDownToLine,
  Printer,
  Shield,
  Clock,
  X,
  Building2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AdminCollectionPage } from './AdminCollectionPage';
import { AdminBankAccountsPage } from './AdminBankAccountsPage';

export const AdminBillingPage: React.FC = () => {
  const { payments, companies, setActiveTab } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'credit_card' | 'bank_transfer' | 'manual'>('all');
  const [showCollectionPage, setShowCollectionPage] = useState(false);

  const [showBankAccountsPage, setShowBankAccountsPage] = useState(false);

  // Total collected calculation
  const totalCollected = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const cardCollected = useMemo(() => {
    return payments.filter((p) => p.method === 'credit_card').reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const bankCollected = useMemo(() => {
    return payments.filter((p) => p.method === 'bank_transfer').reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchSearch =
        p.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchMethod = methodFilter === 'all' ? true : p.method === methodFilter;

      return matchSearch && matchMethod;
    });
  }, [payments, searchTerm, methodFilter]);

  if (showBankAccountsPage) return <AdminBankAccountsPage onBack={() => setShowBankAccountsPage(false)} />;
  if (showCollectionPage) return <AdminCollectionPage onBack={() => setShowCollectionPage(false)} onManageBanks={() => setShowBankAccountsPage(true)} />;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-zinc-900 to-zinc-900 border border-emerald-500/20 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Receipt className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
                Abonelik Tahsilatları & Gelir Kayıtları
              </h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-2xl">
              İşletme ve merkez hesaplarından tahsil edilen lisans bedelleri, ödeme yolları ve banka kayıtları.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button onClick={() => setShowBankAccountsPage(true)} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-200"><Building className="h-4 w-4 text-indigo-400" />Banka Hesapları</button>
            <button
              onClick={() => setActiveTab('admin_tenants')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold text-xs transition-all border border-zinc-700 shadow-xs"
            >
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Aboneler & Lisanslar Portalı</span>
            </button>

            <button
              onClick={() => setShowCollectionPage(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Manuel Tahsilat / Dekont Kaydet</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Toplam Tahsil Edilen</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {(totalCollected ?? 0).toLocaleString('tr-TR')} ₺
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Platform lisans gelirleri</p>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Kaydedilen Kart Tahsilatları</span>
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-300 font-mono">
            {(cardCollected ?? 0).toLocaleString('tr-TR')} ₺
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Kredi kartından otomatik çekilen</p>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Merkez Havale / EFT</span>
            <Building className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono">
            {(bankCollected ?? 0).toLocaleString('tr-TR')} ₺
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Banka havalesi ile onaylanan</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="İşletme adı, referans veya dekont ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-400 text-[11px]">Ödeme Modeli:</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as any)}
              className="bg-transparent text-zinc-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900">Tümü</option>
              <option value="credit_card" className="bg-zinc-900">Kart Tahsilatı</option>
              <option value="manual" className="bg-zinc-900">Nakit / Elden</option>
              <option value="bank_transfer" className="bg-zinc-900">Banka Havale</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment Table */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-zinc-100">Tahsilat Dökümü & Dekontlar</h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono">Toplam {filteredPayments.length} Kayıt</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Tarih & Saat</th>
                <th className="py-3.5 px-4">İşletme / Kurum</th>
                <th className="py-3.5 px-4">Referans / Dekont No</th>
                <th className="py-3.5 px-4">Ödeme Yöntemi</th>
                <th className="py-3.5 px-4">Açıklama / Not</th>
                <th className="py-3.5 px-4">Tutar</th>
                <th className="py-3.5 px-4 text-right">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-xs text-zinc-300">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-zinc-400 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{p.date}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-bold text-zinc-100">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>{p.companyName}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200">
                      {p.invoiceNumber}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    {p.method === 'credit_card' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-medium">
                        <CreditCard className="w-3 h-3 text-indigo-400" />
                        <span>Kart Tahsilatı</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-medium">
                        <Building className="w-3 h-3 text-amber-400" />
                        <span>{p.method === 'manual' ? 'Nakit / Elden' : 'Banka Havalesi'}</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-zinc-400 max-w-xs truncate text-[11px]">
                    {p.description}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-sm">
                    {(p.amount ?? 0).toLocaleString('tr-TR')} ₺
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Tahsil Edildi</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
};
