import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CiroxLogo } from '../common/CiroxLogo';

export const LoginPage: React.FC = () => {
  const { loginWithCredentials } = useApp();
  const submitting = React.useRef(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setFormError('');
    try {
      await loginWithCredentials(email, password);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Giriş yapılamadı.');
    } finally {
      submitting.current = false; setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-zinc-950 flex flex-col items-center md:p-6 selection:bg-emerald-500 selection:text-black">
      <div className="w-full min-w-0 min-h-dvh md:min-h-[calc(100dvh-3rem)] max-w-[42rem] flex flex-col gap-[18px]">
        {/* Brand Header */}
        <div className="hidden md:block text-center shrink-0">
          <CiroxLogo className="w-15 h-15 mx-auto mb-[9px] shadow-lg shadow-emerald-500/5" />
          <h1 className="text-4xl font-bold text-zinc-100 tracking-tight">
            CIROX
          </h1>
          <p className="text-[18px] leading-6 text-zinc-400 mt-1">
            Çoklu Şube Finans, Ciro & Performans Yönetim Konsolu
          </p>
        </div>

        {/* Login Card */}
        <div className="login-card flex flex-1 flex-col justify-center bg-zinc-900/90 md:border border-zinc-800 md:rounded-3xl p-[15px] md:p-[30px] shadow-2xl backdrop-blur">
          {/* Regular Login Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-[18px]">
            <div>
              <label htmlFor="login-identifier" className="block text-[18px] leading-6 font-medium text-zinc-300 mb-[9px]">
                Kullanıcı Adı veya E-posta
              </label>
              <input
                type="text"
                id="login-identifier"
                autoComplete="username"
                required maxLength={128} disabled={busy}
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Kullanıcı adı veya e-posta"
                className="w-full min-h-12 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-[18px] leading-6 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 mb-[9px]">
                <label htmlFor="login-password" className="block text-[18px] leading-6 font-medium text-zinc-300">
                  Şifre
                </label>
                <a href="#forgot" className="text-[16.5px] text-emerald-400 hover:underline">
                  Şifremi unuttum
                </a>
              </div>
              <input
                type="password"
                id="login-password"
                autoComplete="current-password" required maxLength={256} disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-12 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-[18px] leading-6 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {formError && <p role="alert" className="text-[18px] leading-6 text-rose-400">{formError}</p>}
            <button
              type="submit" disabled={busy}
              className="w-full min-h-12 flex items-center justify-center gap-3 py-3 px-[15px] rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-[18px] leading-6 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <span>{busy ? 'Giriş yapılıyor…' : 'Giriş Yap'}</span>
              <ArrowRight className="w-6 h-6 shrink-0" />
            </button>
          </form>

          {/* Footer note */}
          <div className="hidden md:block mt-6 pt-[18px] border-t border-zinc-800/80 text-center text-[16.5px] text-zinc-500">
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
