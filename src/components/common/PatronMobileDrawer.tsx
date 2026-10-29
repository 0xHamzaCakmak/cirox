import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';

export const PatronMobileDrawer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { close.current(); return; }
      if (event.key !== 'Tab') return;
      const items = [...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]') || [])].filter(element => element.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  return <div className="patron-mobile-drawer fixed inset-0 z-50 md:hidden">
    <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Menüyü kapat" onClick={onClose} tabIndex={-1} />
    <div ref={panel} role="dialog" aria-modal="true" aria-label="Patron menüsü" className="patron-drawer-panel relative h-full bg-zinc-950">
      <button className="patron-drawer-close text-zinc-300" aria-label="Menüyü kapat" onClick={onClose}><X /></button>
      <Sidebar onCloseMobile={onClose} />
    </div>
  </div>;
};
