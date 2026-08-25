import React, { useMemo, useState } from 'react';
import {
  Activity,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Client, ClientCrmStatus, ThemeConfig } from '../types';
import { getContrastFg } from '../utils/themeEngine';

interface ClientesViewProps {
  clients: Client[];
  theme: ThemeConfig;
  onAddClient: (client: Client) => void;
  onShowToast: (msg: string) => void;
}

type ClientTab = 'visao' | 'propostas' | 'atividades' | 'energia';

const CRM_STATUSES: ClientCrmStatus[] = [
  'Novo lead',
  'Em contato',
  'Qualificado',
  'Proposta enviada',
  'Negociação',
  'Cliente',
  'Perdido',
];

const getClientCrmStatus = (client: Client): ClientCrmStatus => {
  if (client.crmStatus) return client.crmStatus;
  if (client.activeStatus === 'Ativo') return 'Cliente';
  if (client.activeStatus === 'Inativo') return 'Perdido';
  return 'Em contato';
};

const statusClass: Record<ClientCrmStatus, string> = {
  'Novo lead': 'bg-sky-500/15 text-sky-500 border-sky-500/25',
  'Em contato': 'bg-blue-500/15 text-blue-500 border-blue-500/25',
  Qualificado: 'bg-violet-500/15 text-violet-500 border-violet-500/25',
  'Proposta enviada': 'bg-amber-500/15 text-amber-500 border-amber-500/25',
  Negociação: 'bg-orange-500/15 text-orange-500 border-orange-500/25',
  Cliente: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25',
  Perdido: 'bg-rose-500/15 text-rose-500 border-rose-500/25',
};

export const ClientesView: React.FC<ClientesViewProps> = ({
  clients,
  theme,
  onAddClient,
  onShowToast,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | ClientCrmStatus>('Todos');
  const [typeFilter, setTypeFilter] = useState<'Todos' | Client['type']>('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedTab, setSelectedTab] = useState<ClientTab>('visao');

  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [type, setType] = useState<Client['type']>('Residencial');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [concessionaria, setConcessionaria] = useState('');
  const [avgConsumptionKWh, setAvgConsumptionKWh] = useState(0);
  const [avgMonthlyBill, setAvgMonthlyBill] = useState(0);
  const [crmStatus, setCrmStatus] = useState<ClientCrmStatus>('Novo lead');
  const [responsible, setResponsible] = useState('');
  const [source, setSource] = useState('');

  const backgroundIsDark = getContrastFg(theme.background) === '#FFFFFF';
  const panelBg = backgroundIsDark
    ? `color-mix(in srgb, ${theme.background} 88%, #FFFFFF)`
    : `color-mix(in srgb, ${theme.background} 94%, #000000)`;
  const panelAltBg = backgroundIsDark
    ? `color-mix(in srgb, ${theme.background} 82%, #FFFFFF)`
    : `color-mix(in srgb, ${theme.background} 90%, #000000)`;
  const mutedText = `color-mix(in srgb, ${theme.text} 62%, transparent)`;

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return clients.filter((client) => {
      const crm = getClientCrmStatus(client);
      const matchesSearch =
        !normalizedSearch ||
        client.name.toLowerCase().includes(normalizedSearch) ||
        client.document.toLowerCase().includes(normalizedSearch) ||
        client.email.toLowerCase().includes(normalizedSearch) ||
        client.phone.toLowerCase().includes(normalizedSearch) ||
        client.city.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'Todos' || crm === statusFilter;
      const matchesType = typeFilter === 'Todos' || client.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [clients, search, statusFilter, typeFilter]);

  const metrics = useMemo(() => {
    const active = clients.filter((client) => client.activeStatus === 'Ativo').length;
    const inProgress = clients.filter((client) => {
      const status = getClientCrmStatus(client);
      return ['Em contato', 'Qualificado', 'Proposta enviada', 'Negociação'].includes(status);
    }).length;
    const withProposal = clients.filter((client) => client.proposalsCount > 0).length;

    return {
      total: clients.length,
      active,
      inProgress,
      withProposal,
    };
  }, [clients]);

  const resetForm = () => {
    setName('');
    setDocument('');
    setType('Residencial');
    setEmail('');
    setPhone('');
    setCity('');
    setState('');
    setConcessionaria('');
    setAvgConsumptionKWh(0);
    setAvgMonthlyBill(0);
    setCrmStatus('Novo lead');
    setResponsible('');
    setSource('');
  };

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;

    const newClient: Client = {
      id: `cli-${Date.now()}`,
      name: name.trim(),
      document: document.trim(),
      type,
      email: email.trim(),
      phone: phone.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      concessionaria: concessionaria.trim(),
      avgConsumptionKWh: Number(avgConsumptionKWh) || 0,
      proposalsCount: 0,
      activeStatus:
        crmStatus === 'Cliente' ? 'Ativo' : crmStatus === 'Perdido' ? 'Inativo' : 'Em atendimento',
      crmStatus,
      responsible: responsible.trim() || undefined,
      source: source.trim() || undefined,
      avgMonthlyBill: Number(avgMonthlyBill) || undefined,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      lastInteraction: 'Agora',
    };

    onAddClient(newClient);
    setModalOpen(false);
    resetForm();
    onShowToast(`Cliente ${newClient.name} cadastrado com sucesso!`);
  };

  const openClient = (client: Client) => {
    setSelectedClient(client);
    setSelectedTab('visao');
  };

  const panelStyle = {
    backgroundColor: panelBg,
    borderColor: theme.border,
    color: theme.text,
  };

  return (
    <div id="clientes-page" className="mx-auto max-w-[1480px] space-y-5" style={{ color: theme.text }}>
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: mutedText }}>
            <Users className="h-4 w-4" />
            CRM · Gestão de clientes
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Clientes</h1>
          <p className="mt-1 text-sm" style={{ color: mutedText }}>
            Gerencie sua carteira, acompanhe o relacionamento e concentre os dados comerciais do cliente.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold shadow-sm transition hover:brightness-110"
          style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}
        >
          <Plus className="h-4 w-4" />
          Novo cliente
        </button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total de clientes', value: metrics.total, icon: Users },
          { label: 'Em atendimento', value: metrics.inProgress, icon: MessageCircle },
          { label: 'Com proposta', value: metrics.withProposal, icon: FileText },
          { label: 'Clientes ativos', value: metrics.active, icon: CheckCircle2 },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-xl border p-4" style={panelStyle}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold" style={{ color: mutedText }}>{metric.label}</p>
                  <p className="mt-2 text-2xl font-extrabold">{metric.value}</p>
                </div>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `color-mix(in srgb, ${theme.secondary} 18%, transparent)`, color: theme.secondary }}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border" style={panelStyle}>
        <div className="flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center" style={{ borderColor: theme.border }}>
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: mutedText }} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por cliente, documento, telefone, e-mail ou cidade..."
              className="h-10 w-full rounded-lg border bg-transparent pl-9 pr-3 text-sm outline-none transition focus:ring-2"
              style={{ borderColor: theme.border, color: theme.text }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-10 items-center gap-2 rounded-lg border px-3" style={{ borderColor: theme.border }}>
              <Filter className="h-4 w-4" style={{ color: mutedText }} />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'Todos' | ClientCrmStatus)}
                className="bg-transparent text-sm outline-none"
                style={{ color: theme.text }}
              >
                <option value="Todos">Todos os status</option>
                {CRM_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as 'Todos' | Client['type'])}
              className="h-10 rounded-lg border bg-transparent px-3 text-sm outline-none"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              <option value="Todos">Todos os perfis</option>
              <option value="Residencial">Residencial</option>
              <option value="Comercial">Comercial</option>
              <option value="Rural">Rural</option>
              <option value="Industrial">Industrial</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left">
            <thead>
              <tr className="border-b text-[11px] font-bold uppercase tracking-wider" style={{ borderColor: theme.border, color: mutedText }}>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3 text-center">Propostas</th>
                <th className="px-4 py-3">Última interação</th>
                <th className="w-10 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const crm = getClientCrmStatus(client);
                return (
                  <tr
                    key={client.id}
                    onClick={() => openClient(client)}
                    className="border-b transition hover:brightness-110"
                    style={{ borderColor: theme.border, cursor: 'pointer' }}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold"
                          style={{ backgroundColor: `color-mix(in srgb, ${theme.secondary} 18%, transparent)`, color: theme.secondary }}
                        >
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="max-w-[250px] truncate text-sm font-bold">{client.name}</div>
                          <div className="mt-0.5 text-[11px]" style={{ color: mutedText }}>
                            {client.document || client.type}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="max-w-[210px] space-y-1 text-xs" style={{ color: mutedText }}>
                        <div className="flex items-center gap-1.5 truncate"><Phone className="h-3 w-3 shrink-0" />{client.phone || 'Não informado'}</div>
                        <div className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" />{client.email || 'Não informado'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" style={{ color: mutedText }} />{client.city ? `${client.city}/${client.state}` : 'Não informado'}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClass[crm]}`}>{crm}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs">{client.responsible || 'Não atribuído'}</td>
                    <td className="px-4 py-3.5 text-center text-sm font-bold">{client.proposalsCount}</td>
                    <td className="px-4 py-3.5 text-xs" style={{ color: mutedText }}>{client.lastInteraction || 'Sem registro'}</td>
                    <td className="px-2 py-3.5"><ChevronRight className="h-4 w-4" style={{ color: mutedText }} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="px-6 py-14 text-center">
            <Users className="mx-auto h-8 w-8" style={{ color: mutedText }} />
            <p className="mt-3 text-sm font-bold">Nenhum cliente encontrado</p>
            <p className="mt-1 text-xs" style={{ color: mutedText }}>Altere os filtros ou cadastre um novo cliente.</p>
          </div>
        )}

        <div className="flex items-center justify-between border-t px-4 py-3 text-xs" style={{ borderColor: theme.border, color: mutedText }}>
          <span>{filtered.length} de {clients.length} clientes</span>
          <span>Carteira de clientes</span>
        </div>
      </section>

      {selectedClient && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={() => setSelectedClient(null)}>
          <aside
            className="h-full w-full max-w-[620px] overflow-y-auto border-l shadow-2xl"
            style={{ ...panelStyle, backgroundColor: theme.background }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b p-5" style={{ ...panelStyle, borderColor: theme.border }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold" style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}>
                    {selectedClient.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-extrabold">{selectedClient.name}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass[getClientCrmStatus(selectedClient)]}`}>
                        {getClientCrmStatus(selectedClient)}
                      </span>
                      <span className="text-xs" style={{ color: mutedText }}>{selectedClient.type}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedClient(null)} className="flex h-9 w-9 items-center justify-center rounded-lg border" style={{ borderColor: theme.border }} aria-label="Fechar cliente">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => onShowToast(`Nova proposta para ${selectedClient.name}`)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold"
                  style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}
                >
                  <FileText className="h-4 w-4" /> Nova proposta
                </button>
                <button
                  onClick={() => onShowToast(`Interação registrada para ${selectedClient.name}`)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold"
                  style={{ borderColor: theme.border }}
                >
                  <MessageCircle className="h-4 w-4" /> Registrar interação
                </button>
              </div>
            </div>

            <div className="border-b px-5" style={{ borderColor: theme.border }}>
              <div className="flex gap-1 overflow-x-auto">
                {[
                  ['visao', 'Visão geral'],
                  ['propostas', 'Propostas'],
                  ['atividades', 'Atividades'],
                  ['energia', 'Dados de energia'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTab(key as ClientTab)}
                    className="whitespace-nowrap border-b-2 px-3 py-3 text-xs font-bold"
                    style={{
                      borderColor: selectedTab === key ? theme.secondary : 'transparent',
                      color: selectedTab === key ? theme.secondary : mutedText,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5">
              {selectedTab === 'visao' && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ['Telefone', selectedClient.phone || 'Não informado', Phone],
                      ['E-mail', selectedClient.email || 'Não informado', Mail],
                      ['Localização', selectedClient.city ? `${selectedClient.city}/${selectedClient.state}` : 'Não informado', MapPin],
                      ['Responsável', selectedClient.responsible || 'Não atribuído', UserRound],
                      ['Origem', selectedClient.source || 'Não informada', Activity],
                      ['Cliente desde', selectedClient.createdAt || 'Não informado', Clock3],
                    ].map(([label, value, Icon]) => {
                      const ItemIcon = Icon as React.ElementType;
                      return (
                        <div key={label as string} className="rounded-xl border p-3" style={{ backgroundColor: panelAltBg, borderColor: theme.border }}>
                          <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: mutedText }}><ItemIcon className="h-3.5 w-3.5" />{label as string}</div>
                          <div className="mt-2 break-words text-sm font-bold">{value as string}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-xl border p-4" style={{ backgroundColor: panelAltBg, borderColor: theme.border }}>
                    <h3 className="text-sm font-extrabold">Resumo comercial</h3>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <div><div className="text-xl font-extrabold">{selectedClient.proposalsCount}</div><div className="mt-1 text-[10px] uppercase" style={{ color: mutedText }}>Propostas</div></div>
                      <div><div className="text-xl font-extrabold">{selectedClient.avgConsumptionKWh || 0}</div><div className="mt-1 text-[10px] uppercase" style={{ color: mutedText }}>kWh/mês</div></div>
                      <div><div className="text-xl font-extrabold">{selectedClient.activeStatus === 'Ativo' ? 'Ativo' : 'Aberto'}</div><div className="mt-1 text-[10px] uppercase" style={{ color: mutedText }}>Relacionamento</div></div>
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === 'propostas' && (
                <div className="rounded-xl border p-5 text-center" style={{ backgroundColor: panelAltBg, borderColor: theme.border }}>
                  <FileText className="mx-auto h-8 w-8" style={{ color: theme.secondary }} />
                  <h3 className="mt-3 text-base font-extrabold">{selectedClient.proposalsCount} proposta(s) vinculada(s)</h3>
                  <p className="mt-1 text-xs" style={{ color: mutedText }}>O histórico detalhado de propostas será exibido aqui quando a vinculação por cliente estiver concluída.</p>
                  <button onClick={() => onShowToast(`Nova proposta para ${selectedClient.name}`)} className="mt-4 rounded-lg px-4 py-2 text-xs font-bold" style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}>Criar nova proposta</button>
                </div>
              )}

              {selectedTab === 'atividades' && (
                <div className="rounded-xl border p-5" style={{ backgroundColor: panelAltBg, borderColor: theme.border }}>
                  {selectedClient.lastInteraction ? (
                    <div className="flex gap-3">
                      <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: theme.secondary }} />
                      <div>
                        <div className="text-sm font-bold">Última interação</div>
                        <div className="mt-1 text-xs" style={{ color: mutedText }}>{selectedClient.lastInteraction}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-5 text-center">
                      <Clock3 className="mx-auto h-8 w-8" style={{ color: mutedText }} />
                      <div className="mt-3 text-sm font-bold">Nenhuma atividade registrada</div>
                      <div className="mt-1 text-xs" style={{ color: mutedText }}>Registre ligações, reuniões, mensagens e follow-ups do cliente.</div>
                    </div>
                  )}
                </div>
              )}

              {selectedTab === 'energia' && (
                <div className="space-y-3">
                  {[
                    ['Concessionária', selectedClient.concessionaria || 'Não informada'],
                    ['Consumo médio', selectedClient.avgConsumptionKWh ? `${selectedClient.avgConsumptionKWh} kWh/mês` : 'Não informado'],
                    ['Conta média', selectedClient.avgMonthlyBill ? selectedClient.avgMonthlyBill.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Não informada'],
                    ['Tipo de ligação', selectedClient.connectionType || 'Não informado'],
                    ['Unidade consumidora', selectedClient.consumerUnit || 'Não informada'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 rounded-xl border p-4" style={{ backgroundColor: panelAltBg, borderColor: theme.border }}>
                      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: mutedText }}><Zap className="h-4 w-4" />{label}</div>
                      <div className="text-right text-sm font-bold">{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border shadow-2xl" style={{ ...panelStyle, backgroundColor: theme.background }}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b p-5" style={{ ...panelStyle, borderColor: theme.border }}>
              <div>
                <h2 className="text-lg font-extrabold">Novo cliente</h2>
                <p className="mt-1 text-xs" style={{ color: mutedText }}>Cadastre o contato agora e complete os dados comerciais conforme o relacionamento evoluir.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg border" style={{ borderColor: theme.border }} aria-label="Fechar cadastro"><X className="h-4 w-4" /></button>
            </div>

            <form onSubmit={handleCreate} className="space-y-5 p-5">
              <div>
                <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider" style={{ color: mutedText }}>Dados principais</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Nome / Razão Social" required><input required value={name} onChange={(e) => setName(e.target.value)} className="crm-input" placeholder="Nome do cliente" /></Field>
                  <Field label="CPF / CNPJ"><input value={document} onChange={(e) => setDocument(e.target.value)} className="crm-input" placeholder="Documento" /></Field>
                  <Field label="Perfil"><select value={type} onChange={(e) => setType(e.target.value as Client['type'])} className="crm-input"><option>Residencial</option><option>Comercial</option><option>Rural</option><option>Industrial</option></select></Field>
                  <Field label="Status CRM"><select value={crmStatus} onChange={(e) => setCrmStatus(e.target.value as ClientCrmStatus)} className="crm-input">{CRM_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></Field>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider" style={{ color: mutedText }}>Contato e localização</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="E-mail"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="crm-input" placeholder="cliente@email.com" /></Field>
                  <Field label="Telefone / WhatsApp"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="crm-input" placeholder="(00) 00000-0000" /></Field>
                  <Field label="Cidade"><input value={city} onChange={(e) => setCity(e.target.value)} className="crm-input" placeholder="Cidade" /></Field>
                  <Field label="UF"><input value={state} maxLength={2} onChange={(e) => setState(e.target.value.toUpperCase())} className="crm-input" placeholder="UF" /></Field>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider" style={{ color: mutedText }}>Informações comerciais e energia</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Responsável"><input value={responsible} onChange={(e) => setResponsible(e.target.value)} className="crm-input" placeholder="Responsável comercial" /></Field>
                  <Field label="Origem do lead"><input value={source} onChange={(e) => setSource(e.target.value)} className="crm-input" placeholder="Google, indicação, Instagram..." /></Field>
                  <Field label="Concessionária"><input value={concessionaria} onChange={(e) => setConcessionaria(e.target.value)} className="crm-input" placeholder="Concessionária" /></Field>
                  <Field label="Consumo médio (kWh/mês)"><input type="number" min="0" value={avgConsumptionKWh || ''} onChange={(e) => setAvgConsumptionKWh(Number(e.target.value))} className="crm-input" placeholder="0" /></Field>
                  <Field label="Conta média (R$)"><input type="number" min="0" step="0.01" value={avgMonthlyBill || ''} onChange={(e) => setAvgMonthlyBill(Number(e.target.value))} className="crm-input" placeholder="0,00" /></Field>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: theme.border }}>
                <button type="button" onClick={() => setModalOpen(false)} className="h-10 rounded-lg border px-4 text-sm font-bold" style={{ borderColor: theme.border }}>Cancelar</button>
                <button type="submit" className="h-10 rounded-lg px-5 text-sm font-bold" style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}>Salvar cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <label className="block text-xs font-bold">
    <span className="mb-1.5 block">{label}{required ? ' *' : ''}</span>
    {children}
  </label>
);
