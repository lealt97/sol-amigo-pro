import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, LogOut, QrCode, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ThemeConfig } from '../types';

interface SecurityViewProps {
  theme: ThemeConfig;
  onShowToast: (message: string) => void;
  onSignedOut: () => void;
}

type Enrollment = { factorId: string; qrCode: string };

export const SecurityView: React.FC<SecurityViewProps> = ({ theme, onShowToast, onSignedOut }) => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [factors, setFactors] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const verifiedTotp = useMemo(
    () => factors.filter((factor) => factor.factor_type === 'totp' && factor.status === 'verified'),
    [factors]
  );

  const loadFactors = async () => {
    setLoading(true);
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
      setError(listError.message);
      setFactors([]);
    } else {
      setError('');
      setFactors(data?.all ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadFactors();
  }, []);

  const startEnrollment = async () => {
    setBusy(true);
    setError('');
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Sol Amigo Pro',
    });
    if (enrollError) {
      setError(enrollError.message);
      setBusy(false);
      return;
    }
    setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code });
    setCode('');
    setBusy(false);
  };

  const verifyEnrollment = async () => {
    if (!enrollment) return;
    const cleanCode = code.replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      setError('Digite o código de 6 dígitos do aplicativo autenticador.');
      return;
    }
    setBusy(true);
    setError('');
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code: cleanCode,
    });
    if (verifyError) {
      setError('Código inválido ou expirado. Tente novamente.');
      setBusy(false);
      return;
    }
    setEnrollment(null);
    setCode('');
    await loadFactors();
    onShowToast('MFA ativado com sucesso.');
    setBusy(false);
  };

  const cancelEnrollment = async () => {
    if (!enrollment) return;
    setBusy(true);
    await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId });
    setEnrollment(null);
    setCode('');
    setBusy(false);
    await loadFactors();
  };

  const disableFactor = async (factorId: string) => {
    setBusy(true);
    setError('');
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
    if (unenrollError) {
      setError(unenrollError.message);
      setBusy(false);
      return;
    }
    await loadFactors();
    onShowToast('MFA desativado.');
    setBusy(false);
  };

  const signOut = async () => {
    setBusy(true);
    await supabase.auth.signOut();
    onSignedOut();
  };

  return (
    <div id="seguranca-page" className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="h-5 w-5" style={{ color: theme.accent }} />
              Segurança da conta
            </div>
            <h2 className="text-xl font-bold">Autenticação multifator (MFA)</h2>
            <p className="mt-2 max-w-2xl text-sm opacity-70">
              Use Google Authenticator, Microsoft Authenticator, Authy ou outro aplicativo TOTP.
            </p>
          </div>
          <span className="shrink-0 rounded-full border px-3 py-1 text-xs font-bold" style={{ borderColor: theme.border }}>
            {loading ? 'Verificando...' : verifiedTotp.length ? 'MFA ativado' : 'MFA desativado'}
          </span>
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm opacity-70">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : enrollment ? (
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <div className="rounded-2xl bg-white p-4">
              <img src={enrollment.qrCode} alt="QR Code para ativar MFA" className="mx-auto aspect-square w-full max-w-[220px]" />
            </div>
            <div>
              <div className="flex items-center gap-2"><QrCode className="h-5 w-5" style={{ color: theme.secondary }} /><h3 className="font-bold">Escaneie o QR Code</h3></div>
              <p className="mt-2 text-sm opacity-70">Adicione uma conta no aplicativo autenticador e depois digite o código de 6 dígitos.</p>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="mt-5 h-11 w-full max-w-xs rounded-lg border bg-transparent px-4 font-mono text-lg tracking-[0.35em] outline-none"
                style={{ borderColor: theme.border }}
              />
              <div className="mt-4 flex gap-2">
                <button type="button" disabled={busy} onClick={verifyEnrollment} className="rounded-lg px-4 py-2 text-sm font-bold" style={{ backgroundColor: theme.secondary, color: '#fff' }}>{busy ? 'Verificando...' : 'Ativar MFA'}</button>
                <button type="button" disabled={busy} onClick={cancelEnrollment} className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: theme.border }}>Cancelar</button>
              </div>
            </div>
          </div>
        ) : verifiedTotp.length ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border p-4" style={{ borderColor: theme.border }}>
              <Smartphone className="mt-0.5 h-5 w-5 shrink-0" style={{ color: theme.accent }} />
              <div><p className="font-semibold">Aplicativo autenticador conectado</p><p className="mt-1 text-sm opacity-65">O código MFA será solicitado nos próximos logins.</p></div>
            </div>
            {verifiedTotp.map((factor) => (
              <div key={factor.id} className="flex items-center justify-between gap-3 rounded-xl border p-4" style={{ borderColor: theme.border }}>
                <div><p className="text-sm font-semibold">{factor.friendly_name || 'Aplicativo autenticador'}</p><p className="mt-1 text-xs opacity-55">TOTP · verificado</p></div>
                <button type="button" disabled={busy} onClick={() => disableFactor(factor.id)} className="inline-flex items-center gap-2 rounded-lg border border-red-400/40 px-3 py-2 text-xs font-bold text-red-300"><ShieldOff className="h-4 w-4" />Desativar MFA</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4 py-3">
            <Smartphone className="h-8 w-8" style={{ color: theme.secondary }} />
            <div><h3 className="font-bold">Proteção adicional desativada</h3><p className="mt-1 max-w-2xl text-sm opacity-65">Ative o MFA para exigir um segundo fator depois da senha.</p></div>
            <button type="button" disabled={busy} onClick={startEnrollment} className="rounded-lg px-4 py-2.5 text-sm font-bold" style={{ backgroundColor: theme.secondary, color: '#fff' }}>{busy ? 'Preparando...' : 'Ativar autenticação em duas etapas'}</button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h3 className="font-bold">Sessão</h3><p className="mt-1 text-sm opacity-65">Encerre sua sessão neste dispositivo.</p></div>
          <button type="button" disabled={busy} onClick={signOut} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: theme.border }}><LogOut className="h-4 w-4" />Sair da conta</button>
        </div>
      </section>
    </div>
  );
};
