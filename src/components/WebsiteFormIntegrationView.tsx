import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Check, ChevronDown, ChevronUp, Clipboard, Code2, ExternalLink,
  Globe2, Image, KeyRound, Loader2, MapPin, MonitorSmartphone, Plus, RefreshCw,
  RotateCcw, Save, ShieldCheck, Trash2, Type,
} from 'lucide-react';
import type { FormColorMode, FormThemeColors, ThemeConfig, WebsiteFormSettings } from '../types';
import {
  fetchProfileBrandLogos, fetchWebsiteFormSettings, normalizeWebsiteOrigin,
  rotateWebsiteFormToken, saveWebsiteFormSettings, uploadWebsiteFormImage,
} from '../services/websiteFormIntegration';
import type { ProfileBrandLogo } from '../services/websiteFormIntegration';
import { ALL_BRAZIL_STATE_CODES, BRAZIL_STATE_GROUPS } from '../data/brazilStates';
import {
  createAutomaticFormTheme, DEFAULT_FORM_PRIMARY, DEFAULT_FORM_SECONDARY,
  DEFAULT_FORM_SURFACE, DEFAULT_FORM_THEME_COLORS, FORM_THEME_COLOR_GROUPS,
  isHexColor, resolveFormTheme,
} from '../utils/formTheme';
import { ResponsiveColorField } from './ResponsiveColorField';

interface WebsiteFormIntegrationViewProps {
  theme: ThemeConfig;
  onShowToast: (message: string) => void;
}

type CollapsibleSection = 'integration' | 'states' | 'appearance';

const PUBLIC_APP_URL = (
  import.meta.env.VITE_PUBLIC_APP_URL || 'https://lealt97.github.io/sol-amigo-pro/'
).replace(/\/?$/, '/');
const CAPTURE_ENDPOINT = 'https://tmdhmthlnfotfezxgxlt.supabase.co/functions/v1/capture-lead';

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const field = document.createElement('textarea');
  field.value = value;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  document.execCommand('copy');
  field.remove();
};

const validateHttpsUrl = (value: string, label: string) => {
  if (!value.trim()) return;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') throw new Error();
  } catch {
    throw new Error(`${label} precisa ser uma URL HTTPS válida.`);
  }
};

export const WebsiteFormIntegrationView: React.FC<WebsiteFormIntegrationViewProps> = ({
  theme,
  onShowToast,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [saved, setSaved] = useState<WebsiteFormSettings | null>(null);
  const [draft, setDraft] = useState<WebsiteFormSettings | null>(null);
  const [profileLogos, setProfileLogos] = useState<ProfileBrandLogo[]>([]);
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [domainInput, setDomainInput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'code' | 'link' | 'token' | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<CollapsibleSection, boolean>>({
    integration: false,
    states: true,
    appearance: false,
  });

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchWebsiteFormSettings(),
      fetchProfileBrandLogos().catch(() => []),
    ])
      .then(([settings, logos]) => {
        if (!mounted) return;
        setSaved(settings);
        setDraft(settings);
        setProfileLogos(logos);
      })
      .catch(() => mounted && setError('Não foi possível carregar a integração.'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const previewImageKey = draft?.sideImageUrls.join('|') ?? '';
  useEffect(() => {
    setPreviewImageIndex(0);
    const imageCount = draft?.sideImageUrls.length ?? 0;
    if (!draft?.sideImageRotationEnabled || imageCount < 2) return;
    const interval = window.setInterval(() => {
      setPreviewImageIndex((current) => (current + 1) % imageCount);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [draft?.sideImageRotationEnabled, previewImageKey]);

  const changed = useMemo(
    () => Boolean(saved && draft && JSON.stringify(saved) !== JSON.stringify(draft)),
    [saved, draft]
  );
  const publicLink = draft
    ? `${PUBLIC_APP_URL}?captacao=${encodeURIComponent(draft.publicToken)}`
    : '';
  const installCode = useMemo(() => {
    if (!draft) return '';
    return `<div id="sol-amigo-formulario"></div>\n<script async src="${PUBLIC_APP_URL}widget.js" data-sol-amigo-token="${draft.publicToken}" data-target="#sol-amigo-formulario"></script>`;
  }, [draft]);

  const setField = <K extends keyof WebsiteFormSettings>(key: K, value: WebsiteFormSettings[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setError('');
  };
  const setThemeColor = (key: keyof FormThemeColors, color: string) => {
    setDraft((current) => current ? {
      ...current,
      themeColors: { ...current.themeColors, [key]: color },
    } : current);
    setError('');
  };
  const setColorMode = (colorMode: FormColorMode) => {
    setDraft((current) => current ? {
      ...current,
      colorMode,
      themeColors: colorMode === 'detailed'
        ? createAutomaticFormTheme(current.primaryColor, current.secondaryColor, current.surfaceColor)
        : current.themeColors,
    } : current);
    setError('');
  };
  const resetColors = () => {
    setDraft((current) => current ? {
      ...current,
      colorMode: 'automatic',
      primaryColor: DEFAULT_FORM_PRIMARY,
      secondaryColor: DEFAULT_FORM_SECONDARY,
      surfaceColor: DEFAULT_FORM_SURFACE,
      themeColors: DEFAULT_FORM_THEME_COLORS,
    } : current);
    setError('');
    onShowToast('Cores padrão restauradas. Salve para publicar.');
  };

  const uploadFormImage = async (file: File, index: number) => {
    try {
      setUploadingImage(index);
      setError('');
      const url = await uploadWebsiteFormImage(file, index);
      setDraft((current) => {
        if (!current) return current;
        const nextImages = [...current.sideImageUrls];
        nextImages[index] = url;
        return { ...current, sideImageUrls: nextImages.slice(0, 3) };
      });
      onShowToast(`Foto ${index + 1} enviada. Salve para publicar.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Não foi possível enviar a foto.');
    } finally {
      setUploadingImage(null);
    }
  };
  const removeFormImage = (index: number) => {
    setDraft((current) => {
      if (!current) return current;
      const nextImages = current.sideImageUrls.filter((_, imageIndex) => imageIndex !== index);
      return {
        ...current,
        sideImageUrls: nextImages,
        sideImageRotationEnabled: nextImages.length > 1 && current.sideImageRotationEnabled,
      };
    });
    setError('');
  };
  const setFormActive = (active: boolean) => {
    setDraft((current) => current ? {
      ...current,
      active,
      widgetEnabled: active ? current.widgetEnabled : false,
    } : current);
    setError('');
  };
  const addDomain = () => {
    if (!draft) return;
    try {
      const origin = normalizeWebsiteOrigin(domainInput);
      if (draft.allowedOrigins.includes(origin)) throw new Error('Este domínio já foi adicionado.');
      if (draft.allowedOrigins.length >= 10) throw new Error('Você pode autorizar até 10 domínios.');
      setField('allowedOrigins', [...draft.allowedOrigins, origin]);
      setDomainInput('');
    } catch (domainError) {
      setError(domainError instanceof Error ? domainError.message : 'Domínio inválido.');
    }
  };

  const validate = (settings: WebsiteFormSettings) => {
    if (!settings.active && settings.widgetEnabled) {
      throw new Error('Ative o formulário público antes de ativar a integração no site.');
    }
    if (settings.widgetEnabled && !settings.allowedOrigins.length) {
      throw new Error('Adicione ao menos um domínio antes de ativar a integração.');
    }
    if (!settings.serviceStates.length) throw new Error('Selecione ao menos um estado atendido.');
    if (settings.companyName.trim().length < 2) throw new Error('Informe o nome da empresa.');
    if (settings.headline.trim().length < 5) throw new Error('O título está muito curto.');
    if (settings.subheadline.trim().length < 5) throw new Error('O texto de apoio está muito curto.');
    if (settings.submitLabel.trim().length < 3) throw new Error('O texto do botão está muito curto.');
    if (settings.successMessage.trim().length < 5) throw new Error('A mensagem de sucesso está muito curta.');
    if (![settings.primaryColor, settings.secondaryColor, settings.surfaceColor].every(isHexColor)) {
      throw new Error('Revise as cores principais do formulário.');
    }
    if (!Object.values(settings.themeColors).every(isHexColor)) {
      throw new Error('Revise as cores detalhadas do formulário.');
    }
    validateHttpsUrl(settings.privacyUrl, 'A URL da política de privacidade');
    if (settings.sideImageUrls.length > 3) throw new Error('Use no máximo três fotos laterais.');
    settings.sideImageUrls.forEach((url, index) => validateHttpsUrl(url, `A foto ${index + 1}`));
    if (settings.sideImageRotationEnabled && settings.sideImageUrls.length < 2) {
      throw new Error('Adicione pelo menos duas fotos para ativar a alternância.');
    }
  };

  const save = async () => {
    if (!draft) return;
    try {
      validate(draft);
      setSaving(true);
      setError('');
      const updated = await saveWebsiteFormSettings(draft);
      setSaved(updated);
      setDraft(updated);
      onShowToast('Configurações do formulário salvas.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };
  const testConnection = async () => {
    if (!saved?.active || !saved.widgetEnabled || !saved.allowedOrigins.length) {
      setError('Salve e ative a integração antes de testar.');
      return;
    }
    setTesting(true);
    setError('');
    try {
      const widgetResponse = await fetch(`${PUBLIC_APP_URL}widget.js`, {
        method: 'GET', credentials: 'omit', cache: 'no-store',
      });
      if (!widgetResponse.ok) throw new Error('O script público do formulário não está disponível.');
      await Promise.all(saved.allowedOrigins.map(async (origin) => {
        const url = new URL(CAPTURE_ENDPOINT);
        url.searchParams.set('formToken', saved.publicToken);
        url.searchParams.set('siteOrigin', origin);
        const response = await fetch(url, { method: 'GET', credentials: 'omit', cache: 'no-store' });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(`${origin}: ${body.error || 'conexão recusada'}`);
        if (!['inline', 'modal'].includes(body.widgetMode) || !body.primaryColor || !body.themeColors) {
          throw new Error(`${origin}: a configuração pública está incompleta.`);
        }
      }));
      onShowToast(`Script e ${saved.allowedOrigins.length} domínio(s) validados com sucesso.`);
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : 'Falha ao testar a conexão.');
    } finally {
      setTesting(false);
    }
  };
  const rotateToken = async () => {
    if (!draft) return;
    const confirmed = window.confirm(
      'Gerar um novo identificador? O código já instalado deixará de funcionar e a integração será desativada até você instalar o novo código.'
    );
    if (!confirmed) return;
    setRotating(true);
    setError('');
    try {
      const updated = await rotateWebsiteFormToken(draft.id);
      setSaved(updated);
      setDraft(updated);
      onShowToast('Identificador renovado. Atualize o código no seu site.');
    } catch {
      setError('Não foi possível renovar o identificador.');
    } finally {
      setRotating(false);
    }
  };
  const copy = async (kind: 'code' | 'link' | 'token', value: string) => {
    try {
      await copyText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied((current) => (current === kind ? null : current)), 1800);
    } catch {
      setError('Não foi possível copiar automaticamente. Selecione o conteúdo manualmente.');
    }
  };

  const toggleSection = (section: CollapsibleSection) => {
    setCollapsedSections((current) => ({ ...current, [section]: !current[section] }));
  };
  const collapseButton = (section: CollapsibleSection, label: string) => {
    const collapsed = collapsedSections[section];
    return (
      <button
        type="button"
        onClick={() => toggleSection(section)}
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? 'Expandir' : 'Recolher'} ${label}`}
        className="btn-outline inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-bold"
        style={{ borderColor: theme.border }}
      >
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        <span className="hidden sm:inline">{collapsed ? 'Expandir' : 'Recolher'}</span>
      </button>
    );
  };

  if (loading) {
    return (
      <div id="integracoes-page" className="mx-auto flex min-h-72 max-w-6xl items-center justify-center gap-2 text-sm opacity-70">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando integração...
      </div>
    );
  }
  if (!draft) {
    return (
      <div id="integracoes-page" className="mx-auto max-w-2xl rounded-2xl border border-red-400/40 bg-red-500/10 p-6 text-sm text-red-100">
        <AlertTriangle className="mb-3 h-6 w-6" />
        <h2 className="font-bold">Não foi possível carregar o formulário</h2>
        <p className="mt-1 opacity-75">Tente novamente. Se o problema continuar, verifique a conexão com o banco.</p>
        <button type="button" onClick={() => window.location.reload()} className="btn-outline mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold">
          <RefreshCw className="h-4 w-4" /> Recarregar
        </button>
      </div>
    );
  }

  const resolvedTheme = resolveFormTheme(draft);
  const previewFieldStyle = {
    backgroundColor: resolvedTheme.inputBackground,
    borderColor: resolvedTheme.inputBorder,
    color: resolvedTheme.mutedText,
  };

  return (
    <div id="integracoes-page" className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold">
              <Globe2 className="h-5 w-5" style={{ color: theme.accent }} /> Formulário no site
            </div>
            <h2 className="mt-2 text-xl font-bold">Configure e publique em um só lugar</h2>
            <p className="mt-2 max-w-2xl text-sm opacity-70">
              Fotos, cores, textos e integração ficam sincronizados. Cada envio autorizado entra no funil como uma nova simulação.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <label className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: theme.border }}>
              <span><span className="block text-sm font-bold">Formulário público</span><span className="block text-[11px] opacity-60">Link e captação</span></span>
              <input type="checkbox" checked={draft.active} onChange={(event) => setFormActive(event.target.checked)} className="h-5 w-5" style={{ accentColor: theme.secondary }} />
            </label>
            <label className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: theme.border }}>
              <span><span className="block text-sm font-bold">Integração</span><span className="block text-[11px] opacity-60">No site do cliente</span></span>
              <input type="checkbox" checked={draft.widgetEnabled} disabled={!draft.active} onChange={(event) => setField('widgetEnabled', event.target.checked)} className="h-5 w-5" style={{ accentColor: theme.secondary }} />
            </label>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Code2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: theme.accent }} />
                <div><h3 className="font-bold">1. Integração</h3><p className="mt-1 text-xs leading-5 opacity-65">Autorize o domínio, escolha como exibir e copie o código.</p></div>
              </div>
              {collapseButton('integration', 'integração')}
            </div>
            {!collapsedSections.integration && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input value={domainInput} onChange={(event) => setDomainInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addDomain(); } }} className="crm-input flex-1" placeholder="https://www.minhaempresa.com.br" inputMode="url" />
                  <button type="button" onClick={addDomain} className="btn-outline inline-flex h-[42px] items-center justify-center gap-2 rounded-lg border px-4 text-xs font-bold" style={{ borderColor: theme.border }}><Plus className="h-4 w-4" /> Adicionar domínio</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {draft.allowedOrigins.length ? draft.allowedOrigins.map((origin) => (
                    <span key={origin} className="inline-flex max-w-full items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[11px]" style={{ borderColor: theme.border }}>
                      <span className="truncate">{origin}</span>
                      <button type="button" onClick={() => setField('allowedOrigins', draft.allowedOrigins.filter((item) => item !== origin))} className="text-red-300" aria-label={`Remover ${origin}`}><Trash2 className="h-3.5 w-3.5" /></button>
                    </span>
                  )) : <span className="text-xs opacity-55">Nenhum domínio autorizado.</span>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ['inline', 'Dentro da página', 'Ocupa um bloco da página.'],
                    ['modal', 'Botão flutuante', 'Abre sobre a página.'],
                  ] as const).map(([mode, label, description]) => (
                    <button key={mode} type="button" onClick={() => setField('widgetMode', mode)} className="rounded-xl border p-4 text-left" style={{ borderColor: draft.widgetMode === mode ? theme.secondary : theme.border, boxShadow: draft.widgetMode === mode ? `0 0 0 2px ${theme.secondary}25` : undefined }}>
                      <span className="flex items-center justify-between gap-2 text-sm font-bold">{label}{draft.widgetMode === mode && <Check className="h-4 w-4" style={{ color: theme.accent }} />}</span>
                      <span className="mt-1 block text-xs opacity-60">{description}</span>
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <pre className="max-h-48 min-w-0 overflow-y-auto whitespace-pre-wrap break-all rounded-xl border p-4 pr-12 font-mono text-[11px] leading-5" style={{ borderColor: theme.border, backgroundColor: `${theme.primary}22` }}><code>{installCode}</code></pre>
                  <button type="button" onClick={() => copy('code', installCode)} className="absolute right-2 top-2 rounded-lg border p-2" style={{ borderColor: theme.border }} aria-label="Copiar código de instalação">{copied === 'code' ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}</button>
                </div>
                <div className="flex items-start gap-3 rounded-xl border p-3" style={{ borderColor: theme.border }}>
                  <Type className="mt-0.5 h-4 w-4 shrink-0" style={{ color: theme.accent }} />
                  <div><p className="text-xs font-bold">Fonte automática do site</p><p className="mt-1 text-[11px] leading-5 opacity-65">O widget detecta a fonte da página onde o código foi instalado e aplica a mesma família no formulário, mantendo o conteúdo isolado para não alterar o site.</p></div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: theme.accent }} />
                <div><h3 className="font-bold">2. Área de atendimento</h3><p className="mt-1 text-xs leading-5 opacity-65">Mostra e aceita somente os estados selecionados.</p></div>
              </div>
              <div className="flex shrink-0 items-center gap-2"><span className="rounded-full border px-2.5 py-1 text-[11px] font-bold" style={{ borderColor: theme.border }}>{draft.serviceStates.length}/27</span>{collapseButton('states', 'área de atendimento')}</div>
            </div>
            {!collapsedSections.states && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setField('serviceStates', [...ALL_BRAZIL_STATE_CODES])} className="btn-outline rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: theme.border }}>Selecionar todos</button>
                  <button type="button" onClick={() => setField('serviceStates', [])} className="btn-outline rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: theme.border }}>Limpar</button>
                </div>
                <div className="mt-4 space-y-4">
                  {BRAZIL_STATE_GROUPS.map(({ region, states }) => (
                    <fieldset key={region}>
                      <legend className="mb-2 text-xs font-bold opacity-70">{region}</legend>
                      <div className="flex flex-wrap gap-2">
                        {states.map(([code, name]) => {
                          const checked = draft.serviceStates.includes(code);
                          return (
                            <label key={code} className="cursor-pointer rounded-lg border px-3 py-2 text-xs" style={{ borderColor: checked ? theme.secondary : theme.border, backgroundColor: checked ? `${theme.secondary}20` : undefined }} title={name}>
                              <input type="checkbox" checked={checked} onChange={() => setField('serviceStates', checked ? draft.serviceStates.filter((state) => state !== code) : [...draft.serviceStates, code])} className="mr-2" style={{ accentColor: theme.secondary }} />
                              <strong>{code}</strong> <span className="opacity-65">{name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <MonitorSmartphone className="mt-0.5 h-5 w-5 shrink-0" style={{ color: theme.accent }} />
                <div><h3 className="font-bold">3. Aparência e conteúdo</h3><p className="mt-1 text-xs leading-5 opacity-65">Personalize o formulário sem código.</p></div>
              </div>
              {collapseButton('appearance', 'aparência')}
            </div>
            {!collapsedSections.appearance && (
              <div className="mt-5 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold">Nome da empresa</span><input className="crm-input" value={draft.companyName} maxLength={100} onChange={(event) => setField('companyName', event.target.value)} /></label>
                  <fieldset className="sm:col-span-2">
                    <legend className="text-xs font-bold">Logotipo</legend>
                    <p className="mt-1 text-[11px] opacity-60">Use um logo já cadastrado no perfil.</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <button type="button" onClick={() => setField('logoUrl', '')} aria-pressed={!draft.logoUrl} className="flex min-h-24 items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold" style={{ borderColor: !draft.logoUrl ? theme.secondary : theme.border, boxShadow: !draft.logoUrl ? `0 0 0 2px ${theme.secondary}25` : undefined }}><Image className="h-4 w-4 opacity-60" /> Sem logo {!draft.logoUrl && <Check className="h-4 w-4" style={{ color: theme.accent }} />}</button>
                      {profileLogos.map((logo) => {
                        const selected = draft.logoUrl === logo.url;
                        return (
                          <button key={logo.id} type="button" onClick={() => setField('logoUrl', logo.url)} aria-pressed={selected} className="relative min-h-24 overflow-hidden rounded-xl border p-3 text-left" style={{ borderColor: selected ? theme.secondary : theme.border, backgroundColor: logo.background === 'dark' ? '#0E2337' : '#F4F7FA', boxShadow: selected ? `0 0 0 2px ${theme.secondary}25` : undefined }}>
                            <img src={logo.url} alt={logo.label} className="mx-auto h-12 max-w-full object-contain" />
                            <span className={`mt-2 block truncate text-[10px] font-bold ${logo.background === 'dark' ? 'text-white' : 'text-[#0E2337]'}`}>{logo.label}</span>
                            {selected && <Check className="absolute right-2 top-2 h-4 w-4 text-emerald-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <fieldset className="sm:col-span-2">
                    <legend className="text-xs font-bold">Fotos laterais no computador</legend>
                    <p className="mt-1 text-[11px] leading-5 opacity-60">Envie até três fotos. Elas ficam ocultas no celular.</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {draft.sideImageUrls.map((imageUrl, index) => (
                        <div key={imageUrl} className="overflow-hidden rounded-xl border" style={{ borderColor: theme.border }}>
                          <img src={imageUrl} alt={`Foto lateral ${index + 1}`} className="h-28 w-full object-cover" />
                          <div className="flex items-center justify-between gap-2 p-2">
                            <span className="text-[10px] font-bold">Foto {index + 1}</span>
                            <div className="flex gap-1">
                              <label className="theme-interactive cursor-pointer rounded-lg border px-2 py-1.5 text-[10px] font-bold" style={{ borderColor: theme.border }}>{uploadingImage === index ? 'Enviando...' : 'Trocar'}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingImage !== null} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void uploadFormImage(file, index); }} /></label>
                              <button type="button" onClick={() => removeFormImage(index)} disabled={uploadingImage !== null} aria-label={`Remover foto ${index + 1}`} className="theme-interactive rounded-lg border p-1.5 text-red-300" style={{ borderColor: theme.border }}><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {draft.sideImageUrls.length < 3 && (
                        <label className="theme-interactive flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-center" style={{ borderColor: theme.secondary }}>
                          {uploadingImage === draft.sideImageUrls.length ? <Loader2 className="h-6 w-6 animate-spin" /> : <Image className="h-6 w-6 opacity-65" />}
                          <span className="text-xs font-bold">{uploadingImage === draft.sideImageUrls.length ? 'Enviando foto...' : 'Adicionar foto'}</span>
                          <span className="text-[10px] opacity-55">{draft.sideImageUrls.length + 1} de 3</span>
                          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingImage !== null} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void uploadFormImage(file, draft.sideImageUrls.length); }} />
                        </label>
                      )}
                    </div>
                    {draft.sideImageUrls.length > 0 && (
                      <label className="mt-3 flex items-start gap-3 rounded-xl border p-3" style={{ borderColor: theme.border }}>
                        <input type="checkbox" checked={draft.sideImageRotationEnabled} disabled={draft.sideImageUrls.length < 2} onChange={(event) => setField('sideImageRotationEnabled', event.target.checked)} className="mt-0.5" style={{ accentColor: theme.secondary }} />
                        <span><span className="block text-xs font-bold">Alternar fotos com opacidade</span><span className="mt-1 block text-[10px] leading-4 opacity-60">{draft.sideImageUrls.length < 2 ? 'Adicione pelo menos duas fotos para ativar.' : 'Transição suave a cada 5 segundos.'}</span></span>
                      </label>
                    )}
                  </fieldset>

                  <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold">Título</span><input className="crm-input" value={draft.headline} maxLength={160} onChange={(event) => setField('headline', event.target.value)} /></label>
                  <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold">Texto de apoio</span><textarea className="min-h-20 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none" style={{ borderColor: theme.border }} value={draft.subheadline} maxLength={240} onChange={(event) => setField('subheadline', event.target.value)} /></label>
                  <label><span className="mb-1.5 block text-xs font-bold">Texto do botão</span><input className="crm-input" value={draft.submitLabel} maxLength={60} onChange={(event) => setField('submitLabel', event.target.value)} /></label>
                  <label><span className="mb-1.5 block text-xs font-bold">Política de privacidade</span><input className="crm-input" value={draft.privacyUrl} maxLength={500} inputMode="url" placeholder="https://..." onChange={(event) => setField('privacyUrl', event.target.value)} /></label>
                  <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold">Mensagem após o envio</span><textarea className="min-h-20 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none" style={{ borderColor: theme.border }} value={draft.successMessage} maxLength={240} onChange={(event) => setField('successMessage', event.target.value)} /></label>
                  <label className="sm:col-span-2 flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: theme.border }}><input type="checkbox" checked={draft.showPoweredBy} onChange={(event) => setField('showPoweredBy', event.target.checked)} style={{ accentColor: theme.secondary }} /><span className="text-xs font-semibold">Exibir “Tecnologia Sol Amigo PRO”</span></label>
                </div>

                <div className="border-t pt-6" style={{ borderColor: theme.border }}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div><h4 className="text-sm font-bold">Motor de cores</h4><p className="mt-1 text-[11px] leading-5 opacity-60">O modo automático cria um conjunto completo e legível. Use o detalhado somente para controlar cada área.</p></div>
                    <button type="button" onClick={resetColors} className="btn-outline inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: theme.border }}><RotateCcw className="h-4 w-4" /> Restaurar cores</button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border p-1.5" style={{ borderColor: theme.border }}>
                    {([['automatic', 'Automático'], ['detailed', 'Detalhado']] as const).map(([mode, label]) => (
                      <button key={mode} type="button" onClick={() => setColorMode(mode)} className="rounded-lg px-3 py-2.5 text-xs font-bold" style={{ backgroundColor: draft.colorMode === mode ? theme.secondary : 'transparent', color: draft.colorMode === mode ? '#FFFFFF' : undefined }} aria-pressed={draft.colorMode === mode}>{label}</button>
                    ))}
                  </div>
                  {draft.colorMode === 'automatic' ? (
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <ResponsiveColorField label="Cor de ação" value={draft.primaryColor} borderColor={theme.border} accentColor={theme.accent} onChange={(color) => setField('primaryColor', color)} />
                      <ResponsiveColorField label="Cor institucional" value={draft.secondaryColor} borderColor={theme.border} accentColor={theme.accent} onChange={(color) => setField('secondaryColor', color)} />
                      <ResponsiveColorField label="Fundo do formulário" value={draft.surfaceColor} borderColor={theme.border} accentColor={theme.accent} onChange={(color) => setField('surfaceColor', color)} />
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {FORM_THEME_COLOR_GROUPS.map((group, groupIndex) => (
                        <details key={group.label} open={groupIndex === 0} className="rounded-xl border p-4" style={{ borderColor: theme.border }}>
                          <summary className="cursor-pointer text-xs font-bold">{group.label}<span className="ml-2 font-normal opacity-55">{group.description}</span></summary>
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            {group.fields.map(([key, label]) => (
                              <ResponsiveColorField key={key} label={label} value={draft.themeColors[key]} borderColor={theme.border} accentColor={theme.accent} onChange={(color) => setThemeColor(key, color)} />
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-20 xl:self-start">
          <section className="rounded-2xl border p-4" style={{ borderColor: theme.border }}>
            <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[.12em] opacity-60">Prévia do formulário</p><span className="rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[.08em]" style={{ borderColor: theme.border }}>{draft.colorMode === 'automatic' ? 'Cores automáticas' : 'Cores detalhadas'}</span></div>
            {draft.widgetMode === 'modal' && (
              <div className="relative mt-4 min-h-32 overflow-hidden rounded-2xl border p-4" style={{ borderColor: theme.border, backgroundColor: resolvedTheme.pageBackground, color: resolvedTheme.bodyText }}>
                <p className="text-[10px] font-bold uppercase tracking-[.1em]" style={{ color: resolvedTheme.mutedText }}>Exemplo no site</p>
                <div className="mt-3 h-2 w-2/3 rounded" style={{ backgroundColor: resolvedTheme.progressInactive }} />
                <div className="mt-2 h-2 w-1/2 rounded" style={{ backgroundColor: resolvedTheme.progressInactive }} />
                <button type="button" className="absolute bottom-3 right-3 rounded-full px-4 py-2 text-[10px] font-extrabold shadow-lg" style={{ backgroundColor: resolvedTheme.primaryButtonBackground, color: resolvedTheme.primaryButtonText }}>{draft.submitLabel}</button>
              </div>
            )}
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[.1em] opacity-50">Primeira etapa</p>
            <div className="mt-4 rounded-2xl p-3" style={{ backgroundColor: resolvedTheme.pageBackground, color: resolvedTheme.bodyText }}>
              <div className="overflow-hidden rounded-2xl shadow-xl" style={{ backgroundColor: resolvedTheme.cardBackground }}>
                <div className="p-4" style={{ backgroundColor: resolvedTheme.headerBackground, color: resolvedTheme.headerText }}>
                  {draft.logoUrl ? <img src={draft.logoUrl} alt="Logotipo configurado" className="mb-3 h-8 max-w-[180px] object-contain object-left" /> : <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[.12em]">{draft.companyName}</p>}
                  <h3 className="text-lg font-extrabold leading-tight">{draft.headline}</h3>
                  <p className="mt-2 text-[11px] leading-4" style={{ color: resolvedTheme.headerMutedText }}>{draft.subheadline}</p>
                </div>
                <div className={draft.sideImageUrls.length ? 'grid grid-cols-[0.72fr_1.28fr]' : ''}>
                  {draft.sideImageUrls.length > 0 && (
                    <div className="relative min-h-56 overflow-hidden" style={{ backgroundColor: resolvedTheme.progressInactive }}>
                      {draft.sideImageUrls.map((imageUrl, index) => (
                        <img key={imageUrl} src={imageUrl} alt={index === previewImageIndex ? 'Prévia da foto lateral' : ''} className={`absolute inset-0 h-full min-h-56 w-full object-cover transition-opacity duration-1000 motion-reduce:transition-none ${index === previewImageIndex ? 'opacity-100' : 'opacity-0'}`} />
                      ))}
                    </div>
                  )}
                  <div className="grid min-w-0 gap-2 p-4 sm:grid-cols-2 xl:grid-cols-2">
                    <div className="rounded-lg border px-3 py-2.5 text-xs sm:col-span-2" style={previewFieldStyle}>Nome completo</div>
                    <div className="rounded-lg border px-3 py-2.5 text-xs" style={previewFieldStyle}>WhatsApp</div>
                    <div className="rounded-lg border px-3 py-2.5 text-xs" style={previewFieldStyle}>Estado</div>
                    <button type="button" className="h-10 w-full rounded-lg text-xs font-extrabold sm:col-span-2" style={{ backgroundColor: resolvedTheme.primaryButtonBackground, color: resolvedTheme.primaryButtonText }}>{draft.submitLabel}</button>
                    {draft.showPoweredBy && <p className="text-center text-[9px] sm:col-span-2" style={{ color: resolvedTheme.mutedText }}>Tecnologia Sol Amigo PRO</p>}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-xl border p-3 text-[11px] leading-5" style={{ borderColor: theme.border }}><strong>Após o envio:</strong> <span className="opacity-70">{draft.successMessage}</span></div>
          </section>

          <section className="rounded-2xl border p-5" style={{ borderColor: theme.border }}>
            <div className="flex items-center justify-between gap-3"><h3 className="font-bold">Link direto</h3><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${draft.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{draft.active ? 'Ativo' : 'Desativado'}</span></div>
            <p className="mt-1 text-xs opacity-60">Para bio, anúncio ou WhatsApp.</p>
            <div className="mt-3 flex gap-2"><input readOnly value={publicLink} className="crm-input min-w-0 flex-1 font-mono text-[10px]" /><button type="button" onClick={() => copy('link', publicLink)} className="rounded-lg border px-3" style={{ borderColor: theme.border }}>{copied === 'link' ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}</button><a href={publicLink} target="_blank" rel="noreferrer" className="flex items-center rounded-lg border px-3" style={{ borderColor: theme.border }}><ExternalLink className="h-4 w-4" /></a></div>
          </section>

          <section className="rounded-2xl border p-5" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-2"><KeyRound className="h-4 w-4" style={{ color: theme.accent }} /><h3 className="font-bold">Identificador público</h3></div>
            <p className="mt-2 text-xs leading-5 opacity-60">Identifica o destino dos leads, sem conceder acesso ao CRM.</p>
            <div className="mt-3 flex gap-2"><input readOnly value={draft.publicToken} className="crm-input min-w-0 flex-1 font-mono text-[10px]" /><button type="button" onClick={() => copy('token', draft.publicToken)} className="rounded-lg border px-3" style={{ borderColor: theme.border }}>{copied === 'token' ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}</button></div>
            <button type="button" disabled={rotating} onClick={rotateToken} className="btn-outline mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: theme.border }}><RefreshCw className={`h-4 w-4 ${rotating ? 'animate-spin' : ''}`} /> Renovar identificador</button>
          </section>

          <section className="rounded-2xl border p-5" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" style={{ color: theme.accent }} /><h3 className="font-bold">Proteções ativas</h3></div>
            <ul className="mt-3 space-y-2 text-xs opacity-70"><li>• isolamento por conta e políticas RLS</li><li>• domínio autorizado e integração desligada por padrão</li><li>• limite por IP anonimizado e limite global</li><li>• campo-isca, validação no servidor e deduplicação</li><li>• nenhuma chave administrativa no navegador</li></ul>
          </section>
        </aside>
      </div>

      <div className="sticky bottom-4 flex flex-col gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur md:flex-row md:items-center md:justify-between" style={{ borderColor: theme.border, backgroundColor: `${theme.background}F2` }}>
        <div><p className="text-sm font-bold">{changed ? 'Existem alterações não salvas' : 'Configuração salva'}</p><p className="mt-0.5 text-xs opacity-60">A prévia usa exatamente o mesmo motor de cores do formulário público.</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={testing || changed || !saved?.active || !saved.widgetEnabled || !saved.allowedOrigins.length} onClick={testConnection} className="btn-outline inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-bold" style={{ borderColor: theme.border }}>{testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />} Testar conexão</button>
          <button type="button" disabled={saving || !changed} onClick={save} className="btn-filled inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold" style={{ backgroundColor: theme.secondary, color: '#fff' }}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar configurações</button>
        </div>
      </div>
    </div>
  );
};
