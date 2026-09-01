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
  sideImageUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  headline: string;
  subheadline: string;
  submitLabel: string;
  successMessage: string;
  privacyUrl: string | null;
  showPoweredBy: boolean;
  serviceStates: string[];
  customCssEnabled: boolean;
  customCss: string;
};

const DEFAULT_CONFIG: PublicFormConfig = {
  companyName: 'Especialista em energia solar',
  logoUrl: null,
  sideImageUrl: null,
  primaryColor: '#0076DD',
  secondaryColor: '#0E2337',
  headline: 'Descubra quanto você pode economizar com energia solar.',
  subheadline: 'Preencha seus dados para receber uma análise inicial sem compromisso.',
  submitLabel: 'Solicitar análise gratuita',
  successMessage: 'Recebemos sua solicitação. Em breve, nossa equipe entrará em contato.',
  privacyUrl: null,
  showPoweredBy: true,
  serviceStates: ALL_BRAZIL_STATE_CODES,
  customCssEnabled: false,
  customCss: '',
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
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');
  const formThemeStyle = useMemo(() => ({
    '--sol-form-primary': config.primaryColor,
    '--sol-form-secondary': config.secondaryColor,
  } as React.CSSProperties), [config.primaryColor, config.secondaryColor]);

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
    };
  }, []);

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
      .then((nextConfig) => mounted && setConfig(nextConfig))
      .catch((loadError) => mounted && setConfigError(loadError instanceof Error ? loadError.message : 'Formulário indisponível.'))
      .finally(() => mounted && setConfigLoading(false));

    return () => {
      mounted = false;
    };
  }, [formToken, queryContext.siteOrigin]);

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
      <div id="public-lead-form-page" className="flex min-h-screen items-center justify-center bg-[#F4F7FA] text-[#0E2337]">
        <div className="flex items-center gap-2 text-sm font-semibold"><Loader2 className="h-5 w-5 animate-spin" /> Preparando formulário...</div>
      </div>
    );
  }

  if (configError) {
    return (
      <div id="public-lead-form-page" className="flex min-h-screen items-center justify-center bg-[#F4F7FA] px-4 text-[#0E2337]">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-xl">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
          <h1 className="mt-4 text-xl font-extrabold">Formulário indisponível</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{configError}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div id="public-lead-form-page" className={`sol-form ${queryContext.embedded ? 'min-h-0 py-4' : 'min-h-screen py-10'} px-4 text-[#0E2337]`} style={formThemeStyle}>
        {config.customCssEnabled && <style>{config.customCss}</style>}
        <div className={`mx-auto flex max-w-xl items-center ${queryContext.embedded ? 'min-h-0' : 'min-h-[calc(100vh-5rem)]'}`}>
          <section className="sol-form__card sol-form__success w-full rounded-3xl bg-white p-7 text-center shadow-2xl md:p-10">
            <div className="sol-form__icon mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#B4BF8A]/25" style={{ color: config.primaryColor }}>
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="mt-6 text-2xl font-extrabold tracking-tight md:text-3xl">Recebemos sua solicitação!</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              {config.successMessage}
            </p>
            <div className="mt-7 rounded-2xl bg-[#F3F7FA] p-4 text-left">
              <div className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: config.primaryColor }} />
                <div>
                  <p className="text-sm font-bold">Próximo passo</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Vamos confirmar seus dados e preparar uma análise inicial do seu consumo.</p>
                </div>
              </div>
            </div>
            {config.showPoweredBy && <p className="sol-form__powered-by mt-5 text-[10px] font-semibold text-slate-400">Tecnologia Sol Amigo PRO</p>}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div id="public-lead-form-page" className={`sol-form ${queryContext.embedded ? 'min-h-0' : 'min-h-screen'} text-[#0E2337]`} style={formThemeStyle}>
      {config.customCssEnabled && <style>{config.customCss}</style>}
      <div className={`mx-auto flex max-w-7xl items-center justify-center bg-[#F4F7FA] ${queryContext.embedded ? 'min-h-0 px-3 py-3 sm:px-4' : 'min-h-screen px-4 py-6 sm:px-8 lg:px-12 lg:py-12'}`}>
        <section className={`w-full ${config.sideImageUrl ? 'max-w-6xl' : 'max-w-2xl'}`}>
            <div className="sol-form__card overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
              <div className="sol-form__header p-5 sm:p-7 lg:px-9 lg:py-8">
                {config.logoUrl ? <img src={config.logoUrl} alt={config.companyName} className="h-10 max-w-[190px] object-contain object-left" referrerPolicy="no-referrer" /> : <span className="text-xs font-extrabold uppercase tracking-[.1em]">{config.companyName}</span>}
                <h1 className="sol-form__title mt-5 text-2xl font-extrabold leading-tight tracking-[-0.025em]">{config.headline}</h1>
                <p className="sol-form__subtitle mt-2 text-sm leading-5 text-white/75">{config.subheadline}</p>
              </div>

              <div className={config.sideImageUrl ? 'lg:grid lg:grid-cols-[minmax(260px,0.78fr)_minmax(0,1.22fr)]' : ''}>
                {config.sideImageUrl && (
                  <div className="hidden min-h-full overflow-hidden bg-slate-100 lg:block">
                    <img
                      src={config.sideImageUrl}
                      alt="Projeto de energia solar"
                      className="sol-form__image h-full min-h-[560px] w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <div className="min-w-0">
              <div className="px-5 pt-5 sm:px-8 sm:pt-7">
                <div className="sol-form__progress flex items-center gap-3">
                  {[1, 2].map((item) => (
                    <React.Fragment key={item}>
                      <div className="flex items-center gap-2">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold ${step >= item ? 'text-white' : 'bg-slate-200 text-slate-500'}`} style={step >= item ? { backgroundColor: config.primaryColor } : undefined}>{item}</span>
                        <span className={`hidden text-xs font-bold sm:inline ${step >= item ? 'text-[#0E2337]' : 'text-slate-400'}`}>{item === 1 ? 'Seus dados' : 'Consumo de energia'}</span>
                      </div>
                      {item === 1 && <div className="h-px flex-1 bg-slate-200" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-5 pt-6 sm:p-8 sm:pt-7">
              {step === 1 ? (
                <>
                  <div className="mb-6">
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em]" style={{ color: config.primaryColor }}>Simulação solar</p>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Conte um pouco sobre você</h2>
                    <p className="mt-2 text-sm text-slate-500">Começamos com os dados essenciais para falar com você.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="sol-form__field sm:col-span-2">
                      <span className="sol-form__label mb-1.5 block text-xs font-bold text-slate-700">Nome completo *</span>
                      <input value={form.name} onChange={(event) => setField('name', event.target.value)} autoComplete="name" className="sol-form__input h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="Como podemos chamar você?" />
                    </label>
                    <label className="sol-form__field">
                      <span className="sol-form__label mb-1.5 block text-xs font-bold text-slate-700">WhatsApp com DDD *</span>
                      <input value={form.phone} onChange={(event) => setField('phone', event.target.value)} autoComplete="tel" inputMode="tel" className="sol-form__input h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="(00) 00000-0000" />
                    </label>
                    <label className="sol-form__field">
                      <span className="sol-form__label mb-1.5 block text-xs font-bold text-slate-700">E-mail</span>
                      <input value={form.email} onChange={(event) => setField('email', event.target.value)} autoComplete="email" inputMode="email" className="sol-form__input h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="voce@email.com" />
                    </label>
                    <label className="sol-form__field">
                      <span className="sol-form__label mb-1.5 block text-xs font-bold text-slate-700">Cidade *</span>
                      <input value={form.city} onChange={(event) => setField('city', event.target.value)} autoComplete="address-level2" className="sol-form__input h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="Sua cidade" />
                    </label>
                    <label className="sol-form__field">
                      <span className="sol-form__label mb-1.5 block text-xs font-bold text-slate-700">Estado *</span>
                      <select value={form.state} onChange={(event) => setField('state', event.target.value)} autoComplete="address-level1" className="sol-form__select h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10">
                        <option value="">Selecione</option>
                        {config.serviceStates.map((state) => (
                          <option key={state} value={state}>{state} — {BRAZIL_STATE_NAMES[state]}</option>
                        ))}
                      </select>
                    </label>
                    <label className="sol-form__field sm:col-span-2">
                      <span className="sol-form__label mb-1.5 block text-xs font-bold text-slate-700">Tipo de imóvel *</span>
                      <select value={form.propertyType} onChange={(event) => setField('propertyType', event.target.value as PublicFormData['propertyType'])} className="sol-form__select h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10">
                        <option>Residencial</option><option>Comercial</option><option>Rural</option><option>Industrial</option>
                      </select>
                    </label>
                  </div>

                  <button type="button" onClick={continueToEnergy} className="sol-form__button mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold text-white shadow-lg shadow-blue-600/20">
                    {config.submitLabel} <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="sol-form__icon flex h-10 w-10 items-center justify-center rounded-xl bg-[#FACB5C]/35 text-[#0E2337]"><Zap className="h-5 w-5" /></div>
                    <h2 className="mt-4 text-2xl font-extrabold tracking-tight">Agora, sobre seu consumo</h2>
                    <p className="mt-2 text-sm text-slate-500">Informe o que você souber. Um dos dois primeiros campos é suficiente.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="sol-form__field">
                      <span className="sol-form__label mb-1.5 block text-xs font-bold text-slate-700">Valor médio da conta (R$)</span>
                      <input value={form.averageMonthlyBill} onChange={(event) => setField('averageMonthlyBill', event.target.value)} inputMode="decimal" type="number" min="0" step="0.01" className="sol-form__input h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="Ex.: 450" />
                    </label>
                    <label className="sol-form__field">
                      <span className="sol-form__label mb-1.5 block text-xs font-bold text-slate-700">Consumo médio (kWh/mês)</span>
                      <input value={form.averageConsumptionKWh} onChange={(event) => setField('averageConsumptionKWh', event.target.value)} inputMode="decimal" type="number" min="0" step="0.01" className="sol-form__input h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="Ex.: 380" />
                    </label>
                    <label className="sol-form__field">
                      <span className="sol-form__label mb-1.5 block text-xs font-bold text-slate-700">Distribuidora</span>
                      <input value={form.distributor} onChange={(event) => setField('distributor', event.target.value)} className="sol-form__input h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="Ex.: CPFL, Cemig, Copel" />
                    </label>
                    <label className="sol-form__field">
                      <span className="sol-form__label mb-1.5 block text-xs font-bold text-slate-700">Situação do imóvel</span>
                      <select value={form.propertyStatus} onChange={(event) => setField('propertyStatus', event.target.value as PublicFormData['propertyStatus'])} className="sol-form__select h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10">
                        <option value="">Selecione</option><option>Próprio</option><option>Alugado</option><option>Em construção</option><option>Outro</option>
                      </select>
                    </label>
                    <label className="sol-form__field">
                      <span className="sol-form__label mb-1.5 block text-xs font-bold text-slate-700">Prazo para instalação</span>
                      <select value={form.installationTimeframe} onChange={(event) => setField('installationTimeframe', event.target.value)} className="sol-form__select h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10">
                        <option value="">Ainda não sei</option><option>Até 30 dias</option><option>1 a 3 meses</option><option>3 a 6 meses</option><option>Mais de 6 meses</option>
                      </select>
                    </label>
                    <label className="sol-form__field">
                      <span className="sol-form__label mb-1.5 block text-xs font-bold text-slate-700">Melhor horário para contato</span>
                      <select value={form.preferredContactTime} onChange={(event) => setField('preferredContactTime', event.target.value)} className="sol-form__select h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10">
                        <option value="">Qualquer horário</option><option>Manhã</option><option>Tarde</option><option>Noite</option>
                      </select>
                    </label>
                  </div>

                  <label className="sol-form__consent mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                    <input type="checkbox" checked={form.consent} onChange={(event) => setField('consent', event.target.checked)} className="mt-0.5 h-4 w-4" style={{ accentColor: config.primaryColor }} />
                    <span className="text-xs leading-5 text-slate-600">Autorizo o contato da equipe para atender esta solicitação e concordo com o tratamento dos dados informados para essa finalidade.{config.privacyUrl && <> Consulte a <a href={config.privacyUrl} target="_blank" rel="noreferrer" className="font-bold underline">política de privacidade</a>.</>}</span>
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
                    <button type="button" onClick={() => setStep(1)} className="sol-form__secondary-button flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-600 sm:w-auto"><ArrowLeft className="h-4 w-4" /> Voltar</button>
                    <button type="submit" disabled={submitting} className="sol-form__button flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20">
                      {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <>{config.submitLabel} <ArrowRight className="h-4 w-4" /></>}
                    </button>
                  </div>
                </>
              )}

              {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
              </form>
                </div>
              </div>
            </div>

            <p className="mt-5 flex items-center justify-center gap-2 text-center text-[11px] text-slate-500"><LockKeyhole className="h-3.5 w-3.5" /> Seus dados não serão vendidos ou compartilhados para publicidade.</p>
            {config.showPoweredBy && <p className="sol-form__powered-by mt-2 text-center text-[10px] font-semibold text-slate-400">Tecnologia Sol Amigo PRO</p>}
        </section>
      </div>
    </div>
  );
};
