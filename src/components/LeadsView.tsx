import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CalendarDays,
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
import { Lead, LeadStage, ThemeConfig } from '../types';
import {
  addLeadToClients,
  createProposalFromLead,
  deleteOwnedLead,
  fetchLeads,
  ProposalSystemType,
  updateLeadNotes,
} from '../services/leads';
import { LeadParametersModal } from './LeadParametersModal';
import { formatPhone } from '../utils/formatters';
import { getContrastFg } from '../utils/themeEngine';
import { LEAD_STAGE_LABELS, getLeadStatusStyle } from '../utils/leadStatus';
import { fetchAndSyncLeadNotifications, markLeadAsRead } from '../services/leadNotifications';

interface LeadsViewProps {
  theme: ThemeConfig;
  onShowToast: (message: string) => void;
}

const statusLabels: Record<Lead['status'], string> = LEAD_STAGE_LABELS;

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function LeadsView({ theme, onShowToast }: LeadsViewProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [proposalLead, setProposalLead] = useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);
  const [notesLead, setNotesLead] = useState<Lead | null>(null);
  const [notesText, setNotesText] = useState('');
  const [paramsLead, setParamsLead] = useState<Lead | null>(null);
  const [systemType, setSystemType] = useState<ProposalSystemType>('On-Grid');
  const [password, setPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);

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
    const closeMenu = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  const isLight = getContrastFg(theme.primary) === '#0F172A';

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return leads.filter((lead) => {
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
      if (!query) return true;
      return [lead.name, lead.phone, lead.email, lead.street, lead.addressNumber, lead.city, lead.state, lead.source]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(query));
    });
  }, [leads, search, statusFilter]);

  const handleAddClient = async (lead: Lead) => {
    setOpenMenuId(null);
    setWorkingId(lead.id);
    try {
      const clientId = await addLeadToClients(lead.id);
      setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, clientId } : item));
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
      const proposal = await createProposalFromLead(proposalLead.id, systemType);
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
    setNotesText(lead.notes || '');
    markLeadAsRead(lead.id);
  };

  const handleSaveNotes = async () => {
    if (!notesLead) return;
    setWorkingId(notesLead.id);
    setModalError('');
    try {
      await updateLeadNotes(notesLead.id, notesText);
    } catch {
      // Continue even if remote update fails
    }
    setLeads((current) =>
      current.map((item) => (item.id === notesLead.id ? { ...item, notes: notesText } : item))
    );
    onShowToast(`Anotação de ${notesLead.name} salva.`);
    setNotesLead(null);
    setWorkingId(null);
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
          <p className="mt-1 text-sm text-[var(--muted)]">Interessados enviados pelo formulário do seu site.</p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="btn-outline inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-all hover:border-[var(--secondary)] hover:bg-[var(--secondary)] hover:text-[var(--secondary-fg)]"
          style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text }}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
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
              {leads.length}
            </span>
          </button>
          {(Object.keys(LEAD_STAGE_LABELS) as LeadStage[]).map((stKey) => {
            const count = leads.filter((l) => l.status === stKey).length;
            const st = getLeadStatusStyle(stKey, isLight);
            const isSelected = statusFilter === stKey;
            return (
              <button
                key={stKey}
                type="button"
                onClick={() => setStatusFilter(isSelected ? 'all' : stKey)}
                className="rounded-full px-3 py-1 font-semibold transition-all shrink-0 border inline-flex items-center gap-1.5"
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
            return (
              <article key={lead.id} className="relative rounded-xl border p-5" style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text, boxShadow: `0 18px 45px ${theme.secondary}2e` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-all"
                        style={{
                          borderColor: statusStyle.border,
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: statusStyle.color }}
                        />
                        {statusStyle.label}
                      </span>
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
                        <span className="font-medium group-hover:text-white transition-colors">Gerar proposta</span>
                      </button>
                      <button onClick={() => void handleAddClient(lead)} disabled={Boolean(lead.clientId) || workingId === lead.id} className="lead-menu-item group flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors disabled:opacity-50">
                        <UserPlus className="h-4 w-4 shrink-0 text-[var(--secondary)] group-hover:text-white group-hover:stroke-white transition-colors" />
                        <span className="font-medium group-hover:text-white transition-colors">{lead.clientId ? 'Já é cliente' : 'Adicionar aos clientes'}</span>
                      </button>
                      <button onClick={() => openNotes(lead)} className="lead-menu-item group flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors">
                        <NotepadText className="h-4 w-4 shrink-0 text-[var(--secondary)] group-hover:text-white group-hover:stroke-white transition-colors" />
                        <span className="font-medium group-hover:text-white transition-colors">Abrir anotação</span>
                      </button>
                      <button onClick={() => openParams(lead)} className="lead-menu-item group flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors">
                        <SlidersHorizontal className="h-4 w-4 shrink-0 text-[var(--secondary)] group-hover:text-white group-hover:stroke-white transition-colors" />
                        <span className="font-medium group-hover:text-white transition-colors">Parâmetros gerais</span>
                      </button>
                      <div className="my-1 border-t border-[var(--border)]" />
                      <button onClick={() => openDelete(lead)} className="lead-menu-item-danger group flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-[var(--danger)] transition-colors">
                        <Trash2 className="h-4 w-4 shrink-0 group-hover:text-white group-hover:stroke-white transition-colors" />
                        <span className="font-medium group-hover:text-white transition-colors">Excluir</span>
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
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--neutral) 78%, transparent)' }}
        >
          <div
            className="w-full max-w-md rounded-xl border p-5 shadow-2xl space-y-4"
            style={{
              backgroundColor: theme.primary,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-[var(--secondary)]" />
                <h3 className="text-base font-bold">Gerar Nova Proposta</h3>
              </div>
              <button
                onClick={() => setProposalLead(null)}
                className="p-1 text-[var(--dim)] hover:text-[var(--text)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[var(--muted)]">
                Criar uma nova proposta comercial para <strong>{proposalLead.name}</strong>.
              </p>
              <div>
                <label className="block font-semibold text-[var(--dim)] mb-1">Tipo de Sistema Solar</label>
                <select
                  value={systemType}
                  onChange={(e) => setSystemType(e.target.value as ProposalSystemType)}
                  className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                  style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                >
                  <option value="On-Grid" style={{ backgroundColor: theme.primary, color: theme.text }}>On-Grid (Conectado à rede)</option>
                  <option value="Híbrido" style={{ backgroundColor: theme.primary, color: theme.text }}>Híbrido (Rede + Baterias)</option>
                </select>
              </div>
              {modalError && <p className="text-xs text-[var(--danger)]">{modalError}</p>}
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t" style={{ borderColor: theme.border }}>
              <button
                type="button"
                onClick={() => setProposalLead(null)}
                className="btn-outline px-4 py-2 rounded-lg border text-xs font-semibold hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)]"
                style={{ borderColor: theme.border }}
              >
                Cancelar
              </button>
              <button
                id="btn-lead-confirmar-gerar-proposta"
                type="button"
                onClick={() => void handleCreateProposal()}
                disabled={workingId === proposalLead.id}
                className="btn-filled px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
              >
                {workingId === proposalLead.id ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Gerando proposta...
                  </>
                ) : (
                  <>
                    <FileText className="h-3.5 w-3.5" />
                    Gerar Proposta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteLead && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--neutral) 78%, transparent)' }}>
          <div className="w-full max-w-md rounded-xl border p-5" style={{ backgroundColor: theme.primary, borderColor: 'color-mix(in srgb, var(--danger) 40%, transparent)', color: theme.text, boxShadow: `0 18px 45px ${theme.secondary}2e` }}>
            <div className="flex items-start justify-between"><div><h2 className="text-lg font-bold">Excluir lead</h2><p className="mt-1 text-sm text-[var(--muted)]">Esta ação removerá definitivamente <strong>{deleteLead.name}</strong>.</p></div><button onClick={() => setDeleteLead(null)} className="p-1 text-[var(--dim)]"><X className="h-5 w-5" /></button></div>
            <label htmlFor="lead-delete-password" className="mt-5 block text-xs font-semibold">Digite sua senha para confirmar</label>
            <input id="lead-delete-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleDelete(); }} className="mt-2 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--neutral)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--danger)]" />
            {modalError && <p className="mt-3 text-xs text-[var(--danger)]">{modalError}</p>}
            <div className="mt-6 flex justify-end gap-3"><button onClick={() => setDeleteLead(null)} className="btn-outline rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text)]">Cancelar</button><button onClick={() => void handleDelete()} disabled={!password || workingId === deleteLead.id} className="btn-danger-outline rounded-lg px-4 py-2 text-sm font-bold">{workingId === deleteLead.id ? 'Excluindo...' : 'Excluir definitivamente'}</button></div>
          </div>
        </div>
      )}

      {notesLead && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--neutral) 78%, transparent)' }}>
          <div className="w-full max-w-lg rounded-xl border p-5" style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text, boxShadow: `0 18px 45px ${theme.secondary}2e` }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.secondary }}>
                  <NotepadText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Anotações do Lead</h2>
                  <p className="text-xs text-[var(--muted)]">{notesLead.name} · {formatPhone(notesLead.phone)}</p>
                </div>
              </div>
              <button onClick={() => setNotesLead(null)} className="p-1 text-[var(--dim)] hover:text-[var(--text)] transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5">
              <label htmlFor="lead-notes-textarea" className="block text-xs font-semibold text-[var(--dim)] uppercase tracking-wider mb-2">
                Histórico & Observações
              </label>
              <textarea
                id="lead-notes-textarea"
                rows={6}
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Insira detalhes de conversas, preferências do cliente, observações da visita ou do projeto..."
                className="w-full rounded-lg border p-3 text-sm outline-none resize-none focus:border-[var(--secondary)]"
                style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
              />
              <p className="mt-1.5 text-xs text-[var(--muted)]">
                Estas notas permanecem salvas para consulta da sua equipe.
              </p>
            </div>

            {modalError && <p className="mt-3 text-xs text-[var(--danger)]">{modalError}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setNotesLead(null)}
                className="btn-outline rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text)]"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleSaveNotes()}
                disabled={workingId === notesLead.id}
                className="btn-filled rounded-lg px-4 py-2 text-sm font-bold"
                style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
              >
                {workingId === notesLead.id ? 'Salvando...' : 'Salvar anotação'}
              </button>
            </div>
          </div>
        </div>
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
    </section>
  );
}
