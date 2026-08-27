import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  MessageCircle,
  SunMedium,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BrandLogo } from './BrandLogo';

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
  website: string;
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
  website: '',
};

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export const PublicLeadFormView: React.FC<PublicLeadFormViewProps> = ({ formToken }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<PublicFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const queryContext = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('origem') || 'Formulário do site',
      utmSource: params.get('utm_source'),
      utmMedium: params.get('utm_medium'),
      utmCampaign: params.get('utm_campaign'),
      utmContent: params.get('utm_content'),
      utmTerm: params.get('utm_term'),
    };
  }, []);

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

    const { data, error: invokeError } = await supabase.functions.invoke('capture-lead', {
      body: {
        formToken,
        ...form,
        averageMonthlyBill: form.averageMonthlyBill || null,
        averageConsumptionKWh: form.averageConsumptionKWh || null,
        propertyStatus: form.propertyStatus || null,
        landingPage: window.location.href,
        ...queryContext,
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

  if (submitted) {
    return (
      <div id="public-lead-form-page" className="min-h-screen bg-[#0E2337] px-4 py-10 text-[#0E2337]">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center">
          <section className="w-full rounded-3xl bg-white p-7 text-center shadow-2xl md:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#B4BF8A]/25 text-[#52723B]">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="mt-6 text-2xl font-extrabold tracking-tight md:text-3xl">Recebemos sua solicitação!</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              Seus dados foram enviados para a equipe comercial. Em breve, um especialista entrará em contato pelo WhatsApp informado.
            </p>
            <div className="mt-7 rounded-2xl bg-[#F3F7FA] p-4 text-left">
              <div className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#0076DD]" />
                <div>
                  <p className="text-sm font-bold">Próximo passo</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Vamos confirmar seus dados e preparar uma análise inicial do seu consumo.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div id="public-lead-form-page" className="min-h-screen bg-[#0E2337] text-[#0E2337]">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="hidden bg-[#183956] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <BrandLogo backgroundColor="#183956" className="h-12 w-auto self-start" />
          <div className="max-w-md">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FACB5C] text-[#0E2337]">
              <SunMedium className="h-7 w-7" />
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-[-0.035em]">Descubra quanto você pode economizar com energia solar.</h1>
            <p className="mt-5 text-sm leading-6 text-white/75">Leva menos de dois minutos. A equipe usa seus dados para preparar uma análise inicial sem compromisso.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <LockKeyhole className="h-4 w-4" />
            Dados protegidos e usados somente para este atendimento.
          </div>
        </aside>

        <section className="bg-[#F4F7FA] px-4 py-6 sm:px-8 lg:flex lg:items-center lg:px-14 lg:py-12">
          <div className="mx-auto w-full max-w-2xl">
            <div className="mb-7 flex items-center justify-between lg:hidden">
              <BrandLogo backgroundColor="#F4F7FA" className="h-10 w-auto" />
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FACB5C] text-[#0E2337]"><SunMedium className="h-5 w-5" /></div>
            </div>

            <div className="mb-6 flex items-center gap-3">
              {[1, 2].map((item) => (
                <React.Fragment key={item}>
                  <div className="flex items-center gap-2">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold ${step >= item ? 'bg-[#0076DD] text-white' : 'bg-slate-200 text-slate-500'}`}>{item}</span>
                    <span className={`hidden text-xs font-bold sm:inline ${step >= item ? 'text-[#0E2337]' : 'text-slate-400'}`}>{item === 1 ? 'Seus dados' : 'Consumo de energia'}</span>
                  </div>
                  {item === 1 && <div className="h-px flex-1 bg-slate-200" />}
                </React.Fragment>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-8">
              {step === 1 ? (
                <>
                  <div className="mb-6">
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0076DD]">Simulação solar</p>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Conte um pouco sobre você</h2>
                    <p className="mt-2 text-sm text-slate-500">Começamos com os dados essenciais para falar com você.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">Nome completo *</span>
                      <input value={form.name} onChange={(event) => setField('name', event.target.value)} autoComplete="name" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="Como podemos chamar você?" />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">WhatsApp com DDD *</span>
                      <input value={form.phone} onChange={(event) => setField('phone', event.target.value)} autoComplete="tel" inputMode="tel" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="(00) 00000-0000" />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">E-mail</span>
                      <input value={form.email} onChange={(event) => setField('email', event.target.value)} autoComplete="email" inputMode="email" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="voce@email.com" />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">Cidade *</span>
                      <input value={form.city} onChange={(event) => setField('city', event.target.value)} autoComplete="address-level2" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="Sua cidade" />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">Estado *</span>
                      <select value={form.state} onChange={(event) => setField('state', event.target.value)} autoComplete="address-level1" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10">
                        <option value="">Selecione</option>
                        {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                      </select>
                    </label>
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">Tipo de imóvel *</span>
                      <select value={form.propertyType} onChange={(event) => setField('propertyType', event.target.value as PublicFormData['propertyType'])} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10">
                        <option>Residencial</option><option>Comercial</option><option>Rural</option><option>Industrial</option>
                      </select>
                    </label>
                  </div>

                  <button type="button" onClick={continueToEnergy} className="btn-filled mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0076DD] text-sm font-extrabold text-white shadow-lg shadow-blue-600/20">
                    Continuar <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FACB5C]/35 text-[#0E2337]"><Zap className="h-5 w-5" /></div>
                    <h2 className="mt-4 text-2xl font-extrabold tracking-tight">Agora, sobre seu consumo</h2>
                    <p className="mt-2 text-sm text-slate-500">Informe o que você souber. Um dos dois primeiros campos é suficiente.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">Valor médio da conta (R$)</span>
                      <input value={form.averageMonthlyBill} onChange={(event) => setField('averageMonthlyBill', event.target.value)} inputMode="decimal" type="number" min="0" step="0.01" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="Ex.: 450" />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">Consumo médio (kWh/mês)</span>
                      <input value={form.averageConsumptionKWh} onChange={(event) => setField('averageConsumptionKWh', event.target.value)} inputMode="decimal" type="number" min="0" step="0.01" className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="Ex.: 380" />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">Distribuidora</span>
                      <input value={form.distributor} onChange={(event) => setField('distributor', event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10" placeholder="Ex.: CPFL, Cemig, Copel" />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">Situação do imóvel</span>
                      <select value={form.propertyStatus} onChange={(event) => setField('propertyStatus', event.target.value as PublicFormData['propertyStatus'])} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10">
                        <option value="">Selecione</option><option>Próprio</option><option>Alugado</option><option>Em construção</option><option>Outro</option>
                      </select>
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">Prazo para instalação</span>
                      <select value={form.installationTimeframe} onChange={(event) => setField('installationTimeframe', event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10">
                        <option value="">Ainda não sei</option><option>Até 30 dias</option><option>1 a 3 meses</option><option>3 a 6 meses</option><option>Mais de 6 meses</option>
                      </select>
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">Melhor horário para contato</span>
                      <select value={form.preferredContactTime} onChange={(event) => setField('preferredContactTime', event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0076DD] focus:ring-4 focus:ring-[#0076DD]/10">
                        <option value="">Qualquer horário</option><option>Manhã</option><option>Tarde</option><option>Noite</option>
                      </select>
                    </label>
                  </div>

                  <label className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                    <input type="checkbox" checked={form.consent} onChange={(event) => setField('consent', event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0076DD]" />
                    <span className="text-xs leading-5 text-slate-600">Autorizo o contato da equipe para atender esta solicitação e concordo com o tratamento dos dados informados para essa finalidade.</span>
                  </label>

                  <input value={form.website} onChange={(event) => setField('website', event.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[10000px] h-px w-px opacity-0" />

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                    <button type="button" onClick={() => setStep(1)} className="btn-outline flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-600 sm:w-auto"><ArrowLeft className="h-4 w-4" /> Voltar</button>
                    <button type="submit" disabled={submitting} className="btn-filled flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0076DD] px-5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20">
                      {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <>Solicitar análise gratuita <ArrowRight className="h-4 w-4" /></>}
                    </button>
                  </div>
                </>
              )}

              {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
            </form>

            <p className="mt-5 flex items-center justify-center gap-2 text-center text-[11px] text-slate-500"><LockKeyhole className="h-3.5 w-3.5" /> Seus dados não serão vendidos ou compartilhados para publicidade.</p>
          </div>
        </section>
      </div>
    </div>
  );
};
