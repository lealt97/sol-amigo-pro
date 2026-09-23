import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  User,
  Users,
  UserPlus,
  Search,
  Check,
  Building2,
  Phone,
  Mail,
  MapPin,
  Zap,
  Calculator,
  AlertCircle,
  FileText,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { ThemeConfig, Client, Lead, SolarProposal } from '../types';
import { fetchClients, addClient } from '../services/clients';
import { fetchLeads } from '../services/leads';
import { formatPhone, getOnlyDigits } from '../utils/formatters';
import { BRAZIL_STATE_GROUPS, BRAZIL_STATE_NAMES } from '../data/brazilStates';
import { fetchWebsiteFormSettings } from '../services/websiteFormIntegration';
import { getLeadClienteBadgeStyle } from '../utils/themeEngine';

export interface ProposalTargetSelection {
  id: string;
  name: string;
  type: 'client' | 'lead';
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  street?: string;
  addressNumber?: string;
  propertyType?: string;
  concessionaria?: string;
  monthlyConsumptionKWh?: number;
  sourceLeadId?: string;
  clientId?: string;
}

interface ProposalWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  initialTarget?: {
    id: string;
    name: string;
    type?: 'client' | 'lead';
    clientId?: string;
    phone?: string;
    email?: string;
    city?: string;
    state?: string;
    propertyType?: string;
    concessionaria?: string;
    monthlyConsumptionKWh?: number;
  } | null;
  onSaveProposal: (proposal: SolarProposal) => void;
  onShowToast: (msg: string) => void;
}

// Etapas do fluxo de dimensionamento
export type WizardStep = 'client_selection' | 'consumption_bills' | 'sizing_hardware' | 'review_save';

export const ProposalWizardModal: React.FC<ProposalWizardModalProps> = ({
  isOpen,
  onClose,
  theme,
  initialTarget,
  onSaveProposal,
  onShowToast,
}) => {
  // Etapa atual
  const [currentStep, setCurrentStep] = useState<WizardStep>('client_selection');

  // Dados carregados para seleção
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [leadsList, setLeadsList] = useState<Lead[]>([]);

  // Alvo selecionado (Cliente ou Interessado)
  const [selectedTarget, setSelectedTarget] = useState<ProposalTargetSelection | null>(null);

  // Busca e filtros na Etapa 1
  const [searchQuery, setSearchQuery] = useState('');
  const [contactFilterType, setContactFilterType] = useState<'all' | 'clients' | 'leads'>('all');
  const [isRegisteringNewClient, setIsRegisteringNewClient] = useState(false);

  // Formulário de novo cliente
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPropertyType, setNewClientPropertyType] = useState('Residencial');
  const [newClientCity, setNewClientCity] = useState('Campinas');
  const [newClientState, setNewClientState] = useState('SP');
  const [configuredStates, setConfiguredStates] = useState<string[]>([]);
  const [newClientStreet, setNewClientStreet] = useState('');
  const [newClientNumber, setNewClientNumber] = useState('');
  const [newClientConcessionaria, setNewClientConcessionaria] = useState('');
  const [newClientAvgConsumption, setNewClientAvgConsumption] = useState<number | ''>('');
  const [savingNewClient, setSavingNewClient] = useState(false);

  // Carrega clientes e leads
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    async function loadData() {
      setLoadingContacts(true);
      try {
        const [cList, lList, formSettings] = await Promise.all([
          fetchClients().catch(() => []),
          fetchLeads().catch(() => []),
          fetchWebsiteFormSettings().catch(() => null),
        ]);
        if (!isMounted) return;
        setClientsList(cList);
        setLeadsList(lList);

        if (formSettings && Array.isArray(formSettings.serviceStates) && formSettings.serviceStates.length > 0) {
          const validStates = formSettings.serviceStates.filter(Boolean);
          setConfiguredStates(validStates);
          if (validStates.length > 0) {
            setNewClientState((prev) => (prev && validStates.includes(prev) ? prev : validStates[0]));
          }
        }

        // Se initialTarget foi fornecido (ex: vindo de Parâmetros Gerais ou LeadsView)
        if (initialTarget && initialTarget.id) {
          const matchLead = lList.find((l) => l.id === initialTarget.id);
          const matchClient = cList.find(
            (c) => c.id === initialTarget.id || (initialTarget.clientId && c.id === initialTarget.clientId && !matchLead)
          );

          if (initialTarget.type === 'lead' || (matchLead && initialTarget.type !== 'client')) {
            const targetLead = matchLead || {
              id: initialTarget.id,
              name: initialTarget.name,
              phone: initialTarget.phone,
              email: initialTarget.email,
              city: initialTarget.city,
              state: initialTarget.state,
              propertyType: initialTarget.propertyType,
              distributor: initialTarget.concessionaria,
              averageConsumptionKWh: initialTarget.monthlyConsumptionKWh,
              clientId: initialTarget.clientId,
            };
            setSelectedTarget({
              id: targetLead.id,
              name: targetLead.name,
              type: 'lead',
              phone: targetLead.phone,
              email: targetLead.email,
              city: targetLead.city,
              state: targetLead.state,
              street: (targetLead as any).street,
              addressNumber: (targetLead as any).addressNumber,
              propertyType: targetLead.propertyType,
              concessionaria: (targetLead as any).distributor || initialTarget.concessionaria,
              monthlyConsumptionKWh: (targetLead as any).averageConsumptionKWh || initialTarget.monthlyConsumptionKWh,
              clientId: targetLead.clientId,
            });
          } else if (matchClient) {
            setSelectedTarget({
              id: matchClient.id,
              name: matchClient.name,
              type: 'client',
              phone: matchClient.phone,
              email: matchClient.email,
              city: matchClient.city,
              state: matchClient.state,
              street: matchClient.street,
              addressNumber: matchClient.addressNumber,
              propertyType: matchClient.propertyType || matchClient.type,
              concessionaria: matchClient.concessionaria,
              monthlyConsumptionKWh: matchClient.avgConsumptionKWh,
              sourceLeadId: matchClient.sourceLeadId,
              clientId: matchClient.id,
            });
          } else {
            setSelectedTarget({
              id: initialTarget.id,
              name: initialTarget.name,
              type: initialTarget.type || (initialTarget.clientId ? 'client' : 'lead'),
              phone: initialTarget.phone,
              email: initialTarget.email,
              city: initialTarget.city,
              state: initialTarget.state,
              propertyType: initialTarget.propertyType || 'Residencial',
              concessionaria: initialTarget.concessionaria,
              monthlyConsumptionKWh: initialTarget.monthlyConsumptionKWh,
              clientId: initialTarget.clientId,
            });
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar contatos para nova proposta:', err);
      } finally {
        if (isMounted) setLoadingContacts(false);
      }
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, initialTarget]);

  // Lista unificada para busca
  const unifiedContacts = useMemo(() => {
    const list: ProposalTargetSelection[] = [];

    // Clientes
    clientsList.forEach((c) => {
      list.push({
        id: c.id,
        name: c.name,
        type: 'client',
        phone: c.phone,
        email: c.email,
        city: c.city,
        state: c.state,
        street: c.street,
        addressNumber: c.addressNumber,
        propertyType: c.propertyType || c.type,
        concessionaria: c.concessionaria,
        monthlyConsumptionKWh: c.avgConsumptionKWh,
        sourceLeadId: c.sourceLeadId,
        clientId: c.id,
      });
    });

    // Leads / Interessados (exibe todos os leads ativos; não remove por nome coincidente)
    leadsList.forEach((l) => {
      // Ignora somente se o lead já tiver status 'Cliente' E o cliente correspondente estiver na lista de clientes
      const isAlreadyInClientsAsSameEntity =
        (l.status as string) === 'Cliente' &&
        list.some(
          (item) => item.type === 'client' && (item.id === l.clientId || item.sourceLeadId === l.id)
        );

      if (!isAlreadyInClientsAsSameEntity) {
        list.push({
          id: l.id,
          name: l.name,
          type: 'lead',
          phone: l.phone,
          email: l.email,
          city: l.city,
          state: l.state,
          street: l.street,
          addressNumber: l.addressNumber,
          propertyType: l.propertyType,
          concessionaria: l.distributor,
          monthlyConsumptionKWh: l.averageConsumptionKWh,
          clientId: l.clientId,
        });
      }
    });

    return list;
  }, [clientsList, leadsList]);

  // Contagens exatas e sincronizadas para as abas
  const clientCount = useMemo(
    () => unifiedContacts.filter((item) => item.type === 'client').length,
    [unifiedContacts]
  );
  const leadCount = useMemo(
    () => unifiedContacts.filter((item) => item.type === 'lead').length,
    [unifiedContacts]
  );

  // Filtragem da lista
  const filteredContacts = useMemo(() => {
    let result = unifiedContacts;

    if (contactFilterType === 'clients') {
      result = result.filter((item) => item.type === 'client');
    } else if (contactFilterType === 'leads') {
      result = result.filter((item) => item.type === 'lead');
    }

    const q = searchQuery.toLowerCase().trim();
    const qDigits = getOnlyDigits(searchQuery);
    if (q) {
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.phone && (item.phone.toLowerCase().includes(q) || (qDigits && getOnlyDigits(item.phone).includes(qDigits)))) ||
          (item.email && item.email.toLowerCase().includes(q)) ||
          (item.city && item.city.toLowerCase().includes(q)) ||
          (item.state && item.state.toLowerCase().includes(q)) ||
          (item.concessionaria && item.concessionaria.toLowerCase().includes(q))
      );
    }

    return result;
  }, [unifiedContacts, contactFilterType, searchQuery]);

  // Manipular cadastro de novo cliente
  const handleSaveNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }

    setSavingNewClient(true);
    try {
      const created = await addClient({
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
        email: newClientEmail.trim(),
        city: newClientCity.trim() || 'Campinas',
        state: newClientState.trim() || 'SP',
        street: newClientStreet.trim() || undefined,
        addressNumber: newClientNumber.trim() || undefined,
        type: newClientPropertyType as any,
        propertyType: newClientPropertyType as any,
        concessionaria: newClientConcessionaria.trim() || undefined,
        avgConsumptionKWh: newClientAvgConsumption ? Number(newClientAvgConsumption) : undefined,
      });

      // Adiciona na lista local e seleciona
      setClientsList((prev) => [created, ...prev]);
      const newSelection: ProposalTargetSelection = {
        id: created.id,
        name: created.name,
        type: 'client',
        phone: created.phone,
        email: created.email,
        city: created.city,
        state: created.state,
        street: created.street,
        addressNumber: created.addressNumber,
        propertyType: created.propertyType || created.type,
        concessionaria: created.concessionaria,
        monthlyConsumptionKWh: created.avgConsumptionKWh,
        clientId: created.id,
      };
      setSelectedTarget(newSelection);
      setIsRegisteringNewClient(false);
      onShowToast(`Cliente ${created.name} cadastrado e selecionado!`);
    } catch (err: any) {
      alert(`Erro ao cadastrar cliente: ${err?.message || 'Falha ao salvar'}`);
    } finally {
      setSavingNewClient(false);
    }
  };

  const handleGenerateProposalFinal = () => {
    if (!selectedTarget) {
      onShowToast?.('Selecione um cliente ou interessado.');
      return;
    }
    const propCode = `PROP-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;
    const newProp: SolarProposal = {
      id: `prop-${Date.now()}`,
      code: propCode,
      clientName: selectedTarget.name,
      clientEmail: selectedTarget.email,
      clientPhone: selectedTarget.phone,
      propertyType: selectedTarget.propertyType || 'Residencial',
      clientCity: selectedTarget.city || 'São Paulo',
      clientState: selectedTarget.state || 'SP',
      concessionaria: selectedTarget.concessionaria || 'Enel SP',
      monthlyConsumptionKWh: selectedTarget.monthlyConsumptionKWh || 450,
      systemPowerKWp: 4.8,
      modulesCount: 8,
      moduleModel: 'Painel Solar Canadian 600W Bifacial',
      inverterModel: 'Inversor Deye 5kW Monofásico',
      estimatedMonthlyGenKWh: 580,
      estimatedMonthlySavings: 520,
      paybackYears: 3.2,
      totalValue: 14900,
      commercialConditions: {
        paymentMethods: 'À vista com 5% de desconto ou 36x sem juros no solar Santander',
      },
      status: 'Rascunho',
      createdAt: new Date().toISOString(),
      systemType: 'On-Grid',
    };
    onSaveProposal(newProp);
    onClose();
  };

  // Definição das etapas do Wizard
  const stepsConfig: { id: WizardStep; number: number; title: string; subtitle: string }[] = [
    {
      id: 'client_selection',
      number: 1,
      title: 'Cliente ou Interessado',
      subtitle: 'Identificação do titular',
    },
    {
      id: 'consumption_bills',
      number: 2,
      title: 'Fatura & Consumo',
      subtitle: 'Histórico e tarifas',
    },
    {
      id: 'sizing_hardware',
      number: 3,
      title: 'Dimensionamento & Kits',
      subtitle: 'Potência e módulos',
    },
    {
      id: 'review_save',
      number: 4,
      title: 'Proposta & Condições',
      subtitle: 'Revisão e fechamento',
    },
  ];

  const currentStepIndex = stepsConfig.findIndex((s) => s.id === currentStep);
  const progressPercent = Math.round(((currentStepIndex + 1) / stepsConfig.length) * 100);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto backdrop-blur-md"
      style={{ backgroundColor: 'color-mix(in srgb, var(--neutral) 85%, transparent)' }}
    >
      <div
        className="w-full max-w-4xl rounded-2xl border shadow-2xl flex flex-col my-auto transition-all overflow-hidden max-h-[92vh]"
        style={{
          backgroundColor: theme.primary,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        {/* CABEÇALHO DO WIZARD */}
        <div
          className="p-4 sm:p-5 border-b shrink-0 flex flex-col gap-4"
          style={{ borderColor: theme.border, backgroundColor: theme.background }}
        >
          {/* Linha superior com título e botão fechar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                  color: theme.secondary,
                }}
              >
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text)]">
                    Dimensionamento & Nova Proposta Solar
                  </h2>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--secondary) 12%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--secondary) 25%, transparent)',
                      color: theme.secondary,
                    }}
                  >
                    Fluxo Guiado
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  Assistente passo a passo para levantamento, dimensionamento fotovoltaico e geração da proposta.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[var(--dim)] hover:text-[var(--text)] transition-colors cursor-pointer border border-transparent hover:border-[var(--border)]"
              title="Fechar assistente"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* BARRA DE PROGRESSO E INDICADORES DE ETAPAS */}
          <div className="space-y-2">
            {/* Barra de progresso visual contínua */}
            <div className="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: theme.secondary,
                }}
              />
            </div>

            {/* Stepper com passos clicáveis/visuais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {stepsConfig.map((s, idx) => {
                const isPassed = idx < currentStepIndex;
                const isCurrent = s.id === currentStep;

                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-2 p-1.5 rounded-lg text-left transition-colors ${
                      isCurrent
                        ? 'bg-[var(--neutral)]/40 font-semibold'
                        : isPassed
                        ? 'opacity-85'
                        : 'opacity-50'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border"
                      style={{
                        backgroundColor: isCurrent
                          ? theme.secondary
                          : isPassed
                          ? 'color-mix(in srgb, var(--secondary) 25%, transparent)'
                          : 'transparent',
                        color: isCurrent
                          ? 'var(--secondary-fg)'
                          : isPassed
                          ? theme.secondary
                          : 'var(--muted)',
                        borderColor: isCurrent || isPassed ? theme.secondary : 'var(--border)',
                      }}
                    >
                      {isPassed ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : s.number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] sm:text-xs font-medium truncate text-[var(--text)]">
                        {s.title}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-[var(--muted)] truncate hidden sm:block">
                        {s.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CORPO DO WIZARD: CONTEÚDO DINÂMICO POR ETAPA */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* ========================================================================= */}
          {/* ETAPA 1: ESCOLHA DE CLIENTE OU INTERESSADO (LEAD) / CADASTRO NOVO CLIENTE */}
          {/* ========================================================================= */}
          {currentStep === 'client_selection' && (
            <div className="space-y-5">
              <div className="space-y-3 pb-4 border-b" style={{ borderColor: theme.border }}>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[var(--text)] flex items-center gap-2">
                    <User className="w-4 h-4 text-[var(--secondary)]" />
                    Etapa 1: Titular da Proposta
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    Escolha um cliente ou interessado existente, ou realize um cadastro rápido caso seja um novo titular.
                  </p>
                </div>

                {/* Alternância: Buscar Existente vs Novo Cliente */}
                <div
                  className="p-1 rounded-xl border inline-flex items-center gap-1 self-start"
                  style={{ backgroundColor: theme.background, borderColor: theme.border }}
                >
                  <button
                    type="button"
                    onClick={() => setIsRegisteringNewClient(false)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      !isRegisteringNewClient
                        ? 'shadow-xs text-[var(--secondary-fg)]'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                    style={
                      !isRegisteringNewClient
                        ? { backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }
                        : {}
                    }
                  >
                    <Search className="w-3.5 h-3.5" />
                    Buscar Existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRegisteringNewClient(true)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isRegisteringNewClient
                        ? 'shadow-xs text-[var(--secondary-fg)]'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                    style={
                      isRegisteringNewClient
                        ? { backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }
                        : {}
                    }
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Novo Cliente
                  </button>
                </div>
              </div>

              {/* CARD RESUMO DE QUEM JÁ ESTÁ SELECIONADO */}
              {selectedTarget && (
                <div
                  className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--secondary) 8%, var(--primary))',
                    borderColor: theme.secondary,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: theme.secondary,
                        color: 'var(--secondary-fg)',
                        borderColor: theme.secondary,
                      }}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[var(--text)]">{selectedTarget.name}</span>
                        {(() => {
                          const isLeadTarget = selectedTarget.type === 'lead';
                          const bStyle = getLeadClienteBadgeStyle(isLeadTarget, theme.primary);
                          return (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border inline-flex items-center gap-1"
                              style={{
                                backgroundColor: bStyle.backgroundColor,
                                color: bStyle.color,
                                borderColor: bStyle.borderColor,
                              }}
                            >
                              {isLeadTarget ? <User className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                              {isLeadTarget ? 'Lead / Interessado' : 'Cliente'}
                            </span>
                          );
                        })()}
                        {selectedTarget.propertyType && (
                          <span className="text-[10px] text-[var(--muted)] bg-[var(--border)]/40 px-2 py-0.5 rounded-md">
                            {selectedTarget.propertyType}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                        {selectedTarget.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {selectedTarget.phone}
                          </span>
                        )}
                        {selectedTarget.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {selectedTarget.email}
                          </span>
                        )}
                        {(selectedTarget.city || selectedTarget.state) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {selectedTarget.city ? `${selectedTarget.city}/${selectedTarget.state || ''}` : selectedTarget.state}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedTarget(null)}
                    data-danger-text="true"
                    data-text-only="true"
                    className="btn-danger-text text-xs font-semibold hover:underline cursor-pointer self-end sm:self-auto px-1.5 py-0.5 rounded transition-colors"
                  >
                    Trocar titular
                  </button>
                </div>
              )}

              {/* MODO 1: BUSCAR E SELECIONAR EXISTENTE */}
              {!isRegisteringNewClient && (
                <div className="space-y-4">
                  {/* Barra de busca e filtros de categoria */}
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--dim)] pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nome, telefone, e-mail ou cidade..."
                        className="w-full h-10 pl-9 pr-9 rounded-xl border text-xs sm:text-sm font-medium outline-none transition-all focus:border-[var(--secondary)]"
                        style={{
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                          color: theme.text,
                        }}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--dim)] hover:text-[var(--text)] transition-colors cursor-pointer"
                          title="Limpar busca"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div
                      className="p-1 rounded-xl border flex items-center gap-1 shrink-0"
                      style={{ backgroundColor: theme.background, borderColor: theme.border }}
                    >
                      <button
                        type="button"
                        onClick={() => setContactFilterType('all')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          contactFilterType === 'all'
                            ? 'bg-[var(--neutral)] font-bold text-[var(--text)]'
                            : 'text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        Todos ({unifiedContacts.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactFilterType('clients')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          contactFilterType === 'clients'
                            ? 'bg-[var(--neutral)] font-bold text-[var(--text)]'
                            : 'text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        Clientes ({clientCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactFilterType('leads')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          contactFilterType === 'leads'
                            ? 'bg-[var(--neutral)] font-bold text-[var(--text)]'
                            : 'text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        Interessados ({leadCount})
                      </button>
                    </div>
                  </div>

                  {/* LISTA DE CONTATOS ENCONTRADOS */}
                  {loadingContacts ? (
                    <div className="py-12 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[var(--secondary)]" />
                      Carregando clientes e interessados...
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div
                      className="p-8 text-center rounded-xl border border-dashed flex flex-col items-center justify-center gap-2"
                      style={{ borderColor: theme.border, backgroundColor: theme.background }}
                    >
                      <User className="w-8 h-8 text-[var(--dim)] opacity-50" />
                      <p className="text-sm font-semibold text-[var(--text)]">
                        Nenhum contato encontrado com essa busca
                      </p>
                      <p className="text-xs text-[var(--muted)] max-w-sm">
                        Caso este cliente ainda não esteja no sistema, você pode cadastrá-lo agora mesmo.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const digits = getOnlyDigits(searchQuery);
                          if (digits.length >= 8 && digits.length <= 11 && !/[a-zA-Z]/.test(searchQuery)) {
                            setNewClientPhone(formatPhone(searchQuery));
                            setNewClientName('');
                          } else {
                            setNewClientName(searchQuery);
                          }
                          setIsRegisteringNewClient(true);
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold shadow-xs hover:brightness-110 active:scale-[0.98] cursor-pointer"
                        style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Cadastrar &ldquo;{searchQuery || 'Novo Cliente'}&rdquo;
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                      {filteredContacts.map((contact) => {
                        const isSelected = selectedTarget?.id === contact.id;

                        return (
                          <div
                            key={`${contact.type}-${contact.id}`}
                            onClick={() => setSelectedTarget(contact)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                              isSelected
                                ? 'ring-2 shadow-md'
                                : 'hover:border-[var(--secondary)] opacity-90 hover:opacity-100'
                            }`}
                            style={{
                              backgroundColor: isSelected
                                ? 'color-mix(in srgb, var(--secondary) 10%, var(--primary))'
                                : theme.background,
                              borderColor: isSelected ? theme.secondary : theme.border,
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm text-[var(--text)] truncate">
                                    {contact.name}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  {(() => {
                                    const isLead = contact.type === 'lead';
                                    const bStyle = getLeadClienteBadgeStyle(isLead, theme.primary);
                                    return (
                                      <span
                                        className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border inline-flex items-center gap-1"
                                        style={{
                                          backgroundColor: bStyle.backgroundColor,
                                          color: bStyle.color,
                                          borderColor: bStyle.borderColor,
                                        }}
                                      >
                                        {isLead ? <User className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                                        {isLead ? 'Lead' : 'Cliente'}
                                      </span>
                                    );
                                  })()}
                                  {contact.propertyType && (
                                    <span className="text-[10px] text-[var(--muted)]">
                                      • {contact.propertyType}
                                    </span>
                                  )}
                                  {contact.concessionaria && (
                                    <span className="text-[10px] text-[var(--muted)] truncate max-w-[120px]">
                                      • {contact.concessionaria}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected ? 'border-transparent' : 'border-[var(--border)]'
                                }`}
                                style={{
                                  backgroundColor: isSelected ? theme.secondary : 'transparent',
                                  color: isSelected ? 'var(--secondary-fg)' : 'transparent',
                                }}
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            </div>

                            <div className="text-xs text-[var(--muted)] space-y-0.5 pt-1 border-t" style={{ borderColor: theme.border }}>
                              {contact.phone && (
                                <p className="truncate flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-[var(--dim)] shrink-0" />
                                  {contact.phone}
                                </p>
                              )}
                              {(contact.city || contact.state) && (
                                <p className="truncate flex items-center gap-1.5">
                                  <MapPin className="w-3 h-3 text-[var(--dim)] shrink-0" />
                                  {contact.city ? `${contact.city}/${contact.state || ''}` : contact.state}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* MODO 2: FORMULÁRIO DE CADASTRO DE NOVO CLIENTE */}
              {isRegisteringNewClient && (
                <form
                  onSubmit={handleSaveNewClient}
                  className="p-4 sm:p-5 rounded-xl border space-y-4"
                  style={{ backgroundColor: theme.background, borderColor: theme.border }}
                >
                  <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: theme.border }}>
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-[var(--secondary)]" />
                      <h4 className="text-sm font-bold text-[var(--text)]">
                        Cadastro Rápido de Novo Cliente
                      </h4>
                    </div>
                    <span className="text-[11px] text-[var(--muted)]">
                      * Campos essenciais
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[var(--dim)] mb-1">
                        Nome Completo do Titular *
                      </label>
                      <input
                        type="text"
                        required
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Ex: João da Silva / Empresa Comercial Ltda"
                        className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)]"
                        style={{
                          backgroundColor: theme.primary,
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
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(formatPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)]"
                        style={{
                          backgroundColor: theme.primary,
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
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                        placeholder="cliente@exemplo.com"
                        className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)]"
                        style={{
                          backgroundColor: theme.primary,
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
                          value={newClientStreet}
                          onChange={(e) => setNewClientStreet(e.target.value)}
                          placeholder="Ex: Rua das Palmeiras, Av. Brasil"
                          className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)]"
                          style={{
                            backgroundColor: theme.primary,
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
                          value={newClientNumber}
                          onChange={(e) => setNewClientNumber(e.target.value)}
                          placeholder="Ex: 123, Bloco B"
                          className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)]"
                          style={{
                            backgroundColor: theme.primary,
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
                        value={newClientCity}
                        onChange={(e) => setNewClientCity(e.target.value)}
                        placeholder="Ex: Campinas"
                        className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)]"
                        style={{
                          backgroundColor: theme.primary,
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
                          value={newClientState}
                          onChange={(e) => setNewClientState(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)] cursor-pointer"
                          style={{
                            backgroundColor: theme.primary,
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
                          value={newClientState}
                          onChange={(e) => setNewClientState(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)] cursor-pointer"
                          style={{
                            backgroundColor: theme.primary,
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
                        value={newClientConcessionaria}
                        onChange={(e) => setNewClientConcessionaria(e.target.value)}
                        placeholder="Ex: Light, Enel, CPFL, Cemig..."
                        className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)]"
                        style={{
                          backgroundColor: theme.primary,
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
                        value={newClientAvgConsumption}
                        onChange={(e) => setNewClientAvgConsumption(e.target.value ? Number(e.target.value) : '')}
                        placeholder="Ex: 850"
                        className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)]"
                        style={{
                          backgroundColor: theme.primary,
                          borderColor: theme.border,
                          color: theme.text,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor: theme.border }}>
                    <button
                      type="button"
                      onClick={() => setIsRegisteringNewClient(false)}
                      className="px-3.5 py-2 rounded-lg border text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                      style={{ borderColor: theme.border }}
                    >
                      Cancelar Cadastro
                    </button>
                    <button
                      type="submit"
                      disabled={savingNewClient || !newClientName.trim()}
                      className="px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                    >
                      {savingNewClient ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Salvando Cliente...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          Salvar e Selecionar Cliente
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* PRÓXIMAS ETAPAS (PREPARADAS PARA AS PRÓXIMAS INSTRUÇÕES DO USUÁRIO)      */}
          {/* ========================================================================= */}
          {currentStep === 'consumption_bills' && (
            <div className="space-y-4 text-center py-8">
              <div
                className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border shadow-xs"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                  color: theme.secondary,
                }}
              >
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--text)]">
                Etapa 2: Fatura & Consumo Energético
              </h3>
              <p className="text-xs text-[var(--muted)] max-w-md mx-auto">
                Titular selecionado: <strong>{selectedTarget?.name}</strong>.
                Aguardando suas próximas instruções de cálculo de consumo e faturas para esta etapa.
              </p>
            </div>
          )}

          {currentStep === 'sizing_hardware' && (
            <div className="space-y-4 text-center py-8">
              <div
                className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border shadow-xs"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                  color: theme.secondary,
                }}
              >
                <Calculator className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--text)]">
                Etapa 3: Dimensionamento Técnico & Kits
              </h3>
              <p className="text-xs text-[var(--muted)] max-w-md mx-auto">
                Definição de potência (kWp), módulos, inversores e índices solares (HSP).
              </p>
            </div>
          )}

          {currentStep === 'review_save' && (
            <div className="space-y-4 text-center py-8">
              <div
                className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border shadow-xs"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                  color: theme.secondary,
                }}
              >
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--text)]">
                Etapa 4: Condições Comerciais & Geração
              </h3>
              <p className="text-xs text-[var(--muted)] max-w-md mx-auto">
                Revisão final, precificação por watt-pico, payback e emissão da proposta para <strong>{selectedTarget?.name}</strong>.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerateProposalFinal}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-2"
                  style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                >
                  <FileText className="w-4 h-4" />
                  <span>Gerar Proposta</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ DE NAVEGAÇÃO ENTRE ETAPAS */}
        <div
          className="p-4 sm:p-5 border-t shrink-0 flex items-center justify-between gap-3"
          style={{ borderColor: theme.border, backgroundColor: theme.background }}
        >
          <button
            type="button"
            onClick={() => {
              if (currentStepIndex > 0) {
                setCurrentStep(stepsConfig[currentStepIndex - 1].id);
              } else {
                onClose();
              }
            }}
            className="px-4 py-2 rounded-xl border text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer flex items-center gap-1.5"
            style={{ borderColor: theme.border }}
          >
            {currentStepIndex > 0 ? (
              <>
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </>
            ) : (
              'Cancelar'
            )}
          </button>

          <div className="flex items-center gap-2">
            {currentStep === 'client_selection' && (
              <button
                type="button"
                disabled={!selectedTarget}
                onClick={() => setCurrentStep('consumption_bills')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
              >
                <span>Avançar para Fatura & Consumo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {currentStep !== 'client_selection' && currentStepIndex < stepsConfig.length - 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(stepsConfig[currentStepIndex + 1].id)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
                style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
              >
                <span>Próxima Etapa</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 'review_save' && (
              <button
                type="button"
                onClick={handleGenerateProposalFinal}
                className="px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
                style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
              >
                <FileText className="w-4 h-4" />
                <span>Gerar Proposta</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
