import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface LoginViewProps {
  onLogin: (credentials: { email: string; password: string; remember: boolean }) => Promise<string | null>;
  onForgotPassword: (email: string) => Promise<string>;
  onOpenRegister: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onForgotPassword, onOpenRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const normalizedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Digite um e-mail válido.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    const loginError = await onLogin({ email: normalizedEmail, password, remember });
    if (loginError) setError(loginError);
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setError('');
    setNotice('');
    const normalizedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Digite seu e-mail primeiro para recuperar a senha.');
      return;
    }
    setLoading(true);
    const message = await onForgotPassword(normalizedEmail);
    setNotice(message);
    setLoading(false);
  };

  return (
    <div
      id="login-page"
      data-auth-page="true"
      className="auth-view flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#EAF5FD_0%,#F7F8F5_46%,#EEF4E8_100%)] px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="w-full max-w-[470px] overflow-hidden rounded-[28px] border border-[#D6E0E8] bg-white p-7 shadow-[0_24px_70px_rgba(14,35,55,0.12)] sm:p-10">
        <div className="mb-8 flex justify-center">
          <BrandLogo
            orientation="horizontal"
            backgroundColor="#FFFFFF"
            className="h-auto w-[210px] max-w-full object-contain"
          />
        </div>

        <div className="mb-8 text-center sm:text-left">
          <span className="mb-3 inline-flex rounded-full bg-[#B4BF8A]/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#183956]">
            Acesso ao sistema
          </span>
          <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-[#0E2337] sm:text-[34px]">
            Bem-vindo!
          </h1>
          <p className="mt-2.5 text-[14px] leading-6 text-[#607386]">
            Acesse sua conta para gerenciar clientes, propostas e projetos de energia solar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="login-email" className="mb-2 block text-sm font-bold text-[#183956]">
              E-mail
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#7D8E9E]" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className="h-[50px] w-full rounded-xl border border-[#CFD9E2] bg-white pl-12 pr-4 text-[14px] text-[#0E2337] outline-none transition focus:border-[#0076DD] focus:ring-4 focus:ring-[#64B0F3]/15"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="mb-2 block text-sm font-bold text-[#183956]">
              Senha
            </label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#7D8E9E]" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                className="h-[50px] w-full rounded-xl border border-[#CFD9E2] bg-white pl-12 pr-12 text-[14px] text-[#0E2337] outline-none transition focus:border-[#0076DD] focus:ring-4 focus:ring-[#64B0F3]/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="auth-eye-btn absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-transparent p-0 text-[#718496] outline-none transition-colors duration-150 hover:bg-transparent hover:text-[#0076DD]"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <EyeOff className="h-[18px] w-[18px] transition-colors duration-150" />
                ) : (
                  <Eye className="h-[18px] w-[18px] transition-colors duration-150" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1 text-[13px]">
            <label className="flex cursor-pointer items-center gap-2 font-medium text-[#41586C]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-4 w-4 rounded accent-[#0076DD]"
              />
              Lembrar-me
            </label>
            <button
              type="button"
              disabled={loading}
              onClick={handleForgotPassword}
              className="auth-link font-semibold text-[#0076DD] transition-colors duration-150 hover:text-[#005EAF] hover:underline"
            >
              Esqueci minha senha
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-[#E5B8B8] bg-[#FFF5F5] px-4 py-3 text-[13px] font-medium text-[#A33A3A]">
              {error}
            </div>
          )}
          {notice && (
            <div className="rounded-xl border border-[#B9D8C1] bg-[#F2FBF4] px-4 py-3 text-[13px] font-medium text-[#356B43]">
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="auth-submit-btn flex h-[50px] w-full items-center justify-center rounded-xl bg-[#183956] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(24,57,86,0.20)] transition hover:bg-[#0E2337] active:translate-y-px disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center text-[13px] text-[#607386]">
          Ainda não tem uma conta?{' '}
          <button
            type="button"
            onClick={onOpenRegister}
            className="auth-link font-bold text-[#0076DD] transition-colors duration-150 hover:text-[#005EAF] hover:underline"
          >
            Criar conta
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-[#7A8C9C]">
          <ShieldCheck className="h-[17px] w-[17px] shrink-0 text-[#6E8B55]" />
          <span>Autenticação protegida pelo Supabase.</span>
        </div>

        <p className="mt-8 text-center text-[12px] text-[#8797A5]">© 2026 Sol Amigo Pro</p>
      </div>
    </div>
  );
};
