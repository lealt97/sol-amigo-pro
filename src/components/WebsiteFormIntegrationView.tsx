import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Braces,
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Code2,
  ExternalLink,
  Globe2,
  KeyRound,
  LayoutTemplate,
  Loader2,
  MapPin,
  MonitorSmartphone,
  Image,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { ThemeConfig, WebsiteFormSettings } from '../types';
import {
  fetchWebsiteFormSettings,
  fetchProfileBrandLogos,
  normalizeWebsiteOrigin,
  rotateWebsiteFormToken,
  saveWebsiteFormSettings,
} from '../services/websiteFormIntegration';
import type { ProfileBrandLogo } from '../services/websiteFormIntegration';
import { ALL_BRAZIL_STATE_CODES, BRAZIL_STATE_GROUPS } from '../data/brazilStates';
import { FORM_TEMPLATES } from '../data/formTemplates';
import type { FormTemplate } from '../data/formTemplates';
import { CUSTOM_FORM_CSS_EXAMPLE, CUSTOM_FORM_CSS_LIMIT, validateCustomFormCss } from '../utils/customFormCss';
import { ResponsiveColorField } from './ResponsiveColorField';

interface WebsiteFormIntegrationViewProps {
  theme: ThemeConfig;
  onShowToast: (message: string) => void;
}

type CollapsibleSection = 'domains' | 'states' | 'display' | 'templates' | 'branding' | 'css';

const PUBLIC_APP_URL = (
  import.meta.env.VITE_PUBLIC_APP_URL || 'https://lealt97.github.io/sol-amigo-pro/'
).replace(/\/?$/, '/');
const CAPTURE_ENDPOINT = 'https://tmdhmthlnfotfezxgxlt.supabase.co/functions/v1/capture-lead';

const CSS_EDITOR_PAIRS: Record<string, string> = {
  '{': '}',
  '[': ']',
  '(': ')',
  '"': '"',
  "'": "'",
};

const CSS_EDITOR_CLOSING_CHARACTERS = new Set(Object.values(CSS_EDITOR_PAIRS));

const CUSTOM_FORM_CLASS_DESCRIPTIONS = [
  ['.sol-form', 'Formulário inteiro e sua largura geral.'],
  ['.sol-form__card', 'Caixa principal que envolve todo o formulário.'],
  ['.sol-form__header', 'Cabeçalho interno com logo, título e subtítulo.'],
  ['.sol-form__title', 'Título principal do formulário.'],
  ['.sol-form__subtitle', 'Texto de apoio abaixo do título.'],
  ['.sol-form__field', 'Bloco que agrupa uma etiqueta e seu campo.'],
  ['.sol-form__label', 'Nome ou etiqueta exibida acima de um campo.'],
  ['.sol-form__input', 'Campos de texto, telefone, e-mail e cidade.'],
  ['.sol-form__select', 'Campos de seleção, como estado e tipo de imóvel.'],
  ['.sol-form__button', 'Botão principal de avançar ou enviar.'],
  ['.sol-form__secondary-button', 'Botão secundário, como voltar.'],
  ['.sol-form__progress', 'Indicador de progresso entre as etapas.'],
  ['.sol-form__consent', 'Texto e caixa de autorização de contato.'],
  ['.sol-form__success', 'Mensagem exibida após o envio bem-sucedido.'],
  ['.sol-form__powered-by', 'Crédito “Criado com Sol Amigo PRO”.'],
] as const;

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
  const [domainInput, setDomainInput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'code' | 'link' | 'token' | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<CollapsibleSection, boolean>>({
    domains: false,
    states: false,
    display: false,
    templates: false,
    branding: false,
    css: false,
  });

  const toggleSection = (section: CollapsibleSection) => {
    setCollapsedSections((current) => ({ ...current, [section]: !current[section] }));
  };

  const setAllSectionsCollapsed = (collapsed: boolean) => {
    setCollapsedSections({ domains: collapsed, states: collapsed, display: collapsed, templates: collapsed, branding: collapsed, css: collapsed });
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

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchWebsiteFormSettings(),
      fetchProfileBrandLogos().catch((logoError) => {
        console.warn('Não foi possível carregar os logos do perfil:', logoError);
        return [];
      }),
    ])
      .then(([settings, logos]) => {
        if (!mounted) return;
        setSaved(settings);
        setDraft(settings);
        setProfileLogos(logos);
      })
      .catch(() => mounted && setError('Não foi possível carregar a integração.'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const changed = useMemo(
    () => Boolean(saved && draft && JSON.stringify(saved) !== JSON.stringify(draft)),
    [saved, draft]
  );

  const publicLink = draft
    ? `${PUBLIC_APP_URL}?captacao=${encodeURIComponent(draft.publicToken)}`
    : '';

  const installCode = useMemo(() => {
    if (!draft) return '';
    const widgetScript = `${PUBLIC_APP_URL}widget.js`;
    return `<div id="sol-amigo-formulario"></div>\n<script async src="${widgetScript}" data-sol-amigo-token="${draft.publicToken}" data-target="#sol-amigo-formulario"></script>`;
  }, [draft]);

  const setField = <K extends keyof WebsiteFormSettings>(
    key: K,
    value: WebsiteFormSettings[K]
  ) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setError('');
  };

  const replaceCssEditorSelection = (
    editor: HTMLTextAreaElement,
    replacement: string,
    selectionStart: number,
    selectionEnd = selectionStart,
  ) => {
    const nextCss = `${editor.value.slice(0, editor.selectionStart)}${replacement}${editor.value.slice(editor.selectionEnd)}`;
    if (nextCss.length > CUSTOM_FORM_CSS_LIMIT) return;
    setField('customCss', nextCss);
    window.requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const insertCssEditorPair = (editor: HTMLTextAreaElement, opening: string) => {
    const closing = CSS_EDITOR_PAIRS[opening];
    if (!closing) return false;
    const { selectionStart, selectionEnd, value } = editor;
    const selectedText = value.slice(selectionStart, selectionEnd);
    replaceCssEditorSelection(
      editor,
      `${opening}${selectedText}${closing}`,
      selectionStart + 1,
      selectionEnd + 1,
    );
    return true;
  };

  const handleCssEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const editor = event.currentTarget;
    const { selectionStart, selectionEnd, value } = editor;

    if (event.key === 'Tab') {
      event.preventDefault();
      replaceCssEditorSelection(editor, '  ', selectionStart + 2);
      return;
    }

    if (
      CSS_EDITOR_CLOSING_CHARACTERS.has(event.key)
      && selectionStart === selectionEnd
      && value[selectionStart] === event.key
    ) {
      event.preventDefault();
      editor.setSelectionRange(selectionStart + 1, selectionStart + 1);
      return;
    }

    if (CSS_EDITOR_PAIRS[event.key]) {
      event.preventDefault();
      insertCssEditorPair(editor, event.key);
      return;
    }

    if (
      event.key === 'Backspace'
      && selectionStart === selectionEnd
      && selectionStart > 0
      && CSS_EDITOR_PAIRS[value[selectionStart - 1]] === value[selectionStart]
    ) {
      event.preventDefault();
      const nextCss = `${value.slice(0, selectionStart - 1)}${value.slice(selectionStart + 1)}`;
      setField('customCss', nextCss);
      window.requestAnimationFrame(() => {
        editor.focus();
        editor.setSelectionRange(selectionStart - 1, selectionStart - 1);
      });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentIndent = value.slice(lineStart, selectionStart).match(/^\s*/)?.[0] ?? '';
      const isInsideBraces = value[selectionStart - 1] === '{' && value[selectionStart] === '}';
      const replacement = isInsideBraces
        ? `\n${currentIndent}  \n${currentIndent}`
        : `\n${currentIndent}`;
      const cursorPosition = selectionStart + 1 + currentIndent.length + (isInsideBraces ? 2 : 0);
      replaceCssEditorSelection(editor, replacement, cursorPosition);
    }
  };

  const handleCssEditorBeforeInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const nativeEvent = event.nativeEvent as InputEvent;
    const insertedText = nativeEvent.data;
    if (nativeEvent.inputType !== 'insertText' || !insertedText || insertedText.length !== 1) return;

    const editor = event.currentTarget;
    if (
      CSS_EDITOR_CLOSING_CHARACTERS.has(insertedText)
      && editor.selectionStart === editor.selectionEnd
      && editor.value[editor.selectionStart] === insertedText
    ) {
      event.preventDefault();
      const nextPosition = editor.selectionStart + 1;
      editor.setSelectionRange(nextPosition, nextPosition);
      return;
    }

    if (CSS_EDITOR_PAIRS[insertedText]) {
      event.preventDefault();
      insertCssEditorPair(editor, insertedText);
    }
  };

  const setFormActive = (active: boolean) => {
    setDraft((current) => current ? {
      ...current,
      active,
      widgetEnabled: active ? current.widgetEnabled : false,
    } : current);
    setError('');
  };

  const applyFormTemplate = (template: FormTemplate) => {
    setDraft((current) => current ? {
      ...current,
      primaryColor: template.primaryColor,
      secondaryColor: template.secondaryColor,
      headline: template.headline,
      subheadline: template.subheadline,
      submitLabel: template.submitLabel,
      successMessage: template.successMessage,
      customCssEnabled: true,
      customCss: template.customCss,
    } : current);
    setCollapsedSections((current) => ({ ...current, branding: false, css: false }));
    setError('');
    onShowToast(`Modelo “${template.name}” aplicado. Salve para publicar.`);
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
    if (!settings.serviceStates.length) {
      throw new Error('Selecione ao menos um estado atendido.');
    }
    if (settings.companyName.trim().length < 2) throw new Error('Informe o nome da empresa.');
    if (settings.headline.trim().length < 5) throw new Error('O título está muito curto.');
    if (settings.subheadline.trim().length < 5) throw new Error('O texto de apoio está muito curto.');
    if (settings.submitLabel.trim().length < 3) throw new Error('O texto do botão está muito curto.');
    if (settings.successMessage.trim().length < 5) throw new Error('A mensagem de sucesso está muito curta.');
    if (!/^#[0-9A-Fa-f]{6}$/.test(settings.primaryColor)) throw new Error('A cor principal é inválida.');
    if (!/^#[0-9A-Fa-f]{6}$/.test(settings.secondaryColor)) throw new Error('A cor secundária é inválida.');
    validateHttpsUrl(settings.privacyUrl, 'A URL da política de privacidade');
    const cssErrors = validateCustomFormCss(settings.customCss);
    if (cssErrors.length) throw new Error(cssErrors[0]);
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
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
      });
      if (!widgetResponse.ok) throw new Error('O script público do formulário não está disponível.');

      await Promise.all(saved.allowedOrigins.map(async (origin) => {
        const url = new URL(CAPTURE_ENDPOINT);
        url.searchParams.set('formToken', saved.publicToken);
        url.searchParams.set('siteOrigin', origin);
        const response = await fetch(url, { method: 'GET', credentials: 'omit', cache: 'no-store' });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(`${origin}: ${body.error || 'conexão recusada'}`);
        if (!['inline', 'modal'].includes(body.widgetMode) || !body.primaryColor || !body.submitLabel) {
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
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h2 className="font-bold">Não foi possível carregar o formulário</h2>
            <p className="mt-1 opacity-75">Tente novamente. Se o problema continuar, as configurações da integração precisam ser verificadas.</p>
            <button type="button" onClick={() => window.location.reload()} className="btn-outline mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200/30 px-3 py-2 text-xs font-bold">
              <RefreshCw className="h-4 w-4" /> Recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cssErrors = validateCustomFormCss(draft.customCss);
  const previewCss = draft.customCssEnabled && !cssErrors.length ? draft.customCss : '';
  const previewThemeStyle = {
    '--sol-form-primary': draft.primaryColor,
    '--sol-form-secondary': draft.secondaryColor,
  } as React.CSSProperties;
  const activeFormTemplateId = FORM_TEMPLATES.find((template) => (
    template.primaryColor === draft.primaryColor
    && template.secondaryColor === draft.secondaryColor
    && template.headline === draft.headline
    && template.subheadline === draft.subheadline
    && template.submitLabel === draft.submitLabel
    && template.successMessage === draft.successMessage
    && template.customCss === draft.customCss
  ))?.id;

  return (
    <div id="integracoes-page" className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold">
              <Globe2 className="h-5 w-5" style={{ color: theme.accent }} />
              Formulário no site
            </div>
            <h2 className="mt-2 text-xl font-bold">Conecte seu site ao Sol Amigo PRO</h2>
            <p className="mt-2 max-w-2xl text-sm opacity-70">
              Instale o formulário com um pequeno código. Cada envio autorizado entra automaticamente no funil como novo lead.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAllSectionsCollapsed(!Object.values(collapsedSections).every(Boolean))}
            className="btn-outline inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold"
            style={{ borderColor: theme.border }}
          >
            {Object.values(collapsedSections).every(Boolean) ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            {Object.values(collapsedSections).every(Boolean) ? 'Expandir seções' : 'Recolher seções'}
          </button>
          <label className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: theme.border }}>
            <span>
              <span className="block text-sm font-bold">Formulário público</span>
              <span className="block text-[11px] opacity-60">Link e captação</span>
            </span>
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(event) => setFormActive(event.target.checked)}
              className="h-5 w-5"
              style={{ accentColor: theme.secondary }}
            />
          </label>
          <label className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: theme.border }}>
            <span>
              <span className="block text-sm font-bold">Integração no site</span>
              <span className="block text-[11px] opacity-60">Somente domínios autorizados</span>
            </span>
            <input
              type="checkbox"
              checked={draft.widgetEnabled}
              disabled={!draft.active}
              onChange={(event) => setField('widgetEnabled', event.target.checked)}
              className="h-5 w-5"
              style={{ accentColor: theme.secondary }}
            />
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
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: theme.accent }} />
                <div>
                <h3 className="font-bold">1. Autorize os domínios</h3>
                <p className="mt-1 text-xs leading-5 opacity-65">
                  Somente páginas nestes domínios poderão enviar dados. Use a origem completa, sem caminhos.
                </p>
                </div>
              </div>
              {collapseButton('domains', 'domínios autorizados')}
            </div>

            {!collapsedSections.domains && <>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={domainInput}
                onChange={(event) => setDomainInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addDomain();
                  }
                }}
                className="crm-input flex-1"
                placeholder="https://www.minhaempresa.com.br"
                inputMode="url"
              />
              <button type="button" onClick={addDomain} className="btn-outline inline-flex h-[42px] items-center justify-center gap-2 rounded-lg border px-4 text-xs font-bold" style={{ borderColor: theme.border }}>
                <Plus className="h-4 w-4" /> Adicionar
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {draft.allowedOrigins.length ? draft.allowedOrigins.map((origin) => (
                <div key={origin} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2" style={{ borderColor: theme.border }}>
                  <span className="truncate font-mono text-xs">{origin}</span>
                  <button
                    type="button"
                    onClick={() => setField('allowedOrigins', draft.allowedOrigins.filter((item) => item !== origin))}
                    className="rounded-md p-1.5 text-red-300"
                    aria-label={`Remover ${origin}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )) : (
                <div className="rounded-lg border border-dashed p-4 text-center text-xs opacity-55" style={{ borderColor: theme.border }}>
                  Nenhum domínio autorizado. O widget permanece bloqueado.
                </div>
              )}
            </div>
            </>}
          </section>

          <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: theme.accent }} />
                <div>
                  <h3 className="font-bold">2. Defina a área de atendimento</h3>
                  <p className="mt-1 text-xs leading-5 opacity-65">
                    O formulário mostrará somente os estados selecionados. Envios fora dessa área também serão bloqueados no servidor.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full border px-2.5 py-1 text-[11px] font-bold" style={{ borderColor: theme.border }}>
                  {draft.serviceStates.length}/27
                </span>
                {collapseButton('states', 'área de atendimento')}
              </div>
            </div>

            {!collapsedSections.states && <>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setField('serviceStates', [...ALL_BRAZIL_STATE_CODES])} className="btn-outline rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: theme.border }}>Selecionar todos</button>
              <button type="button" onClick={() => setField('serviceStates', [])} className="btn-outline rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: theme.border }}>Limpar seleção</button>
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
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setField('serviceStates', checked
                              ? draft.serviceStates.filter((state) => state !== code)
                              : [...draft.serviceStates, code])}
                            className="mr-2"
                            style={{ accentColor: theme.secondary }}
                          />
                          <strong>{code}</strong> <span className="opacity-65">{name}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
            </>}
          </section>

          <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <LayoutTemplate className="mt-0.5 h-5 w-5 shrink-0" style={{ color: theme.accent }} />
                <div>
                  <h3 className="font-bold">3. Escolha um modelo pronto</h3>
                  <p className="mt-1 text-xs leading-5 opacity-65">
                    Aplique um visual completo em um clique. Logo, empresa, domínios e estados atendidos serão preservados.
                  </p>
                </div>
              </div>
              {collapseButton('templates', 'modelos prontos')}
            </div>

            {!collapsedSections.templates && (
              <div className="mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {FORM_TEMPLATES.map((template) => {
                    const selected = activeFormTemplateId === template.id;
                    const preview = template.preview;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => applyFormTemplate(template)}
                        aria-pressed={selected}
                        className="group overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-lg"
                        style={{
                          borderColor: selected ? theme.secondary : theme.border,
                          boxShadow: selected ? `0 0 0 2px ${theme.secondary}30` : undefined,
                        }}
                      >
                        <span className="block p-3" style={{ backgroundColor: preview.canvas }}>
                          <span
                            className="mx-auto block max-w-[260px] overflow-hidden border shadow-md"
                            style={{
                              backgroundColor: preview.card,
                              borderColor: preview.inputBorder,
                              borderRadius: preview.radius,
                            }}
                          >
                            <span className="block p-3" style={{ backgroundColor: preview.header, color: preview.headerText }}>
                              <span className="block text-[7px] font-extrabold uppercase tracking-[.12em] opacity-80">Sua empresa solar</span>
                              <span className="mt-2 block text-[12px] font-extrabold leading-tight">{template.headline}</span>
                              <span className="mt-1 block h-1.5 w-3/4 rounded-full opacity-70" style={{ backgroundColor: preview.mutedText }} />
                            </span>
                            <span className="grid gap-1.5 p-3">
                              <span className="h-6 rounded border" style={{ backgroundColor: preview.input, borderColor: preview.inputBorder }} />
                              <span className="h-6 rounded border" style={{ backgroundColor: preview.input, borderColor: preview.inputBorder }} />
                              <span
                                className="mt-1 flex h-7 items-center justify-center px-2 text-[7px] font-extrabold uppercase tracking-[.05em]"
                                style={{
                                  backgroundColor: preview.button,
                                  color: preview.buttonText,
                                  borderRadius: Math.max(5, preview.radius - 5),
                                }}
                              >
                                {template.submitLabel}
                              </span>
                            </span>
                          </span>
                        </span>
                        <span className="block p-4">
                          <span className="flex items-start justify-between gap-3">
                            <span>
                              <span className="block text-sm font-extrabold">{template.name}</span>
                              <span className="mt-1 block text-[11px] leading-5 opacity-60">{template.description}</span>
                            </span>
                            {selected && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9px] font-extrabold uppercase" style={{ backgroundColor: `${theme.secondary}22`, color: theme.accent }}>
                                <Check className="h-3 w-3" /> Aplicado
                              </span>
                            )}
                          </span>
                          <span className="mt-3 flex items-center gap-1.5 text-[10px] font-bold opacity-65">
                            <span className="h-3 w-3 rounded-full border border-white/30" style={{ backgroundColor: template.primaryColor }} />
                            <span className="h-3 w-3 rounded-full border border-white/30" style={{ backgroundColor: template.secondaryColor }} />
                            <span className="ml-1">{selected ? 'Modelo selecionado' : 'Aplicar este modelo'}</span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-4 rounded-xl border border-dashed p-3 text-[11px] leading-5 opacity-65" style={{ borderColor: theme.border }}>
                  O modelo não é salvo automaticamente. Você pode ajustar cores, textos e CSS depois de aplicá-lo e conferir tudo na prévia.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Code2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: theme.secondary }} />
                <div>
                <h3 className="font-bold">4. Escolha como exibir</h3>
                <p className="mt-1 text-xs leading-5 opacity-65">Funciona em WordPress, Wix e páginas HTML que aceitam código personalizado.</p>
                </div>
              </div>
              {collapseButton('display', 'modo de exibição')}
            </div>

            {!collapsedSections.display && <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {([
                ['inline', 'Dentro da página', 'O formulário ocupa um bloco da sua página.'],
                ['modal', 'Botão flutuante', 'Um botão abre o formulário sobre a página.'],
              ] as const).map(([mode, label, description]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setField('widgetMode', mode)}
                  className="rounded-xl border p-4 text-left"
                  style={{
                    borderColor: draft.widgetMode === mode ? theme.secondary : theme.border,
                    boxShadow: draft.widgetMode === mode ? `0 0 0 2px ${theme.secondary}25` : undefined,
                  }}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-bold">
                    {label}{draft.widgetMode === mode && <Check className="h-4 w-4" style={{ color: theme.accent }} />}
                  </span>
                  <span className="mt-1 block text-xs opacity-60">{description}</span>
                </button>
              ))}
            </div>

            <div className="relative mt-4">
              <pre className="max-h-48 min-w-0 overflow-y-auto whitespace-pre-wrap break-all rounded-xl border p-4 pr-12 font-mono text-[11px] leading-5" style={{ borderColor: theme.border, backgroundColor: `${theme.primary}22` }}>
                <code>{installCode}</code>
              </pre>
              <button type="button" onClick={() => copy('code', installCode)} className="absolute right-2 top-2 rounded-lg border p-2" style={{ borderColor: theme.border }} aria-label="Copiar código de instalação">
                {copied === 'code' ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-3 text-[11px] leading-5 opacity-65">Modo, cores e texto do botão são sincronizados automaticamente. Não é necessário reinstalar o código depois de salvar essas alterações.</p>
            </>}
          </section>

          <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <MonitorSmartphone className="mt-0.5 h-5 w-5 shrink-0" style={{ color: theme.accent }} />
                <div><h3 className="font-bold">5. Personalize sua marca</h3><p className="mt-1 text-xs opacity-65">Estas cores são próprias do formulário e não alteram o tema do CRM.</p></div>
              </div>
              {collapseButton('branding', 'personalização da marca')}
            </div>

            {!collapsedSections.branding &&
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold">Nome da empresa</span><input className="crm-input" value={draft.companyName} maxLength={100} onChange={(event) => setField('companyName', event.target.value)} /></label>
              <fieldset className="sm:col-span-2">
                <legend className="text-xs font-bold">Logotipo do formulário</legend>
                <p className="mt-1 text-[11px] leading-5 opacity-60">Escolha uma das imagens enviadas em Configurações → Perfil.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setField('logoUrl', '')}
                    aria-pressed={!draft.logoUrl}
                    className="flex min-h-24 items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold"
                    style={{ borderColor: !draft.logoUrl ? theme.secondary : theme.border, boxShadow: !draft.logoUrl ? `0 0 0 2px ${theme.secondary}25` : undefined }}
                  >
                    <Image className="h-4 w-4 opacity-60" /> Sem logo
                    {!draft.logoUrl && <Check className="h-4 w-4" style={{ color: theme.accent }} />}
                  </button>
                  {profileLogos.map((logo) => {
                    const selected = draft.logoUrl === logo.url;
                    return (
                      <button
                        key={logo.id}
                        type="button"
                        onClick={() => setField('logoUrl', logo.url)}
                        aria-pressed={selected}
                        className="relative min-h-24 overflow-hidden rounded-xl border p-3 text-left"
                        style={{
                          borderColor: selected ? theme.secondary : theme.border,
                          backgroundColor: logo.background === 'dark' ? '#0E2337' : '#F4F7FA',
                          boxShadow: selected ? `0 0 0 2px ${theme.secondary}25` : undefined,
                        }}
                      >
                        <img src={logo.url} alt={logo.label} className="mx-auto h-12 max-w-full object-contain" />
                        <span className={`mt-2 block truncate text-[10px] font-bold ${logo.background === 'dark' ? 'text-white' : 'text-[#0E2337]'}`}>{logo.label}</span>
                        {selected && <span className="absolute right-2 top-2 rounded-full bg-white p-1"><Check className="h-3.5 w-3.5" style={{ color: theme.secondary }} /></span>}
                      </button>
                    );
                  })}
                </div>
                {!profileLogos.length && (
                  <p className="mt-3 rounded-lg border border-dashed p-3 text-xs opacity-65" style={{ borderColor: theme.border }}>
                    Nenhum logo cadastrado. Envie suas imagens em Configurações → Perfil e volte a esta seção.
                  </p>
                )}
                {draft.logoUrl && !profileLogos.some((logo) => logo.url === draft.logoUrl) && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-xs">
                    <span>O formulário ainda usa uma imagem antiga. Escolha um logo do perfil ou “Sem logo”.</span>
                    <img src={draft.logoUrl} alt="Logo atual antigo" className="h-8 max-w-24 object-contain" />
                  </div>
                )}
              </fieldset>
              <ResponsiveColorField label="Cor principal" value={draft.primaryColor} borderColor={theme.border} accentColor={theme.accent} onChange={(color) => setField('primaryColor', color)} />
              <ResponsiveColorField label="Cor secundária" value={draft.secondaryColor} borderColor={theme.border} accentColor={theme.accent} onChange={(color) => setField('secondaryColor', color)} />
              <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold">Título</span><input className="crm-input" value={draft.headline} maxLength={160} onChange={(event) => setField('headline', event.target.value)} /></label>
              <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold">Texto de apoio</span><textarea className="min-h-20 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none" style={{ borderColor: theme.border }} value={draft.subheadline} maxLength={240} onChange={(event) => setField('subheadline', event.target.value)} /></label>
              <label><span className="mb-1.5 block text-xs font-bold">Texto do botão</span><input className="crm-input" value={draft.submitLabel} maxLength={60} onChange={(event) => setField('submitLabel', event.target.value)} /></label>
              <label><span className="mb-1.5 block text-xs font-bold">Política de privacidade</span><input className="crm-input" value={draft.privacyUrl} maxLength={500} inputMode="url" placeholder="https://..." onChange={(event) => setField('privacyUrl', event.target.value)} /></label>
              <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold">Mensagem após o envio</span><textarea className="min-h-20 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none" style={{ borderColor: theme.border }} value={draft.successMessage} maxLength={240} onChange={(event) => setField('successMessage', event.target.value)} /></label>
              <label className="sm:col-span-2 flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: theme.border }}><input type="checkbox" checked={draft.showPoweredBy} onChange={(event) => setField('showPoweredBy', event.target.checked)} style={{ accentColor: theme.secondary }} /><span className="text-xs font-semibold">Exibir “Tecnologia Sol Amigo PRO”</span></label>
            </div>
            }
          </section>

          <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: theme.border }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Braces className="mt-0.5 h-5 w-5 shrink-0" style={{ color: theme.secondary }} />
                <div>
                  <h3 className="font-bold">6. CSS avançado</h3>
                  <p className="mt-1 text-xs leading-5 opacity-65">Personalização visual restrita às classes públicas e propriedades seguras do formulário.</p>
                </div>
              </div>
              {collapseButton('css', 'CSS avançado')}
            </div>

            {!collapsedSections.css && (
              <div className="mt-4 space-y-4">
                <label className="flex items-center justify-between gap-4 rounded-xl border p-3" style={{ borderColor: theme.border }}>
                  <span><span className="block text-xs font-bold">Ativar CSS personalizado</span><span className="mt-0.5 block text-[11px] opacity-60">O CSS só será aplicado se passar pela validação.</span></span>
                  <input type="checkbox" checked={draft.customCssEnabled} onChange={(event) => setField('customCssEnabled', event.target.checked)} className="h-5 w-5" style={{ accentColor: theme.secondary }} />
                </label>

                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="block text-xs font-bold">Editor CSS</span>
                      <span className="mt-0.5 block text-[10px] opacity-55">Fechamento automático, indentação com Tab e recuo inteligente com Enter.</span>
                    </span>
                    <span className="text-[11px] opacity-60">{draft.customCss.length.toLocaleString('pt-BR')}/{CUSTOM_FORM_CSS_LIMIT.toLocaleString('pt-BR')}</span>
                  </div>
                  <textarea
                    value={draft.customCss}
                    onChange={(event) => setField('customCss', event.target.value)}
                    onKeyDown={handleCssEditorKeyDown}
                    onBeforeInput={handleCssEditorBeforeInput}
                    maxLength={CUSTOM_FORM_CSS_LIMIT}
                    spellCheck={false}
                    className="min-h-72 w-full rounded-xl border bg-[#091A29] p-4 font-mono text-xs leading-5 text-slate-100 outline-none"
                    style={{ borderColor: cssErrors.length ? '#F87171' : theme.border }}
                    placeholder={CUSTOM_FORM_CSS_EXAMPLE}
                    aria-label="CSS personalizado do formulário"
                  />
                </div>

                {cssErrors.length ? (
                  <div role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-200">
                    <p className="font-bold">Revise o CSS antes de salvar:</p>
                    <ul className="mt-2 space-y-1">{cssErrors.map((item) => <li key={item}>• {item}</li>)}</ul>
                  </div>
                ) : draft.customCss.trim() ? (
                  <p className="flex items-center gap-2 text-xs text-emerald-300"><Check className="h-4 w-4" /> CSS válido e restrito ao formulário.</p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setField('customCss', CUSTOM_FORM_CSS_EXAMPLE)} className="btn-outline inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: theme.border }}><Clipboard className="h-4 w-4" />Usar exemplo</button>
                  <button type="button" onClick={() => { setField('customCss', ''); setField('customCssEnabled', false); }} className="btn-outline inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: theme.border }}><RotateCcw className="h-4 w-4" />Restaurar padrão</button>
                </div>

                <details className="rounded-xl border p-3 text-xs" style={{ borderColor: theme.border }}>
                  <summary className="cursor-pointer font-bold">Classes disponíveis</summary>
                  <p className="mt-2 text-[11px] leading-5 opacity-60">Use uma classe por regra para alterar somente aquela parte do formulário.</p>
                  <dl className="mt-3 divide-y" style={{ borderColor: theme.border }}>
                    {CUSTOM_FORM_CLASS_DESCRIPTIONS.map(([className, description]) => (
                      <div key={className} className="grid gap-1 py-2.5 sm:grid-cols-[minmax(180px,auto)_1fr] sm:gap-4">
                        <dt><code className="font-mono text-[11px] font-bold" style={{ color: theme.accent }}>{className}</code></dt>
                        <dd className="text-[11px] leading-5 opacity-70">{description}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              </div>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-20 xl:self-start">
          <section className="rounded-2xl border p-4" style={{ borderColor: theme.border }}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[.12em] opacity-60">Prévia do widget</p>
              <span className="rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[.08em]" style={{ borderColor: theme.border }}>{draft.widgetMode === 'modal' ? 'Botão flutuante' : 'Dentro da página'}</span>
            </div>
            {previewCss && <style>{previewCss}</style>}
            {draft.widgetMode === 'modal' && (
              <div className="relative mt-4 min-h-32 overflow-hidden rounded-2xl border bg-slate-100 p-4 text-[#0E2337]" style={{ borderColor: theme.border }}>
                <p className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Exemplo no site</p>
                <div className="mt-3 h-2 w-2/3 rounded bg-slate-200" />
                <div className="mt-2 h-2 w-1/2 rounded bg-slate-200" />
                <button type="button" className="absolute bottom-3 right-3 rounded-full px-4 py-2 text-[10px] font-extrabold text-white shadow-lg" style={{ backgroundColor: draft.primaryColor }}>{draft.submitLabel}</button>
              </div>
            )}
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[.1em] opacity-50">{draft.widgetMode === 'modal' ? 'Formulário ao abrir' : 'Primeira etapa incorporada'}</p>
            <div className="sol-form mt-4" style={previewThemeStyle}>
            <div className="sol-form__card overflow-hidden rounded-2xl bg-[#F4F7FA] text-[#0E2337] shadow-xl">
              <div className="sol-form__header p-4">
                {draft.logoUrl ? <img src={draft.logoUrl} alt="Logotipo configurado" className="mb-3 h-8 max-w-[180px] object-contain object-left" /> : <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[.12em]">{draft.companyName}</p>}
                <h3 className="sol-form__title text-lg font-extrabold leading-tight">{draft.headline}</h3>
                <p className="sol-form__subtitle mt-2 text-[11px] leading-4 opacity-75">{draft.subheadline}</p>
              </div>
              <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-2">
                <div className="sol-form__input rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-400 sm:col-span-2">Nome completo</div>
                <div className="sol-form__input rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-400">WhatsApp</div>
                <div className="sol-form__select rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-400">Estado</div>
                <button type="button" className="sol-form__button h-10 w-full rounded-lg text-xs font-extrabold text-white sm:col-span-2">{draft.submitLabel}</button>
                {draft.showPoweredBy && <p className="sol-form__powered-by text-center text-[9px] text-slate-400 sm:col-span-2">Tecnologia Sol Amigo PRO</p>}
              </div>
            </div>
            </div>
            <div className="mt-3 rounded-xl border p-3 text-[11px] leading-5" style={{ borderColor: theme.border }}><strong>Após o envio:</strong> <span className="opacity-70">{draft.successMessage}</span></div>
          </section>

          <section className="rounded-2xl border p-5" style={{ borderColor: theme.border }}>
            <div className="flex items-center justify-between gap-3"><h3 className="font-bold">Link direto</h3><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${draft.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{draft.active ? 'Ativo' : 'Desativado'}</span></div>
            <p className="mt-1 text-xs opacity-60">Alternativa para bio, anúncio ou WhatsApp. O link é bloqueado quando o formulário público está desativado.</p>
            <div className="mt-3 flex gap-2"><input readOnly value={publicLink} className="crm-input min-w-0 flex-1 font-mono text-[10px]" /><button type="button" onClick={() => copy('link', publicLink)} className="rounded-lg border px-3" style={{ borderColor: theme.border }}>{copied === 'link' ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}</button><a href={publicLink} target="_blank" rel="noreferrer" className="flex items-center rounded-lg border px-3" style={{ borderColor: theme.border }}><ExternalLink className="h-4 w-4" /></a></div>
          </section>

          <section className="rounded-2xl border p-5" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-2"><KeyRound className="h-4 w-4" style={{ color: theme.accent }} /><h3 className="font-bold">Identificador público</h3></div>
            <p className="mt-2 text-xs leading-5 opacity-60">Pode aparecer no código do site. Ele identifica o destino dos leads, mas não concede acesso ao CRM.</p>
            <div className="mt-3 flex gap-2"><input readOnly value={draft.publicToken} className="crm-input min-w-0 flex-1 font-mono text-[10px]" /><button type="button" onClick={() => copy('token', draft.publicToken)} className="rounded-lg border px-3" style={{ borderColor: theme.border }}>{copied === 'token' ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}</button></div>
            <button type="button" disabled={rotating} onClick={rotateToken} className="btn-outline mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: theme.border }}><RefreshCw className={`h-4 w-4 ${rotating ? 'animate-spin' : ''}`} />Renovar identificador</button>
          </section>

          <section className="rounded-2xl border p-5" style={{ borderColor: theme.border }}>
            <h3 className="font-bold">Proteções ativas</h3>
            <ul className="mt-3 space-y-2 text-xs opacity-70">
              <li>• isolamento por conta e políticas RLS</li>
              <li>• domínio autorizado e integração desligada por padrão</li>
              <li>• limite por IP anonimizado e limite global</li>
              <li>• campo-isca, validação no servidor e deduplicação</li>
              <li>• nenhuma chave administrativa no navegador</li>
            </ul>
          </section>
        </aside>
      </div>

      <div className="sticky bottom-4 flex flex-col gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur md:flex-row md:items-center md:justify-between" style={{ borderColor: theme.border, backgroundColor: `${theme.background}F2` }}>
        <div><p className="text-sm font-bold">{changed ? 'Existem alterações não salvas' : 'Configuração salva'}</p><p className="mt-0.5 text-xs opacity-60">O teste valida o script e todos os domínios sem criar um lead.</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={testing || changed || !saved?.active || !saved.widgetEnabled || !saved.allowedOrigins.length} onClick={testConnection} className="btn-outline inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-bold" style={{ borderColor: theme.border }} title="Valida o script público e todos os domínios autorizados">{testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}Testar conexão</button>
          <button type="button" disabled={saving || !changed} onClick={save} className="btn-filled inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold" style={{ backgroundColor: theme.secondary, color: '#fff' }}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar configurações</button>
        </div>
      </div>
    </div>
  );
};
