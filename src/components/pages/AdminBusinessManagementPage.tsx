import React from 'react';
import { Store, Building2, Link2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { PageTab } from '../../types';
import { AdminCreateEstablishmentPage } from './AdminCreateEstablishmentPage';
import { AdminCreateCenterPage } from './AdminCreateCenterPage';
import { AdminBranchCentersPage } from './AdminBranchCentersPage';
import { AdminBusinessesPage } from './AdminBusinessesPage';

const sections = [
  { id: 'admin_businesses' as PageTab, label: 'İşletmeler', icon: Store },
  { id: 'admin_establishment_create' as PageTab, label: 'İşletme Ekle', icon: Store },
  { id: 'admin_center_create' as PageTab, label: 'Merkez / Patron Ekle', icon: Building2 },
  { id: 'admin_branch_centers' as PageTab, label: 'Şube–Merkez Bağlantıları', icon: Link2 },
];

export const AdminBusinessManagementPage: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  return <div className="w-full min-w-0 space-y-5 pb-8">
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-zinc-100">İşletme Yönetimi</h1>
      <nav aria-label="İşletme yönetimi bölümleri" className="flex flex-wrap gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2">
        {sections.map(section => {
          const Icon = section.icon;
          const selected = activeTab === section.id;
          return <button key={section.id} type="button" onClick={() => setActiveTab(section.id)}
            aria-current={selected ? 'page' : undefined}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${selected ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300' : 'border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}>
            <Icon className="h-4 w-4 shrink-0" /><span>{section.label}</span>
          </button>;
        })}
      </nav>
    </div>
    {activeTab === 'admin_businesses' ? <AdminBusinessesPage /> : activeTab === 'admin_establishment_create' ? <AdminCreateEstablishmentPage /> :
      activeTab === 'admin_center_create' ? <AdminCreateCenterPage /> : <AdminBranchCentersPage />}
  </div>;
};
