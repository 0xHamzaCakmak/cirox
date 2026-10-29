import React, { useEffect, useRef, useState } from 'react';
import { Bell, X, TrendingUp, Receipt, Info, AlertTriangle, RefreshCw, CheckCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api, type BranchNotificationFeed } from '../../services/api';

const tones = {
  income: { text: 'text-emerald-400', icon: TrendingUp, border: 'border-emerald-500/30', badge: 'bg-emerald-500' },
  expense: { text: 'text-rose-400', icon: Receipt, border: 'border-rose-500/30', badge: 'bg-rose-500' },
  info: { text: 'text-sky-400', icon: Info, border: 'border-sky-500/30', badge: 'bg-sky-500' },
  warning: { text: 'text-amber-400', icon: AlertTriangle, border: 'border-amber-500/30', badge: 'bg-amber-500' },
};
const emptyFeed: BranchNotificationFeed = { events: [], unreadCount: 0, latestId: '0' };

export const NotificationBell: React.FC = () => {
  const { currentUser, viewUser, adminCenterId } = useApp();
  const centerId = currentUser?.role === 'admin' && viewUser?.role === 'merkez' ? adminCenterId : '';
  const branchId = currentUser?.role === 'admin' && viewUser?.role === 'sube' ? viewUser.branchId || '' : '';
  const query = centerId ? '?centerId=' + encodeURIComponent(centerId) : branchId ? '?branchId=' + encodeURIComponent(branchId) : '';
  const scopeKey = `${currentUser?.id}:${currentUser?.role}:${query}`;
  const [response, setResponse] = useState<{ key: string; data: BranchNotificationFeed } | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const feed = response?.key === scopeKey ? response.data : emptyFeed;
  const newestUnread = feed.events.find(event => !event.read);
  const badge = newestUnread ? tones[newestUnread.tone]?.badge : 'bg-emerald-500';

  useEffect(() => {
    if (!currentUser) return;
    let disposed = false, inFlight = false, loaded = false, lastId = '0';
    setOpen(false); setLoading(true); setError('');
    const refresh = async () => {
      if (inFlight || disposed || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        const data = await api<BranchNotificationFeed>('/notifications' + query);
        if (disposed) return;
        setResponse({ key: scopeKey, data }); setError('');
        if (loaded && lastId !== data.latestId) window.dispatchEvent(new Event('cirox:branch-activity'));
        lastId = data.latestId; loaded = true;
      } catch (err) { if (!disposed) setError(err instanceof Error ? err.message : 'Bildirimler yüklenemedi.'); }
      finally { inFlight = false; if (!disposed) setLoading(false); }
    };
    refreshRef.current = refresh;
    void refresh();
    const tick = () => { void refresh(); };
    const timer = window.setInterval(tick, 10_000);
    window.addEventListener('focus', tick); document.addEventListener('visibilitychange', tick);
    return () => { disposed = true; window.clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); };
  }, [scopeKey, query]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);

  const markAllRead = async () => {
    if (saving || feed.latestId === '0') return;
    setSaving(true);
    try { await api<void>('/notifications/read' + query, { throughId: feed.latestId }); await refreshRef.current(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Okundu bilgisi kaydedilemedi.'); }
    finally { setSaving(false); }
  };

  return <div className="relative" ref={root}>
    <button type="button" aria-label={`Bildirimler${feed.unreadCount ? ` (${feed.unreadCount} okunmamış)` : ''}`} aria-expanded={open}
      onClick={() => { if (!open) void refreshRef.current(); setOpen(value => !value); }}
      className="relative rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100">
      <Bell className="h-4 w-4" />
      {feed.unreadCount > 0 && <span className={`absolute -right-1 -top-1 min-w-4 rounded-full px-1 text-center text-[10px] font-bold leading-4 text-zinc-950 ring-2 ring-zinc-950 ${badge}`}>{feed.unreadCount > 99 ? '99+' : feed.unreadCount}</span>}
    </button>
    {open && <section data-notification-popover aria-label="Bildirimler ve işlem geçmişi" className="absolute right-0 z-50 mt-2 w-96 max-w-[calc(100vw_-_2rem)] rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-2xl">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2">
        <h2 className="text-xs font-semibold text-zinc-200">Bildirimler {feed.unreadCount > 0 && <span className="text-zinc-500">({feed.unreadCount} yeni)</span>}</h2>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Bildirimleri yenile" onClick={() => void refreshRef.current()} className="p-1 text-zinc-500 hover:text-zinc-200"><RefreshCw className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label="Bildirimleri kapat" onClick={() => setOpen(false)} className="p-1 text-zinc-500 hover:text-zinc-200"><X className="h-4 w-4" /></button>
        </div>
      </div>
      {error && <p role="alert" className="py-2 text-xs text-amber-400">{error}</p>}
      <div className="max-h-[min(65dvh,28rem)] space-y-2 overflow-y-auto py-2">
        {loading && feed.events.length === 0 ? <p role="status" className="py-4 text-center text-xs text-zinc-500">Bildirimler yükleniyor…</p> :
          !error && feed.events.length === 0 ? <p className="py-4 text-center text-xs text-zinc-500">Henüz işlem bildirimi yok.</p> : null}
        {feed.events.map(event => {
          const tone = tones[event.tone] || tones.info;
          const Icon = tone.icon;
          return <article key={event.id} className={`space-y-1 rounded-lg border bg-zinc-950 p-3 text-xs ${event.read ? 'border-zinc-800/80' : tone.border}`}>
            <p className="break-words font-semibold text-zinc-200">{event.branchName}</p>
            <div className={`flex items-start gap-2 font-semibold ${tone.text}`}><Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{event.title}</span></div>
            {event.amount !== null && <p className={`font-mono font-bold ${tone.text}`}>{event.amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</p>}
            <p className="break-words text-[11px] text-zinc-400">{event.detail}</p>
            <p className="break-words text-[10px] text-zinc-500">{event.actorName} · <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>{event.read ? ' · Okundu' : ''}</p>
          </article>;
        })}
      </div>
      {feed.unreadCount > 0 && <button type="button" disabled={saving} onClick={() => void markAllRead()} className="flex w-full items-center justify-center gap-2 border-t border-zinc-800 pt-3 text-xs font-medium text-zinc-300 hover:text-zinc-100 disabled:opacity-50"><CheckCheck className="h-3.5 w-3.5" />{saving ? 'Kaydediliyor…' : 'Tümünü Okundu İşaretle'}</button>}
    </section>}
  </div>;
};
