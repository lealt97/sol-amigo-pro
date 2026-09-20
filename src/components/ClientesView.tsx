import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  Files,
  FileText,
  Mail,
  MapPin,
  MoreVertical,
  NotepadText,
  Phone,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';
import { Client, PageKey, PdfSettingsConfig, SolarProposal, ThemeConfig } from '../types';
import {
  fetchClients,
  fetchClientsLocal,
  deleteClient,
  addClient,
  updateClient,
  updateClientNotes,
  mergeClientsWithLeads,
  CLIENTS_UPDATED_EVENT,
} from '../services/clients';
import { fetchLeads, updateLeadStatus } from '../services/leads';
import {
  fetchAllClientProposals,
  ClientProposal,
  PROPOSALS_UPDATED_EVENT,
  saveStoredProposalsLocal,
  getStoredProposalsLocal,
} from '../services/proposals';
import { formatPhone } from '../utils/formatters';
import { getContrastFg } from '../utils/themeEngine';
import { parseLeadNotes, serializeLeadNotes, LeadNote, compressImageFile } from '../utils/leadNotes';
import { NewProposalModal } from './NewProposalModal';
import { ProposalViewerModal } from './ProposalViewerModal';

interface ClientesViewProps {
  theme: ThemeConfig;
  pdfSettings?: PdfSettingsConfig;
  onShowToast: (message: string) => void;
  onNavigate?: (page: PageKey, filter?: string) => void;
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function ClientesView({
  theme,
  pdfSettings,
  onShowToast,
  onNavigate,
}: ClientesViewProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [allProposals, setAllProposals] = useState<ClientProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  // Modais de ações
  const [proposalsModalClient, setProposalsModalClient] = useState<Client | null>(null);
  const [notesModalClient, setNotesModalClient] = useState<Client | null>(null);
  const [paramsModalClient, setParamsModalClient] = useState<Client | null>(null);
  const [deleteClientTarget, setDeleteClientTarget] = useState<Client | null>(null);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewProposalModalOpen, setIsNewProposalModalOpen] = useState(false);
  const [proposalClientPreselected, setProposalClientPreselected] = useState<Client | null>(null);
  const [viewingProposal, setViewingProposal] = useState<SolarProposal | null>(null);

  // Estados de edição de notas do cliente
  const [clientNotesList, setClientNotesList] = useState<LeadNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteImages, setNewNoteImages] = useState<string[]>([]);
  const [processingImages, setProcessingImages] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Estados do formulário de novo cliente
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientCity, setNewClientCity] = useState('Campinas');
  const [newClientState, setNewClientState] = useState('SP');
  const [newClientStreet, setNewClientStreet] = useState('');
  const [newClientNumber, setNewClientNumber] = useState('');
  const [newClientType, setNewClientType] = useState<'Residencial' | 'Comercial' | 'Rural' | 'Industrial'>('Residencial');
  const [newClientConcessionaria, setNewClientConcessionaria] = useState('CPFL Paulista');
  const [newClientConsumption, setNewClientConsumption] = useState<number | ''>('');

  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fechar menu de ações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Carregar dados de clientes e propostas
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [clientsData, leadsData, propsData] = await Promise.all([
        fetchClients(),
        fetchLeads().catch(() => []),
        fetchAllClientProposals().catch(() => []),
      ]);
      const merged = mergeClientsWithLeads(clientsData, leadsData);
      setClients(merged);
      setAllProposals(propsData);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();

    const handleClientsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<Client[]>;
      if (customEvent.detail) {
        setClients(customEvent.detail);
      } else {
        void fetchClients().then(setClients);
      }
    };

    const handleProposalsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<ClientProposal[]>;
      if (customEvent.detail) {
        setAllProposals(customEvent.detail);
      } else {
        void fetchAllClientProposals().then(setAllProposals);
      }
    };

    window.addEventListener(CLIENTS_UPDATED_EVENT, handleClientsUpdate);
    window.addEventListener(PROPOSALS_UPDATED_EVENT, handleProposalsUpdate);
    return () => {
      window.removeEventListener(CLIENTS_UPDATED_EVENT, handleClientsUpdate);
      window.removeEventListener(PROPOSALS_UPDATED_EVENT, handleProposalsUpdate);
    };
  }, []);

  const isLight = getContrastFg(theme.primary) === '#0F172A';

  // Obter propostas de um cliente
  const getProposalsForClient = (client: Client): ClientProposal[] => {
    return allProposals.filter(
      (p) =>
        p.clientId === client.id ||
        (p.clientName && p.clientName.trim().toLowerCase() === client.name.trim().toLowerCase())
    );
  };

  // Filtragem de clientes
  const filteredClients = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return clients.filter((client) => {
      const clientType = client.type || client.propertyType || 'Residencial';
      if (typeFilter !== 'all' && clientType !== typeFilter) return false;
      if (!query) return true;
      return [
        client.name,
        client.phone,
        client.email,
        client.street,
        client.addressNumber,
        client.city,
        client.state,
        client.concessionaria,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(query));
    });
  }, [clients, search, typeFilter]);

  // Contagens por tipo
  const typeCounts = useMemo(() => {
    return {
      all: clients.length,
      Residencial: clients.filter((c) => (c.type || c.propertyType) === 'Residencial').length,
      Comercial: clients.filter((c) => (c.type || c.propertyType) === 'Comercial').length,
      Rural: clients.filter((c) => (c.type || c.propertyType) === 'Rural').length,
      Industrial: clients.filter((c) => (c.type || c.propertyType) === 'Industrial').length,
    };
  }, [clients]);

  // Abertura do modal de notas
  const handleOpenNotes = (client: Client) => {
    setOpenMenuId(null);
    setNotesModalClient(client);
    setClientNotesList(parseLeadNotes(client.notes));
    setNewNoteText('');
    setNewNoteImages([]);
  };

  // Upload de imagem para anotação
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setProcessingImages(true);
    try {
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const b64 = await compressImageFile(file);
          compressedList.push(b64);
        }
      }
      setNewNoteImages((prev) => [...prev, ...compressedList]);
    } catch (err: any) {
      onShowToast('Não foi possível processar as imagens.');
    } finally {
      setProcessingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Salvar anotação do cliente
  const handleSaveNote = async () => {
    if (!notesModalClient || (!newNoteText.trim() && newNoteImages.length === 0)) return;
    setSavingNotes(true);
    try {
      const newNoteItem: LeadNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: newNoteText.trim(),
        createdAt: new Date().toISOString(),
        images: newNoteImages,
      };
      const updatedNotes = [newNoteItem, ...clientNotesList];
      const serialized = serializeLeadNotes(updatedNotes);

      await updateClientNotes(notesModalClient.id, serialized, notesModalClient.sourceLeadId);
      setClientNotesList(updatedNotes);
      setClients((prev) =>
        prev.map((c) => (c.id === notesModalClient.id ? { ...c, notes: serialized } : c))
      );
      setNewNoteText('');
      setNewNoteImages([]);
      onShowToast('Anotação adicionada ao cliente!');
    } catch (err: any) {
      onShowToast('Erro ao salvar anotação.');
    } finally {
      setSavingNotes(false);
    }
  };

  // Excluir anotação específica do cliente
  const handleDeleteNote = async (noteId: string) => {
    if (!notesModalClient) return;
    try {
      const updatedNotes = clientNotesList.filter((n) => n.id !== noteId);
      const serialized = serializeLeadNotes(updatedNotes);
      await updateClientNotes(notesModalClient.id, serialized, notesModalClient.sourceLeadId);
      setClientNotesList(updatedNotes);
      setClients((prev) =>
        prev.map((c) => (c.id === notesModalClient.id ? { ...c, notes: serialized } : c))
      );
      onShowToast('Anotação removida!');
    } catch {
      onShowToast('Erro ao excluir anotação.');
    }
  };

  // Excluir cliente
  const handleDeleteClient = async () => {
    if (!deleteClientTarget) return;
    setWorkingId(deleteClientTarget.id);
    try {
      await deleteClient(deleteClientTarget.id);
      setClients((prev) => prev.filter((c) => c.id !== deleteClientTarget.id));
      onShowToast(`Cliente ${deleteClientTarget.name} excluído.`);
      setDeleteClientTarget(null);
    } catch (err: any) {
      setError(err?.message || 'Erro ao excluir cliente.');
    } finally {
      setWorkingId(null);
    }
  };

  // Criar novo cliente manual
  const handleCreateNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      onShowToast('Informe o nome do cliente.');
      return;
    }

    try {
      const created = await addClient({
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
        email: newClientEmail.trim(),
        city: newClientCity.trim(),
        state: newClientState.trim(),
        street: newClientStreet.trim(),
        addressNumber: newClientNumber.trim(),
        type: newClientType,
        propertyType: newClientType,
        concessionaria: newClientConcessionaria.trim(),
        avgConsumptionKWh: newClientConsumption ? Number(newClientConsumption) : undefined,
      });

      setClients((prev) => [created, ...prev]);
      setIsNewClientModalOpen(false);
      onShowToast(`Cliente ${created.name} cadastrado com sucesso!`);

      // Reset form
      setNewClientName('');
      setNewClientPhone('');
      setNewClientEmail('');
      setNewClientStreet('');
      setNewClientNumber('');
      setNewClientConsumption('');
    } catch {
      onShowToast('Erro ao cadastrar cliente.');
    }
  };

  // Abrir tela de propostas filtrada para o cliente
  const handleOpenPropostas = (client: Client) => {
    setOpenMenuId(null);
    if (onNavigate) {
      onNavigate('propostas', client.name);
    } else {
      setProposalsModalClient(client);
    }
  };

  // Abrir modal de criação de proposta com cliente pré-selecionado
  const handleOpenNewProposal = (client: Client) => {
    setOpenMenuId(null);
    setProposalClientPreselected(client);
    setIsNewProposalModalOpen(true);
  };

  // Salvar proposta gerada
  const handleSaveProposalFromModal = (proposal: SolarProposal) => {
    const newProp: ClientProposal = {
      id: proposal.id,
      code: proposal.code,
      clientId: proposalClientPreselected?.id || `cli-${Date.now()}`,
      clientName: proposal.clientName,
      title: `${proposal.systemPowerKWp} kWp • ${proposal.clientName}`,
      systemPowerKWp: proposal.systemPowerKWp,
      systemType: proposal.systemType || 'On-Grid',
      totalValue: proposal.totalValue,
      status: proposal.status,
      modulesCount: proposal.modulesCount,
      moduleModel: proposal.moduleModel,
      inverterModel: proposal.inverterModel,
      batteryModel: proposal.batteryModel,
      batteryCount: proposal.batteryCount,
      estimatedMonthlyGenKWh: proposal.estimatedMonthlyGenKWh,
      estimatedMonthlySavings: proposal.estimatedMonthlySavings,
      createdAt: proposal.createdAt || new Date().toISOString(),
    };

    const currentProps = getStoredProposalsLocal();
    const updated = [newProp, ...currentProps];
    saveStoredProposalsLocal(updated);
    setAllProposals(updated);
    setIsNewProposalModalOpen(false);
    onShowToast(`Proposta ${proposal.code} criada com sucesso para ${proposal.clientName}!`);
  };

  // Converter ClientProposal para SolarProposal para visualização
  const convertToSolarProposal = (p: ClientProposal, client?: Client): SolarProposal => ({
    id: p.id,
    code: p.code,
    clientName: p.clientName,
    clientCity: client?.city || 'Campinas',
    clientState: client?.state || 'SP',
    concessionaria: client?.concessionaria || 'CPFL Paulista',
    monthlyConsumptionKWh: p.estimatedMonthlyGenKWh || 1200,
    systemPowerKWp: p.systemPowerKWp,
    systemType: p.systemType === 'Híbrido' ? 'Híbrido' : 'On-Grid',
    estimatedMonthlyGenKWh: p.estimatedMonthlyGenKWh || Math.round(p.systemPowerKWp * 120),
    modulesCount: p.modulesCount || Math.ceil((p.systemPowerKWp * 1000) / 585),
    moduleModel: p.moduleModel || 'Canadian Solar 585W TOPCon Bi-facial',
    inverterModel: p.inverterModel || 'Inversor Deye Trifásico',
    batteryModel: p.batteryModel,
    batteryCount: p.batteryCount,
    totalValue: p.totalValue,
    estimatedMonthlySavings: p.estimatedMonthlySavings || Math.round(p.totalValue * 0.025),
    paybackYears: 3.2,
    status: p.status,
    createdAt: p.createdAt,
  });

  return (
    <section id="clientes-page" className="space-y-5">
      {/* Header com Ações e Título */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dim)]">
            Gestão comercial
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text)]">Clientes</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Clientes ativos e convertidos com acesso rápido a propostas e histórico.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsNewClientModalOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all shadow-sm"
            style={{
              backgroundColor: theme.secondary,
              color: 'var(--secondary-fg)',
            }}
          >
            <UserPlus className="h-4 w-4" /> Novo cliente
          </button>
          <button
            onClick={() => void loadData()}
            disabled={loading}
            className="btn-outline inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-all hover:border-[var(--secondary)] hover:bg-[var(--secondary)] hover:text-[var(--secondary-fg)]"
            style={{
              backgroundColor: theme.primary,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
      </div>

      {/* Barra de Busca e Filtros Rápidos */}
      <div
        className="rounded-xl border p-3 space-y-2.5"
        style={{
          backgroundColor: theme.primary,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dim)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, telefone, cidade ou endereço do cliente..."
            className="h-10 w-full rounded-lg border pl-10 pr-4 text-sm outline-none focus:border-[var(--secondary)]"
            style={{
              backgroundColor: theme.background,
              borderColor: theme.border,
              color: theme.text,
            }}
          />
        </div>

        {/* Chips de filtro por tipo de imóvel */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs pt-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`rounded-full px-3 py-1 font-semibold transition-all shrink-0 border inline-flex items-center gap-1.5 ${
              typeFilter === 'all'
                ? 'border-[var(--secondary)] bg-[var(--secondary)] text-[var(--secondary-fg)] shadow-sm'
                : 'border-[var(--border)] text-[var(--dim)] hover:text-[var(--text)]'
            }`}
            style={typeFilter === 'all' ? undefined : { backgroundColor: theme.background }}
          >
            <span>Todos os clientes</span>
            <span className="rounded-full px-1.5 py-0.2 text-[10px] font-bold opacity-85">
              {typeCounts.all}
            </span>
          </button>
          {(['Residencial', 'Comercial', 'Rural', 'Industrial'] as const).map((cat) => {
            const count = typeCounts[cat];
            const isSelected = typeFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setTypeFilter(isSelected ? 'all' : cat)}
                className={`rounded-full px-3 py-1 font-semibold transition-all shrink-0 border inline-flex items-center gap-1.5 ${
                  isSelected
                    ? 'border-[var(--secondary)] bg-[var(--secondary)] text-[var(--secondary-fg)] shadow-sm'
                    : 'border-[var(--border)] text-[var(--dim)] hover:text-[var(--text)]'
                }`}
                style={isSelected ? undefined : { backgroundColor: theme.background }}
              >
                <span>{cat}</span>
                <span
                  className="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(0,0,0,0.25)'
                      : 'color-mix(in srgb, currentColor 15%, transparent)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--danger) 40%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--danger) 10%, transparent)',
            color: 'var(--danger)',
          }}
        >
          {error}
        </div>
      )}

      {/* Grid de Cards de Clientes */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-64 animate-pulse rounded-xl border"
              style={{ backgroundColor: theme.primary, borderColor: theme.border }}
            />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div
          className="rounded-xl border border-dashed px-6 py-16 text-center"
          style={{
            backgroundColor: theme.primary,
            borderColor: theme.border,
            color: theme.text,
          }}
        >
          <UserCheck className="mx-auto h-8 w-8 text-[var(--auxiliary)]" />
          <h2 className="mt-3 font-semibold text-[var(--text)]">Nenhum cliente encontrado</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Os cards adicionados como cliente em Leads ou criados manualmente aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredClients.map((client) => {
            const clientProposals = getProposalsForClient(client);
            const notesCount = parseLeadNotes(client.notes).length;

            return (
              <article
                key={client.id}
                className="lead-card flex flex-col justify-between rounded-xl border p-5 shadow-sm transition-all"
                style={{
                  backgroundColor: theme.primary,
                  borderColor: theme.border,
                  boxShadow: `0 8px 30px ${theme.secondary}12`,
                }}
              >
                {/* Cabeçalho do Card */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold"
                          style={{
                            borderColor: 'color-mix(in srgb, var(--auxiliary) 55%, transparent)',
                            backgroundColor: 'color-mix(in srgb, var(--auxiliary) 18%, transparent)',
                            color: 'var(--auxiliary)',
                          }}
                        >
                          Cliente
                        </span>
                        <span
                          className="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold"
                          style={{
                            borderColor: theme.border,
                            backgroundColor: theme.background,
                            color: theme.text,
                          }}
                        >
                          {client.type || client.propertyType || 'Residencial'}
                        </span>
                        {clientProposals.length > 0 && (
                          <span
                            className="rounded-full border px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1"
                            style={{
                              borderColor: 'color-mix(in srgb, var(--secondary) 40%, transparent)',
                              backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                              color: 'var(--secondary)',
                            }}
                          >
                            <Files className="h-3 w-3" />
                            {clientProposals.length} {clientProposals.length === 1 ? 'proposta' : 'propostas'}
                          </span>
                        )}
                      </div>
                      <h2
                        className="truncate text-lg font-bold text-[var(--text)]"
                        title={client.name}
                      >
                        {client.name}
                      </h2>
                      <p
                        className="mt-1 truncate text-xs text-[var(--muted)]"
                        title={
                          client.street
                            ? `${client.street}, ${client.addressNumber || 'S/N'}`
                            : client.city
                            ? `${client.city}/${client.state || 'UF'}`
                            : 'Endereço não informado'
                        }
                      >
                        {client.street
                          ? `${client.street}, ${client.addressNumber || 'S/N'}`
                          : client.city
                          ? `${client.city}/${client.state || 'UF'}`
                          : 'Endereço não informado'}
                      </p>
                    </div>

                    {/* Menu de 3 Pontos com Propostas substituindo "Já é cliente" */}
                    <div
                      ref={openMenuId === client.id ? menuRef : undefined}
                      className="relative shrink-0"
                    >
                      <button
                        aria-label={`Ações de ${client.name}`}
                        onClick={() =>
                          setOpenMenuId((current) => (current === client.id ? null : client.id))
                        }
                        className="lead-actions-button flex h-9 w-9 items-center justify-center rounded-lg border"
                        style={{
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                          color: theme.text,
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {openMenuId === client.id && (
                        <div
                          className="lead-actions-dropdown absolute right-0 top-11 z-20 w-52 overflow-hidden rounded-lg border py-1 shadow-xl"
                          style={{
                            backgroundColor: theme.primary,
                            borderColor: theme.border,
                            color: theme.text,
                            boxShadow: `0 18px 45px ${theme.secondary}2e`,
                          }}
                        >
                          <button
                            onClick={() => handleOpenNewProposal(client)}
                            className="lead-menu-item group flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors"
                          >
                            <FileText className="h-4 w-4 shrink-0 text-[var(--secondary)] group-hover:text-white group-hover:stroke-white transition-colors" />
                            <span className="font-medium group-hover:text-white transition-colors">
                              Gerar proposta
                            </span>
                          </button>

                          {/* Onde estava "Já é cliente", agora é "Propostas" */}
                          <button
                            onClick={() => handleOpenPropostas(client)}
                            className="lead-menu-item group flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors"
                          >
                            <Files className="h-4 w-4 shrink-0 text-[var(--secondary)] group-hover:text-white group-hover:stroke-white transition-colors" />
                            <span className="font-medium group-hover:text-white transition-colors">
                              Propostas
                            </span>
                          </button>

                          <button
                            onClick={() => handleOpenNotes(client)}
                            className="lead-menu-item group flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors"
                          >
                            <NotepadText className="h-4 w-4 shrink-0 text-[var(--secondary)] group-hover:text-white group-hover:stroke-white transition-colors" />
                            <span className="font-medium group-hover:text-white transition-colors">
                              Anotar {notesCount > 0 ? `(${notesCount})` : ''}
                            </span>
                          </button>

                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              setParamsModalClient(client);
                            }}
                            className="lead-menu-item group flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors"
                          >
                            <SlidersHorizontal className="h-4 w-4 shrink-0 text-[var(--secondary)] group-hover:text-white group-hover:stroke-white transition-colors" />
                            <span className="font-medium group-hover:text-white transition-colors">
                              Parâmetros gerais
                            </span>
                          </button>

                          <div className="my-1 border-t border-[var(--border)]" />

                          <button
                            data-delete-btn="true"
                            onClick={() => {
                              setOpenMenuId(null);
                              setDeleteClientTarget(client);
                            }}
                            className="lead-menu-item-danger group flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-[var(--danger)] transition-colors"
                          >
                            <Trash2 className="h-4 w-4 shrink-0 transition-colors" />
                            <span className="font-medium transition-colors">Excluir cliente</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informações de Contato e Local */}
                  <dl className="mt-5 space-y-2.5 text-sm">
                    <div className="flex items-center gap-2 text-[var(--text)]">
                      <Phone className="h-4 w-4 text-[var(--dim)] shrink-0" />
                      <a href={`tel:${client.phone}`} className="hover:underline">
                        {client.phone ? formatPhone(client.phone) : 'Sem telefone'}
                      </a>
                    </div>
                    {client.email && (
                      <div className="flex min-w-0 items-center gap-2 text-[var(--text)]">
                        <Mail className="h-4 w-4 shrink-0 text-[var(--dim)]" />
                        <a
                          href={`mailto:${client.email}`}
                          className="truncate hover:underline"
                          title={client.email}
                        >
                          {client.email}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[var(--text)]">
                      <MapPin className="h-4 w-4 text-[var(--dim)] shrink-0" />
                      <span className="truncate">
                        {client.city ? `${client.city}/${client.state || 'UF'}` : 'Cidade não informada'}
                      </span>
                    </div>
                    {client.concessionaria && (
                      <div className="flex items-center gap-2 text-[var(--text)]">
                        <Building2 className="h-4 w-4 text-[var(--dim)] shrink-0" />
                        <span className="truncate">{client.concessionaria}</span>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Rodapé do Card com Atalho para Propostas */}
                <div className="mt-5 border-t border-[var(--border)] pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[var(--dim)]">
                        Consumo mensal
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-[var(--text)]">
                        {client.avgConsumptionKWh
                          ? `${client.avgConsumptionKWh} kWh/mês`
                          : client.avgMonthlyBill
                          ? money.format(client.avgMonthlyBill)
                          : 'Não informado'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--dim)]">
                        Cliente desde
                      </p>
                      <p className="mt-0.5 flex items-center justify-end gap-1 text-sm font-semibold text-[var(--text)]">
                        <CalendarDays className="h-3.5 w-3.5 text-[var(--dim)]" />
                        {client.createdAt
                          ? new Date(client.createdAt).toLocaleDateString('pt-BR')
                          : 'Recente'}
                      </p>
                    </div>
                  </div>

                  {/* Botão de ação rápida para Propostas */}
                  <div className="mt-3.5 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenPropostas(client)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-all hover:bg-[var(--secondary)] hover:border-[var(--secondary)] hover:text-white"
                      style={{
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        color: theme.text,
                      }}
                    >
                      <Files className="h-3.5 w-3.5 text-[var(--secondary)]" />
                      <span>Propostas ({clientProposals.length})</span>
                    </button>
                    <button
                      onClick={() => handleOpenNotes(client)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all hover:bg-[var(--secondary)] hover:border-[var(--secondary)] hover:text-white"
                      style={{
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        color: theme.text,
                      }}
                      title="Anotações do cliente"
                    >
                      <NotepadText className="h-3.5 w-3.5 text-[var(--secondary)]" />
                      {notesCount > 0 && <span>{notesCount}</span>}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MODAL: Propostas do Cliente */}
      {proposalsModalClient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col"
            style={{
              backgroundColor: theme.primary,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <div className="flex items-center justify-between border-b pb-4 shrink-0" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm"
                  style={{
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.secondary,
                  }}
                >
                  <Files className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text)]">
                    Propostas de {proposalsModalClient.name}
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    Histórico comercial e orçamentos vinculados
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProposalsModalClient(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border text-[var(--muted)] hover:text-[var(--text)]"
                style={{ borderColor: theme.border }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {getProposalsForClient(proposalsModalClient).length === 0 ? (
                <div className="text-center py-10 rounded-xl border border-dashed" style={{ borderColor: theme.border }}>
                  <FileText className="h-8 w-8 mx-auto text-[var(--dim)] opacity-60" />
                  <p className="mt-2 text-sm font-semibold text-[var(--text)]">
                    Nenhuma proposta encontrada para este cliente.
                  </p>
                  <button
                    onClick={() => {
                      const c = proposalsModalClient;
                      setProposalsModalClient(null);
                      handleOpenNewProposal(c);
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                    style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Criar primeira proposta
                  </button>
                </div>
              ) : (
                getProposalsForClient(proposalsModalClient).map((prop) => (
                  <div
                    key={prop.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--secondary)]">
                          {prop.code}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold border"
                          style={{
                            borderColor: theme.border,
                            backgroundColor: theme.primary,
                          }}
                        >
                          {prop.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-[var(--text)]">{prop.title}</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        Potência: {prop.systemPowerKWp} kWp • Tipo: {prop.systemType} • Valor: {money.format(prop.totalValue)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setViewingProposal(convertToSolarProposal(prop, proposalsModalClient));
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all hover:border-[var(--secondary)] hover:text-[var(--secondary)]"
                        style={{ borderColor: theme.border, backgroundColor: theme.primary }}
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver proposta
                      </button>
                      {onNavigate && (
                        <button
                          onClick={() => {
                            setProposalsModalClient(null);
                            onNavigate('propostas', prop.code);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all hover:bg-[var(--secondary)] hover:text-white"
                          style={{ borderColor: theme.border, backgroundColor: theme.primary }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Abrir
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-4 flex items-center justify-between shrink-0" style={{ borderColor: theme.border }}>
              <button
                onClick={() => {
                  const c = proposalsModalClient;
                  setProposalsModalClient(null);
                  handleOpenNewProposal(c);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold"
                style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
              >
                <Plus className="h-4 w-4" /> Nova proposta para {proposalsModalClient.name}
              </button>
              <button
                onClick={() => setProposalsModalClient(null)}
                className="rounded-lg border px-4 py-2 text-xs font-semibold"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Anotações do Cliente */}
      {notesModalClient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
            style={{
              backgroundColor: theme.primary,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <div className="flex items-center justify-between border-b pb-3 shrink-0" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm"
                  style={{
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.secondary,
                  }}
                >
                  <NotepadText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text)]">
                    Anotações: {notesModalClient.name}
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    Registro de conversas, faturas e observações
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNotesModalClient(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border text-[var(--muted)] hover:text-[var(--text)]"
                style={{ borderColor: theme.border }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Caixa de nova anotação */}
            <div className="space-y-2 shrink-0">
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Escreva uma anotação sobre este cliente..."
                rows={3}
                className="w-full rounded-lg border p-3 text-sm outline-none focus:border-[var(--secondary)]"
                style={{
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processingImages}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:border-[var(--secondary)]"
                    style={{ borderColor: theme.border, backgroundColor: theme.background }}
                  >
                    Anexar foto
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  {newNoteImages.length > 0 && (
                    <span className="text-xs text-[var(--secondary)] font-semibold">
                      {newNoteImages.length} imagem(ns)
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={savingNotes || (!newNoteText.trim() && newNoteImages.length === 0)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
                  style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                >
                  <Check className="h-3.5 w-3.5" /> Salvar anotação
                </button>
              </div>
            </div>

            {/* Lista de anotações */}
            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {clientNotesList.length === 0 ? (
                <div className="text-center py-8 rounded-xl border border-dashed" style={{ borderColor: theme.border }}>
                  <NotepadText className="h-7 w-7 mx-auto text-[var(--dim)] opacity-60" />
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Nenhuma anotação registrada ainda.
                  </p>
                </div>
              ) : (
                clientNotesList.map((note) => (
                  <div
                    key={note.id}
                    className="p-3.5 rounded-xl border space-y-2 relative group"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    }}
                  >
                    <div className="flex items-center justify-between text-[11px] text-[var(--dim)]">
                      <span>{new Date(note.createdAt).toLocaleString('pt-BR')}</span>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-[var(--danger)] hover:underline opacity-80 hover:opacity-100"
                      >
                        Excluir
                      </button>
                    </div>
                    <p className="text-sm text-[var(--text)] whitespace-pre-wrap">{note.text}</p>
                    {note.images && note.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {note.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt="Anexo"
                            className="h-16 w-16 object-cover rounded-lg border"
                            style={{ borderColor: theme.border }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Parâmetros do Cliente */}
      {paramsModalClient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4"
            style={{
              backgroundColor: theme.primary,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-[var(--secondary)]" />
                <h2 className="text-lg font-bold">Parâmetros de {paramsModalClient.name}</h2>
              </div>
              <button
                onClick={() => setParamsModalClient(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border text-[var(--muted)] hover:text-[var(--text)]"
                style={{ borderColor: theme.border }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--dim)]">Tipo de Imóvel</label>
                  <p className="mt-1 font-semibold">{paramsModalClient.type || 'Residencial'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--dim)]">Concessionária</label>
                  <p className="mt-1 font-semibold">{paramsModalClient.concessionaria || 'CPFL Paulista'}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--dim)]">Endereço</label>
                <p className="mt-1 font-semibold">
                  {paramsModalClient.street
                    ? `${paramsModalClient.street}, ${paramsModalClient.addressNumber || 'S/N'}`
                    : 'Não informado'}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {paramsModalClient.city} - {paramsModalClient.state || 'SP'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--dim)]">Consumo Médio</label>
                <p className="mt-1 font-semibold">
                  {paramsModalClient.avgConsumptionKWh
                    ? `${paramsModalClient.avgConsumptionKWh} kWh/mês`
                    : 'Não informado'}
                </p>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-end" style={{ borderColor: theme.border }}>
              <button
                onClick={() => setParamsModalClient(null)}
                className="rounded-lg px-4 py-2 text-xs font-semibold"
                style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmação de Exclusão de Cliente */}
      {deleteClientTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4"
            style={{
              backgroundColor: theme.primary,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Excluir Cliente</h3>
                <p className="text-xs text-[var(--muted)]">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-sm text-[var(--text)]">
              Tem certeza que deseja remover o cliente <strong>{deleteClientTarget.name}</strong> da sua base?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteClientTarget(null)}
                className="rounded-lg border px-4 py-2 text-xs font-semibold"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteClient}
                disabled={Boolean(workingId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Novo Cliente Manual */}
      {isNewClientModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: theme.primary,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[var(--secondary)]" />
                <h2 className="text-lg font-bold">Novo Cliente</h2>
              </div>
              <button
                onClick={() => setIsNewClientModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border text-[var(--muted)] hover:text-[var(--text)]"
                style={{ borderColor: theme.border }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewClient} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--dim)]">Nome completo *</label>
                <input
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="mt-1 h-9 w-full rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                  style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--dim)]">Telefone / WhatsApp</label>
                  <input
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="(19) 99999-9999"
                    className="mt-1 h-9 w-full rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--dim)]">E-mail</label>
                  <input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="cliente@exemplo.com"
                    className="mt-1 h-9 w-full rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-[var(--dim)]">Rua / Logradouro</label>
                  <input
                    value={newClientStreet}
                    onChange={(e) => setNewClientStreet(e.target.value)}
                    placeholder="Rua das Palmeiras"
                    className="mt-1 h-9 w-full rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--dim)]">Número</label>
                  <input
                    value={newClientNumber}
                    onChange={(e) => setNewClientNumber(e.target.value)}
                    placeholder="123"
                    className="mt-1 h-9 w-full rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--dim)]">Cidade</label>
                  <input
                    value={newClientCity}
                    onChange={(e) => setNewClientCity(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--dim)]">Estado (UF)</label>
                  <input
                    value={newClientState}
                    onChange={(e) => setNewClientState(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--dim)]">Tipo do Imóvel</label>
                  <select
                    value={newClientType}
                    onChange={(e) => setNewClientType(e.target.value as any)}
                    className="mt-1 h-9 w-full rounded-lg border px-2 text-sm outline-none focus:border-[var(--secondary)]"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  >
                    <option value="Residencial">Residencial</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Rural">Rural</option>
                    <option value="Industrial">Industrial</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--dim)]">Consumo Médio (kWh/mês)</label>
                  <input
                    type="number"
                    value={newClientConsumption}
                    onChange={(e) => setNewClientConsumption(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Ex: 850"
                    className="mt-1 h-9 w-full rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </div>
              </div>

              <div className="border-t pt-4 flex justify-end gap-2" style={{ borderColor: theme.border }}>
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="rounded-lg border px-4 py-2 text-xs font-semibold"
                  style={{ borderColor: theme.border, backgroundColor: theme.background }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg px-4 py-2 text-xs font-semibold"
                  style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Criação de Nova Proposta */}
      {isNewProposalModalOpen && (
        <NewProposalModal
          isOpen={isNewProposalModalOpen}
          onClose={() => {
            setIsNewProposalModalOpen(false);
            setProposalClientPreselected(null);
          }}
          clients={
            proposalClientPreselected
              ? [proposalClientPreselected, ...clients.filter((c) => c.id !== proposalClientPreselected.id)]
              : clients
          }
          theme={theme}
          onSaveProposal={handleSaveProposalFromModal}
          onShowToast={onShowToast}
        />
      )}

      {/* MODAL: Visualizador de Proposta */}
      {viewingProposal && pdfSettings && (
        <ProposalViewerModal
          proposal={viewingProposal}
          pdfSettings={pdfSettings}
          theme={theme}
          onClose={() => setViewingProposal(null)}
          onShowToast={onShowToast}
        />
      )}
    </section>
  );
}
