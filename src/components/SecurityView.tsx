import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  MailCheck,
  QrCode,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from 'lucide-react';
import { supabase, validateCurrentPassword } from '../lib/supabase';
import type { ThemeConfig } from '../types';

interface SecurityViewProps {
  theme: ThemeConfig;
  onShowToast: (message: string) => void;
  onSignedOut: () => void;
}

type Enrollment = { factorId: string; qrCode: string };
type PasswordStep = 'closed' | 'credentials' | 'mfa' | 'email';

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  busy: boolean;
  visible: boolean;
  borderColor: string;
  focusColor: string;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
}

const maskEmail = (email: string) => {
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${'*'.repeat(Math.max(3, localPart.length - visible.length))}@${domain}`;
};

const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  label,
  value,
  autoComplete,
  busy,
  visible,
  borderColor,
  focusColor,
  onChange,
  onToggleVisibility,
}) => (
  <label htmlFor={id} className="block">
    <span className="mb-1.5 block text-sm font-semibold">{label}</span>
    <span className="relative block">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={busy}
        className="h-11 w-full rounded-lg border bg-transparent px-4 pr-11 text-sm outline-none transition focus:ring-2"
        style={{ borderColor, ['--tw-ring-color' as string]: focusColor }}
      />
      <button
        type="button"
        onClick={onToggleVisibility}
        disabled={busy}
        aria-label={visible ? 'Ocultar senhas' : 'Mostrar senhas'}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center opacity-60 transition hover:opacity-100"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </span>
  </label>
);

export const SecurityView: React.FC<SecurityViewProps> = ({ theme, onShowToast, onSignedOut }) => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [factors, setFactors] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [passwordStep, setPasswordStep] = useState<PasswordStep>('closed');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMfaCode, setPasswordMfaCode] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [passwordFactorId, setPasswordFactorId] = useState('');

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

  const resetPasswordFlow = () => {
    setPasswordStep('closed');
    setPasswordBusy(false);
    setPasswordError('');
    setShowPasswords(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMfaCode('');
    setEmailCode('');
    setAccountEmail('');
    setPasswordFactorId('');
  };

  const sendPasswordEmailCode = async () => {
    setPasswordBusy(true);
    setPasswordError('');
    const { error: reauthenticateError } = await supabase.auth.reauthenticate();
    if (reauthenticateError) {
      setPasswordError('Não foi possível enviar o código de validação. Aguarde um momento e tente novamente.');
      setPasswordBusy(false);
      return false;
    }
    setEmailCode('');
    setPasswordStep('email');
    setPasswordBusy(false);
    return true;
  };

  const startPasswordChange = async () => {
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Digite sua senha atual.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('A nova senha precisa ser diferente da senha atual.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação não corresponde à nova senha.');
      return;
    }

    setPasswordBusy(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (userError || !email) {
      setPasswordError('Não foi possível confirmar a conta conectada. Entre novamente e tente outra vez.');
      setPasswordBusy(false);
      return;
    }
    if (!userData.user?.email_confirmed_at) {
      setPasswordError('Confirme o e-mail da conta antes de alterar a senha.');
      setPasswordBusy(false);
      return;
    }

    const passwordValidationError = await validateCurrentPassword(email, currentPassword);
    if (passwordValidationError) {
      setPasswordError(
        passwordValidationError.code === 'invalid_credentials'
          ? 'A senha atual está incorreta.'
          : 'Não foi possível validar a senha atual. Verifique sua conexão e tente novamente.'
      );
      setPasswordBusy(false);
      return;
    }

    setAccountEmail(email);
    const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors();
    if (factorError) {
      setPasswordError('Não foi possível verificar a proteção MFA da conta. Tente novamente.');
      setPasswordBusy(false);
      return;
    }

    const verifiedFactor = factorData?.all?.find(
      (factor) => factor.factor_type === 'totp' && factor.status === 'verified'
    );
    if (verifiedFactor) {
      setPasswordFactorId(verifiedFactor.id);
      setPasswordMfaCode('');
      setPasswordStep('mfa');
      setPasswordBusy(false);
      return;
    }

    await sendPasswordEmailCode();
  };

  const verifyPasswordMfa = async () => {
    const cleanCode = passwordMfaCode.replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      setPasswordError('Digite o código de 6 dígitos do aplicativo autenticador.');
      return;
    }
    if (!passwordFactorId) {
      setPasswordError('O autenticador não foi localizado. Reinicie a alteração de senha.');
      return;
    }

    setPasswordBusy(true);
    setPasswordError('');
    const { error: verificationError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: passwordFactorId,
      code: cleanCode,
    });
    if (verificationError) {
      setPasswordError('Código MFA inválido ou expirado. Confira o aplicativo e tente novamente.');
      setPasswordBusy(false);
      return;
    }

    await sendPasswordEmailCode();
  };

  const finishPasswordChange = async () => {
    const cleanCode = emailCode.replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      setPasswordError('Digite o código de 6 dígitos enviado ao seu e-mail.');
      return;
    }

    setPasswordBusy(true);
    setPasswordError('');
    const { error: updateError } = await supabase.auth.updateUser({
      current_password: currentPassword,
      password: newPassword,
      nonce: cleanCode,
    });
    if (updateError) {
      const code = updateError.code ?? '';
      if (code === 'same_password') {
        setPasswordError('A nova senha precisa ser diferente da senha atual.');
      } else if (code === 'weak_password') {
        setPasswordError('A nova senha não atende aos requisitos de segurança. Escolha uma senha mais forte.');
      } else if (code === 'reauthentication_not_valid' || code === 'reauth_nonce_missing') {
        setPasswordError('O código do e-mail é inválido ou expirou. Solicite um novo código.');
      } else {
        setPasswordError('Não foi possível alterar a senha. Confira os dados e tente novamente.');
      }
      setPasswordBusy(false);
      return;
    }

    resetPasswordFlow();
    onShowToast('Senha alterada com sucesso.');
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${theme.secondary}18`, color: theme.secondary }}>
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold">Alterar senha</h3>
              <p className="mt-1 max-w-2xl text-sm opacity-65">
                Confirme sua senha atual e valide a alteração com os fatores de segurança da conta.
              </p>
            </div>
          </div>
          {passwordStep === 'closed' && (
            <button
              type="button"
              onClick={() => setPasswordStep('credentials')}
              className="rounded-lg px-4 py-2.5 text-sm font-bold"
              style={{ backgroundColor: theme.secondary, color: '#fff' }}
            >
              Alterar senha
            </button>
          )}
        </div>

        {passwordStep !== 'closed' && (
          <div className="mt-6 border-t pt-6" style={{ borderColor: theme.border }}>
            <div className="mb-6 flex flex-wrap gap-2 text-xs font-bold">
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5" style={{ borderColor: theme.border, backgroundColor: passwordStep === 'credentials' ? `${theme.secondary}20` : 'transparent' }}>
                {passwordStep !== 'credentials' ? <Check className="h-3.5 w-3.5" /> : <span>1</span>} Senha atual
              </span>
              {passwordFactorId && (
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5" style={{ borderColor: theme.border, backgroundColor: passwordStep === 'mfa' ? `${theme.secondary}20` : 'transparent' }}>
                  {passwordStep === 'email' ? <Check className="h-3.5 w-3.5" /> : <span>2</span>} MFA
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5" style={{ borderColor: theme.border, backgroundColor: passwordStep === 'email' ? `${theme.secondary}20` : 'transparent', opacity: passwordStep === 'credentials' ? 0.55 : 1 }}>
                <span>{passwordFactorId ? 3 : 2}</span> E-mail
              </span>
            </div>

            {passwordError && (
              <div role="alert" className="mb-5 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {passwordError}
              </div>
            )}

            {passwordStep === 'credentials' && (
              <div className="max-w-xl">
                <div className="grid gap-4">
                  <PasswordInput id="current-password" label="Senha atual" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" busy={passwordBusy} visible={showPasswords} borderColor={theme.border} focusColor={`${theme.secondary}55`} onToggleVisibility={() => setShowPasswords((visible) => !visible)} />
                  <PasswordInput id="new-password" label="Nova senha" value={newPassword} onChange={setNewPassword} autoComplete="new-password" busy={passwordBusy} visible={showPasswords} borderColor={theme.border} focusColor={`${theme.secondary}55`} onToggleVisibility={() => setShowPasswords((visible) => !visible)} />
                  <PasswordInput id="confirm-password" label="Confirmar nova senha" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" busy={passwordBusy} visible={showPasswords} borderColor={theme.border} focusColor={`${theme.secondary}55`} onToggleVisibility={() => setShowPasswords((visible) => !visible)} />
                </div>
                <p className="mt-3 text-xs opacity-55">Use pelo menos 8 caracteres e não repita a senha atual.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" disabled={passwordBusy} onClick={startPasswordChange} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold disabled:opacity-60" style={{ backgroundColor: theme.secondary, color: '#fff' }}>
                    {passwordBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {passwordBusy ? 'Validando...' : 'Continuar'}
                  </button>
                  <button type="button" disabled={passwordBusy} onClick={resetPasswordFlow} className="rounded-lg border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: theme.border }}>Cancelar</button>
                </div>
              </div>
            )}

            {passwordStep === 'mfa' && (
              <div className="max-w-xl">
                <div className="flex items-start gap-3">
                  <Smartphone className="mt-0.5 h-5 w-5 shrink-0" style={{ color: theme.secondary }} />
                  <div><h4 className="font-bold">Confirme no aplicativo autenticador</h4><p className="mt-1 text-sm opacity-65">Como o MFA está ativo, esta alteração também exige o código de 6 dígitos.</p></div>
                </div>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  value={passwordMfaCode}
                  onChange={(event) => setPasswordMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  disabled={passwordBusy}
                  className="mt-5 h-11 w-full max-w-xs rounded-lg border bg-transparent px-4 font-mono text-lg tracking-[0.35em] outline-none"
                  style={{ borderColor: theme.border }}
                />
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" disabled={passwordBusy} onClick={verifyPasswordMfa} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold disabled:opacity-60" style={{ backgroundColor: theme.secondary, color: '#fff' }}>
                    {passwordBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {passwordBusy ? 'Verificando...' : 'Verificar MFA'}
                  </button>
                  <button type="button" disabled={passwordBusy} onClick={resetPasswordFlow} className="rounded-lg border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: theme.border }}>Cancelar</button>
                </div>
              </div>
            )}

            {passwordStep === 'email' && (
              <div className="max-w-xl">
                <div className="flex items-start gap-3">
                  <MailCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: theme.secondary }} />
                  <div>
                    <h4 className="font-bold">Valide pelo e-mail</h4>
                    <p className="mt-1 text-sm opacity-65">Digite o código de 6 dígitos enviado para <strong>{maskEmail(accountEmail)}</strong>.</p>
                  </div>
                </div>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  value={emailCode}
                  onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  disabled={passwordBusy}
                  className="mt-5 h-11 w-full max-w-xs rounded-lg border bg-transparent px-4 font-mono text-lg tracking-[0.35em] outline-none"
                  style={{ borderColor: theme.border }}
                />
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" disabled={passwordBusy} onClick={finishPasswordChange} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold disabled:opacity-60" style={{ backgroundColor: theme.secondary, color: '#fff' }}>
                    {passwordBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {passwordBusy ? 'Alterando...' : 'Confirmar nova senha'}
                  </button>
                  <button type="button" disabled={passwordBusy} onClick={sendPasswordEmailCode} className="rounded-lg border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: theme.border }}>Reenviar código</button>
                  <button type="button" disabled={passwordBusy} onClick={resetPasswordFlow} className="rounded-lg border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: theme.border }}>Cancelar</button>
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2 text-xs opacity-55">
              <LockKeyhole className="h-4 w-4" /> A senha e os códigos não são armazenados no navegador.
            </div>
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
