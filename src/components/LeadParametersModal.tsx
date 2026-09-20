import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FilePlus2,
  FileText,
  HelpCircle,
  Mail,
  MapPin,
  MessageCircle,
  NotepadText,
  Phone,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react';
import { Lead, LeadStage, ThemeConfig } from '../types';
import {
  createProposalFromLead,
  deleteLeadProposal,
  fetchLeadEnergyBills,
  fetchLeadNotesCount,
  fetchLeadProposals,
  getEnergyBillSignedUrl,
  LeadDocumentItem,
  LeadProposalItem,
  ProposalSystemType,
  updateLeadNotes,
  updateLeadParameters,
  updateLeadStatus,
} from '../services/leads';
import { formatPhone, formatWhatsAppLink } from '../utils/formatters';
import { LeadNotesManager } from './LeadNotesManager';
import { parseLeadNotes } from '../utils/leadNotes';
import { getContrastFg } from '../utils/themeEngine';
import { getLeadStatusStyle, LEAD_STAGE_LABELS, LEAD_STATUS_PALETTE } from '../utils/leadStatus';
import { LEAD_STATUS_CHANGED_EVENT } from '../utils/leadStatusPersistence';

interface LeadParametersModalProps {
  lead: Lead;
  theme: ThemeConfig;
  statusLabels: Record<LeadStage, string>;
  initialTab?: TabKey;
  onClose: () => void;
  onLeadUpdated: (updatedLead: Lead) => void;
  onShowToast: (message: string) => void;
}

type TabKey = 'parametros' | 'propostas' | 'conta_luz' | 'anotacoes';

export function LeadParametersModal({
  lead,
  theme,
  statusLabels,
  initialTab = 'parametros',
  onClose,
  onLeadUpdated,
  onShowToast,
}: LeadParametersModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [loading, setLoading] = useState(true);

  // Propostas
  const [proposals, setProposals] = useState<LeadProposalItem[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [deletingProposalId, setDeletingProposalId] = useState<string | null>(null);
  const [selectedProposalForView, setSelectedProposalForView] = useState<LeadProposalItem | null>(null);
  const [creatingProposal, setCreatingProposal] = useState(false);
  const [newProposalSystemType, setNewProposalSystemType] = useState<ProposalSystemType>('On-Grid');
  const [showCreateProposalModal, setShowCreateProposalModal] = useState(false);

  // Documentos / Conta de luz
  const [energyBills, setEnergyBills] = useState<LeadDocumentItem[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [openingBillPath, setOpeningBillPath] = useState<string | null>(null);

  // Anotações
  const [notesCount, setNotesCount] = useState<number>(0);
  const [notesText, setNotesText] = useState(lead.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);

  // Parâmetros editáveis
  const [name, setName] = useState(lead.name || '');
  const [phone, setPhone] = useState(formatPhone(lead.phone || ''));
  const [email, setEmail] = useState(lead.email || '');
  const [street, setStreet] = useState(lead.street || '');
  const [addressNumber, setAddressNumber] = useState(lead.addressNumber || '');
  const [city, setCity] = useState(lead.city || '');
  const [state, setState] = useState(lead.state || '');
  const [status, setStatus] = useState<LeadStage>(lead.status || 'novo');
  const [propertyType, setPropertyType] = useState<Lead['propertyType']>(lead.propertyType || 'Residencial');
  const [propertyStatus, setPropertyStatus] = useState(lead.propertyStatus || '');
  const [distributor, setDistributor] = useState(lead.distributor || '');
  const [bill, setBill] = useState(lead.averageMonthlyBill != null ? String(lead.averageMonthlyBill) : '');
  const [kwh, setKwh] = useState(lead.averageConsumptionKWh != null ? String(lead.averageConsumptionKWh) : '');
  const [timeframe, setTimeframe] = useState(lead.installationTimeframe || '');
  const [contactTime, setContactTime] = useState(lead.preferredContactTime || '');
  const [responsible, setResponsible] = useState(lead.responsible || '');

  // Status dropdown interativo
  const [isHeaderStatusMenuOpen, setIsHeaderStatusMenuOpen] = useState(false);
  const [isSectionStatusMenuOpen, setIsSectionStatusMenuOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const headerStatusRef = useRef<HTMLDivElement | null>(null);
  const sectionStatusRef = useRef<HTMLDivElement | null>(null);

  const [savingParams, setSavingParams] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isLight = getContrastFg(theme.primary) === '#0F172A';
  const currentStatusStyle = getLeadStatusStyle(status, isLight);

  // Fecha dropdowns de status ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (headerStatusRef.current && !headerStatusRef.current.contains(target)) {
        setIsHeaderStatusMenuOpen(false);
      }
      if (sectionStatusRef.current && !sectionStatusRef.current.contains(target)) {
        setIsSectionStatusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sincroniza em tempo real se o status for alterado externamente (no card ou em outra aba)
  useEffect(() => {
    const handleStatusEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ leadId: string; status: LeadStage }>;
      if (customEvent.detail && customEvent.detail.leadId === lead.id) {
        setStatus(customEvent.detail.status);
      }
    };
    window.addEventListener(LEAD_STATUS_CHANGED_EVENT, handleStatusEvent);
    return () => window.removeEventListener(LEAD_STATUS_CHANGED_EVENT, handleStatusEvent);
  }, [lead.id]);

  // Carrega dados associados ao lead
  const loadData = async () => {
    setLoading(true);
    setLoadingProposals(true);
    setLoadingBills(true);

    try {
      const [proposalsData, billsData, nNotes] = await Promise.all([
        fetchLeadProposals(lead.id),
        fetchLeadEnergyBills(lead.id),
        fetchLeadNotesCount(lead.id),
      ]);
      setProposals(proposalsData);
      setEnergyBills(billsData);
      setNotesCount(Math.max(nNotes, parseLeadNotes(lead.notes).length));
    } catch (err) {
      console.error('Erro ao carregar dados do lead:', err);
    } finally {
      setLoading(false);
      setLoadingProposals(false);
      setLoadingBills(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [lead.id]);

  useEffect(() => {
    if (lead.status) {
      setStatus(lead.status);
    }
  }, [lead.status]);

  // Atualização instantânea do status: reflete no cabeçalho, no formulário, no card e persiste no banco/storage
  const handleStatusChange = async (newStatus: LeadStage) => {
    if (newStatus === status) {
      setIsHeaderStatusMenuOpen(false);
      setIsSectionStatusMenuOpen(false);
      return;
    }

    setStatus(newStatus);
    setIsHeaderStatusMenuOpen(false);
    setIsSectionStatusMenuOpen(false);
    setUpdatingStatus(true);

    const updatedLead: Lead = {
      ...lead,
      status: newStatus,
    };
    onLeadUpdated(updatedLead);

    try {
      await updateLeadStatus(lead.id, newStatus);
      const label = statusLabels[newStatus] || LEAD_STAGE_LABELS[newStatus] || newStatus;
      onShowToast(`Status de ${lead.name} alterado para "${label}".`);
    } catch (err: any) {
      console.error('Erro ao atualizar status do lead:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Salvar parâmetros do formulário
  const handleSaveParams = async () => {
    setSavingParams(true);
    setErrorMessage('');
    const parsedBill = bill.trim() ? parseFloat(bill.replace(',', '.')) : undefined;
    const parsedKwh = kwh.trim() ? parseFloat(kwh.replace(',', '.')) : undefined;

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      street: street.trim() || undefined,
      addressNumber: addressNumber.trim() || undefined,
      city: city.trim(),
      state: state.trim().toUpperCase(),
      status,
      propertyType,
      propertyStatus: (propertyStatus as any) || undefined,
      distributor: distributor.trim() || undefined,
      averageMonthlyBill: isNaN(parsedBill as number) ? undefined : parsedBill,
      averageConsumptionKWh: isNaN(parsedKwh as number) ? undefined : parsedKwh,
      installationTimeframe: timeframe.trim() || undefined,
      preferredContactTime: contactTime.trim() || undefined,
      responsible: responsible.trim() || undefined,
    };

    try {
      await updateLeadParameters(lead.id, payload);
      const updated = {
        ...lead,
        ...payload,
      };
      onLeadUpdated(updated);
      onShowToast('Parâmetros do lead atualizados com sucesso.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Não foi possível salvar os parâmetros.');
    } finally {
      setSavingParams(false);
    }
  };

  // Salvar anotação
  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setErrorMessage('');
    try {
      await updateLeadNotes(lead.id, notesText);
      const updated = { ...lead, notes: notesText };
      onLeadUpdated(updated);
      setNotesCount((curr) => (notesText.trim() ? Math.max(curr, 1) : curr));
      onShowToast('Anotação salva com sucesso.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao salvar anotação.');
    } finally {
      setSavingNotes(false);
    }
  };

  // Excluir proposta
  const handleDeleteProposal = async (proposalId: string, code: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a proposta ${code}?`)) return;
    setDeletingProposalId(proposalId);
    try {
      await deleteLeadProposal(proposalId);
      setProposals((curr) => curr.filter((p) => p.id !== proposalId));
      if (selectedProposalForView?.id === proposalId) {
        setSelectedProposalForView(null);
      }
      onShowToast(`Proposta ${code} excluída.`);
    } catch (err: any) {
      onShowToast(`Erro ao excluir proposta: ${err?.message || 'Falha'}`);
    } finally {
      setDeletingProposalId(null);
    }
  };

  // Criar nova proposta
  const handleCreateProposal = async () => {
    setCreatingProposal(true);
    setErrorMessage('');
    try {
      const result = await createProposalFromLead(lead.id, newProposalSystemType);
      setShowCreateProposalModal(false);
      onShowToast(`Proposta ${result.proposalCode} gerada.`);
      // Recarrega propostas
      const updatedProposals = await fetchLeadProposals(lead.id);
      setProposals(updatedProposals);
      setActiveTab('propostas');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Não foi possível gerar a proposta.');
    } finally {
      setCreatingProposal(false);
    }
  };

  // Visualizar conta de luz
  const handleOpenBill = async (billItem: LeadDocumentItem) => {
    setOpeningBillPath(billItem.objectPath);
    try {
      const signedUrl = await getEnergyBillSignedUrl(billItem.objectPath);
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert('Não foi possível gerar o link para visualização do arquivo.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao abrir a conta de luz.');
    } finally {
      setOpeningBillPath(null);
    }
  };

  const formattedDate = lead.createdAt
    ? new Date(lead.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Data não informada';

  const whatsappUrl = formatWhatsAppLink(lead.phone || phone);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 backdrop-blur-sm overflow-y-auto"
      style={{ backgroundColor: 'color-mix(in srgb, var(--neutral) 82%, transparent)' }}
    >
      <div
        className="w-full max-w-4xl rounded-2xl border flex flex-col my-auto max-h-[92vh] overflow-hidden shadow-2xl transition-all"
        style={{
          backgroundColor: theme.primary,
          borderColor: theme.border,
          color: theme.text,
          boxShadow: `0 24px 60px ${theme.secondary}25`,
        }}
      >
        {/* Top Header */}
        <div
          className="border-b px-6 py-4 flex items-center justify-between gap-4"
          style={{ borderColor: theme.border, backgroundColor: 'color-mix(in srgb, var(--primary) 96%, transparent)' }}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border font-bold"
              style={{
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: 'var(--secondary)',
              }}
            >
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold truncate leading-tight" title={lead.name}>
                  {lead.name}
                </h1>
                <div ref={headerStatusRef} className="relative inline-block">
                  <button
                    type="button"
                    aria-label={`Status: ${currentStatusStyle.label}. Clique para alterar.`}
                    aria-haspopup="listbox"
                    aria-expanded={isHeaderStatusMenuOpen}
                    onClick={() => {
                      setIsSectionStatusMenuOpen(false);
                      setIsHeaderStatusMenuOpen((prev) => !prev);
                    }}
                    disabled={updatingStatus}
                    className="group/status inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
                    style={{
                      borderColor: currentStatusStyle.border,
                      backgroundColor: currentStatusStyle.bg,
                      color: currentStatusStyle.color,
                    }}
                    title="Clique para mudar o status diretamente"
                  >
                    {updatingStatus ? (
                      <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: currentStatusStyle.color }}
                      />
                    )}
                    <span>{currentStatusStyle.label}</span>
                    <ChevronDown
                      className={`h-3 w-3 opacity-70 transition-transform group-hover/status:opacity-100 ${
                        isHeaderStatusMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isHeaderStatusMenuOpen && (
                    <div
                      className="absolute left-0 top-full mt-1.5 z-50 w-44 overflow-hidden rounded-xl border py-1.5 shadow-2xl backdrop-blur-md"
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
                        const isCurrent = status === stageKey;
                        return (
                          <button
                            key={stageKey}
                            type="button"
                            onClick={() => void handleStatusChange(stageKey)}
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
                {lead.clientId && (
                  <span
                    className="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--auxiliary) 15%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--auxiliary) 40%, transparent)',
                      color: 'var(--auxiliary)',
                    }}
                  >
                    Cliente Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--muted)] truncate mt-0.5">
                Captado em {formattedDate} · Origem: {lead.source || 'Formulário do site'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg border hover:border-[var(--secondary)] hover:text-[var(--secondary)] hover:bg-[color-mix(in_srgb,var(--secondary)_14%,transparent)] transition-colors text-[var(--dim)]"
              style={{ borderColor: theme.border }}
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Abas de Navegação */}
        <nav
          id="lead-modal-nav"
          aria-label="Navegação do lead"
          className="shrink-0 border-b px-6 py-3 overflow-x-auto"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--background) 55%, transparent)',
            borderColor: theme.border,
          }}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-max">
            {/* Aba 1: Dados do Lead */}
            <button
              id="lead-modal-tab-parametros"
              type="button"
              onClick={() => setActiveTab('parametros')}
              className={`lead-modal-nav-btn group flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'parametros'
                  ? 'border-[var(--secondary)] shadow-sm'
                  : 'border-transparent text-[var(--muted)]'
              }`}
              style={
                activeTab === 'parametros'
                  ? {
                      backgroundColor: 'color-mix(in srgb, var(--secondary) 14%, var(--primary))',
                      borderColor: theme.secondary,
                      color: theme.secondary,
                    }
                  : undefined
              }
            >
              <SlidersHorizontal
                className="h-4 w-4 shrink-0 transition-colors"
                style={{ color: activeTab === 'parametros' ? theme.secondary : undefined }}
              />
              <span className="transition-colors font-medium">Informações do Interessado</span>
            </button>

            {/* Aba 2: Propostas Geradas */}
            <button
              id="lead-modal-tab-propostas"
              type="button"
              onClick={() => setActiveTab('propostas')}
              className={`lead-modal-nav-btn group flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'propostas'
                  ? 'border-[var(--secondary)] shadow-sm'
                  : 'border-transparent text-[var(--muted)]'
              }`}
              style={
                activeTab === 'propostas'
                  ? {
                      backgroundColor: 'color-mix(in srgb, var(--secondary) 14%, var(--primary))',
                      borderColor: theme.secondary,
                      color: theme.secondary,
                    }
                  : undefined
              }
            >
              <FileText
                className="h-4 w-4 shrink-0 transition-colors"
                style={{ color: activeTab === 'propostas' ? theme.secondary : undefined }}
              />
              <span className="transition-colors font-medium">Propostas Geradas</span>
              <span
                className="tab-badge inline-flex items-center justify-center min-w-[20px] px-2 py-0.5 rounded-full text-xs font-bold transition-colors"
                style={{
                  backgroundColor:
                    activeTab === 'propostas'
                      ? theme.secondary
                      : 'color-mix(in srgb, var(--secondary) 18%, transparent)',
                  color:
                    activeTab === 'propostas'
                      ? 'var(--secondary-fg)'
                      : theme.secondary,
                }}
              >
                {loadingProposals ? '...' : proposals.length}
              </span>
            </button>

            {/* Aba 3: Conta de Luz */}
            <button
              id="lead-modal-tab-conta-luz"
              type="button"
              onClick={() => setActiveTab('conta_luz')}
              className={`lead-modal-nav-btn group flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'conta_luz'
                  ? 'border-[var(--secondary)] shadow-sm'
                  : 'border-transparent text-[var(--muted)]'
              }`}
              style={
                activeTab === 'conta_luz'
                  ? {
                      backgroundColor: 'color-mix(in srgb, var(--secondary) 14%, var(--primary))',
                      borderColor: theme.secondary,
                      color: theme.secondary,
                    }
                  : undefined
              }
            >
              <Zap
                className="h-4 w-4 shrink-0 transition-colors"
                style={{ color: activeTab === 'conta_luz' ? '#f59e0b' : undefined }}
              />
              <span className="transition-colors font-medium">Conta de Luz Anexada</span>
              <span
                className="tab-badge inline-flex items-center justify-center min-w-[20px] px-2 py-0.5 rounded-full text-xs font-bold transition-colors"
                style={{
                  backgroundColor:
                    activeTab === 'conta_luz'
                      ? theme.secondary
                      : 'color-mix(in srgb, var(--secondary) 18%, transparent)',
                  color:
                    activeTab === 'conta_luz'
                      ? 'var(--secondary-fg)'
                      : theme.secondary,
                }}
              >
                {loadingBills ? '...' : energyBills.length}
              </span>
            </button>

            {/* Aba 4: Anotações */}
            <button
              id="lead-modal-tab-anotacoes"
              type="button"
              onClick={() => setActiveTab('anotacoes')}
              className={`lead-modal-nav-btn group flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'anotacoes'
                  ? 'border-[var(--secondary)] shadow-sm'
                  : 'border-transparent text-[var(--muted)]'
              }`}
              style={
                activeTab === 'anotacoes'
                  ? {
                      backgroundColor: 'color-mix(in srgb, var(--secondary) 14%, var(--primary))',
                      borderColor: theme.secondary,
                      color: theme.secondary,
                    }
                  : undefined
              }
            >
              <NotepadText
                className="h-4 w-4 shrink-0 transition-colors"
                style={{ color: activeTab === 'anotacoes' ? theme.secondary : undefined }}
              />
              <span className="transition-colors font-medium">Anotações</span>
              <span
                className="tab-badge inline-flex items-center justify-center min-w-[20px] px-2 py-0.5 rounded-full text-xs font-bold transition-colors"
                style={{
                  backgroundColor:
                    activeTab === 'anotacoes'
                      ? theme.secondary
                      : 'color-mix(in srgb, var(--secondary) 18%, transparent)',
                  color:
                    activeTab === 'anotacoes'
                      ? 'var(--secondary-fg)'
                      : theme.secondary,
                }}
              >
                {notesCount}
              </span>
            </button>
          </div>
        </nav>

        {/* Conteúdo das Abas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ABA 1: PARÂMETROS E INFORMAÇÕES COMPLETAS DO LEAD */}
          {activeTab === 'parametros' && (
            <div className="space-y-6">
              {/* Bloco de Ações Rápidas de Contato */}
              <div
                className="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3"
                style={{ backgroundColor: theme.background, borderColor: theme.border }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[color-mix(in_srgb,var(--text)_6%,transparent)] text-[var(--text)]">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold">{lead.name}</h2>
                    <p className="text-xs text-[var(--muted)]">
                      {formatPhone(lead.phone)} {lead.email ? `· ${lead.email}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Conversar no WhatsApp
                    </a>
                  )}
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border hover:border-[var(--secondary)] hover:text-[var(--secondary)] hover:bg-[color-mix(in_srgb,var(--secondary)_14%,transparent)] transition-colors"
                      style={{ borderColor: theme.border, color: theme.text }}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Enviar E-mail
                    </a>
                  )}
                </div>
              </div>

              {/* Seção 1: Dados Pessoais e de Contato */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dim)] mb-3 flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-[var(--secondary)]" />
                  Dados de Contato & Localização
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--dim)] mb-1">Nome completo *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--dim)] mb-1">Telefone / WhatsApp *</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--dim)] mb-1">E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[var(--dim)] mb-1">Endereço (Rua / Logradouro)</label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Rua, avenida ou estrada informada no formulário"
                      className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--dim)] mb-1">Número / Compl.</label>
                    <input
                      type="text"
                      value={addressNumber}
                      onChange={(e) => setAddressNumber(e.target.value)}
                      placeholder="Ex: 123 ou S/N"
                      className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--dim)] mb-1">Cidade</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--dim)] mb-1">Estado (UF)</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      className="w-full h-10 rounded-lg border px-3 text-sm outline-none uppercase focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--dim)] mb-1">Horário preferencial de contato</label>
                    <select
                      value={contactTime}
                      onChange={(e) => setContactTime(e.target.value)}
                      className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    >
                      <option value="" style={{ backgroundColor: theme.primary, color: theme.text }}>Não especificado</option>
                      <option value="Manhã (08h às 12h)" style={{ backgroundColor: theme.primary, color: theme.text }}>Manhã (08h às 12h)</option>
                      <option value="Tarde (12h às 18h)" style={{ backgroundColor: theme.primary, color: theme.text }}>Tarde (12h às 18h)</option>
                      <option value="Noite (após 18h)" style={{ backgroundColor: theme.primary, color: theme.text }}>Noite (após 18h)</option>
                      <option value="Qualquer horário" style={{ backgroundColor: theme.primary, color: theme.text }}>Qualquer horário</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção 2: Dados Energéticos & Técnicos */}
              <div className="pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dim)] mb-3 flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Parâmetros de Energia & Instalação
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--dim)] mb-1">Distribuidora de energia</label>
                    <input
                      type="text"
                      value={distributor}
                      onChange={(e) => setDistributor(e.target.value)}
                      placeholder="Ex: Cemig, CPFL, Enel..."
                      className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--dim)] mb-1">Conta mensal média (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={bill}
                      onChange={(e) => setBill(e.target.value)}
                      placeholder="0,00"
                      className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--dim)] mb-1">Consumo médio (kWh/mês)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={kwh}
                      onChange={(e) => setKwh(e.target.value)}
                      placeholder="Ex: 450"
                      className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--dim)] mb-1">Tipo de imóvel</label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value as any)}
                      className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    >
                      <option value="Residencial" style={{ backgroundColor: theme.primary, color: theme.text }}>Residencial</option>
                      <option value="Comercial" style={{ backgroundColor: theme.primary, color: theme.text }}>Comercial</option>
                      <option value="Rural" style={{ backgroundColor: theme.primary, color: theme.text }}>Rural</option>
                      <option value="Industrial" style={{ backgroundColor: theme.primary, color: theme.text }}>Industrial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--dim)] mb-1">Situação do imóvel</label>
                    <select
                      value={propertyStatus}
                      onChange={(e) => setPropertyStatus(e.target.value)}
                      className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    >
                      <option value="" style={{ backgroundColor: theme.primary, color: theme.text }}>Não especificado</option>
                      <option value="Próprio" style={{ backgroundColor: theme.primary, color: theme.text }}>Próprio</option>
                      <option value="Alugado" style={{ backgroundColor: theme.primary, color: theme.text }}>Alugado</option>
                      <option value="Em construção" style={{ backgroundColor: theme.primary, color: theme.text }}>Em construção</option>
                      <option value="Outro" style={{ backgroundColor: theme.primary, color: theme.text }}>Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--dim)] mb-1">Prazo de instalação desejado</label>
                    <select
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value)}
                      className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    >
                      <option value="" style={{ backgroundColor: theme.primary, color: theme.text }}>Não especificado</option>
                      <option value="Imediato (até 30 dias)" style={{ backgroundColor: theme.primary, color: theme.text }}>Imediato (até 30 dias)</option>
                      <option value="1 a 3 meses" style={{ backgroundColor: theme.primary, color: theme.text }}>1 a 3 meses</option>
                      <option value="3 a 6 meses" style={{ backgroundColor: theme.primary, color: theme.text }}>3 a 6 meses</option>
                      <option value="Apenas pesquisando" style={{ backgroundColor: theme.primary, color: theme.text }}>Apenas pesquisando</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção 3: Gestão Comercial & Metadados do Lead */}
              <div className="pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dim)] mb-3 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  Status no Funil & Atribuição
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-medium text-[var(--dim)]">Status no funil</label>
                      <div ref={sectionStatusRef} className="relative inline-block">
                        <button
                          type="button"
                          aria-label={`Status: ${currentStatusStyle.label}. Clique para alterar.`}
                          aria-haspopup="listbox"
                          aria-expanded={isSectionStatusMenuOpen}
                          onClick={() => {
                            setIsHeaderStatusMenuOpen(false);
                            setIsSectionStatusMenuOpen((prev) => !prev);
                          }}
                          disabled={updatingStatus}
                          className="group/status inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
                          style={{
                            borderColor: currentStatusStyle.border,
                            backgroundColor: currentStatusStyle.bg,
                            color: currentStatusStyle.color,
                          }}
                          title="Clique para alternar o status do lead"
                        >
                          {updatingStatus ? (
                            <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            <span
                              className="h-1.5 w-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: currentStatusStyle.color }}
                            />
                          )}
                          <span>{currentStatusStyle.label}</span>
                          <ChevronDown
                            className={`h-3 w-3 opacity-70 transition-transform group-hover/status:opacity-100 ${
                              isSectionStatusMenuOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {isSectionStatusMenuOpen && (
                          <div
                            className="absolute right-0 top-full mt-1.5 z-50 w-44 overflow-hidden rounded-xl border py-1.5 shadow-2xl backdrop-blur-md"
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
                              const isCurrent = status === stageKey;
                              return (
                                <button
                                  key={stageKey}
                                  type="button"
                                  onClick={() => void handleStatusChange(stageKey)}
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
                    </div>
                    <div className="relative flex items-center">
                      <span
                        className="absolute left-3.5 h-2.5 w-2.5 rounded-full pointer-events-none transition-colors"
                        style={{ backgroundColor: currentStatusStyle.color }}
                      />
                      <select
                        value={status}
                        onChange={(e) => void handleStatusChange(e.target.value as LeadStage)}
                        disabled={updatingStatus}
                        className="w-full h-10 appearance-none rounded-lg border pl-9 pr-9 text-sm outline-none transition-colors font-medium cursor-pointer"
                        style={{
                          backgroundColor: theme.background,
                          borderColor: currentStatusStyle.border,
                          color: theme.text,
                        }}
                      >
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <option key={key} value={key} style={{ backgroundColor: theme.primary, color: theme.text }}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="absolute right-3 h-4 w-4 pointer-events-none opacity-60"
                        style={{ color: theme.text }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--dim)] mb-1">Consultor / Responsável</label>
                    <input
                      type="text"
                      value={responsible}
                      onChange={(e) => setResponsible(e.target.value)}
                      placeholder="Nome do consultor responsável"
                      className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                    />
                  </div>
                </div>
              </div>

              {/* Botão de Salvar Alterações nos Parâmetros */}
              <div
                className="pt-4 border-t flex items-center justify-end gap-3"
                style={{ borderColor: theme.border }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border text-xs font-semibold hover:border-[var(--secondary)] hover:text-[var(--secondary)] hover:bg-[color-mix(in_srgb,var(--secondary)_14%,transparent)] transition-colors"
                  style={{ borderColor: theme.border }}
                >
                  Fechar
                </button>
                <button
                  id="btn-lead-salvar-alteracoes"
                  type="button"
                  onClick={() => void handleSaveParams()}
                  disabled={savingParams}
                  className="px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:brightness-110 hover:shadow-lg active:scale-[0.98]"
                  style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                >
                  {savingParams ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Salvando alterações...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ABA 2: PROPOSTAS GERADAS PARA ESSE INTERESSADO */}
          {activeTab === 'propostas' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[var(--secondary)]" />
                    Propostas Geradas ({proposals.length})
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    Histórico completo de propostas e orçamentos vinculados a este interessado.
                  </p>
                </div>
                <button
                  id="btn-lead-gerar-nova-proposta"
                  type="button"
                  onClick={() => setShowCreateProposalModal(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold shadow-md transition-all self-start sm:self-auto hover:brightness-110 active:scale-[0.98]"
                  style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                >
                  <FileText className="h-4 w-4" />
                  Gerar Nova Proposta
                </button>
              </div>

              {loadingProposals ? (
                <div className="py-12 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-[var(--secondary)]" />
                  Carregando propostas vinculadas...
                </div>
              ) : proposals.length === 0 ? (
                <div
                  className="p-8 text-center rounded-xl border border-dashed flex flex-col items-center justify-center gap-2"
                  style={{ borderColor: theme.border, backgroundColor: theme.background }}
                >
                  <FileText className="h-8 w-8 text-[var(--dim)] opacity-60" />
                  <p className="text-sm font-semibold text-[var(--text)]">Nenhuma proposta gerada ainda</p>
                  <p className="text-xs text-[var(--muted)] max-w-sm">
                    Este interessado ainda não possui propostas de energia solar criadas. Você pode gerar a primeira proposta agora mesmo.
                  </p>
                  <button
                    id="btn-lead-criar-proposta-comercial"
                    type="button"
                    onClick={() => setShowCreateProposalModal(true)}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:brightness-110 active:scale-[0.98]"
                    style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                  >
                    <FileText className="h-4 w-4" />
                    Criar Proposta Comercial
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {proposals.map((item) => {
                    const propDate = new Date(item.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:border-[var(--secondary)]"
                        style={{ backgroundColor: theme.background, borderColor: theme.border }}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-[var(--text)]">
                              {item.code}
                            </span>
                            <span
                              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                              style={{
                                borderColor: 'color-mix(in srgb, var(--secondary) 40%, transparent)',
                                backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                                color: theme.secondary,
                              }}
                            >
                              {item.systemType}
                            </span>
                            <span
                              className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                              style={{
                                borderColor: theme.border,
                                backgroundColor: 'color-mix(in srgb, var(--text) 8%, transparent)',
                                color: theme.text,
                              }}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--muted)]">
                            Criada em {propDate}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => setSelectedProposalForView(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] transition-colors"
                            style={{ borderColor: theme.border, color: theme.text }}
                            title="Visualizar Detalhes da Proposta"
                          >
                            <Eye className="h-3.5 w-3.5 text-[var(--secondary)]" />
                            Visualizar
                          </button>
                          <button
                            data-delete-btn="true"
                            onClick={() => void handleDeleteProposal(item.id, item.code)}
                            disabled={deletingProposalId === item.id}
                            className="btn-danger-outline flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
                            title="Excluir Proposta"
                          >
                            {deletingProposalId === item.id ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Excluir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ABA 3: CONTA DE LUZ ANEXADA NO FORM LEAD */}
          {activeTab === 'conta_luz' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Conta de Luz Anexada no Formulário Lead
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  Fatura de energia enviada pelo interessado durante o preenchimento do formulário público de captação.
                </p>
              </div>

              {loadingBills ? (
                <div className="py-12 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-[var(--secondary)]" />
                  Consultando documentos anexados...
                </div>
              ) : energyBills.length === 0 ? (
                <div
                  className="p-8 text-center rounded-xl border border-dashed flex flex-col items-center justify-center gap-2"
                  style={{ borderColor: theme.border, backgroundColor: theme.background }}
                >
                  <FileText className="h-8 w-8 text-[var(--dim)] opacity-50" />
                  <p className="text-sm font-semibold text-[var(--text)]">Nenhuma conta de luz foi anexada</p>
                  <p className="text-xs text-[var(--muted)] max-w-md">
                    O interessado preencheu o formulário sem anexar o arquivo da fatura de energia. Você pode solicitar o PDF ou foto via WhatsApp para anexar ao atendimento.
                  </p>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Solicitar Fatura no WhatsApp
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {energyBills.map((doc) => {
                    const uploadDate = new Date(doc.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const sizeFormatted =
                      doc.sizeBytes > 1024 * 1024
                        ? `${(doc.sizeBytes / (1024 * 1024)).toFixed(2)} MB`
                        : `${Math.round(doc.sizeBytes / 1024)} KB`;

                    const isPdf = doc.mimeType === 'application/pdf';

                    return (
                      <div
                        key={doc.id}
                        className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                        style={{ backgroundColor: theme.background, borderColor: theme.border }}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border font-bold"
                            style={{
                              backgroundColor: theme.primary,
                              borderColor: theme.border,
                              color: isPdf ? '#ef4444' : '#3b82f6',
                            }}
                          >
                            <FileText className="h-6 w-6" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold truncate text-[var(--text)]" title={doc.originalName}>
                              {doc.originalName}
                            </h4>
                            <p className="text-xs text-[var(--muted)] mt-0.5">
                              {sizeFormatted} · Enviado em {uploadDate}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button
                            onClick={() => void handleOpenBill(doc)}
                            disabled={openingBillPath === doc.objectPath}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm hover:brightness-110 active:scale-[0.98]"
                            style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                          >
                            {openingBillPath === doc.objectPath ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                Abrindo...
                              </>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5" />
                                Visualizar Conta de Luz
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ABA 4: ANOTAÇÕES CRIADAS PARA ESSE LEAD */}
          {activeTab === 'anotacoes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <NotepadText className="h-4 w-4 text-[var(--secondary)]" />
                    Anotações do Lead ({notesCount})
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    Histórico completo de observações, telefonemas e fotos da instalação.
                  </p>
                </div>
              </div>

              <LeadNotesManager
                leadId={lead.id}
                leadName={lead.name}
                initialNotes={lead.notes}
                theme={theme}
                onNotesUpdated={(serializedNotes, count) => {
                  setNotesCount(count);
                  onLeadUpdated({ ...lead, notes: serializedNotes });
                }}
                onShowToast={onShowToast}
              />
            </div>
          )}
        </div>

        {/* Footer info */}
        <div
          className="border-t px-6 py-3 flex items-center justify-between text-xs text-[var(--muted)]"
          style={{ borderColor: theme.border, backgroundColor: 'color-mix(in srgb, var(--primary) 96%, transparent)' }}
        >
          <span>ID: {lead.id.slice(0, 8)}...</span>
          <div className="flex items-center gap-3">
            <span>{proposals.length} proposta(s)</span>
            <span>·</span>
            <span>{energyBills.length > 0 ? 'Fatura anexada' : 'Sem fatura'}</span>
            <span>·</span>
            <span>{notesCount} anotação(ões)</span>
          </div>
        </div>
      </div>

      {/* MODAL DE VISUALIZAÇÃO DE PROPOSTA */}
      {selectedProposalForView && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--neutral) 85%, transparent)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl"
            style={{
              backgroundColor: theme.primary,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-[var(--secondary)]" />
                <h3 className="text-base font-bold">Detalhes da Proposta</h3>
              </div>
              <button
                onClick={() => setSelectedProposalForView(null)}
                className="p-1 text-[var(--dim)] hover:text-[var(--text)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b" style={{ borderColor: theme.border }}>
                <span className="text-[var(--muted)]">Código da Proposta:</span>
                <span className="font-mono font-bold text-sm text-[var(--text)]">{selectedProposalForView.code}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b" style={{ borderColor: theme.border }}>
                <span className="text-[var(--muted)]">Tipo de Sistema:</span>
                <span className="font-bold text-[var(--secondary)]">{selectedProposalForView.systemType}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b" style={{ borderColor: theme.border }}>
                <span className="text-[var(--muted)]">Status Comercial:</span>
                <span className="font-semibold uppercase text-[var(--text)]">{selectedProposalForView.status}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b" style={{ borderColor: theme.border }}>
                <span className="text-[var(--muted)]">Data de Geração:</span>
                <span className="text-[var(--text)]">
                  {new Date(selectedProposalForView.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--muted)]">Interessado:</span>
                <span className="font-semibold text-[var(--text)]">{lead.name}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-between gap-3 border-t" style={{ borderColor: theme.border }}>
              <button
                type="button"
                data-delete-btn="true"
                onClick={() => void handleDeleteProposal(selectedProposalForView.id, selectedProposalForView.code)}
                className="btn-danger-outline px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Excluir Proposta
              </button>
              <button
                type="button"
                onClick={() => setSelectedProposalForView(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold"
                style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO RÁPIDA DE PROPOSTA */}
      {showCreateProposalModal && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--neutral) 85%, transparent)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl"
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
                onClick={() => setShowCreateProposalModal(false)}
                className="p-1 text-[var(--dim)] hover:text-[var(--text)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[var(--muted)]">
                Criar uma nova proposta comercial para <strong>{lead.name}</strong>.
              </p>
              <div>
                <label className="block font-semibold text-[var(--dim)] mb-1">Tipo de Sistema Solar</label>
                <select
                  value={newProposalSystemType}
                  onChange={(e) => setNewProposalSystemType(e.target.value as ProposalSystemType)}
                  className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:border-[var(--secondary)]"
                  style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                >
                  <option value="On-Grid" style={{ backgroundColor: theme.primary, color: theme.text }}>On-Grid (Conectado à rede)</option>
                  <option value="Híbrido" style={{ backgroundColor: theme.primary, color: theme.text }}>Híbrido (Rede + Baterias)</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t" style={{ borderColor: theme.border }}>
              <button
                type="button"
                data-cancel-outline="true"
                onClick={() => setShowCreateProposalModal(false)}
                className="btn-outline-cancel px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ borderColor: theme.border }}
              >
                Cancelar
              </button>
              <button
                id="btn-lead-confirmar-gerar-proposta"
                type="button"
                onClick={() => void handleCreateProposal()}
                disabled={creatingProposal}
                className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
              >
                {creatingProposal ? (
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
    </div>
  );
}
