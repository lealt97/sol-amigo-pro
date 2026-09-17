import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, LockKeyhole, ShieldAlert, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ThemeConfig } from '../types';

interface RiskAreaViewProps {
  theme: ThemeConfig;
}

const CONFIRMATION_TEXT = 'EXCLUIR MINHA CONTA';

export const RiskAreaView: React.FC<RiskAreaViewProps> = ({ theme }) => {
  const [email, setEmail] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
  }, []);

  const closeConfirmation = () => {
    if (deleting) return;
    setConfirmOpen(false);
    setConfirmation('');
    setPassword('');
    setError('');
  };

  const handleDeleteAccount = async () => {
    if (
      confirmation !== CONFIRMATION_TEXT ||
      !password.trim() ||
      !email ||
      deleting
    ) {
      return;
    }

    setDeleting(true);
    setError('');

    const { error: passwordError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (passwordError) {
      setError('Senha incorreta. Verifique sua senha e tente novamente.');
      setDeleting(false);
      return;
    }

    const { error: functionError } = await supabase.functions.invoke('delete-account', {
      body: { confirmation },
    });

    if (functionError) {
      setError('Não foi possível excluir a conta. Tente novamente.');
      setDeleting(false);
      return;
    }

    setPassword('');
    await supabase.auth.signOut({ scope: 'local' });
    window.location.reload();
  };

  return (
    <div id="area-risco-page" className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-2xl border border-red-400/35 bg-red-500/5 p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-200">Área de risco</h2>
            <p className="mt-1 max-w-2xl text-sm opacity-70">
              Ações desta área podem apagar permanentemente informações da sua conta.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
          <div className="w-full">
            <h3 className="font-bold">Excluir conta definitivamente</h3>
            <p className="mt-1 max-w-2xl text-sm opacity-65">
              Exclui sua conta de acesso, clientes cadastrados e arquivos de perfil armazenados. Esta ação não pode ser desfeita.
            </p>
            {email && <p className="mt-2 text-xs opacity-50">Conta: {email}</p>}

            <div className="mt-4 flex justify-start">
              <button
                type="button"
                id="btn-excluir-minha-conta"
                onClick={() => {
                  setConfirmOpen(true);
                  setConfirmation('');
                  setPassword('');
                  setError('');
                }}
                className="btn-danger-outline inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Excluir minha conta
              </button>
            </div>
          </div>
        </div>
      </section>

      {confirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl border p-5 shadow-2xl md:p-6"
            style={{ backgroundColor: 'var(--neutral)', borderColor: theme.border }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-red-200">Confirmar exclusão da conta</h3>
                <p className="mt-2 text-sm opacity-70">
                  Para proteger sua conta, confirme a frase abaixo e informe sua senha atual.
                </p>
              </div>
              <button
                type="button"
                onClick={closeConfirmation}
                disabled={deleting}
                className="btn-outline flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border"
                style={{ borderColor: theme.border }}
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/5 p-4">
              <p className="text-sm font-semibold">Digite exatamente:</p>
              <p className="mt-1 font-mono text-sm font-bold text-red-200">{CONFIRMATION_TEXT}</p>
            </div>

            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={deleting}
              className="crm-input mt-4"
              placeholder={CONFIRMATION_TEXT}
              autoComplete="off"
            />

            <label className="mt-4 block text-sm font-semibold">
              <span className="mb-2 flex items-center gap-2">
                <LockKeyhole className="h-4 w-4 opacity-65" />
                Senha atual
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={deleting}
                className="crm-input"
                placeholder="Digite sua senha"
                autoComplete="current-password"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeConfirmation}
                disabled={deleting}
                className="btn-outline cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-semibold"
                style={{ borderColor: theme.border }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={confirmation !== CONFIRMATION_TEXT || !password.trim() || deleting}
                className="btn-filled inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? 'Verificando e excluindo...' : 'Excluir conta definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
