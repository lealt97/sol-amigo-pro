import React, { useEffect, useState } from 'react';
import { Building2, Loader2, Mail, Save, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ThemeConfig } from '../types';

interface ProfileViewProps {
  theme: ThemeConfig;
  onShowToast: (message: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ theme, onShowToast }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      const { data, error: userError } = await supabase.auth.getUser();
      if (!mounted) return;

      if (userError || !data.user) {
        setError('Não foi possível carregar os dados da conta.');
        setLoading(false);
        return;
      }

      setFullName(String(data.user.user_metadata?.full_name ?? ''));
      setCompany(String(data.user.user_metadata?.company ?? ''));
      setEmail(data.user.email ?? '');
      setCreatedAt(
        data.user.created_at
          ? new Date(data.user.created_at).toLocaleDateString('pt-BR')
          : ''
      );
      setLoading(false);
    };

    void loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        company: company.trim(),
      },
    });

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    onShowToast('Perfil atualizado com sucesso.');
    setSaving(false);
  };

  return (
    <div id="perfil-page" className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: theme.secondary, color: '#fff' }}
          >
            <UserRound className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Perfil</h2>
            <p className="mt-1 text-sm opacity-65">
              Atualize os dados principais vinculados à sua conta Sol Amigo Pro.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
        {loading ? (
          <div className="flex min-h-52 items-center justify-center gap-2 text-sm opacity-70">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando perfil...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold">
                <span className="mb-2 flex items-center gap-2">
                  <UserRound className="h-4 w-4 opacity-65" /> Nome completo
                </span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="crm-input"
                  placeholder="Seu nome"
                />
              </label>

              <label className="block text-sm font-semibold">
                <span className="mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4 opacity-65" /> Empresa
                </span>
                <input
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  className="crm-input"
                  placeholder="Nome da empresa"
                />
              </label>

              <label className="block text-sm font-semibold md:col-span-2">
                <span className="mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4 opacity-65" /> E-mail da conta
                </span>
                <input value={email} readOnly className="crm-input opacity-70" />
                <span className="mt-1.5 block text-xs font-normal opacity-50">
                  O e-mail de acesso é gerenciado pela autenticação da conta.
                </span>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: theme.border }}>
              <span className="text-xs opacity-50">
                {createdAt ? `Conta criada em ${createdAt}` : 'Conta autenticada'}
              </span>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold"
                style={{ backgroundColor: theme.secondary, color: '#fff' }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};
