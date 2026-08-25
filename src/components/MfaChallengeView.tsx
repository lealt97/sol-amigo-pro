import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface MfaChallengeViewProps {
  error?: string;
  loading?: boolean;
  onVerify: (code: string) => Promise<void> | void;
  onCancel: () => void;
}

export const MfaChallengeView: React.FC<MfaChallengeViewProps> = ({
  error = '',
  loading = false,
  onVerify,
  onCancel,
}) => {
  const [code, setCode] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onVerify(code.replace(/\D/g, '').slice(0, 6));
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#EAF5FD_0%,#F7F8F5_46%,#EEF4E8_100%)] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-xl items-center justify-center">
        <div className="w-full rounded-[28px] border border-[#D6E0E8] bg-white p-7 shadow-[0_28px_80px_rgba(14,35,55,0.16)] sm:p-10">
          <BrandLogo orientation="horizontal" backgroundColor="#FFFFFF" className="mb-10 h-auto w-[210px] max-w-full object-contain object-left" />

          <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B4BF8A]/20 text-[#183956]">
            <ShieldCheck className="h-6 w-6" />
          </div>

          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-[#0E2337]">Confirme sua identidade</h1>
          <p className="mt-3 text-sm leading-6 text-[#607386]">
            Abra seu aplicativo autenticador e digite o código temporário de 6 dígitos para concluir o login.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="mfa-login-code" className="mb-2 block text-sm font-bold text-[#183956]">Código de autenticação</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#7D8E9E]" />
                <input
                  id="mfa-login-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                  className="h-[54px] w-full rounded-xl border border-[#CFD9E2] bg-white pl-12 pr-4 font-mono text-xl tracking-[0.35em] text-[#0E2337] outline-none transition focus:border-[#0076DD] focus:ring-4 focus:ring-[#64B0F3]/15"
                />
              </div>
            </div>

            {error && <div className="rounded-xl border border-[#E5B8B8] bg-[#FFF5F5] px-4 py-3 text-[13px] font-medium text-[#A33A3A]">{error}</div>}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex h-[52px] w-full items-center justify-center rounded-xl bg-[#183956] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(24,57,86,0.20)] transition hover:bg-[#0E2337] disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Confirmar e entrar'}
            </button>

            <button type="button" onClick={onCancel} className="w-full text-center text-sm font-semibold text-[#607386] hover:text-[#183956]">
              Voltar para o login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
