import React, { useEffect, useState } from 'react';
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
  const [imageSrc, setImageSrc] = useState('');

  useEffect(() => {
    let active = true;
    const imageParts = [
      'brand/login-aframe.b64.txt',
      'brand/login-aframe.b64.part2.txt',
      'brand/login-aframe.b64.part3.txt',
    ];

    Promise.all(
      imageParts.map((file) =>
        fetch(`${import.meta.env.BASE_URL}${file}`).then((response) => {
          if (!response.ok) throw new Error('Imagem de cadastro indisponível');
          return response.text();
        })
      )
    )
      .then((parts) => {
        const base64 = parts.map((part) => part.trim()).join('');
        if (active && base64) setImageSrc(`data:image/jpeg;base64,${base64}`);
      })
      .catch(() => {
        if (active) setImageSrc('');
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (name.trim().length < 3) {
      setError('Digite seu nome completo.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Digite um e-mail válido.');
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
      setError('Aceite os termos para continuar.');
      return;
    }

    setLoading(true);
    const result = await onRegister({
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
      password,
    });
    if (result.error) setError(result.error);
    if (result.message) setNotice(result.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#EAF5FD_0%,#F7F8F5_46%,#EEF4E8_100%)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-40px)] w-full max-w-[1380px] overflow-hidden rounded-[28px] border border-[#D6E0E8] bg-white shadow-[0_28px_80px_rgba(14,35,55,0.16)] lg:grid-cols-[46%_54%]">
        <section className="flex min-h-[760px] items-center bg-white px-7 py-8 sm:px-12 lg:px-16 xl:px-20">
          <div className="mx-auto w-full max-w-[470px]">
            <BrandLogo orientation="horizontal" backgroundColor="#FFFFFF" className="mb-9 h-auto w-[210px] max-w-full object-contain object-left" />

            <div className="mb-7">
              <span className="mb-3 inline-flex rounded-full bg-[#B4BF8A]/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#183956]">Nova conta</span>
              <h1 className="text-4xl font-extrabold tracking-[-0.035em] text-[#0E2337] sm:text-[42px]">Crie sua conta</h1>
              <p className="mt-3 max-w-[420px] text-[15px] leading-6 text-[#607386]">Comece a organizar clientes, propostas e projetos solares em um só lugar.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="register-name" className="mb-2 block text-sm font-bold text-[#183956]">Nome completo</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#7D8E9E]" />
                    <input id="register-name" type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" autoComplete="name" className="h-[50px] w-full rounded-xl border border-[#CFD9E2] bg-white pl-12 pr-4 text-[14px] text-[#0E2337] outline-none transition focus:border-[#0076DD] focus:ring-4 focus:ring-[#64B0F3]/15" />
                  </div>
                </div>
                <div>
                  <label htmlFor="register-company" className="mb-2 block text-sm font-bold text-[#183956]">Empresa</label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#7D8E9E]" />
                    <input id="register-company" type="text" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Nome da empresa" autoComplete="organization" className="h-[50px] w-full rounded-xl border border-[#CFD9E2] bg-white pl-12 pr-4 text-[14px] text-[#0E2337] outline-none transition focus:border-[#0076DD] focus:ring-4 focus:ring-[#64B0F3]/15" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="register-email" className="mb-2 block text-sm font-bold text-[#183956]">E-mail</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#7D8E9E]" />
                  <input id="register-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" autoComplete="email" className="h-[50px] w-full rounded-xl border border-[#CFD9E2] bg-white pl-12 pr-4 text-[14px] text-[#0E2337] outline-none transition focus:border-[#0076DD] focus:ring-4 focus:ring-[#64B0F3]/15" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="register-password" className="mb-2 block text-sm font-bold text-[#183956]">Senha</label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#7D8E9E]" />
                    <input id="register-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" className="h-[50px] w-full rounded-xl border border-[#CFD9E2] bg-white pl-12 pr-11 text-[14px] text-[#0E2337] outline-none transition focus:border-[#0076DD] focus:ring-4 focus:ring-[#64B0F3]/15" />
                    <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#718496] transition hover:bg-[#F1F5F8] hover:text-[#183956]" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}</button>
                  </div>
                </div>

                <div>
                  <label htmlFor="register-confirm-password" className="mb-2 block text-sm font-bold text-[#183956]">Confirmar senha</label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#7D8E9E]" />
                    <input id="register-confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repita a senha" autoComplete="new-password" className="h-[50px] w-full rounded-xl border border-[#CFD9E2] bg-white pl-12 pr-11 text-[14px] text-[#0E2337] outline-none transition focus:border-[#0076DD] focus:ring-4 focus:ring-[#64B0F3]/15" />
                    <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#718496] transition hover:bg-[#F1F5F8] hover:text-[#183956]" aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}>{showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}</button>
                  </div>
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 text-[12px] leading-5 text-[#53697B]">
                <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0076DD]" />
                <span>Li e aceito os <button type="button" className="font-semibold text-[#0076DD]">Termos de Uso</button> e a <button type="button" className="font-semibold text-[#0076DD]">Política de Privacidade</button>.</span>
              </label>

              {error && <div className="rounded-xl border border-[#E5B8B8] bg-[#FFF5F5] px-4 py-3 text-[13px] font-medium text-[#A33A3A]">{error}</div>}
              {notice && <div className="rounded-xl border border-[#B9D8C1] bg-[#F2FBF4] px-4 py-3 text-[13px] font-medium text-[#356B43]">{notice}</div>}

              <button type="submit" disabled={loading} className="flex h-[52px] w-full items-center justify-center rounded-xl bg-[#183956] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(24,57,86,0.20)] transition hover:bg-[#0E2337] active:translate-y-px disabled:opacity-60">{loading ? 'Criando conta...' : 'Criar conta'}</button>
            </form>

            <div className="mt-5 text-center text-[13px] text-[#607386]">Já tem uma conta?{' '}<button type="button" onClick={onBackToLogin} className="font-bold text-[#0076DD] transition hover:text-[#005EAF]">Entrar</button></div>
            <div className="mt-5 flex items-center justify-center gap-2 text-[12px] text-[#7A8C9C]"><ShieldCheck className="h-[17px] w-[17px] shrink-0 text-[#6E8B55]" /><span>Cadastro protegido pelo Supabase.</span></div>
          </div>
        </section>

        <section className="relative hidden min-h-[760px] overflow-hidden bg-[#0E2337] lg:block">
          {imageSrc ? <img src={imageSrc} alt="Chalé A-frame com módulos solares ao pôr do sol" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-[linear-gradient(145deg,#183956_0%,#315B70_42%,#FACB5C_100%)]" />}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,35,55,0.03)_20%,rgba(14,35,55,0.72)_100%)]" />
          <div className="absolute left-10 top-10 flex items-center gap-2 rounded-full border border-white/25 bg-[#0E2337]/45 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md"><span className="h-2 w-2 rounded-full bg-[#FACB5C] shadow-[0_0_0_4px_rgba(250,203,92,0.16)]" />Sua operação solar começa aqui</div>
          <div className="absolute bottom-0 left-0 right-0 p-10 xl:p-14"><div className="max-w-[560px] text-white"><div className="mb-4 h-1 w-14 rounded-full bg-[#B4BF8A]" /><h2 className="text-3xl font-extrabold leading-tight tracking-[-0.03em] xl:text-[38px]">Transforme oportunidades em projetos solares.</h2><p className="mt-4 max-w-[500px] text-sm leading-6 text-white/80">Tenha clientes, propostas e gestão comercial organizados em uma única plataforma.</p></div></div>
        </section>
      </div>
    </div>
  );
};
