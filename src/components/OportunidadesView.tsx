import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Filter,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Target,
  UserRound,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import { Lead, LeadCaptureForm, LeadStage, ThemeConfig } from '../types';
import { ensureLeadCaptureForm, fetchLeads, leadFromRow, updateLeadStage } from '../services/leads';
import { getContrastFg } from '../utils/themeEngine';
import { supabase } from '../lib/supabase';

interface OportunidadesViewProps {
  theme: ThemeConfig;
  onShowToast: (message: string) => void;
}

const STAGES: Array<{
  key: LeadStage;
  label: string;
  description: string;
  color: string;
}> = [
  { key: 'novo', label: 'Novo', description: 'Aguardando atendimento', color: '#64B0F3' },
  { key: 'em_contato', label: 'Em contato', description: 'Primeiro contato iniciado', color: '#0076DD' },
  { key: 'qualificado', label: 'Qualificado', description: 'Interesse confirmado', color: '#8B7CC7' },
  { key: 'em_estudo', label: 'Em estudo', description: 'Dimensionamento e custos', color: '#FACB5C' },
  { key: 'proposta_enviada', label: 'Proposta enviada', description: 'Aguardando retorno', color: '#DEC488' },
  { key: 'negociacao', label: 'Negociação', description: 'Ajustes comerciais', color: '#E69B5C' },
  { key: 'ganho', label: 'Ganho', description: 'Venda aprovada', color: '#B4BF8A' },
  { key: 'perdido', label: 'Perdido', description: 'Oportunidade encerrada', color: '#D47B7B' },
];

const stageLabel = (stage: LeadStage) => STAGES.find((item) => item.key === stage)?.label ?? stage;

const formatCurrency = (value?: number) =>
  value == null
    ? null
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDateTime = (value?: string) => {
  if (!value) return 'Não definida';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
};

const getLeadPublicUrl = (token: string) => {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin);
  url.searchParams.set('captacao', token);
  return url.toString();
};

export const OportunidadesView: React.FC<OportunidadesViewProps> = ({ theme, onShowToast }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [captureForm, setCaptureForm] = useState<LeadCaptureForm | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<'Todos' | Lead['propertyType']>('Todos');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [error, setError] = useState('');

  const backgroundIsDark = getContrastFg(theme.background) === '#FFFFFF';
  const panelBg = backgroundIsDark
    ? `color-mix(in srgb, ${theme.background} 88%, #FFFFFF)`
    : `color-mix(in srgb, ${theme.background} 94%, #000000)`;
  const panelAltBg = backgroundIsDark
    ? `color-mix(in srgb, ${theme.background} 82%, #FFFFFF)`
    : `color-mix(in srgb, ${theme.background} 90%, #000000)`;
  const mutedText = `color-mix(in srgb, ${theme.text} 62%, transparent)`;

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const [leadData, formData] = await Promise.all([fetchLeads(), ensureLeadCaptureForm()]);
      setLeads(leadData);
      setCaptureForm(formData);
    } catch (loadError) {
      console.error('load leads error', loadError);
      setError('Não foi possível carregar o funil comercial.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    void loadData();

    const channel = supabase
      .channel('crm-leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          if (!mounted) return;

          if (payload.eventType === 'DELETE') {
            const deletedId = String((payload.old as { id?: string }).id ?? '');
            setLeads((current) => current.filter((lead) => lead.id !== deletedId));
            return;
          }

          const nextLead = leadFromRow(payload.new as Parameters<typeof leadFromRow>[0]);
          setLeads((current) => {
            const withoutCurrent = current.filter((lead) => lead.id !== nextLead.id);
            return [nextLead, ...withoutCurrent].sort(
              (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) => {
        const matchesSearch =
          !normalizedSearch ||
          lead.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
          lead.phone.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
          lead.email?.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
          lead.city.toLocaleLowerCase('pt-BR').includes(normalizedSearch);
        const matchesProperty = propertyFilter === 'Todos' || lead.propertyType === propertyFilter;
        return matchesSearch && matchesProperty;
      }),
    [leads, normalizedSearch, propertyFilter]
  );

  const leadsByStage = useMemo(
    () =>
      STAGES.reduce<Record<LeadStage, Lead[]>>(
        (grouped, stage) => ({ ...grouped, [stage.key]: filteredLeads.filter((lead) => lead.status === stage.key) }),
        {
          novo: [], em_contato: [], qualificado: [], em_estudo: [],
          proposta_enviada: [], negociacao: [], ganho: [], perdido: [],
        }
      ),
    [filteredLeads]
  );

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? null;
  const activeLeads = leads.filter((lead) => !['ganho', 'perdido'].includes(lead.status)).length;
  const newLeads = leadsByStage.novo.length;
  const negotiations = leadsByStage.negociacao.length;
  const wonLeads = leadsByStage.ganho.length;

  const copyFormLink = async () => {
    if (!captureForm) {
      onShowToast('O link de captação ainda está sendo preparado.');
      return;
    }

    const url = getLeadPublicUrl(captureForm.publicToken);
    try {
      await navigator.clipboard.writeText(url);
      onShowToast('Link do formulário copiado.');
    } catch {
      window.prompt('Copie o link do formulário:', url);
    }
  };

  const handleStageChange = async (status: LeadStage) => {
    if (!selectedLead || selectedLead.status === status || updatingStage) return;
    setUpdatingStage(true);
    try {
      const updated = await updateLeadStage(selectedLead.id, status);
      setLeads((current) => current.map((lead) => (lead.id === updated.id ? updated : lead)));
      onShowToast(`Lead movido para “${stageLabel(status)}”.`);
    } catch (updateError) {
      console.error('update lead stage error', updateError);
      onShowToast('Não foi possível alterar a etapa do lead.');
    } finally {
      setUpdatingStage(false);
    }
  };

  const panelStyle = { backgroundColor: panelBg, borderColor: theme.border, color: theme.text };

  if (loading) {
    return (
      <div id="oportunidades-page" className="flex min-h-[60vh] items-center justify-center" style={{ color: theme.text }}>
        <div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin" style={{ color: theme.secondary }} /><p className="mt-3 text-sm font-bold">Carregando funil comercial...</p></div>
      </div>
    );
  }

  return (
    <div id="oportunidades-page" className="mx-auto max-w-[1800px] space-y-5" style={{ color: theme.text }}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: mutedText }}><Target className="h-4 w-4" /> Comercial · CRM Solar</div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Funil de oportunidades</h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: mutedText }}>Todo contato recebido no site entra automaticamente em Novo e já recebe uma atividade de atendimento.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void loadData(true)} disabled={refreshing} className="btn-outline inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold" style={{ borderColor: theme.border, color: theme.text }}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar
          </button>
          {captureForm && (
            <a href={getLeadPublicUrl(captureForm.publicToken)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold" style={{ borderColor: theme.border, color: theme.text }}>
              <ExternalLink className="h-4 w-4" /> Abrir formulário
            </a>
          )}
          <button type="button" onClick={copyFormLink} className="btn-filled inline-flex h-10 items-center gap-2 rounded-lg px-4 text-xs font-extrabold" style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}>
            <Clipboard className="h-4 w-4" /> Copiar link de captação
          </button>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">{error}</div>}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Leads ativos', value: activeLeads, icon: Target, color: theme.secondary },
          { label: 'Novos aguardando', value: newLeads, icon: MessageCircle, color: '#64B0F3' },
          { label: 'Em negociação', value: negotiations, icon: WalletCards, color: '#FACB5C' },
          { label: 'Vendas ganhas', value: wonLeads, icon: CheckCircle2, color: '#B4BF8A' },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-xl border p-4" style={panelStyle}>
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-semibold" style={{ color: mutedText }}>{metric.label}</p><p className="mt-2 text-2xl font-extrabold">{metric.value}</p></div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${metric.color} 18%, transparent)`, color: metric.color }}><Icon className="h-[18px] w-[18px]" /></div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border p-3 lg:flex-row lg:items-center" style={panelStyle}>
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: mutedText }} />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, telefone, e-mail ou cidade..." className="crm-input pl-9" />
        </div>
        <div className="flex h-[42px] items-center gap-2 rounded-lg border px-3" style={{ borderColor: theme.border }}>
          <Filter className="h-4 w-4" style={{ color: mutedText }} />
          <select value={propertyFilter} onChange={(event) => setPropertyFilter(event.target.value as typeof propertyFilter)} className="bg-transparent text-xs font-bold outline-none" style={{ color: theme.text }}>
            <option>Todos</option><option>Residencial</option><option>Comercial</option><option>Rural</option><option>Industrial</option>
          </select>
        </div>
      </section>

      <section className="overflow-x-auto pb-3">
        <div className="grid min-w-[2320px] grid-cols-8 gap-3">
          {STAGES.map((stage) => (
            <div key={stage.key} className="min-w-0 rounded-xl border p-2.5" style={{ backgroundColor: panelBg, borderColor: theme.border }}>
              <div className="mb-3 flex items-start justify-between gap-2 px-1 pt-1">
                <div>
                  <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} /><h2 className="text-xs font-extrabold">{stage.label}</h2></div>
                  <p className="mt-1 text-[10px]" style={{ color: mutedText }}>{stage.description}</p>
                </div>
                <span className="rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold" style={{ borderColor: theme.border, color: mutedText }}>{leadsByStage[stage.key].length}</span>
              </div>

              <div className="min-h-[420px] space-y-2">
                {leadsByStage[stage.key].map((lead) => (
                  <button key={lead.id} type="button" onClick={() => setSelectedLeadId(lead.id)} className="w-full rounded-xl border p-3 text-left" style={{ backgroundColor: panelAltBg, borderColor: selectedLeadId === lead.id ? theme.secondary : theme.border, color: theme.text }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><p className="truncate text-xs font-extrabold">{lead.name}</p><p className="mt-1 flex items-center gap-1 text-[10px]" style={{ color: mutedText }}><MapPin className="h-3 w-3" /> {lead.city}/{lead.state}</p></div>
                      <ArrowRight className="h-4 w-4 shrink-0" style={{ color: stage.color }} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-md border px-1.5 py-1 text-[9px] font-bold" style={{ borderColor: theme.border }}>{lead.propertyType}</span>
                      {lead.averageMonthlyBill != null && <span className="rounded-md border px-1.5 py-1 text-[9px] font-bold" style={{ borderColor: theme.border }}>{formatCurrency(lead.averageMonthlyBill)}</span>}
                      {lead.averageConsumptionKWh != null && <span className="rounded-md border px-1.5 py-1 text-[9px] font-bold" style={{ borderColor: theme.border }}>{lead.averageConsumptionKWh} kWh</span>}
                    </div>
                    <div className="mt-3 border-t pt-2 text-[9px]" style={{ borderColor: theme.border, color: mutedText }}><span className="font-bold">{lead.source}</span> · {formatDateTime(lead.createdAt)}</div>
                  </button>
                ))}

                {leadsByStage[stage.key].length === 0 && <div className="rounded-xl border border-dashed p-5 text-center text-[10px]" style={{ borderColor: theme.border, color: mutedText }}>Nenhum lead nesta etapa</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedLead && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/55 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedLeadId(null); }}>
          <aside className="h-full w-full max-w-xl overflow-y-auto border-l shadow-2xl" style={{ backgroundColor: panelBg, borderColor: theme.border, color: theme.text }}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b p-4" style={{ backgroundColor: panelBg, borderColor: theme.border }}>
              <div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: theme.secondary }}>Ficha do lead</p><h2 className="mt-1 text-lg font-extrabold">{selectedLead.name}</h2></div>
              <button type="button" onClick={() => setSelectedLeadId(null)} className="btn-outline flex h-9 w-9 items-center justify-center rounded-lg border" style={{ borderColor: theme.border, color: theme.text }}><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <section className="rounded-xl border p-4" style={{ backgroundColor: panelAltBg, borderColor: theme.border }}>
                <label className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: mutedText }}>Etapa atual</label>
                <div className="mt-2 flex items-center gap-2">
                  <select value={selectedLead.status} disabled={updatingStage} onChange={(event) => void handleStageChange(event.target.value as LeadStage)} className="crm-input flex-1">
                    {STAGES.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
                  </select>
                  {updatingStage && <Loader2 className="h-5 w-5 animate-spin" style={{ color: theme.secondary }} />}
                </div>
              </section>

              <section className="grid grid-cols-2 gap-2">
                <a href={`https://wa.me/55${selectedLead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-lg text-xs font-extrabold" style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}><MessageCircle className="h-4 w-4" /> WhatsApp</a>
                <a href={`tel:${selectedLead.phone.replace(/\D/g, '')}`} className="flex h-11 items-center justify-center gap-2 rounded-lg border text-xs font-extrabold" style={{ borderColor: theme.border, color: theme.text }}><Phone className="h-4 w-4" /> Ligar</a>
              </section>

              <section className="rounded-xl border p-4" style={{ backgroundColor: panelAltBg, borderColor: theme.border }}>
                <h3 className="flex items-center gap-2 text-xs font-extrabold"><UserRound className="h-4 w-4" style={{ color: theme.secondary }} /> Contato</h3>
                <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
                  <div><p style={{ color: mutedText }}>WhatsApp</p><p className="mt-1 font-bold">{selectedLead.phone}</p></div>
                  <div><p style={{ color: mutedText }}>E-mail</p><p className="mt-1 break-all font-bold">{selectedLead.email || 'Não informado'}</p></div>
                  <div><p style={{ color: mutedText }}>Localização</p><p className="mt-1 font-bold">{selectedLead.city}/{selectedLead.state}</p></div>
                  <div><p style={{ color: mutedText }}>Melhor horário</p><p className="mt-1 font-bold">{selectedLead.preferredContactTime || 'Qualquer horário'}</p></div>
                </div>
              </section>

              <section className="rounded-xl border p-4" style={{ backgroundColor: panelAltBg, borderColor: theme.border }}>
                <h3 className="flex items-center gap-2 text-xs font-extrabold"><Zap className="h-4 w-4" style={{ color: '#FACB5C' }} /> Perfil de energia</h3>
                <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
                  <div><p style={{ color: mutedText }}>Tipo do imóvel</p><p className="mt-1 font-bold">{selectedLead.propertyType}</p></div>
                  <div><p style={{ color: mutedText }}>Situação</p><p className="mt-1 font-bold">{selectedLead.propertyStatus || 'Não informada'}</p></div>
                  <div><p style={{ color: mutedText }}>Conta média</p><p className="mt-1 font-bold">{formatCurrency(selectedLead.averageMonthlyBill) || 'Não informada'}</p></div>
                  <div><p style={{ color: mutedText }}>Consumo médio</p><p className="mt-1 font-bold">{selectedLead.averageConsumptionKWh != null ? `${selectedLead.averageConsumptionKWh} kWh/mês` : 'Não informado'}</p></div>
                  <div><p style={{ color: mutedText }}>Distribuidora</p><p className="mt-1 font-bold">{selectedLead.distributor || 'Não informada'}</p></div>
                  <div><p style={{ color: mutedText }}>Prazo pretendido</p><p className="mt-1 font-bold">{selectedLead.installationTimeframe || 'Sem prazo definido'}</p></div>
                </div>
              </section>

              <section className="rounded-xl border p-4" style={{ backgroundColor: panelAltBg, borderColor: theme.border }}>
                <h3 className="flex items-center gap-2 text-xs font-extrabold"><CalendarClock className="h-4 w-4" style={{ color: theme.secondary }} /> Próxima atividade</h3>
                <div className="mt-3 flex items-start gap-3 rounded-lg border p-3" style={{ borderColor: theme.border }}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${theme.secondary} 18%, transparent)`, color: theme.secondary }}><Phone className="h-4 w-4" /></div>
                  <div><p className="text-xs font-extrabold">Realizar primeiro contato</p><p className="mt-1 text-[10px]" style={{ color: mutedText }}>{formatDateTime(selectedLead.nextActivityAt)}</p></div>
                </div>
              </section>

              <section className="rounded-xl border p-4" style={{ backgroundColor: panelAltBg, borderColor: theme.border }}>
                <h3 className="flex items-center gap-2 text-xs font-extrabold"><Building2 className="h-4 w-4" style={{ color: theme.secondary }} /> Origem</h3>
                <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
                  <div><p style={{ color: mutedText }}>Canal</p><p className="mt-1 font-bold">{selectedLead.source}</p></div>
                  <div><p style={{ color: mutedText }}>Campanha</p><p className="mt-1 font-bold">{selectedLead.utmCampaign || 'Orgânico / não informado'}</p></div>
                  <div><p style={{ color: mutedText }}>Recebido em</p><p className="mt-1 font-bold">{formatDateTime(selectedLead.createdAt)}</p></div>
                  <div><p style={{ color: mutedText }}>Consentimento</p><p className="mt-1 font-bold">Registrado em {formatDateTime(selectedLead.consentAt)}</p></div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
