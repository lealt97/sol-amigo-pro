import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Files,
  FileText,
  Mail,
  MapPin,
  MoreVertical,
  NotepadText,
  Phone,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';
import { supabase, validateCurrentPassword } from '../lib/supabase';
import { Lead, LeadStage, PageKey, ThemeConfig } from '../types';
import {
  addLeadToClients,
  createManualLead,
  createProposalFromLead,
  deleteOwnedLead,
  fetchLeads,
  ProposalSystemType,
  updateLeadNotes,
  updateLeadStatus,
  isLeadConverted,
  LEADS_UPDATED_EVENT,
} from '../services/leads';
import { syncLeadAsClient } from '../services/clients';
import { LeadParametersModal } from './LeadParametersModal';
import { LeadNotesModal } from './LeadNotesModal';
import { ProposalWizardModal } from './ProposalWizardModal';
import { formatPhone } from '../utils/formatters';
import { getContrastFg } from '../utils/themeEngine';
import { LEAD_STAGE_LABELS, LEAD_STATUS_PALETTE, getLeadStatusStyle } from '../utils/leadStatus';
import { fetchAndSyncLeadNotifications, markLeadAsRead } from '../services/leadNotifications';
import { LEAD_STATUS_CHANGED_EVENT } from '../utils/leadStatusPersistence';
import { BRAZIL_STATE_GROUPS, BRAZIL_STATE_NAMES } from '../data/brazilStates';
import { fetchWebsiteFormSettings } from '../services/websiteFormIntegration';

interface LeadsViewProps {
  theme: ThemeConfig;
  onShowToast: (message: string) => void;
  onNavigate?: (page: PageKey, filter?: string) => void;
}

const statusLabels: Record<Lead['status'], string> = LEAD_STAGE_LABELS;

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function LeadsView({ theme, onShowToast, onNavigate }: LeadsViewProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [proposalLead, setProposalLead] = useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);
  const [notesLead, setNotesLead] = useState<Lead | null>(null);
  const [paramsLead, setParamsLead] = useState<Lead | null>(null);
  const [systemType, setSystemType] = useState<ProposalSystemType>('On-Grid');
  const [password, setPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);

  // Estados do modal de Novo Lead
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [savingNewLead, setSavingNewLead] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadCity, setNewLeadCity] = useState('Campinas');
  const [newLeadState, setNewLeadState] = useState('SP');
  const [configuredStates, setConfiguredStates] = useState<string[]>([]);
  const [newLeadStreet, setNewLeadStreet] = useState('');
  const [newLeadNumber, setNewLeadNumber] = useState('');
  const [newLeadConcessionaria, setNewLeadConcessionaria] = useState('');
  const [newLeadAvgConsumption, setNewLeadAvgConsumption] = useState<number | ''>('');

  // Carrega estados configurados no formulário do site
  useEffect(() => {
    fetchWebsiteFormSettings()
      .then((settings) => {
        if (settings?.serviceStates && settings.serviceStates.length > 0) {
          const valid = settings.serviceStates.filter(Boolean);
          setConfiguredStates(valid);
          if (valid.length > 0) {
            setNewLeadState((prev) => (prev && valid.includes(prev) ? prev : valid[0]));
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleCreateNewLead = async (e: FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim()) {
      onShowToast('Informe o nome completo do titular.');
      return;
    }

    setSavingNewLead(true);
    try {
      const created = await createManualLead({
        name: newLeadName.trim(),
        phone: newLeadPhone.trim(),
        email: newLeadEmail.trim() || undefined,
        city: newLeadCity.trim() || 'Campinas',
        state: (newLeadState.trim() || 'SP').toUpperCase().slice(0, 2),
        street: newLeadStreet.trim() || undefined,
        addressNumber: newLeadNumber.trim() || undefined,
        propertyType: 'Residencial',
        distributor: newLeadConcessionaria.trim() || undefined,
        averageConsumptionKWh: newLeadAvgConsumption ? Number(newLeadAvgConsumption) : undefined,
      });

      setLeads((prev) => [created, ...prev.filter((l) => l.id !== created.id)]);
      setIsNewLeadModalOpen(false);
      onShowToast(`Lead ${created.name} cadastrado com sucesso!`);

      // Reset
      setNewLeadName('');
      setNewLeadPhone('');
      setNewLeadEmail('');
      setNewLeadStreet('');
      setNewLeadNumber('');
      setNewLeadConcessionaria('');
      setNewLeadAvgConsumption('');
      setNewLeadCity('Campinas');
      if (configuredStates.length > 0) {
        setNewLeadState(configuredStates[0]);
      } else {
        setNewLeadState('SP');
      }
    } catch (err: any) {
      onShowToast(err?.message || 'Erro ao cadastrar lead.');
    } finally {
      setSavingNewLead(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setLeads(await fetchLeads());
      void fetchAndSyncLeadNotifications();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar os leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpenMenuId(null);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(target)) {
        setOpenStatusMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sincroniza em tempo real caso o status seja alterado no modal de parâmetros ou em outro componente
  useEffect(() => {
    const handleStatusEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ leadId: string; status: LeadStage }>;
      if (customEvent.detail) {
        const { leadId, status: newStatus } = customEvent.detail;
        setLeads((current) =>
          current.map((item) => (item.id === leadId ? { ...item, status: newStatus } : item))
        );
        setParamsLead((current) =>
          current && current.id === leadId ? { ...current, status: newStatus } : current
        );
      }
    };

    const handleLeadsUpdated = () => {
      void load();
    };

    window.addEventListener(LEAD_STATUS_CHANGED_EVENT, handleStatusEvent);
    window.addEventListener(LEADS_UPDATED_EVENT, handleLeadsUpdated);
    return () => {
      window.removeEventListener(LEAD_STATUS_CHANGED_EVENT, handleStatusEvent);
      window.removeEventListener(LEADS_UPDATED_EVENT, handleLeadsUpdated);
    };
  }, []);

  const handleQuickStatusChange = async (lead: Lead, newStatus: LeadStage) => {
    if (lead.status === newStatus) {
      setOpenStatusMenuId(null);
      return;
    }

    const previousStatus = lead.status;
    const statusLabel = LEAD_STAGE_LABELS[newStatus] || newStatus;

    // Atualização otimista imediata na UI e no lead aberto em parâmetros
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? { ...item, status: newStatus } : item))
    );
    setParamsLead((current) =>
      current && current.id === lead.id ? { ...current, status: newStatus } : current
    );
    setOpenStatusMenuId(null);
    setUpdatingStatusId(lead.id);

    try {
      await updateLeadStatus(lead.id, newStatus);
      onShowToast(`Status de ${lead.name} alterado para "${statusLabel}".`);
    } catch (err: any) {
      console.warn('Erro ao atualizar status:', err);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const isLight = getContrastFg(theme.primary) === '#0F172A';

  const isLeadConverted = (l: Lead) => Boolean(l.clientId || (l.status as string) === 'Cliente');

  const activeLeads = useMemo(() => {
    return leads.filter((lead) => !isLeadConverted(lead));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return activeLeads.filter((lead) => {
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
      if (!query) return true;
      return [lead.name, lead.phone, lead.email, lead.street, lead.addressNumber, lead.city, lead.state, lead.source]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(query));
    });
  }, [activeLeads, search, statusFilter]);

  const handleAddClient = async (lead: Lead) => {
    setOpenMenuId(null);
    setWorkingId(lead.id);
    try {
      const clientId = await addLeadToClients(lead.id);
      syncLeadAsClient(lead, clientId);
      setLeads((current) => current.filter((item) => item.id !== lead.id));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(LEADS_UPDATED_EVENT, { detail: { convertedLeadId: lead.id, clientId } }));
      }
      onShowToast(`${lead.name} foi adicionado aos clientes.`);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível adicionar o cliente.');
    } finally {
      setWorkingId(null);
    }
  };

  const handleCreateProposal = async () => {
    if (!proposalLead) return;
    setWorkingId(proposalLead.id);
    setModalError('');
    try {
      const proposal = await createProposalFromLead(proposalLead.id, systemType, {
        clientId: proposalLead.clientId,
        clientName: proposalLead.name,
      });
      onShowToast(`Proposta ${proposal.proposalCode} criada como rascunho.`);
      setProposalLead(null);
      setSystemType('On-Grid');
    } catch (err: any) {
      setModalError(err?.message || 'Não foi possível criar a proposta.');
    } finally {
      setWorkingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteLead || !password) return;
    setWorkingId(deleteLead.id);
    setModalError('');
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user?.email) throw new Error('Não foi possível identificar o e-mail da conta.');
      const passwordError = await validateCurrentPassword(data.user.email, password);
      if (passwordError) throw new Error('Senha incorreta. O lead não foi excluído.');
      await deleteOwnedLead(deleteLead.id);
      setLeads((current) => current.filter((item) => item.id !== deleteLead.id));
      onShowToast(`Lead ${deleteLead.name} excluído.`);
      setDeleteLead(null);
      setPassword('');
    } catch (err: any) {
      setModalError(err?.message || 'Não foi possível excluir o lead.');
    } finally {
      setWorkingId(null);
    }
  };

  const openDelete = (lead: Lead) => {
    setOpenMenuId(null);
    setPassword('');
    setModalError('');
    setDeleteLead(lead);
  };

  const openNotes = (lead: Lead) => {
    setOpenMenuId(null);
    setModalError('');
    setNotesLead(lead);
    markLeadAsRead(lead.id);
  };

  const openParams = (lead: Lead) => {
    setOpenMenuId(null);
    setParamsLead(lead);
    markLeadAsRead(lead.id);
  };

  return (
    <section id="leads-page" className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dim)]">Captação comercial</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text)]">Leads</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Interessados captados pelo site ou cadastrados manualmente.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsNewLeadModalOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all shadow-sm hover:brightness-110 active:scale-[0.98] cursor-pointer"
            style={{
              backgroundColor: theme.secondary,
              color: 'var(--secondary-fg)',
            }}
          >
            <UserPlus className="h-4 w-4" /> Novo lead
          </button>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="btn-outline inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-all hover:border-[var(--secondary)] hover:bg-[var(--secondary)] hover:text-[var(--secondary-fg)] cursor-pointer"
            style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text }}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
      </div>

      <div className="rounded-xl border p-3 space-y-2.5" style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text }}>
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dim)]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, telefone, cidade ou e-mail" className="h-10 w-full rounded-lg border pl-10 pr-4 text-sm outline-none focus:border-[var(--secondary)]" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }} />
        </div>

        {/* Barra de Filtro Rápido com Cores Semânticas de Cada Status */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs pt-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded-full px-3 py-1 font-semibold transition-all shrink-0 border inline-flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'border-[var(--secondary)] bg-[var(--secondary)] text-[var(--secondary-fg)] shadow-sm'
                : 'border-[var(--border)] text-[var(--dim)] hover:text-[var(--text)]'
            }`}
            style={statusFilter === 'all' ? undefined : { backgroundColor: theme.background }}
          >
            <span>Todos</span>
            <span className="rounded-full px-1.5 py-0.2 text-[10px] font-bold opacity-85">
              {activeLeads.length}
            </span>
          </button>
          {(Object.keys(LEAD_STAGE_LABELS) as LeadStage[]).map((stKey) => {
            const count = activeLeads.filter((l) => l.status === stKey).length;
            const st = getLeadStatusStyle(stKey, isLight);
            const isSelected = statusFilter === stKey;
            return (
              <button
                key={stKey}
                type="button"
                data-status-badge="true"
                onClick={() => setStatusFilter(isSelected ? 'all' : stKey)}
                className="status-filter-chip rounded-full px-3 py-1 font-semibold transition-all shrink-0 border inline-flex items-center gap-1.5"
                style={{
                  backgroundColor: isSelected ? st.color : st.bg,
                  borderColor: isSelected ? st.color : st.border,
                  color: isSelected ? '#ffffff' : st.color,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: isSelected ? '#ffffff' : st.color }}
                />
                <span>{st.label}</span>
                <span
                  className="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
                  style={{
                    backgroundColor: isSelected ? 'rgba(0,0,0,0.25)' : 'color-mix(in srgb, currentColor 15%, transparent)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'color-mix(in srgb, var(--danger) 40%, transparent)', backgroundColor: 'color-mix(in srgb, var(--danger) 10%, transparent)', color: 'var(--danger)' }}>{error}</div>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-xl border" style={{ backgroundColor: theme.primary, borderColor: theme.border }} />)}</div>
      ) : filteredLeads.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-16 text-center" style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text }}>
          <Zap className="mx-auto h-8 w-8 text-[var(--auxiliary)]" />
          <h2 className="mt-3 font-semibold text-[var(--text)]">Nenhum lead encontrado</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Novos interessados aparecerão aqui automaticamente.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredLeads.map((lead) => {
            const statusStyle = getLeadStatusStyle(lead.status, isLight);
            const isStatusMenuOpen = openStatusMenuId === lead.id;
            const isCardMenuOpen = openMenuId === lead.id;
            const isUpdatingThisStatus = updatingStatusId === lead.id;

            return (
              <article
                key={lead.id}
                className="relative rounded-xl border p-5 transition-shadow"
                style={{
                  backgroundColor: theme.primary,
                  borderColor: theme.border,
                  color: getContrastFg(theme.primary),
                  boxShadow: `0 18px 45px ${theme.secondary}2e`,
                  zIndex: isStatusMenuOpen || isCardMenuOpen ? 30 : 1,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <div
                        ref={isStatusMenuOpen ? statusMenuRef : undefined}
                        className="relative inline-block"
                      >
                        <button
                          type="button"
                          id={`lead-status-btn-${lead.id}`}
                          data-status-badge="true"
                          aria-label={`Status: ${statusStyle.label}. Clique para alterar.`}
                          aria-haspopup="listbox"
                          aria-expanded={isStatusMenuOpen}
                          onClick={() => {
                            setOpenMenuId(null);
                            setOpenStatusMenuId((current) => (current === lead.id ? null : lead.id));
                          }}
                          disabled={isUpdatingThisStatus}
                          className="status-badge group/status inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
                          style={{
                            borderColor: statusStyle.border,
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                          }}
                          title="Clique para mudar o status diretamente"
                        >
                          {isUpdatingThisStatus ? (
                            <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            <span
                              className="h-1.5 w-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: statusStyle.color }}
                            />
                          )}
                          <span>{statusStyle.label}</span>
                          <ChevronDown
                            className={`h-3 w-3 opacity-70 transition-transform group-hover/status:opacity-100 ${
                              isStatusMenuOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {isStatusMenuOpen && (
                          <div
                            className="lead-status-dropdown absolute left-0 top-full mt-1.5 z-50 w-44 overflow-hidden rounded-xl border py-1.5 shadow-2xl backdrop-blur-md"
                            style={{
                              backgroundColor: theme.primary,
                              borderColor: theme.border,
                              color: theme.text,
                              boxShadow: `0 14px 38px ${theme.secondary}38`,
                            }}
                          >
                            <div className="px-3 py-1 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)] mb-1">
                              Mudar Status
                            </div>
                            {(Object.keys(LEAD_STATUS_PALETTE) as LeadStage[]).map((stageKey) => {
                              const optionStyle = getLeadStatusStyle(stageKey, isLight);
                              const isCurrent = lead.status === stageKey;
                              return (
                                <button
                                  key={stageKey}
                                  type="button"
                                  onClick={() => void handleQuickStatusChange(lead, stageKey)}
                                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] cursor-pointer"
                                >
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="h-2 w-2 rounded-full shrink-0"
                                      style={{ backgroundColor: optionStyle.color }}
                                    />
                                    <span
                                      className={`font-medium ${isCurrent ? 'font-bold' : ''}`}
                                      style={{ color: isCurrent ? optionStyle.color : theme.text }}
                                    >
                                      {optionStyle.label}
                                    </span>
                                  </span>
                                  {isCurrent && (
                                    <Check
                                      className="h-3.5 w-3.5 shrink-0"
                                      style={{ color: optionStyle.color }}
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {lead.clientId && <span className="rounded-full border px-2.5 py-1 text-[10px] font-bold" style={{ borderColor: 'color-mix(in srgb, var(--auxiliary) 55%, transparent)', backgroundColor: 'color-mix(in srgb, var(--auxiliary) 18%, transparent)', color: 'var(--auxiliary)' }}>Cliente</span>}
                    </div>
                  <h2 className="truncate text-lg font-bold text-[var(--text)]" title={lead.name}>{lead.name}</h2>
                  <p className="mt-1 truncate text-xs text-[var(--muted)]" title={lead.street ? `${lead.street}, ${lead.addressNumber || 'S/N'}` : 'Endereço não informado'}>
                    {lead.street ? `${lead.street}, ${lead.addressNumber || 'S/N'}` : 'Endereço não informado'}
                  </p>
                </div>
                <div ref={openMenuId === lead.id ? menuRef : undefined} className="relative">
                  <button aria-label={`Ações de ${lead.name}`} onClick={() => setOpenMenuId((current) => current === lead.id ? null : lead.id)} className="lead-actions-button flex h-9 w-9 items-center justify-center rounded-lg border" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}>
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openMenuId === lead.id && (
                    <div className="lead-actions-dropdown absolute right-0 top-11 z-20 w-52 overflow-hidden rounded-lg border py-1 shadow-xl" style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text, boxShadow: `0 18px 45px ${theme.secondary}2e` }}>
                      <button onClick={() => { setProposalLead(lead); setOpenMenuId(null); setModalError(''); }} className="lead-menu-item group flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors">
                        <FileText className="h-4 w-4 shrink-0 text-[var(--secondary)] group-hover:text-white group-hover:stroke-white transition-colors" />
                        <span className="font-medium group-hover:text-white transition-colors">Gerar Proposta</span>
                      </button>
                      {lead.clientId ? (
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            onNavigate?.('propostas', lead.name);
                          }}
                          className="lead-menu-item group flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors"
                        >
                          <Files className="h-4 w-4 shrink-0 text-[var(--secondary)] group-hover:text-white group-hover:stroke-white transition-colors" />
                          <span className="font-medium group-hover:text-white transition-colors">Propostas</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => void handleAddClient(lead)}
                          disabled={workingId === lead.id}
                          className="lead-menu-item group flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors disabled:opacity-50"
                        >
                          <UserPlus className="h-4 w-4 shrink-0 text-[var(--secondary)] group-hover:text-white group-hover:stroke-white transition-colors" />
                          <span className="font-medium group-hover:text-white transition-colors">Adicionar aos clientes</span>
                        </button>
                      )}
                      <button onClick={() => openNotes(lead)} className="lead-menu-item group flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors">
                        <NotepadText className="h-4 w-4 shrink-0 text-[var(--secondary)] group-hover:text-white group-hover:stroke-white transition-colors" />
                        <span className="font-medium group-hover:text-white transition-colors">Anotar</span>
                      </button>
                      <button onClick={() => openParams(lead)} className="lead-menu-item group flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors">
                        <SlidersHorizontal className="h-4 w-4 shrink-0 text-[var(--secondary)] group-hover:text-white group-hover:stroke-white transition-colors" />
                        <span className="font-medium group-hover:text-white transition-colors">Parâmetros gerais</span>
                      </button>
                      <div className="my-1 border-t border-[var(--border)]" />
                      <button data-delete-btn="true" onClick={() => openDelete(lead)} className="lead-menu-item-danger group flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-[var(--danger)] transition-colors">
                        <Trash2 className="h-4 w-4 shrink-0 transition-colors" />
                        <span className="font-medium transition-colors">Excluir</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <dl className="mt-5 space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-[var(--text)]"><Phone className="h-4 w-4 text-[var(--dim)]" /><a href={`tel:${lead.phone}`}>{formatPhone(lead.phone)}</a></div>
                {lead.email && <div className="flex min-w-0 items-center gap-2 text-[var(--text)]"><Mail className="h-4 w-4 shrink-0 text-[var(--dim)]" /><a href={`mailto:${lead.email}`} className="truncate">{lead.email}</a></div>}
                <div className="flex items-center gap-2 text-[var(--text)]"><MapPin className="h-4 w-4 text-[var(--dim)]" />{lead.city}/{lead.state}</div>
                {lead.distributor && <div className="flex items-center gap-2 text-[var(--text)]"><Building2 className="h-4 w-4 text-[var(--dim)]" />{lead.distributor}</div>}
              </dl>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4">
                <div><p className="text-[10px] uppercase tracking-wide text-[var(--dim)]">Conta mensal</p><p className="mt-1 text-sm font-bold text-[var(--text)]">{lead.averageMonthlyBill != null ? money.format(lead.averageMonthlyBill) : 'Não informado'}</p></div>
                <div><p className="text-[10px] uppercase tracking-wide text-[var(--dim)]">Recebido em</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold text-[var(--text)]"><CalendarDays className="h-3.5 w-3.5" />{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</p></div>
              </div>
            </article>
          );
        })}
        </div>
      )}

      {proposalLead && (
        <ProposalWizardModal
          isOpen={Boolean(proposalLead)}
          onClose={() => setProposalLead(null)}
          theme={theme}
          initialTarget={{
            id: proposalLead.id,
            name: proposalLead.name,
            type: 'lead',
            clientId: proposalLead.clientId,
            phone: proposalLead.phone,
            email: proposalLead.email,
            city: proposalLead.city,
            state: proposalLead.state,
            propertyType: proposalLead.propertyType,
            concessionaria: proposalLead.distributor,
            monthlyConsumptionKWh: proposalLead.averageConsumptionKWh,
          }}
          onSaveProposal={async (newSolar) => {
            const { createQuickProposalForClient } = await import('../services/proposals');
            await createQuickProposalForClient({
              clientId: proposalLead.clientId || proposalLead.id,
              clientName: proposalLead.name,
              systemType: newSolar.systemType || 'On-Grid',
              systemPowerKWp: newSolar.systemPowerKWp,
              totalValue: newSolar.totalValue,
              title: `${newSolar.systemPowerKWp} kWp • ${proposalLead.name}`,
              modulesCount: newSolar.modulesCount,
              moduleModel: newSolar.moduleModel,
              inverterModel: newSolar.inverterModel,
              estimatedMonthlyGenKWh: newSolar.estimatedMonthlyGenKWh,
              estimatedMonthlySavings: newSolar.estimatedMonthlySavings,
            });
            setProposalLead(null);
            onShowToast(`Proposta ${newSolar.code} gerada com sucesso.`);
            if (onNavigate) {
              onNavigate('propostas', proposalLead.name);
            }
          }}
          onShowToast={onShowToast}
        />
      )}

      {deleteLead && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--neutral) 78%, transparent)' }}>
          <div className="w-full max-w-md rounded-xl border p-5" style={{ backgroundColor: theme.primary, borderColor: 'color-mix(in srgb, var(--danger) 40%, transparent)', color: theme.text, boxShadow: `0 18px 45px ${theme.secondary}2e` }}>
            <div className="flex items-start justify-between"><div><h2 className="text-lg font-bold">Excluir lead</h2><p className="mt-1 text-sm text-[var(--muted)]">Esta ação removerá definitivamente <strong>{deleteLead.name}</strong>.</p></div><button onClick={() => setDeleteLead(null)} className="p-1 text-[var(--dim)]"><X className="h-5 w-5" /></button></div>
            <label htmlFor="lead-delete-password" className="mt-5 block text-xs font-semibold">Digite sua senha para confirmar</label>
            <input id="lead-delete-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleDelete(); }} className="mt-2 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--neutral)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--danger)]" />
            {modalError && <p className="mt-3 text-xs text-[var(--danger)]">{modalError}</p>}
            <div className="mt-6 flex justify-end gap-3"><button onClick={() => setDeleteLead(null)} data-cancel-outline="true" className="btn-outline-cancel rounded-lg px-4 py-2 text-sm cursor-pointer">Cancelar</button><button onClick={() => void handleDelete()} disabled={!password || workingId === deleteLead.id} data-delete-btn="true" className="btn-danger-solid rounded-lg px-4 py-2 text-sm font-bold cursor-pointer">{workingId === deleteLead.id ? 'Excluindo...' : 'Excluir definitivamente'}</button></div>
          </div>
        </div>
      )}

      {notesLead && (
        <LeadNotesModal
          lead={notesLead}
          theme={theme}
          onClose={() => setNotesLead(null)}
          onNotesUpdated={(serializedNotes) => {
            setLeads((current) =>
              current.map((item) =>
                item.id === notesLead.id ? { ...item, notes: serializedNotes } : item
              )
            );
            setNotesLead((prev) => (prev ? { ...prev, notes: serializedNotes } : null));
          }}
          onShowToast={onShowToast}
        />
      )}

      {paramsLead && (
        <LeadParametersModal
          lead={paramsLead}
          theme={theme}
          statusLabels={statusLabels}
          onClose={() => setParamsLead(null)}
          onLeadUpdated={(updatedLead) => {
            setLeads((current) =>
              current.map((item) => (item.id === updatedLead.id ? updatedLead : item))
            );
            setParamsLead(updatedLead);
          }}
          onShowToast={onShowToast}
        />
      )}

      {/* MODAL: Novo Lead Manual (Padronizado com o Wizard) */}
      {isNewLeadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
        >
          <div
            className="w-full max-w-xl rounded-2xl border p-5 sm:p-6 shadow-2xl space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
              backgroundColor: theme.primary,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[var(--secondary)]" />
                <h4 className="text-sm sm:text-base font-bold text-[var(--text)]">
                  Cadastro Rápido de Novo Lead
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsNewLeadModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--dim)] hover:text-[var(--text)] transition-colors cursor-pointer border border-transparent hover:border-[var(--border)]"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewLead} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--dim)] mb-1">
                    Nome Completo do Titular *
                  </label>
                  <input
                    type="text"
                    required
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    placeholder="Ex: João da Silva / Empresa Comercial Ltda"
                    className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)]"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--dim)] mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)]"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--dim)] mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={newLeadEmail}
                    onChange={(e) => setNewLeadEmail(e.target.value)}
                    placeholder="cliente@exemplo.com"
                    className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)]"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                  />
                </div>

                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[var(--dim)] mb-1">
                      Endereço (Rua / Logradouro)
                    </label>
                    <input
                      type="text"
                      value={newLeadStreet}
                      onChange={(e) => setNewLeadStreet(e.target.value)}
                      placeholder="Ex: Rua das Palmeiras, Av. Brasil"
                      className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)]"
                      style={{
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        color: theme.text,
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--dim)] mb-1">
                      Número / Compl.
                    </label>
                    <input
                      type="text"
                      value={newLeadNumber}
                      onChange={(e) => setNewLeadNumber(e.target.value)}
                      placeholder="Ex: 123, Bloco B"
                      className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)]"
                      style={{
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        color: theme.text,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--dim)] mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={newLeadCity}
                    onChange={(e) => setNewLeadCity(e.target.value)}
                    placeholder="Ex: Campinas"
                    className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)]"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[var(--dim)]">
                      Estado (UF)
                    </label>
                    {configuredStates.length > 0 && (
                      <span className="text-[10px] text-[var(--muted)] font-medium">
                        Atendimento configurado ({configuredStates.length})
                      </span>
                    )}
                  </div>
                  {configuredStates.length > 0 ? (
                    <select
                      value={newLeadState}
                      onChange={(e) => setNewLeadState(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)] cursor-pointer"
                      style={{
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        color: theme.text,
                      }}
                    >
                      {configuredStates.map((uf) => (
                        <option key={uf} value={uf} style={{ backgroundColor: theme.primary, color: theme.text }}>
                          {uf} - {BRAZIL_STATE_NAMES[uf] || uf}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={newLeadState}
                      onChange={(e) => setNewLeadState(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)] cursor-pointer"
                      style={{
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        color: theme.text,
                      }}
                    >
                      {BRAZIL_STATE_GROUPS.map((group) => (
                        <optgroup key={group.region} label={group.region}>
                          {group.states.map(([uf, name]) => (
                            <option key={uf} value={uf} style={{ backgroundColor: theme.primary, color: theme.text }}>
                              {uf} - {name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--dim)] mb-1">
                    Distribuidora / Concessionária
                  </label>
                  <input
                    type="text"
                    value={newLeadConcessionaria}
                    onChange={(e) => setNewLeadConcessionaria(e.target.value)}
                    placeholder="Ex: Light, Enel, CPFL, Cemig..."
                    className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)]"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--dim)] mb-1">
                    Consumo Médio Estimado (kWh/mês)
                  </label>
                  <input
                    type="number"
                    value={newLeadAvgConsumption}
                    onChange={(e) => setNewLeadAvgConsumption(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Ex: 850"
                    className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)]"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor: theme.border }}>
                <button
                  type="button"
                  onClick={() => setIsNewLeadModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                  style={{ borderColor: theme.border }}
                >
                  Cancelar Cadastro
                </button>
                <button
                  type="submit"
                  disabled={savingNewLead || !newLeadName.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                >
                  {savingNewLead ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Salvando Lead...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      Salvar Lead
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
