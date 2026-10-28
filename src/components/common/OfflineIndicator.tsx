import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return (
      <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-300 flex items-center justify-between z-50">
        <div className="flex items-center gap-2 max-w-xl">
          <WifiOff className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
          <span>
            <strong>Çevrimdışı Mod:</strong> İnternet bağlantısı yok. Şube ciro ve gider kayıtlarınız cihaz belleğinde güvenle tutulur.
          </span>
        </div>
        <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded font-mono font-medium">
          Yerel Saklama Aktif
        </span>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-300 flex items-center justify-between z-50 animate-in slide-in-from-top duration-200">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>
            <strong>Bağlantı Kuruldu:</strong> İnternet bağlantınız geri geldi. Veriler senkronize edildi.
          </span>
        </div>
        <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded font-mono font-medium">
          Çevrimiçi
        </span>
      </div>
    );
  }

  return null;
};
