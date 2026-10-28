import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Tags,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Layers,
  Users,
  DollarSign,
  Beef,
  Coffee,
  Apple,
  Sparkles,
  Truck,
  Building2,
  Zap,
  MoreHorizontal,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ExpenseCategory } from '../../types';

export const ExpenseCategoriesPage: React.FC = () => {
  const { expenseCategories, addExpenseCategory, updateExpenseCategory, showNotification, currentUser, branches, selectedBranchId, setSelectedBranchId, activeTab, setActiveTab } = useApp();
  const branchId = currentUser?.branchId || (branches.some(branch => branch.id === selectedBranchId) ? selectedBranchId : branches[0]?.id) || '';
  const categories = useMemo(() => expenseCategories.filter(category => !category.branchId || category.branchId === branchId), [expenseCategories, branchId]);
  const readOnly = currentUser?.role !== 'sube' || !branchId;

  const isModalOpen = activeTab === 'expense_category_new' || activeTab === 'expense_category_edit';
  const setIsModalOpen = (_open: boolean) => setActiveTab('expense_categories');
  const [name, setName] = useState('');
  const [type, setType] = useState<'single' | 'staff_based'>('single');
  const [description, setDescription] = useState('');
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [vatRate, setVatRate] = useState(20);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const openEditor = (category: ExpenseCategory | null) => {
    if (readOnly || saving || busyId) return;
    setEditing(category); setName(category?.name || ''); setType(category?.type || 'single');
    setDescription(category?.description || ''); setVatRate(category?.defaultVatRate ?? 20); setActiveTab(category ? 'expense_category_edit' : 'expense_category_new');
  };
  const toggleActive = async (category: ExpenseCategory) => {
    if (readOnly || busyId || saving) return;
    setBusyId(category.id);
    try { await updateExpenseCategory(category.id, { branchId, isActive: category.isActive === false }); }
    catch (error) { showNotification(error instanceof Error ? error.message : 'Kalem güncellenemedi.', 'warning'); }
    finally { setBusyId(''); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || readOnly || submitting.current) return;
    submitting.current = true; setSaving(true);
    try {
    const data = {
      branchId,
      name: name.trim(),
      type,
      description: description.trim() || `${name} kategorisi giderleri`,
      iconName: type === 'staff_based' ? 'Users' : editing?.type === 'staff_based' ? 'Tags' : editing?.iconName || 'Tags',
      defaultVatRate: type === 'staff_based' ? 0 : vatRate,
    };
    if (editing) await updateExpenseCategory(editing.id, data);
    else await addExpenseCategory({ ...data, isActive: true });

    if (!mounted.current) return;
    setIsModalOpen(false);
    setName('');
    setDescription('');
    setType('single');
    setEditing(null);
    } catch (error) { showNotification(error instanceof Error ? error.message : 'Kalem kaydedilemedi.', 'warning'); }
    finally { submitting.current = false; setSaving(false); }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users':
        return <Users className="w-4 h-4 text-amber-400" />;
      case 'Beef':
        return <Beef className="w-4 h-4 text-rose-400" />;
      case 'Coffee':
        return <Coffee className="w-4 h-4 text-sky-400" />;
      case 'Apple':
        return <Apple className="w-4 h-4 text-emerald-400" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-cyan-400" />;
      case 'Truck':
        return <Truck className="w-4 h-4 text-indigo-400" />;
      case 'Building2':
        return <Building2 className="w-4 h-4 text-purple-400" />;
      case 'Zap':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      default:
        return <Tags className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      {!isModalOpen && <>
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-zinc-100">
              İşletme Gider Kalemleri Yapılandırması
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Şubelerin harcama girişlerinde kullanacağı gider kalemlerini ve tiplerini (Tek Tutar / Personel Bazlı) yönetin
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
        {currentUser?.role !== 'sube' && branches.length > 0 && <select aria-label="Gider kalemleri şubesi" value={branchId} onChange={event => setSelectedBranchId(event.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200">
          {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>}
        <button
          onClick={() => openEditor(null)}
          disabled={readOnly || saving || !!busyId}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/10 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Gider Kalemi Ekle</span>
        </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={`bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors ${cat.isActive === false ? 'opacity-60' : ''}`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                    {getCategoryIcon(cat.iconName)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">{cat.name}</h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        cat.type === 'staff_based'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                      }`}
                    >
                      {cat.type === 'staff_based' ? 'Personel Bazlı' : 'Tek Tutar'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-zinc-500 font-mono">{cat.isSystem ? 'Sistem' : 'Özel'}</span>
                  <button type="button" disabled={readOnly || !!busyId} onClick={() => void toggleActive(cat)}
                    aria-label={`${cat.isActive === false ? 'Etkinleştir' : 'Gizle'}: ${cat.name}`} aria-pressed={cat.isActive !== false}
                    title={cat.isActive === false ? 'Gizli — gider girişinde görünmez' : 'Aktif — gider girişinde kullanılır'}
                    className={`p-1.5 rounded-lg border transition-colors disabled:cursor-default ${cat.isActive === false ? 'border-zinc-700 text-zinc-500 hover:text-zinc-200' : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'}`}>
                    {cat.isActive === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                {cat.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
              <span className="text-[10px]">
                {cat.isActive === false ? 'Gizli — kullanılmıyor' : cat.type === 'staff_based' ? 'Personel seçilerek girilir' : 'Doğrudan fatura tutarı girilir'}
              </span>
              <button
                onClick={() => openEditor(cat)}
                disabled={readOnly || saving || !!busyId}
                className="text-zinc-400 hover:text-zinc-200 text-[11px] flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" /> Düzenle
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Category Modal */}
      </>}
      {isModalOpen && (
        <div className="w-full space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full p-4 md:p-6 shadow-sm">
            <div className="flex flex-wrap gap-3 items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Tags className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-zinc-100">{editing ? 'Gider Kalemini Düzenle' : 'Yeni Gider Kalemi Tanımla'}</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 p-2"
              >
                <ArrowLeft className="w-4 h-4" /><span>Gider Kalemlerine Dön</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Kalem Adı</label>
                <input
                  type="text"
                  maxLength={128}
                  placeholder="Örn: Tatlı & Pasta Tedariği, Kurye Yakıtı..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Gider Kaleminin Tipi</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setType('single')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      type === 'single'
                        ? 'bg-amber-500/10 border-amber-500/40 text-zinc-100'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div className="font-semibold text-xs text-amber-400">Tek Tutar</div>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Fatura veya fiş bazlı standart tutar (Kasap, Kira, Temizlik vb.)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('staff_based')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      type === 'staff_based'
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-zinc-100'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div className="font-semibold text-xs text-indigo-400">Personel Bazlı</div>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Personel seçilerek yevmiye ve avans bağlanan harcamalar
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Açıklama</label>
                <textarea
                  rows={2}
                  maxLength={5000}
                  placeholder="Bu kalemin kapsamı..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Varsayılan KDV Oranı</label>
                <select value={type === 'staff_based' ? 0 : vatRate} onChange={event => setVatRate(Number(event.target.value))} disabled={type === 'staff_based'} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500">
                  {[0, 1, 10, 20].map(rate => <option key={rate} value={rate}>%{rate}</option>)}
                </select>
              </div>
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold transition-colors shadow-lg shadow-amber-500/20"
                >
                  {saving ? 'Kaydediliyor…' : editing ? 'Değişiklikleri Kaydet' : 'Kalemi Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
