import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, User } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface RegisterViewProps {
  onRegister: (data: { name: string; company: string; email: string; password: string }) => Promise<{ error?: string; message?: string }>;
  onBackToLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onRegister, onBackToLogin }) => {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (name.trim().length < 3) {
      setError('Digite seu nome completo.');
      return;
    }
    if (company.trim().length < 2) {
      setError('Digite o nome da sua empresa integradora.');
      return;
    }
    const normalizedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Digite um e-mail corporativo válido.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (!acceptedTerms) {
      setError('Você precisa aceitar os Termos e a Política para prosseguir.');
      return;
    }

    setLoading(true);
    const result = await onRegister({
      name: name.trim(),
      company: company.trim(),
      email: normalizedEmail,
      password,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setNotice(result.message || 'Cadastro concluído com sucesso!');
    }
    setLoading(false);
  };

  return (
    <div
      id="register-page"
      data-auth-page="true"
      className="auth-view flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#EAF5FD_0%,#F7F8F5_46%,#EEF4E8_100%)] px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="w-full max-w-[560px] overflow-hidden rounded-[28px] border border-[#D6E0E8] bg-white p-7 shadow-[0_24px_70px_rgba(14,35,55,0.12)] sm:p-10">
        <div className="mb-8 flex justify-center">
          <BrandLogo
            orientation="horizontal"
            backgroundColor="#FFFFFF"
            className="h-auto w-[210px] max-w-full object-contain"
          />
        </div>

        <div className="mb-8 text-center sm:text-left">
          <span className="mb-3 inline-flex rounded-full bg-[#B4BF8A]/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#183956]">
            Nova conta
          </span>
          <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-[#0E2337] sm:text-[34px]">
            Crie sua conta
          </h1>
          <p className="mt-2.5 text-[14px] leading-6 text-[#607386]">
            Configure seu acesso comercial para operar propostas solares, orçamentos e dimensionamentos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="register-name" className="mb-2 block text-sm font-bold text-[#183956]">
                Nome completo
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#7D8E9E]" />
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Seu nome"
                  autoComplete="name"
                  className="h-[50px] w-full rounded-xl border border-[#CFD9E2] bg-white pl-12 pr-4 text-[14px] text-[#0E2337] outline-none transition focus:border-[#0076DD] focus:ring-4 focus:ring-[#64B0F3]/15"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-company" className="mb-2 block text-sm font-bold text-[#183956]">
                Empresa
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#7D8E9E]" />
                <input
                  id="register-company"
                  type="text"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder="Nome da integradora"
                  autoComplete="organization"
                  className="h-[50px] w-full rounded-xl border border-[#CFD9E2] bg-white pl-12 pr-4 text-[14px] text-[#0E2337] outline-none transition focus:border-[#0076DD] focus:ring-4 focus:ring-[#64B0F3]/15"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="register-email" className="mb-2 block text-sm font-bold text-[#183956]">
              E-mail corporativo
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#7D8E9E]" />
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className="h-[50px] w-full rounded-xl border border-[#CFD9E2] bg-white pl-12 pr-4 text-[14px] text-[#0E2337] outline-none transition focus:border-[#0076DD] focus:ring-4 focus:ring-[#64B0F3]/15"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="register-password" className="mb-2 block text-sm font-bold text-[#183956]">
                Senha
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#7D8E9E]" />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className="h-[50px] w-full rounded-xl border border-[#CFD9E2] bg-white pl-12 pr-11 text-[14px] text-[#0E2337] outline-none transition focus:border-[#0076DD] focus:ring-4 focus:ring-[#64B0F3]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="auth-eye-btn absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-transparent p-0 text-[#718496] outline-none transition-colors duration-150 hover:bg-transparent hover:text-[#0076DD]"
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

            <div>
              <label htmlFor="register-confirm-password" className="mb-2 block text-sm font-bold text-[#183956]">
                Confirmar senha
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#7D8E9E]" />
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  className="h-[50px] w-full rounded-xl border border-[#CFD9E2] bg-white pl-12 pr-11 text-[14px] text-[#0E2337] outline-none transition focus:border-[#0076DD] focus:ring-4 focus:ring-[#64B0F3]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="auth-eye-btn absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-transparent p-0 text-[#718496] outline-none transition-colors duration-150 hover:bg-transparent hover:text-[#0076DD]"
                  aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-[18px] w-[18px] transition-colors duration-150" />
                  ) : (
                    <Eye className="h-[18px] w-[18px] transition-colors duration-150" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-[12px] leading-5 text-[#53697B]">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#0076DD]"
            />
            <span>
              Li e aceito os{' '}
              <span className="font-semibold text-[#0076DD]">Termos de Uso</span> e a{' '}
              <span className="font-semibold text-[#0076DD]">Política de Privacidade</span>.
            </span>
          </label>

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
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <div className="mt-5 text-center text-[13px] text-[#607386]">
          Já tem uma conta?{' '}
          <button
            type="button"
            onClick={onBackToLogin}
            className="auth-link font-bold text-[#0076DD] transition-colors duration-150 hover:text-[#005EAF] hover:underline"
          >
            Entrar
          </button>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-[12px] text-[#7A8C9C]">
          <ShieldCheck className="h-[17px] w-[17px] shrink-0 text-[#6E8B55]" />
          <span>Cadastro protegido pelo Supabase.</span>
        </div>
      </div>
    </div>
  );
};
