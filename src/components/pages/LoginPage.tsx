import React, { useState } from 'react';
import { Shield, Sparkles, Building2, UserCircle2, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LoginPage: React.FC = () => {
  const { loginAs, loginWithCredentials } = useApp();
  const submitting = React.useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting.current) return;
    const passwordInput = e.currentTarget.querySelector<HTMLInputElement>('input[type="password"]')!;
    submitting.current = true;
    try {
      await loginWithCredentials(email, password);
    } catch (error) {
      passwordInput.setCustomValidity(error instanceof Error ? error.message : 'Giriş yapılamadı.');
      passwordInput.reportValidity();
      passwordInput.setCustomValidity('');
    } finally {
      submitting.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-black">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-2xl mb-4 shadow-lg shadow-emerald-500/5">
            ŞA
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Şube Analitik Portalı
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Çoklu Şube Finans, Ciro & Performans Yönetim Konsolu
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur">
          {/* Quick Demo Access Buttons */}
          <div className="mb-6 pb-6 border-b border-zinc-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-2.5">
              Hızlı Demo Erişimi (Tek Tıkla Giriş)
            </span>

            {/* Super Admin Big Option */}
            <button
              type="button"
              onClick={() => loginAs('admin')}
              className="w-full mb-2.5 flex items-center justify-between p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block font-bold text-amber-300 text-xs">
                    MasaM QR — Süper Admin & Lisans Yönetim Merkezi
                  </span>
                  <span className="block text-[10px] text-amber-400/80 font-normal">
                    Aboneler, Merkez Hesapları Açma, Tahsilatlar & Çoklu Merkezler
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => loginAs('merkez')}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all hover:scale-[1.01]"
              >
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>Demo Merkez Yöneticisi</span>
              </button>

              <button
                type="button"
                onClick={() => loginAs('sube', 'branch-1')}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all hover:scale-[1.01]"
              >
                <UserCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Demo Şube Kullanıcısı</span>
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2 text-center">
              (Süper Admin, Merkez veya Kadıköy Moda Şube perspektifine anında erişin)
            </p>
          </div>

          {/* Regular Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Kullanıcı Adı veya E-posta
              </label>
              <input
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Kullanıcı adı veya e-posta"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Şifre
                </label>
                <a href="#forgot" className="text-[11px] text-emerald-400 hover:underline">
                  Şifremi unuttum
                </a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
            >
              <span>Giriş Yap</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center text-[11px] text-zinc-500">
            <span>Para Birimi: </span>
            <span className="font-mono text-zinc-400 font-semibold">TRY (₺)</span>
            <span className="mx-2">•</span>
            <span>40+ Şube Entegrasyonu</span>
          </div>
        </div>
      </div>
    </div>
  );
};
