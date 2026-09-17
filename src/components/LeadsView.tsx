import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CalendarDays,
  FilePlus2,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';
import { supabase, validateCurrentPassword } from '../lib/supabase';
import { Lead, ThemeConfig } from '../types';
import {
  addLeadToClients,
  createProposalFromLead,
  deleteOwnedLead,
  fetchLeads,
  ProposalSystemType,
} from '../services/leads';

interface LeadsViewProps {
  theme: ThemeConfig;
  onShowToast: (message: string) => void;
}

const statusLabels: Record<Lead['status'], string> = {
  novo: 'Novo',
  em_contato: 'Em contato',
  qualificado: 'Qualificado',
  em_estudo: 'Em estudo',
  proposta_enviada: 'Proposta enviada',
  negociacao: 'Negociação',
  ganho: 'Ganho',
  perdido: 'Perdido',
};

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function LeadsView({ theme, onShowToast }: LeadsViewProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [proposalLead, setProposalLead] = useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);
  const [systemType, setSystemType] = useState<ProposalSystemType>('On-Grid');
  const [password, setPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setLeads(await fetchLeads());
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

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    if (!query) return leads;
    return leads.filter((lead) =>
      [lead.name, lead.phone, lead.email, lead.city, lead.state, lead.source]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(query))
    );
  }, [leads, search]);

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

  return (
    <section id="leads-page" className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dim)]">Captação comercial</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text)]">Leads</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Interessados enviados pelo formulário do seu site.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="btn-outline inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold" style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text }}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      <div className="rounded-xl border p-3" style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text }}>
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dim)]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, telefone, cidade ou e-mail" className="h-10 w-full rounded-lg border pl-10 pr-4 text-sm outline-none focus:border-[var(--secondary)]" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }} />
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
          {filteredLeads.map((lead) => (
            <article key={lead.id} className="relative rounded-xl border p-5" style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text, boxShadow: `0 18px 45px ${theme.secondary}2e` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ borderColor: 'color-mix(in srgb, var(--secondary) 55%, transparent)', backgroundColor: 'color-mix(in srgb, var(--secondary) 18%, transparent)', color: 'var(--secondary)' }}>{statusLabels[lead.status]}</span>
                    {lead.clientId && <span className="rounded-full border px-2.5 py-1 text-[10px] font-bold" style={{ borderColor: 'color-mix(in srgb, var(--auxiliary) 55%, transparent)', backgroundColor: 'color-mix(in srgb, var(--auxiliary) 18%, transparent)', color: 'var(--auxiliary)' }}>Cliente</span>}
                  </div>
                  <h2 className="truncate text-lg font-bold text-[var(--text)]" title={lead.name}>{lead.name}</h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">{lead.propertyType} · {lead.source}</p>
                </div>
                <div ref={openMenuId === lead.id ? menuRef : undefined} className="relative">
                  <button aria-label={`Ações de ${lead.name}`} onClick={() => setOpenMenuId((current) => current === lead.id ? null : lead.id)} className="lead-actions-button flex h-9 w-9 items-center justify-center rounded-lg border" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}>
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openMenuId === lead.id && (
                    <div className="absolute right-0 top-11 z-20 w-52 overflow-hidden rounded-lg border py-1" style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text, boxShadow: `0 18px 45px ${theme.secondary}2e` }}>
                      <button onClick={() => { setProposalLead(lead); setOpenMenuId(null); setModalError(''); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"><FilePlus2 className="h-4 w-4 text-[var(--secondary)]" />Gerar proposta</button>
                      <button onClick={() => void handleAddClient(lead)} disabled={Boolean(lead.clientId) || workingId === lead.id} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"><UserPlus className="h-4 w-4 text-[var(--auxiliary)]" />{lead.clientId ? 'Já é cliente' : 'Adicionar aos clientes'}</button>
                      <div className="my-1 border-t border-[var(--border)]" />
                      <button onClick={() => openDelete(lead)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--danger)]"><Trash2 className="h-4 w-4" />Excluir</button>
                    </div>
                  )}
                </div>
              </div>

              <dl className="mt-5 space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-[var(--text)]"><Phone className="h-4 w-4 text-[var(--dim)]" /><a href={`tel:${lead.phone}`}>{lead.phone}</a></div>
                {lead.email && <div className="flex min-w-0 items-center gap-2 text-[var(--text)]"><Mail className="h-4 w-4 shrink-0 text-[var(--dim)]" /><a href={`mailto:${lead.email}`} className="truncate">{lead.email}</a></div>}
                <div className="flex items-center gap-2 text-[var(--text)]"><MapPin className="h-4 w-4 text-[var(--dim)]" />{lead.city}/{lead.state}</div>
                {lead.distributor && <div className="flex items-center gap-2 text-[var(--text)]"><Building2 className="h-4 w-4 text-[var(--dim)]" />{lead.distributor}</div>}
              </dl>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4">
                <div><p className="text-[10px] uppercase tracking-wide text-[var(--dim)]">Conta mensal</p><p className="mt-1 text-sm font-bold text-[var(--text)]">{lead.averageMonthlyBill != null ? money.format(lead.averageMonthlyBill) : 'Não informado'}</p></div>
                <div><p className="text-[10px] uppercase tracking-wide text-[var(--dim)]">Recebido em</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold text-[var(--text)]"><CalendarDays className="h-3.5 w-3.5" />{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</p></div>
              </div>
            </article>
          ))}
        </div>
      )}

      {proposalLead && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--neutral) 78%, transparent)' }}>
          <div className="w-full max-w-md rounded-xl border p-5" style={{ backgroundColor: theme.primary, borderColor: theme.border, color: theme.text, boxShadow: `0 18px 45px ${theme.secondary}2e` }}>
            <div className="flex items-start justify-between"><div><h2 className="text-lg font-bold">Gerar proposta</h2><p className="mt-1 text-sm text-[var(--muted)]">{proposalLead.name}</p></div><button onClick={() => setProposalLead(null)} className="p-1 text-[var(--dim)]"><X className="h-5 w-5" /></button></div>
            <label className="mt-5 block text-xs font-semibold">Tipo do sistema</label>
            <div className="mt-2 grid grid-cols-2 gap-3">{(['On-Grid', 'Híbrido'] as ProposalSystemType[]).map((type) => <button key={type} onClick={() => setSystemType(type)} className="rounded-lg border px-4 py-3 text-sm font-semibold" style={systemType === type ? { borderColor: theme.secondary, backgroundColor: 'color-mix(in srgb, var(--secondary) 18%, transparent)', color: 'var(--secondary)' } : { borderColor: 'var(--border)', color: 'var(--text)' }}>{type}</button>)}</div>
            {modalError && <p className="mt-3 text-xs text-[var(--danger)]">{modalError}</p>}
            <div className="mt-6 flex justify-end gap-3"><button onClick={() => setProposalLead(null)} className="btn-outline rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text)]">Cancelar</button><button onClick={() => void handleCreateProposal()} disabled={workingId === proposalLead.id} className="btn-filled rounded-lg px-4 py-2 text-sm font-bold" style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}>{workingId === proposalLead.id ? 'Criando...' : 'Criar rascunho'}</button></div>
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
    </section>
  );
}
