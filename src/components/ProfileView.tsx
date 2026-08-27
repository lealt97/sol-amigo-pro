import React, { useEffect, useState } from 'react';
import {
  Building2,
  Camera,
  IdCard,
  Image as ImageIcon,
  Loader2,
  Mail,
  Phone,
  Save,
  Upload,
  UserRound,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ThemeConfig } from '../types';

interface ProfileViewProps {
  theme: ThemeConfig;
  onShowToast: (message: string) => void;
}

type LogoVariant = 'dark' | 'light';

type BrandLogos = {
  dark: string[];
  light: string[];
};

const EMPTY_LOGOS: BrandLogos = {
  dark: ['', '', ''],
  light: ['', '', ''],
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const formatCpf = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
};

const formatCnpj = (value: string) => {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\/\d{4})(\d)/, '$1-$2');
};

const formatPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

export const ProfileView: React.FC<ProfileViewProps> = ({ theme, onShowToast }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [brandLogos, setBrandLogos] = useState<BrandLogos>(EMPTY_LOGOS);
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

      const metadata = data.user.user_metadata ?? {};
      const storedLogos = metadata.brand_logos ?? {};

      setFullName(String(metadata.full_name ?? ''));
      setCompany(String(metadata.company ?? ''));
      setPhone(formatPhone(String(metadata.phone ?? '')));
      setCpf(formatCpf(String(metadata.cpf ?? '')));
      setCnpj(formatCnpj(String(metadata.cnpj ?? '')));
      setEmail(data.user.email ?? '');
      setProfilePhoto(String(metadata.profile_image_url ?? ''));
      setBrandLogos({
        dark: [0, 1, 2].map((index) => String(storedLogos.dark?.[index] ?? '')),
        light: [0, 1, 2].map((index) => String(storedLogos.light?.[index] ?? '')),
      });
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

    const phoneDigits = onlyDigits(phone);
    const cpfDigits = onlyDigits(cpf);
    const cnpjDigits = onlyDigits(cnpj);

    if (phoneDigits && phoneDigits.length !== 10 && phoneDigits.length !== 11) {
      setError('Informe um telefone/celular com DDD e 10 ou 11 dígitos.');
      setSaving(false);
      return;
    }

    if (cpfDigits && cpfDigits.length !== 11) {
      setError('Informe um CPF com 11 dígitos.');
      setSaving(false);
      return;
    }

    if (cnpjDigits && cnpjDigits.length !== 14) {
      setError('Informe um CNPJ com 14 dígitos.');
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        company: company.trim(),
        phone: phoneDigits,
        cpf: cpfDigits,
        cnpj: cnpjDigits,
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

  const uploadAsset = async (
    file: File,
    target: { type: 'avatar' } | { type: 'logo'; variant: LogoVariant; index: number }
  ) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato não suportado. Use PNG, JPG, WEBP ou SVG.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('O arquivo deve ter no máximo 5 MB.');
      return;
    }

    const uploadKey =
      target.type === 'avatar' ? 'avatar' : `${target.variant}-${target.index}`;

    setUploading(uploadKey);
    setError('');

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error('Usuário não encontrado.');

      const userId = userData.user.id;
      const objectPath =
        target.type === 'avatar'
          ? `${userId}/profile/avatar`
          : `${userId}/logos/${target.variant}-${target.index + 1}`;

      const { error: uploadError } = await supabase.storage
        .from('account-assets')
        .upload(objectPath, file, {
          upsert: true,
          cacheControl: '3600',
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('account-assets')
        .getPublicUrl(objectPath);

      const versionedUrl = `${publicData.publicUrl}?v=${Date.now()}`;
      const currentMetadata = userData.user.user_metadata ?? {};

      if (target.type === 'avatar') {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            ...currentMetadata,
            profile_image_url: versionedUrl,
          },
        });
        if (metadataError) throw metadataError;
        setProfilePhoto(versionedUrl);
        onShowToast('Foto de perfil atualizada.');
      } else {
        const nextLogos: BrandLogos = {
          dark: [...brandLogos.dark],
          light: [...brandLogos.light],
        };
        nextLogos[target.variant][target.index] = versionedUrl;

        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            ...currentMetadata,
            brand_logos: nextLogos,
          },
        });
        if (metadataError) throw metadataError;
        setBrandLogos(nextLogos);
        onShowToast(`Logo ${target.index + 1} atualizado.`);
      }
    } catch (uploadError) {
      console.error('Erro ao enviar arquivo:', uploadError);
      setError('Não foi possível enviar o arquivo. Tente novamente.');
    } finally {
      setUploading(null);
    }
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
              Atualize seus dados, contato, documentos, foto de perfil e arquivos de identidade visual.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
          <div className="flex min-h-52 items-center justify-center gap-2 text-sm opacity-70">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando perfil...
          </div>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border" style={{ borderColor: theme.border }}>
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Foto de perfil" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: theme.secondary }}>
                    <UserRound className="h-12 w-12 text-white" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5" style={{ color: theme.secondary }} />
                  <h3 className="font-bold">Foto de perfil</h3>
                </div>
                <p className="mt-1 text-sm opacity-60">PNG, JPG ou WEBP. Máximo de 5 MB.</p>
                <label
                  className="theme-interactive mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-bold"
                  style={{ borderColor: theme.border }}
                >
                  {uploading === 'avatar' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading === 'avatar' ? 'Enviando...' : profilePhoto ? 'Trocar foto' : 'Enviar foto'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={uploading !== null}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) void uploadAsset(file, { type: 'avatar' });
                    }}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" style={{ color: theme.secondary }} />
                <h3 className="font-bold">Logos da empresa</h3>
              </div>
              <p className="mt-1 text-sm opacity-60">
                Cadastre até 6 logos: 3 preparados para fundos escuros e 3 para fundos claros.
              </p>
            </div>

            <LogoGroup
              title="Para fundos escuros"
              description="Use versões claras ou com contraste adequado para superfícies escuras."
              variant="dark"
              logos={brandLogos.dark}
              uploading={uploading}
              theme={theme}
              onUpload={uploadAsset}
            />

            <div className="my-6 border-t" style={{ borderColor: theme.border }} />

            <LogoGroup
              title="Para fundos claros"
              description="Use versões escuras ou com contraste adequado para superfícies claras."
              variant="light"
              logos={brandLogos.light}
              uploading={uploading}
              theme={theme}
              onUpload={uploadAsset}
            />
          </section>

          <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
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
                    <Phone className="h-4 w-4 opacity-65" /> Telefone / celular
                  </span>
                  <input
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(formatPhone(event.target.value))}
                    className="crm-input"
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                  <span className="mt-1.5 block text-xs font-normal opacity-50">Informe o DDD. Opcional.</span>
                </label>

                <label className="block text-sm font-semibold">
                  <span className="mb-2 flex items-center gap-2">
                    <IdCard className="h-4 w-4 opacity-65" /> CPF
                  </span>
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    value={cpf}
                    onChange={(event) => setCpf(formatCpf(event.target.value))}
                    className="crm-input"
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                  <span className="mt-1.5 block text-xs font-normal opacity-50">Opcional.</span>
                </label>

                <label className="block text-sm font-semibold">
                  <span className="mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4 opacity-65" /> CNPJ
                  </span>
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    value={cnpj}
                    onChange={(event) => setCnpj(formatCnpj(event.target.value))}
                    className="crm-input"
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                  <span className="mt-1.5 block text-xs font-normal opacity-50">Opcional.</span>
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
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold"
                  style={{ backgroundColor: theme.secondary, color: '#fff' }}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
};

interface LogoGroupProps {
  title: string;
  description: string;
  variant: LogoVariant;
  logos: string[];
  uploading: string | null;
  theme: ThemeConfig;
  onUpload: (
    file: File,
    target: { type: 'avatar' } | { type: 'logo'; variant: LogoVariant; index: number }
  ) => Promise<void>;
}

const LogoGroup: React.FC<LogoGroupProps> = ({
  title,
  description,
  variant,
  logos,
  uploading,
  theme,
  onUpload,
}) => (
  <div>
    <h4 className="text-sm font-bold">{title}</h4>
    <p className="mt-1 text-xs opacity-55">{description}</p>

    <div className="mt-4 grid gap-4 md:grid-cols-3">
      {[0, 1, 2].map((index) => {
        const uploadKey = `${variant}-${index}`;
        const logo = logos[index];
        const isBusy = uploading === uploadKey;

        return (
          <div key={uploadKey} className="overflow-hidden rounded-xl border" style={{ borderColor: theme.border }}>
            <div
              className="flex h-32 items-center justify-center p-4"
              style={{
                backgroundColor: variant === 'dark' ? '#0E2337' : '#FFFFFF',
                backgroundImage:
                  variant === 'light'
                    ? 'linear-gradient(45deg,#f4f4f4 25%,transparent 25%),linear-gradient(-45deg,#f4f4f4 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f4f4f4 75%),linear-gradient(-45deg,transparent 75%,#f4f4f4 75%)'
                    : undefined,
                backgroundSize: variant === 'light' ? '18px 18px' : undefined,
                backgroundPosition: variant === 'light' ? '0 0,0 9px,9px -9px,-9px 0' : undefined,
              }}
            >
              {logo ? (
                <img src={logo} alt={`${title} - logo ${index + 1}`} className="max-h-full max-w-full object-contain" />
              ) : (
                <div className={`text-center ${variant === 'dark' ? 'text-white/45' : 'text-slate-500'}`}>
                  <ImageIcon className="mx-auto h-7 w-7" />
                  <span className="mt-2 block text-xs">Logo {index + 1}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 p-3">
              <span className="text-xs font-semibold">Logo {index + 1}</span>
              <label
                className="theme-interactive inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold"
                style={{ borderColor: theme.border }}
              >
                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {isBusy ? 'Enviando' : logo ? 'Trocar' : 'Enviar'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void onUpload(file, { type: 'logo', variant, index });
                  }}
                />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
