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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-black">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <CiroxLogo className="w-14 h-14 mx-auto mb-4 shadow-lg shadow-emerald-500/5" />
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            CIROX
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Çoklu Şube Finans, Ciro & Performans Yönetim Konsolu
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur">
          {/* Regular Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-identifier" className="block text-xs font-medium text-zinc-300 mb-1.5">
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-medium text-zinc-300">
                  Şifre
                </label>
                <a href="#forgot" className="text-[11px] text-emerald-400 hover:underline">
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {formError && <p role="alert" className="text-xs text-rose-400">{formError}</p>}
            <button
              type="submit" disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
            >
              <span>{busy ? 'Giriş yapılıyor…' : 'Giriş Yap'}</span>
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
