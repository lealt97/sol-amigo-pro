import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface LoginViewProps {
  onLogin: (remember: boolean) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [imageSrc, setImageSrc] = useState('');

  useEffect(() => {
    let active = true;

    fetch(`${import.meta.env.BASE_URL}brand/login-aframe.b64.txt`)
      .then((response) => {
        if (!response.ok) throw new Error('Imagem de login indisponível');
        return response.text();
      })
      .then((base64) => {
        if (active && base64.trim()) {
          setImageSrc(`data:image/jpeg;base64,${base64.trim()}`);
        }
      })
      .catch(() => {
        if (active) setImageSrc('');
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim();

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Digite um e-mail válido.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    onLogin(remember);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#EAF5FD_0%,#F7F8F5_46%,#EEF4E8_100%)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-40px)] w-full max-w-[1380px] overflow-hidden rounded-[28px] border border-[#D6E0E8] bg-white shadow-[0_28px_80px_rgba(14,35,55,0.16)] lg:grid-cols-[46%_54%]">
        <section className="flex min-h-[720px] items-center bg-white px-7 py-10 sm:px-12 lg:px-16 xl:px-20">
          <div className="mx-auto w-full max-w-[470px]">
            <BrandLogo
              orientation="horizontal"
              backgroundColor="#FFFFFF"
              className="mb-14 h-auto w-[210px] max-w-full object-contain object-left"
            />

            <div className="mb-9">
              <span className="mb-3 inline-flex rounded-full bg-[#B4BF8A]/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#183956]">
                Acesso ao sistema
              </span>
              <h1 className="text-4xl font-extrabold tracking-[-0.035em] text-[#0E2337] sm:text-[42px]">
                Bem-vindo!
              </h1>
              <p className="mt-3 max-w-[410px] text-[15px] leading-6 text-[#607386]">
                Acesse sua conta para gerenciar clientes, propostas e projetos de energia solar.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
                    className="h-[52px] w-full rounded-xl border border-[#CFD9E2] bg-white pl-12 pr-4 text-[14px] text-[#0E2337] outline-none transition focus:border-[#0076DD] focus:ring-4 focus:ring-[#64B0F3]/15"
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
                    className="h-[52px] w-full rounded-xl border border-[#CFD9E2] bg-white pl-12 pr-12 text-[14px] text-[#0E2337] outline-none transition focus:border-[#0076DD] focus:ring-4 focus:ring-[#64B0F3]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#718496] transition hover:bg-[#F1F5F8] hover:text-[#183956]"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 text-[13px]">
                <label className="flex cursor-pointer items-center gap-2.5 font-medium text-[#41586C]">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="h-4 w-4 accent-[#0076DD]"
                  />
                  Lembrar-me
                </label>

                <button
                  type="button"
                  onClick={() => setError('A recuperação de senha será conectada à autenticação da conta.')}
                  className="font-semibold text-[#0076DD] transition hover:text-[#005EAF]"
                >
                  Esqueci minha senha
                </button>
              </div>

              {error && (
                <div className="rounded-xl border border-[#E5B8B8] bg-[#FFF5F5] px-4 py-3 text-[13px] font-medium text-[#A33A3A]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="flex h-[52px] w-full items-center justify-center rounded-xl bg-[#183956] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(24,57,86,0.20)] transition hover:bg-[#0E2337] active:translate-y-px"
              >
                Entrar
              </button>
            </form>

            <div className="mt-8 flex items-center gap-3 text-[12px] text-[#7A8C9C]">
              <ShieldCheck className="h-[18px] w-[18px] shrink-0 text-[#6E8B55]" />
              <span>Seus dados e sua conta são protegidos com segurança.</span>
            </div>

            <p className="mt-10 text-center text-[12px] text-[#8797A5]">
              © 2026 Sol Amigo Pro
            </p>
          </div>
        </section>

        <section className="relative hidden min-h-[720px] overflow-hidden bg-[#0E2337] lg:block">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="Chalé A-frame com módulos solares ao pôr do sol"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(145deg,#183956_0%,#315B70_42%,#FACB5C_100%)]" />
          )}

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,35,55,0.04)_20%,rgba(14,35,55,0.72)_100%)]" />

          <div className="absolute left-10 top-10 flex items-center gap-2 rounded-full border border-white/25 bg-[#0E2337]/45 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#FACB5C] shadow-[0_0_0_4px_rgba(250,203,92,0.16)]" />
            Energia que transforma projetos em resultados
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-10 xl:p-14">
            <div className="max-w-[560px] text-white">
              <div className="mb-4 h-1 w-14 rounded-full bg-[#B4BF8A]" />
              <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.03em] xl:text-[38px]">
                Gestão solar profissional em um só lugar.
              </h2>
              <p className="mt-4 max-w-[500px] text-sm leading-6 text-white/80">
                Organize oportunidades, clientes e propostas comerciais com uma experiência criada para o mercado fotovoltaico.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
