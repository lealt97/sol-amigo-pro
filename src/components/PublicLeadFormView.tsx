import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  MessageCircle,
  Zap,
} from 'lucide-react';
import { SUPABASE_URL, supabase } from '../lib/supabase';
import { ALL_BRAZIL_STATE_CODES, BRAZIL_STATE_NAMES } from '../data/brazilStates';
import type { FormColorMode, FormThemeColors } from '../types';
import {
  DEFAULT_FORM_PRIMARY,
  DEFAULT_FORM_SECONDARY,
  DEFAULT_FORM_SURFACE,
  DEFAULT_FORM_THEME_COLORS,
  normalizeFormThemeColors,
  resolveFormTheme,
} from '../utils/formTheme';

interface PublicLeadFormViewProps {
  formToken: string;
}

type PublicFormData = {
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  propertyType: 'Residencial' | 'Comercial' | 'Rural' | 'Industrial';
  averageMonthlyBill: string;
  averageConsumptionKWh: string;
  distributor: string;
  propertyStatus: 'Próprio' | 'Alugado' | 'Em construção' | 'Outro' | '';
  installationTimeframe: string;
  preferredContactTime: string;
  consent: boolean;
  companyFax: string;
};

type PublicFormConfig = {
  companyName: string;
  logoUrl: string | null;
  sideImageUrls: string[];
  sideImageRotationEnabled: boolean;
  colorMode: FormColorMode;
  primaryColor: string;
  secondaryColor: string;
  surfaceColor: string;
  themeColors: FormThemeColors;
  headline: string;
  subheadline: string;
  submitLabel: string;
  successMessage: string;
  privacyUrl: string | null;
  showPoweredBy: boolean;
  serviceStates: string[];
};

const DEFAULT_CONFIG: PublicFormConfig = {
  companyName: 'Especialista em energia solar',
  logoUrl: null,
  sideImageUrls: [],
  sideImageRotationEnabled: false,
  colorMode: 'automatic',
  primaryColor: DEFAULT_FORM_PRIMARY,
  secondaryColor: DEFAULT_FORM_SECONDARY,
  surfaceColor: DEFAULT_FORM_SURFACE,
  themeColors: DEFAULT_FORM_THEME_COLORS,
  headline: 'Descubra quanto você pode economizar com energia solar.',
  subheadline: 'Preencha seus dados para receber uma análise inicial sem compromisso.',
  submitLabel: 'Solicitar análise gratuita',
  successMessage: 'Recebemos sua solicitação. Em breve, nossa equipe entrará em contato.',
  privacyUrl: null,
  showPoweredBy: true,
  serviceStates: ALL_BRAZIL_STATE_CODES,
};

const normalizeSiteFont = (value: string | null) => {
  const candidate = value?.trim().slice(0, 200) ?? '';
  if (!candidate || !/^[\p{L}\p{N}\s,'"-]+$/u.test(candidate)) return '';
  return candidate;
};

const INITIAL_FORM: PublicFormData = {
  name: '',
  phone: '',
  email: '',
  city: '',
  state: '',
  propertyType: 'Residencial',
  averageMonthlyBill: '',
  averageConsumptionKWh: '',
  distributor: '',
  propertyStatus: '',
  installationTimeframe: '',
  preferredContactTime: '',
  consent: false,
  companyFax: '',
};

export const PublicLeadFormView: React.FC<PublicLeadFormViewProps> = ({ formToken }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<PublicFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<PublicFormConfig>(DEFAULT_CONFIG);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');

  const queryContext = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('origem') || 'Formulário do site',
      utmSource: params.get('utm_source'),
      utmMedium: params.get('utm_medium'),
      utmCampaign: params.get('utm_campaign'),
      utmContent: params.get('utm_content'),
      utmTerm: params.get('utm_term'),
      embedded: params.get('embed') === '1',
      widget: params.get('widget') === '1',
      siteOrigin: params.get('site_origin'),
      siteFont: normalizeSiteFont(params.get('site_font')),
    };
  }, []);
  const resolvedTheme = useMemo(() => resolveFormTheme(config), [config]);
  const formThemeStyle = useMemo(() => ({
    '--form-page': resolvedTheme.pageBackground,
    '--form-card': resolvedTheme.cardBackground,
    '--form-header': resolvedTheme.headerBackground,
    '--form-header-text': resolvedTheme.headerText,
    '--form-header-muted': resolvedTheme.headerMutedText,
    '--form-text': resolvedTheme.bodyText,
    '--form-muted': resolvedTheme.mutedText,
    '--form-input': resolvedTheme.inputBackground,
    '--form-input-border': resolvedTheme.inputBorder,
    '--form-input-text': resolvedTheme.inputText,
    '--form-action': resolvedTheme.primaryButtonBackground,
    '--form-action-text': resolvedTheme.primaryButtonText,
    '--form-secondary-action': resolvedTheme.secondaryButtonBackground,
    '--form-secondary-text': resolvedTheme.secondaryButtonText,
    '--form-progress': resolvedTheme.progressActive,
    '--form-progress-muted': resolvedTheme.progressInactive,
    '--form-consent': resolvedTheme.consentBackground,
    '--form-success': resolvedTheme.successBackground,
    '--form-success-accent': resolvedTheme.successAccent,
    '--form-error': resolvedTheme.errorBackground,
    '--form-error-accent': resolvedTheme.errorAccent,
    backgroundColor: resolvedTheme.pageBackground,
    color: resolvedTheme.bodyText,
    fontFamily: queryContext.siteFont || 'Inter, ui-sans-serif, system-ui, sans-serif',
  } as React.CSSProperties), [queryContext.siteFont, resolvedTheme]);

  useEffect(() => {
    let mounted = true;
    const url = new URL(`${SUPABASE_URL}/functions/v1/capture-lead`);
    url.searchParams.set('formToken', formToken);
    if (queryContext.siteOrigin) url.searchParams.set('siteOrigin', queryContext.siteOrigin);

    fetch(url, { method: 'GET', credentials: 'omit' })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || 'Formulário indisponível.');
        return body as PublicFormConfig;
      })
      .then((nextConfig) => {
        if (!mounted) return;
        setConfig({
          ...DEFAULT_CONFIG,
          ...nextConfig,
          colorMode: nextConfig.colorMode === 'detailed' ? 'detailed' : 'automatic',
          themeColors: normalizeFormThemeColors(
            nextConfig.themeColors,
            resolveFormTheme({ ...DEFAULT_CONFIG, ...nextConfig, colorMode: 'automatic' })
          ),
          sideImageUrls: Array.isArray(nextConfig.sideImageUrls)
            ? nextConfig.sideImageUrls.filter((url): url is string => typeof url === 'string' && url.startsWith('https://')).slice(0, 3)
            : [],
          sideImageRotationEnabled: nextConfig.sideImageRotationEnabled === true,
        });
      })
      .catch((loadError) => mounted && setConfigError(loadError instanceof Error ? loadError.message : 'Formulário indisponível.'))
      .finally(() => mounted && setConfigLoading(false));

    return () => {
      mounted = false;
    };
  }, [formToken, queryContext.siteOrigin]);

  const sideImageKey = config.sideImageUrls.join('|');

  useEffect(() => {
    setActiveImageIndex(0);
    if (!config.sideImageRotationEnabled || config.sideImageUrls.length < 2) return;

    const interval = window.setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % config.sideImageUrls.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [config.sideImageRotationEnabled, sideImageKey]);

  useEffect(() => {
    if (!queryContext.widget || !queryContext.siteOrigin || window.parent === window) return;
    let hostOrigin: string;
    try {
      hostOrigin = new URL(queryContext.siteOrigin).origin;
    } catch {
      return;
    }

    const handleResult = (event: MessageEvent) => {
      if (event.origin !== hostOrigin || event.source !== window.parent) return;
      if (event.data?.type !== 'sol-amigo:result') return;
      setSubmitting(false);
      if (!event.data.success) {
        setError(event.data.error || 'Não foi possível enviar seus dados.');
        return;
      }
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('message', handleResult);
    return () => window.removeEventListener('message', handleResult);
  }, [queryContext.siteOrigin, queryContext.widget]);

  useEffect(() => {
    if (!queryContext.widget || !queryContext.siteOrigin || window.parent === window) return;
    let hostOrigin: string;
    try {
      hostOrigin = new URL(queryContext.siteOrigin).origin;
    } catch {
      return;
    }

    const publishHeight = () => {
      window.parent.postMessage(
        { type: 'sol-amigo:resize', height: document.documentElement.scrollHeight },
        hostOrigin
      );
    };
    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [queryContext.siteOrigin, queryContext.widget, step, submitted, configLoading]);

  const setField = <K extends keyof PublicFormData>(key: K, value: PublicFormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const continueToEnergy = () => {
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (form.name.trim().length < 2) return setError('Informe seu nome.');
    if (phoneDigits.length < 10) return setError('Informe um WhatsApp válido com DDD.');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return setError('Informe um e-mail válido.');
    }
    if (form.city.trim().length < 2 || !form.state) {
      return setError('Informe sua cidade e seu estado.');
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.averageMonthlyBill && !form.averageConsumptionKWh) {
      setError('Informe o valor médio da conta ou o consumo em kWh.');
      return;
    }
    if (!form.consent) {
      setError('Autorize o contato para enviar a solicitação.');
      return;
    }

    setSubmitting(true);
    setError('');

    const payload = {
      ...form,
      averageMonthlyBill: form.averageMonthlyBill || null,
      averageConsumptionKWh: form.averageConsumptionKWh || null,
      propertyStatus: form.propertyStatus || null,
      source: queryContext.source,
      utmSource: queryContext.utmSource,
      utmMedium: queryContext.utmMedium,
      utmCampaign: queryContext.utmCampaign,
      utmContent: queryContext.utmContent,
      utmTerm: queryContext.utmTerm,
    };

    if (queryContext.widget && queryContext.siteOrigin && window.parent !== window) {
      let hostOrigin: string;
      try {
        hostOrigin = new URL(queryContext.siteOrigin).origin;
      } catch {
        setSubmitting(false);
        setError('A integração deste site está configurada incorretamente.');
        return;
      }
      window.parent.postMessage(
        { type: 'sol-amigo:submit', formToken, payload },
        hostOrigin
      );
      return;
    }

    const { data, error: invokeError } = await supabase.functions.invoke('capture-lead', {
      body: {
        formToken,
        ...payload,
        landingPage: window.location.href,
      },
    });

    setSubmitting(false);

    if (invokeError || data?.error) {
      setError(data?.error || 'Não foi possível enviar seus dados. Tente novamente.');
      return;
    }

    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (configLoading) {
    return (
      <div id="public-lead-form-page" data-sol-amigo-form className="flex min-h-screen items-center justify-center" style={formThemeStyle}>
        <div className="flex items-center gap-2 text-sm font-semibold"><Loader2 className="h-5 w-5 animate-spin" /> Preparando formulário...</div>
      </div>
    );
  }

  if (configError) {
    return (
      <div id="public-lead-form-page" data-sol-amigo-form className="flex min-h-screen items-center justify-center px-4" style={formThemeStyle}>
        <div className="max-w-md rounded-2xl border p-7 text-center shadow-xl" style={{ backgroundColor: resolvedTheme.cardBackground, borderColor: resolvedTheme.inputBorder }}>
          <AlertTriangle className="mx-auto h-8 w-8" style={{ color: resolvedTheme.errorAccent }} />
          <h1 className="mt-4 text-xl font-extrabold">Formulário indisponível</h1>
          <p className="mt-2 text-sm leading-6" style={{ color: resolvedTheme.mutedText }}>{configError}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div id="public-lead-form-page" data-sol-amigo-form className={`${queryContext.embedded ? 'min-h-0 py-4' : 'min-h-screen py-10'} px-4`} style={formThemeStyle}>
        <div className={`mx-auto flex max-w-xl items-center ${queryContext.embedded ? 'min-h-0' : 'min-h-[calc(100vh-5rem)]'}`}>
          <section className="w-full rounded-3xl p-7 text-center shadow-2xl md:p-10" style={{ backgroundColor: resolvedTheme.successBackground, color: resolvedTheme.bodyText }}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: resolvedTheme.consentBackground, color: resolvedTheme.successAccent }}>
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="mt-6 text-2xl font-extrabold tracking-tight md:text-3xl">Recebemos sua solicitação!</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6" style={{ color: resolvedTheme.mutedText }}>
              {config.successMessage}
            </p>
            <div className="mt-7 rounded-2xl p-4 text-left" style={{ backgroundColor: resolvedTheme.consentBackground }}>
              <div className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: resolvedTheme.successAccent }} />
                <div>
                  <p className="text-sm font-bold">Próximo passo</p>
                  <p className="mt-1 text-xs leading-5" style={{ color: resolvedTheme.mutedText }}>Vamos confirmar seus dados e preparar uma análise inicial do seu consumo.</p>
                </div>
              </div>
            </div>
            {config.showPoweredBy && <p className="mt-5 text-[10px] font-semibold" style={{ color: resolvedTheme.mutedText }}>Tecnologia Sol Amigo PRO</p>}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div id="public-lead-form-page" data-sol-amigo-form className={queryContext.embedded ? 'min-h-0' : 'min-h-screen'} style={formThemeStyle}>
      <div className={`mx-auto flex max-w-7xl items-center justify-center ${queryContext.embedded ? 'min-h-0 px-3 py-3 sm:px-4' : 'min-h-screen px-4 py-6 sm:px-8 lg:px-12 lg:py-12'}`} style={{ backgroundColor: resolvedTheme.pageBackground }}>
        <section className={`w-full ${config.sideImageUrls.length ? 'max-w-6xl' : 'max-w-2xl'}`}>
            <div className="overflow-hidden rounded-3xl border shadow-xl shadow-slate-900/5" style={{ backgroundColor: resolvedTheme.cardBackground, borderColor: resolvedTheme.inputBorder }}>
              <div className="p-5 sm:p-7 lg:px-9 lg:py-8" style={{ backgroundColor: resolvedTheme.headerBackground, color: resolvedTheme.headerText }}>
                {config.logoUrl ? <img src={config.logoUrl} alt={config.companyName} className="h-10 max-w-[190px] object-contain object-left" referrerPolicy="no-referrer" /> : <span className="text-xs font-extrabold uppercase tracking-[.1em]">{config.companyName}</span>}
                <h1 className="mt-5 text-2xl font-extrabold leading-tight tracking-[-0.025em]">{config.headline}</h1>
                <p className="mt-2 text-sm leading-5" style={{ color: resolvedTheme.headerMutedText }}>{config.subheadline}</p>
              </div>

              <div className={config.sideImageUrls.length ? 'lg:grid lg:grid-cols-[minmax(260px,0.78fr)_minmax(0,1.22fr)]' : ''}>
                {config.sideImageUrls.length > 0 && (
                  <div className="relative hidden min-h-[560px] overflow-hidden lg:block" style={{ backgroundColor: resolvedTheme.progressInactive }}>
                    {config.sideImageUrls.map((imageUrl, index) => (
                      <img
                        key={imageUrl}
                        src={imageUrl}
                        alt={index === activeImageIndex ? 'Projeto de energia solar' : ''}
                        className={`absolute inset-0 h-full min-h-[560px] w-full object-cover transition-opacity duration-1000 motion-reduce:transition-none ${index === activeImageIndex ? 'opacity-100' : 'opacity-0'}`}
                        referrerPolicy="no-referrer"
                      />
                    ))}
                  </div>
                )}

                <div className="min-w-0">
              <div className="px-5 pt-5 sm:px-8 sm:pt-7">
                <div className="flex items-center gap-3">
                  {[1, 2].map((item) => (
                    <React.Fragment key={item}>
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold" style={{ backgroundColor: step >= item ? resolvedTheme.progressActive : resolvedTheme.progressInactive, color: step >= item ? resolvedTheme.primaryButtonText : resolvedTheme.mutedText }}>{item}</span>
                        <span className="hidden text-xs font-bold sm:inline" style={{ color: step >= item ? resolvedTheme.bodyText : resolvedTheme.mutedText }}>{item === 1 ? 'Seus dados' : 'Consumo de energia'}</span>
                      </div>
                      {item === 1 && <div className="h-px flex-1" style={{ backgroundColor: resolvedTheme.progressInactive }} />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-5 pt-6 sm:p-8 sm:pt-7">
              {step === 1 ? (
                <>
                  <div className="mb-6">
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em]" style={{ color: resolvedTheme.progressActive }}>Simulação solar</p>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Conte um pouco sobre você</h2>
                    <p className="mt-2 text-sm" style={{ color: resolvedTheme.mutedText }}>Começamos com os dados essenciais para falar com você.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-xs font-bold">Nome completo *</span>
                      <input value={form.name} onChange={(event) => setField('name', event.target.value)} autoComplete="name" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="Como podemos chamar você?" />
                    </label>
                    <label className="">
                      <span className="mb-1.5 block text-xs font-bold">WhatsApp com DDD *</span>
                      <input value={form.phone} onChange={(event) => setField('phone', event.target.value)} autoComplete="tel" inputMode="tel" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="(00) 00000-0000" />
                    </label>
                    <label className="">
                      <span className="mb-1.5 block text-xs font-bold">E-mail</span>
                      <input value={form.email} onChange={(event) => setField('email', event.target.value)} autoComplete="email" inputMode="email" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="voce@email.com" />
                    </label>
                    <label className="">
                      <span className="mb-1.5 block text-xs font-bold">Cidade *</span>
                      <input value={form.city} onChange={(event) => setField('city', event.target.value)} autoComplete="address-level2" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="Sua cidade" />
                    </label>
                    <label className="">
                      <span className="mb-1.5 block text-xs font-bold">Estado *</span>
                      <select value={form.state} onChange={(event) => setField('state', event.target.value)} autoComplete="address-level1" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10">
                        <option value="">Selecione</option>
                        {config.serviceStates.map((state) => (
                          <option key={state} value={state}>{state} — {BRAZIL_STATE_NAMES[state]}</option>
                        ))}
                      </select>
                    </label>
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-xs font-bold">Tipo de imóvel *</span>
                      <select value={form.propertyType} onChange={(event) => setField('propertyType', event.target.value as PublicFormData['propertyType'])} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10">
                        <option>Residencial</option><option>Comercial</option><option>Rural</option><option>Industrial</option>
                      </select>
                    </label>
                  </div>

                  <button type="button" data-primary-action onClick={continueToEnergy} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold shadow-lg">
                    {config.submitLabel} <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: resolvedTheme.consentBackground, color: resolvedTheme.progressActive }}><Zap className="h-5 w-5" /></div>
                    <h2 className="mt-4 text-2xl font-extrabold tracking-tight">Agora, sobre seu consumo</h2>
                    <p className="mt-2 text-sm" style={{ color: resolvedTheme.mutedText }}>Informe o que você souber. Um dos dois primeiros campos é suficiente.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="">
                      <span className="mb-1.5 block text-xs font-bold">Valor médio da conta (R$)</span>
                      <input value={form.averageMonthlyBill} onChange={(event) => setField('averageMonthlyBill', event.target.value)} inputMode="decimal" type="number" min="0" step="0.01" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="Ex.: 450" />
                    </label>
                    <label className="">
                      <span className="mb-1.5 block text-xs font-bold">Consumo médio (kWh/mês)</span>
                      <input value={form.averageConsumptionKWh} onChange={(event) => setField('averageConsumptionKWh', event.target.value)} inputMode="decimal" type="number" min="0" step="0.01" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="Ex.: 380" />
                    </label>
                    <label className="">
                      <span className="mb-1.5 block text-xs font-bold">Distribuidora</span>
                      <input value={form.distributor} onChange={(event) => setField('distributor', event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="Ex.: CPFL, Cemig, Copel" />
                    </label>
                    <label className="">
                      <span className="mb-1.5 block text-xs font-bold">Situação do imóvel</span>
                      <select value={form.propertyStatus} onChange={(event) => setField('propertyStatus', event.target.value as PublicFormData['propertyStatus'])} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10">
                        <option value="">Selecione</option><option>Próprio</option><option>Alugado</option><option>Em construção</option><option>Outro</option>
                      </select>
                    </label>
                    <label className="">
                      <span className="mb-1.5 block text-xs font-bold">Prazo para instalação</span>
                      <select value={form.installationTimeframe} onChange={(event) => setField('installationTimeframe', event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10">
                        <option value="">Ainda não sei</option><option>Até 30 dias</option><option>1 a 3 meses</option><option>3 a 6 meses</option><option>Mais de 6 meses</option>
                      </select>
                    </label>
                    <label className="">
                      <span className="mb-1.5 block text-xs font-bold">Melhor horário para contato</span>
                      <select value={form.preferredContactTime} onChange={(event) => setField('preferredContactTime', event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10">
                        <option value="">Qualquer horário</option><option>Manhã</option><option>Tarde</option><option>Noite</option>
                      </select>
                    </label>
                  </div>

                  <label className="mt-5 flex items-start gap-3 rounded-xl p-3" style={{ backgroundColor: resolvedTheme.consentBackground }}>
                    <input type="checkbox" checked={form.consent} onChange={(event) => setField('consent', event.target.checked)} className="mt-0.5 h-4 w-4" style={{ accentColor: resolvedTheme.progressActive }} />
                    <span className="text-xs leading-5" style={{ color: resolvedTheme.mutedText }}>Autorizo o contato da equipe para atender esta solicitação e concordo com o tratamento dos dados informados para essa finalidade.{config.privacyUrl && <> Consulte a <a href={config.privacyUrl} target="_blank" rel="noreferrer" className="font-bold underline">política de privacidade</a>.</>}</span>
                  </label>

                  <input
                    type="text"
                    name="sol_amigo_confirmation_field"
                    value={form.companyFax}
                    onChange={(event) => setField('companyFax', event.target.value)}
                    tabIndex={-1}
                    autoComplete="new-password"
                    aria-hidden="true"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    className="absolute -left-[10000px] h-px w-px opacity-0"
                  />

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                    <button type="button" data-secondary-action onClick={() => setStep(1)} className="flex h-12 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-bold sm:w-auto"><ArrowLeft className="h-4 w-4" /> Voltar</button>
                    <button type="submit" data-primary-action disabled={submitting} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold shadow-lg">
                      {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <>{config.submitLabel} <ArrowRight className="h-4 w-4" /></>}
                    </button>
                  </div>
                </>
              )}

              {error && <p role="alert" className="mt-4 rounded-xl border px-3 py-2 text-xs font-semibold" style={{ backgroundColor: resolvedTheme.errorBackground, borderColor: resolvedTheme.errorAccent, color: resolvedTheme.errorAccent }}>{error}</p>}
              </form>
                </div>
              </div>
            </div>

            <p className="mt-5 flex items-center justify-center gap-2 text-center text-[11px]" style={{ color: resolvedTheme.mutedText }}><LockKeyhole className="h-3.5 w-3.5" /> Seus dados não serão vendidos ou compartilhados para publicidade.</p>
            {config.showPoweredBy && <p className="mt-2 text-center text-[10px] font-semibold" style={{ color: resolvedTheme.mutedText }}>Tecnologia Sol Amigo PRO</p>}
        </section>
      </div>
    </div>
  );
};
