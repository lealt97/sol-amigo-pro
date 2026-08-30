import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  Clipboard,
  CirclePlus,
  ExternalLink,
  FileText,
  Filter,
  ListTodo,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Save,
  Search,
  Target,
  UserCheck,
  UserRound,
  UserX,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import {
  Lead,
  LeadActivity,
  LeadCaptureForm,
  LeadStage,
  LeadTask,
  ThemeConfig,
} from '../types';
import {
  completeLeadTask,
  createLeadTask,
  ensureLeadCaptureForm,
  fetchLeadActivities,
  fetchLeads,
  fetchLeadTasks,
  leadFromRow,
  markLeadLost,
  qualifyLead,
  registerLeadContact,
  saveLeadDetails,
  updateLeadStage,
} from '../services/leads';
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

const defaultFutureDateTime = () => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const errorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
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
  const [leadTasks, setLeadTasks] = useState<LeadTask[]>([]);
  const [leadActivities, setLeadActivities] = useState<LeadActivity[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMode, setActionMode] = useState<'contact' | 'qualify' | 'lost' | null>(null);
  const [responsible, setResponsible] = useState('');
  const [notes, setNotes] = useState('');
  const [contactChannel, setContactChannel] = useState('WhatsApp');
  const [contactSummary, setContactSummary] = useState('');
  const [contactNextAt, setContactNextAt] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueAt, setTaskDueAt] = useState(defaultFutureDateTime);
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

  useEffect(() => {
    if (!selectedLeadId) {
      setLeadTasks([]);
      setLeadActivities([]);
      setActionMode(null);
      return;
    }

    const lead = leads.find((item) => item.id === selectedLeadId);
    setResponsible(lead?.responsible ?? '');
    setNotes(lead?.notes ?? '');
    setActionMode(null);
    setContactSummary('');
    setContactNextAt('');
    setLostReason(lead?.lostReason ?? '');
    setTaskTitle('');
    setTaskDueAt(defaultFutureDateTime());

    let cancelled = false;
    setDetailsLoading(true);
    void Promise.all([fetchLeadTasks(selectedLeadId), fetchLeadActivities(selectedLeadId)])
      .then(([tasks, activities]) => {
        if (cancelled) return;
        setLeadTasks(tasks);
        setLeadActivities(activities);
      })
      .catch((detailsError) => {
        console.error('load lead details error', detailsError);
        if (!cancelled) onShowToast('Não foi possível carregar tarefas e histórico.');
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedLeadId]);

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
    if (status === 'qualificado') {
      setActionMode('qualify');
      return;
    }
    if (status === 'perdido') {
      setActionMode('lost');
      return;
    }
    setUpdatingStage(true);
    try {
      const updated = await updateLeadStage(selectedLead.id, status);
      setLeads((current) => current.map((lead) => (lead.id === updated.id ? updated : lead)));
      if (selectedLead.status === 'perdido') setLostReason('');
      onShowToast(`Lead movido para “${stageLabel(status)}”.`);
    } catch (updateError) {
      console.error('update lead stage error', updateError);
      onShowToast('Não foi possível alterar a etapa do lead.');
    } finally {
      setUpdatingStage(false);
    }
  };

  const replaceLead = (updated: Lead) => {
    setLeads((current) => current.map((lead) => (lead.id === updated.id ? updated : lead)));
    setResponsible(updated.responsible ?? '');
    setNotes(updated.notes ?? '');
    setLostReason(updated.lostReason ?? '');
  };

  const refreshLeadDetails = async (leadId: string) => {
    const [tasks, activities] = await Promise.all([
      fetchLeadTasks(leadId),
      fetchLeadActivities(leadId),
    ]);
    setLeadTasks(tasks);
    setLeadActivities(activities);
  };

  const handleSaveDetails = async () => {
    if (!selectedLead || actionLoading) return;
    setActionLoading(true);
    try {
      const updated = await saveLeadDetails(selectedLead.id, responsible, notes);
      replaceLead(updated);
      await refreshLeadDetails(selectedLead.id);
      onShowToast('Ficha comercial salva.');
    } catch (saveError) {
      console.error('save lead details error', saveError);
      onShowToast(errorMessage(saveError, 'Não foi possível salvar a ficha.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegisterContact = async () => {
    if (!selectedLead || actionLoading) return;
    if (!contactSummary.trim()) {
      onShowToast('Informe um resumo do contato.');
      return;
    }
    setActionLoading(true);
    try {
      const updated = await registerLeadContact(
        selectedLead.id,
        contactChannel,
        contactSummary,
        contactNextAt ? new Date(contactNextAt).toISOString() : undefined
      );
      replaceLead(updated);
      await refreshLeadDetails(selectedLead.id);
      setContactSummary('');
      setContactNextAt('');
      setActionMode(null);
      onShowToast('Contato registrado no histórico.');
    } catch (contactError) {
      console.error('register lead contact error', contactError);
      onShowToast(errorMessage(contactError, 'Não foi possível registrar o contato.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleQualify = async () => {
    if (!selectedLead || actionLoading) return;
    setActionLoading(true);
    try {
      const updated = await qualifyLead(selectedLead.id, responsible, notes);
      replaceLead(updated);
      await refreshLeadDetails(selectedLead.id);
      setActionMode(null);
      onShowToast('Lead qualificado. Cliente e unidade consumidora criados.');
    } catch (qualifyError) {
      console.error('qualify lead error', qualifyError);
      onShowToast(errorMessage(qualifyError, 'Não foi possível qualificar o lead.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkLost = async () => {
    if (!selectedLead || actionLoading) return;
    if (lostReason.trim().length < 3) {
      onShowToast('Informe o motivo da perda.');
      return;
    }
    setActionLoading(true);
    try {
      const updated = await markLeadLost(selectedLead.id, lostReason);
      replaceLead(updated);
      await refreshLeadDetails(selectedLead.id);
      setActionMode(null);
      onShowToast('Lead encerrado como perdido.');
    } catch (lostError) {
      console.error('mark lead lost error', lostError);
      onShowToast(errorMessage(lostError, 'Não foi possível encerrar o lead.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!selectedLead || actionLoading) return;
    if (taskTitle.trim().length < 2 || !taskDueAt) {
      onShowToast('Informe a tarefa e a data de vencimento.');
      return;
    }
    setActionLoading(true);
    try {
      await createLeadTask(selectedLead.id, taskTitle.trim(), new Date(taskDueAt).toISOString());
      await refreshLeadDetails(selectedLead.id);
      setTaskTitle('');
      setTaskDueAt(defaultFutureDateTime());
      onShowToast('Tarefa criada.');
    } catch (taskError) {
      console.error('create lead task error', taskError);
      onShowToast(errorMessage(taskError, 'Não foi possível criar a tarefa.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!selectedLead || actionLoading) return;
    setActionLoading(true);
    try {
      await completeLeadTask(taskId);
      await refreshLeadDetails(selectedLead.id);
      onShowToast('Tarefa concluída.');
    } catch (taskError) {
      console.error('complete lead task error', taskError);
      onShowToast(errorMessage(taskError, 'Não foi possível concluir a tarefa.'));
    } finally {
      setActionLoading(false);
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
                {selectedLead.clientId && selectedLead.consumerUnitId && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-400">
                    <UserCheck className="h-4 w-4" /> Cliente e unidade consumidora vinculados
                  </div>
                )}
                {selectedLead.lostReason && (
                  <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
                    <span className="font-extrabold">Motivo da perda:</span> {selectedLead.lostReason}
                  </div>
                )}
              </section>

              <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setActionMode(actionMode === 'contact' ? null : 'contact')}
                  disabled={selectedLead.status === 'ganho' || selectedLead.status === 'perdido'}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg border text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ borderColor: theme.border, color: theme.text }}
                >
                  <MessageCircle className="h-4 w-4" /> Registrar contato
                </button>
                <button
                  type="button"
                  onClick={() => setActionMode(actionMode === 'qualify' ? null : 'qualify')}
                  disabled={selectedLead.status === 'ganho' || selectedLead.status === 'perdido'}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg border text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ borderColor: theme.border, color: theme.text }}
                >
                  <UserCheck className="h-4 w-4" /> Qualificar
                </button>
                <button
                  type="button"
                  onClick={() => setActionMode(actionMode === 'lost' ? null : 'lost')}
                  disabled={selectedLead.status === 'perdido'}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg border border-red-500/35 text-xs font-extrabold text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <UserX className="h-4 w-4" /> Marcar perda
                </button>
              </section>

              {actionMode === 'contact' && (
                <section className="rounded-xl border p-4" style={{ backgroundColor: panelAltBg, borderColor: theme.border }}>
                  <h3 className="text-xs font-extrabold">Registrar contato realizado</h3>
                  <div className="mt-3 grid gap-3">
                    <select value={contactChannel} onChange={(event) => setContactChannel(event.target.value)} className="crm-input">
                      <option>WhatsApp</option>
                      <option>Ligação</option>
                      <option>E-mail</option>
                      <option>Presencial</option>
                      <option>Outro</option>
                    </select>
                    <textarea
                      value={contactSummary}
                      onChange={(event) => setContactSummary(event.target.value)}
                      maxLength={1000}
                      rows={3}
                      placeholder="Resumo do que foi conversado..."
                      className="crm-input min-h-[88px] resize-y py-3"
                    />
                    <label className="text-[10px] font-bold" style={{ color: mutedText }}>
                      Próximo acompanhamento (opcional)
                      <input
                        type="datetime-local"
                        value={contactNextAt}
                        onChange={(event) => setContactNextAt(event.target.value)}
                        className="crm-input mt-1"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleRegisterContact()}
                      disabled={actionLoading}
                      className="btn-filled flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-extrabold disabled:opacity-60"
                      style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Salvar contato
                    </button>
                  </div>
                </section>
              )}

              {actionMode === 'qualify' && (
                <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <h3 className="flex items-center gap-2 text-xs font-extrabold text-emerald-300">
                    <UserCheck className="h-4 w-4" /> Qualificar e converter
                  </h3>
                  <p className="mt-2 text-[11px]" style={{ color: mutedText }}>
                    Cria ou reaproveita o cliente, cria a unidade consumidora e mantém o vínculo com este lead.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleQualify()}
                    disabled={actionLoading}
                    className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-xs font-extrabold text-white disabled:opacity-60"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                    Confirmar qualificação
                  </button>
                </section>
              )}

              {actionMode === 'lost' && (
                <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <h3 className="flex items-center gap-2 text-xs font-extrabold text-red-300">
                    <UserX className="h-4 w-4" /> Encerrar oportunidade
                  </h3>
                  <textarea
                    value={lostReason}
                    onChange={(event) => setLostReason(event.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="Por que esta oportunidade foi perdida?"
                    className="crm-input mt-3 min-h-[82px] resize-y py-3"
                  />
                  <button
                    type="button"
                    onClick={() => void handleMarkLost()}
                    disabled={actionLoading}
                    className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-red-600 text-xs font-extrabold text-white disabled:opacity-60"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                    Confirmar perda
                  </button>
                </section>
              )}

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
                <h3 className="flex items-center gap-2 text-xs font-extrabold">
                  <FileText className="h-4 w-4" style={{ color: theme.secondary }} /> Responsável e observações
                </h3>
                <div className="mt-3 grid gap-3">
                  <input
                    value={responsible}
                    onChange={(event) => setResponsible(event.target.value)}
                    maxLength={120}
                    placeholder="Responsável pelo atendimento"
                    className="crm-input"
                  />
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    maxLength={4000}
                    rows={4}
                    placeholder="Informações importantes para a negociação..."
                    className="crm-input min-h-[96px] resize-y py-3"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveDetails()}
                    disabled={actionLoading}
                    className="btn-outline flex h-10 items-center justify-center gap-2 rounded-lg border text-xs font-extrabold disabled:opacity-60"
                    style={{ borderColor: theme.border, color: theme.text }}
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar ficha
                  </button>
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
                <h3 className="flex items-center gap-2 text-xs font-extrabold">
                  <ListTodo className="h-4 w-4" style={{ color: theme.secondary }} /> Tarefas
                </h3>
                <div className="mt-3 space-y-2">
                  {detailsLoading && (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-5 w-5 animate-spin" style={{ color: theme.secondary }} />
                    </div>
                  )}
                  {!detailsLoading && leadTasks.length === 0 && (
                    <p className="rounded-lg border border-dashed p-3 text-center text-[10px]" style={{ borderColor: theme.border, color: mutedText }}>
                      Nenhuma tarefa registrada
                    </p>
                  )}
                  {leadTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                      style={{ borderColor: theme.border, opacity: task.status === 'concluida' ? 0.65 : 1 }}
                    >
                      <button
                        type="button"
                        onClick={() => task.status === 'pendente' && void handleCompleteTask(task.id)}
                        disabled={task.status === 'concluida' || actionLoading}
                        aria-label={task.status === 'concluida' ? 'Tarefa concluída' : 'Concluir tarefa'}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border disabled:cursor-default"
                        style={{
                          borderColor: task.status === 'concluida' ? '#10B981' : theme.border,
                          color: task.status === 'concluida' ? '#10B981' : theme.secondary,
                        }}
                      >
                        {task.status === 'concluida' ? <Check className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
                      </button>
                      <div className="min-w-0">
                        <p className={`text-xs font-extrabold ${task.status === 'concluida' ? 'line-through' : ''}`}>{task.title}</p>
                        <p className="mt-1 text-[10px]" style={{ color: mutedText }}>
                          {task.status === 'concluida' ? `Concluída em ${formatDateTime(task.completedAt)}` : formatDateTime(task.dueAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid gap-2 border-t pt-3" style={{ borderColor: theme.border }}>
                  <input
                    value={taskTitle}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    maxLength={160}
                    placeholder="Nova tarefa"
                    className="crm-input"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="datetime-local"
                      value={taskDueAt}
                      onChange={(event) => setTaskDueAt(event.target.value)}
                      className="crm-input flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCreateTask()}
                      disabled={actionLoading}
                      className="btn-outline flex h-[42px] items-center justify-center gap-2 rounded-lg border px-4 text-xs font-extrabold disabled:opacity-60"
                      style={{ borderColor: theme.border, color: theme.text }}
                    >
                      <CirclePlus className="h-4 w-4" /> Criar
                    </button>
                  </div>
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

              <section className="rounded-xl border p-4" style={{ backgroundColor: panelAltBg, borderColor: theme.border }}>
                <h3 className="flex items-center gap-2 text-xs font-extrabold">
                  <Activity className="h-4 w-4" style={{ color: theme.secondary }} /> Histórico do lead
                </h3>
                <div className="mt-4 space-y-0">
                  {detailsLoading && (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-5 w-5 animate-spin" style={{ color: theme.secondary }} />
                    </div>
                  )}
                  {!detailsLoading && leadActivities.length === 0 && (
                    <p className="rounded-lg border border-dashed p-3 text-center text-[10px]" style={{ borderColor: theme.border, color: mutedText }}>
                      O histórico será formado a partir das próximas ações.
                    </p>
                  )}
                  {leadActivities.map((activity, index) => (
                    <div key={activity.id} className="relative flex gap-3 pb-4">
                      {index < leadActivities.length - 1 && (
                        <span
                          className="absolute left-[7px] top-4 h-[calc(100%-8px)] w-px"
                          style={{ backgroundColor: theme.border }}
                        />
                      )}
                      <span
                        className="relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2"
                        style={{ borderColor: theme.secondary, backgroundColor: panelAltBg }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold">{activity.title}</p>
                        {activity.description && (
                          <p className="mt-1 whitespace-pre-wrap text-[11px]" style={{ color: mutedText }}>
                            {activity.description}
                          </p>
                        )}
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-wide" style={{ color: mutedText }}>
                          {formatDateTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
