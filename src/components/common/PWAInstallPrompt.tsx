import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const PWAInstallPrompt: React.FC<{ minimal?: boolean }> = ({ minimal = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // If already installed or dismissed, only show offline status if offline
  if (isInstalled || dismissed) {
    if (!isOnline) {
      return (
        <div className="fixed bottom-18 left-3 right-3 md:bottom-6 md:left-6 md:right-auto z-50 flex items-center gap-2.5 rounded-xl bg-amber-500/90 text-black px-4 py-2.5 text-xs font-semibold shadow-xl backdrop-blur">
          <span className="h-2.5 w-2.5 rounded-full bg-black animate-ping" />
          <span>İnternet bağlantısı kesildi — Şube çevrimdışı modda çalışıyor.</span>
        </div>
      );
    }
    return null;
  }

  // Minimal button for header or mobile menu
  if (minimal) {
    if (isInstallable) {
      return (
        <button
          onClick={install}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all shadow-xs"
          title="Mobil Cihaza Yükle"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Uygulamayı Yükle</span>
        </button>
      );
    }

    if (isIOS) {
      return (
        <>
          <button
            onClick={() => setShowIOSGuide(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-semibold transition-all"
            title="iPhone / iPad Ana Ekrana Ekle"
          >
            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
            <span>Ana Ekrana Ekle</span>
          </button>

          {showIOSGuide && (
            <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
              <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shadow-2xl text-zinc-100">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-bold">iPhone / iPad Kurulumu</h3>
                  </div>
                  <button
                    onClick={() => setShowIOSGuide(false)}
                    className="p-1 text-zinc-400 hover:text-zinc-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-3 text-xs text-zinc-300 leading-relaxed">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                    <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 shrink-0">
                      <Share className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-100">1. Paylaş Butonuna Basın</p>
                      <p className="text-zinc-400 text-[11px] mt-0.5">Safari alt çubuğundaki Paylaş (Share) simgesine dokunun.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-100">2. Ana Ekrana Ekle</p>
                      <p className="text-zinc-400 text-[11px] mt-0.5">Menüyü kaydırıp &quot;Ana Ekrana Ekle&quot; seçeneğini seçin.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-100">3. Tam Ekran Kullanın</p>
                      <p className="text-zinc-400 text-[11px] mt-0.5">Şube personeli tarayıcı çubuğu olmadan yerel mobil uygulama gibi kullanır.</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-5 w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-black hover:bg-emerald-400 transition-colors"
                >
                  Anladım
                </button>
              </div>
            </div>
          )}
        </>
      );
    }

    return null;
  }

  // Full banner on mobile view for branch users
  if (isInstallable || isIOS) {
    return (
      <>
        <div className="bg-gradient-to-r from-emerald-950/70 via-zinc-900 to-indigo-950/70 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-zinc-100">Şube Mobil Uygulamasını Cihazınıza Yükleyin</h4>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">PWA</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Kamera ile fiş/fatura çekme ve tam ekran hızlı ciro girişi için ana ekrana ekleyin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {isInstallable ? (
              <button
                onClick={install}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors shadow-md shadow-emerald-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Şimdi Yükle</span>
              </button>
            ) : (
              <button
                onClick={() => setShowIOSGuide(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>iOS Ana Ekrana Ekle</span>
              </button>
            )}

            <button
              onClick={() => setDismissed(true)}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Gizle"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* iOS Safari Guide Modal */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shadow-2xl text-zinc-100">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold">iPhone / iPad Kurulumu</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-zinc-300 leading-relaxed">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 shrink-0">
                    <Share className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-100">1. Paylaş Butonuna Basın</p>
                    <p className="text-zinc-400 text-[11px] mt-0.5">Safari alt çubuğundaki Paylaş (Share) simgesine dokunun.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-100">2. Ana Ekrana Ekle</p>
                    <p className="text-zinc-400 text-[11px] mt-0.5">Menüyü kaydırıp &quot;Ana Ekrana Ekle&quot; seçeneğini seçin.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-100">3. Tam Ekran Kullanın</p>
                    <p className="text-zinc-400 text-[11px] mt-0.5">Şube personeli tarayıcı çubuğu olmadan yerel mobil uygulama gibi kullanır.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-black hover:bg-emerald-400 transition-colors"
              >
                Anladım
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
