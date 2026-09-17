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
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B949E]">Captação comercial</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Leads</h1>
          <p className="mt-1 text-sm text-[#8B949E]">Interessados enviados pelo formulário do seu site.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="btn-outline inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#30363D] bg-[#161B22] px-4 text-sm font-semibold text-white">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-3">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B949E]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, telefone, cidade ou e-mail" className="h-10 w-full rounded-lg border border-[#30363D] bg-[#0D1117] pl-10 pr-4 text-sm text-white outline-none focus:border-[#0076DD]" />
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-xl border border-[#30363D] bg-[#161B22]" />)}</div>
      ) : filteredLeads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#3B4654] bg-[#161B22] px-6 py-16 text-center">
          <Zap className="mx-auto h-8 w-8 text-[#FACB5C]" />
          <h2 className="mt-3 font-semibold text-white">Nenhum lead encontrado</h2>
          <p className="mt-1 text-sm text-[#8B949E]">Novos interessados aparecerão aqui automaticamente.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredLeads.map((lead) => (
            <article key={lead.id} className="relative rounded-xl border border-[#30363D] bg-[#161B22] p-5 shadow-xl shadow-black/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#0076DD]/40 bg-[#0076DD]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#64B0F3]">{statusLabels[lead.status]}</span>
                    {lead.clientId && <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">Cliente</span>}
                  </div>
                  <h2 className="truncate text-lg font-bold text-white" title={lead.name}>{lead.name}</h2>
                  <p className="mt-1 text-xs text-[#8B949E]">{lead.propertyType} · {lead.source}</p>
                </div>
                <div ref={openMenuId === lead.id ? menuRef : undefined} className="relative">
                  <button aria-label={`Ações de ${lead.name}`} onClick={() => setOpenMenuId((current) => current === lead.id ? null : lead.id)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#30363D] bg-[#21262D] text-[#C9D1D9]">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openMenuId === lead.id && (
                    <div className="absolute right-0 top-11 z-20 w-52 overflow-hidden rounded-lg border border-[#30363D] bg-[#21262D] py-1 shadow-2xl">
                      <button onClick={() => { setProposalLead(lead); setOpenMenuId(null); setModalError(''); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white"><FilePlus2 className="h-4 w-4 text-[#64B0F3]" />Gerar proposta</button>
                      <button onClick={() => void handleAddClient(lead)} disabled={Boolean(lead.clientId) || workingId === lead.id} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white"><UserPlus className="h-4 w-4 text-emerald-400" />{lead.clientId ? 'Já é cliente' : 'Adicionar aos clientes'}</button>
                      <div className="my-1 border-t border-[#30363D]" />
                      <button onClick={() => openDelete(lead)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-300"><Trash2 className="h-4 w-4" />Excluir</button>
                    </div>
                  )}
                </div>
              </div>

              <dl className="mt-5 space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-[#C9D1D9]"><Phone className="h-4 w-4 text-[#8B949E]" /><a href={`tel:${lead.phone}`}>{lead.phone}</a></div>
                {lead.email && <div className="flex min-w-0 items-center gap-2 text-[#C9D1D9]"><Mail className="h-4 w-4 shrink-0 text-[#8B949E]" /><a href={`mailto:${lead.email}`} className="truncate">{lead.email}</a></div>}
                <div className="flex items-center gap-2 text-[#C9D1D9]"><MapPin className="h-4 w-4 text-[#8B949E]" />{lead.city}/{lead.state}</div>
                {lead.distributor && <div className="flex items-center gap-2 text-[#C9D1D9]"><Building2 className="h-4 w-4 text-[#8B949E]" />{lead.distributor}</div>}
              </dl>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#30363D] pt-4">
                <div><p className="text-[10px] uppercase tracking-wide text-[#8B949E]">Conta mensal</p><p className="mt-1 text-sm font-bold text-white">{lead.averageMonthlyBill != null ? money.format(lead.averageMonthlyBill) : 'Não informado'}</p></div>
                <div><p className="text-[10px] uppercase tracking-wide text-[#8B949E]">Recebido em</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold text-white"><CalendarDays className="h-3.5 w-3.5" />{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</p></div>
              </div>
            </article>
          ))}
        </div>
      )}

      {proposalLead && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-[#30363D] bg-[#161B22] p-5 shadow-2xl">
            <div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-white">Gerar proposta</h2><p className="mt-1 text-sm text-[#8B949E]">{proposalLead.name}</p></div><button onClick={() => setProposalLead(null)} className="p-1 text-[#8B949E]"><X className="h-5 w-5" /></button></div>
            <label className="mt-5 block text-xs font-semibold text-[#C9D1D9]">Tipo do sistema</label>
            <div className="mt-2 grid grid-cols-2 gap-3">{(['On-Grid', 'Híbrido'] as ProposalSystemType[]).map((type) => <button key={type} onClick={() => setSystemType(type)} className="rounded-lg border px-4 py-3 text-sm font-semibold" style={systemType === type ? { borderColor: theme.secondary, backgroundColor: `${theme.secondary}22`, color: '#fff' } : { borderColor: '#30363D', color: '#C9D1D9' }}>{type}</button>)}</div>
            {modalError && <p className="mt-3 text-xs text-red-300">{modalError}</p>}
            <div className="mt-6 flex justify-end gap-3"><button onClick={() => setProposalLead(null)} className="rounded-lg border border-[#30363D] px-4 py-2 text-sm text-white">Cancelar</button><button onClick={() => void handleCreateProposal()} disabled={workingId === proposalLead.id} className="btn-filled rounded-lg px-4 py-2 text-sm font-bold" style={{ backgroundColor: theme.secondary, color: '#fff' }}>{workingId === proposalLead.id ? 'Criando...' : 'Criar rascunho'}</button></div>
          </div>
        </div>
      )}

      {deleteLead && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-[#161B22] p-5 shadow-2xl">
            <div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-white">Excluir lead</h2><p className="mt-1 text-sm text-[#8B949E]">Esta ação removerá definitivamente <strong className="text-white">{deleteLead.name}</strong>.</p></div><button onClick={() => setDeleteLead(null)} className="p-1 text-[#8B949E]"><X className="h-5 w-5" /></button></div>
            <label htmlFor="lead-delete-password" className="mt-5 block text-xs font-semibold text-[#C9D1D9]">Digite sua senha para confirmar</label>
            <input id="lead-delete-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleDelete(); }} className="mt-2 h-10 w-full rounded-lg border border-[#30363D] bg-[#0D1117] px-3 text-sm text-white outline-none focus:border-red-500" />
            {modalError && <p className="mt-3 text-xs text-red-300">{modalError}</p>}
            <div className="mt-6 flex justify-end gap-3"><button onClick={() => setDeleteLead(null)} className="rounded-lg border border-[#30363D] px-4 py-2 text-sm text-white">Cancelar</button><button onClick={() => void handleDelete()} disabled={!password || workingId === deleteLead.id} className="btn-danger-outline rounded-lg px-4 py-2 text-sm font-bold">{workingId === deleteLead.id ? 'Excluindo...' : 'Excluir definitivamente'}</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
