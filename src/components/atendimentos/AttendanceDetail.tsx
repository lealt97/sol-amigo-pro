import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CalendarClock,
  Calculator,
  Check,
  CheckCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  HelpCircle,
  Layers,
  Leaf,
  ListTodo,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Percent,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Target,
  Trash2,
  Trophy,
  User,
  UserCheck,
  UserX,
  Wallet,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Lead,
  LeadActivity,
  LeadCaptureForm,
  LeadStage,
  LeadTask,
  OpportunitySizing,
  PdfSettingsConfig,
  SolarProposal,
  ThemeConfig,
} from '../../types';
import { ATTENDANCE_STAGES, AttendanceTab, getStageConfig } from './types';
import { formatPhone } from '../../utils/formatters';
import {
  completeLeadTask,
  createLeadTask,
  deleteLostLead,
  markLeadLost,
  qualifyLead,
  registerLeadContact,
  reopenLead,
  saveLeadDetails,
  updateLeadStage,
} from '../../services/leads';

interface AttendanceDetailProps {
  lead: Lead;
  tasks: LeadTask[];
  activities: LeadActivity[];
  sizing: OpportunitySizing | null;
  captureForm: LeadCaptureForm | null;
  theme: ThemeConfig;
  pdfSettings: PdfSettingsConfig;
  loadingDetails: boolean;
  onBack: () => void;
  onLeadUpdated: (updatedLead: Lead) => void;
  onTasksUpdated: (tasks: LeadTask[]) => void;
  onActivitiesUpdated: (activities: LeadActivity[]) => void;
  onOpenSizingEditor: () => void;
  onOpenProposalViewer: (proposal: SolarProposal) => void;
  onShowToast: (message: string) => void;
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const AttendanceDetail: React.FC<AttendanceDetailProps> = ({
  lead,
  tasks,
  activities,
  sizing,
  captureForm,
  theme,
  pdfSettings,
  loadingDetails,
  onBack,
  onLeadUpdated,
  onTasksUpdated,
  onActivitiesUpdated,
  onOpenSizingEditor,
  onOpenProposalViewer,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<AttendanceTab>('dados');

  // Form states for editable lead details
  const [responsible, setResponsible] = useState(lead.responsible ?? '');
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [savingDetails, setSavingDetails] = useState(false);

  // Quick task creation
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueAt, setTaskDueAt] = useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [creatingTask, setCreatingTask] = useState(false);

  // Contact register modal/state
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactChannel, setContactChannel] = useState('WhatsApp');
  const [contactSummary, setContactSummary] = useState('');
  const [contactNextAt, setContactNextAt] = useState('');
  const [registeringContact, setRegisteringContact] = useState(false);

  // Qualification form state
  const [qualifying, setQualifying] = useState(false);
  const [decisionMaker, setDecisionMaker] = useState('Sim');
  const [interestLevel, setInterestLevel] = useState('Alto');
  const [purchaseTimeframe, setPurchaseTimeframe] = useState('Até 30 dias');
  const [paymentPreference, setPaymentPreference] = useState('Financiamento');
  const [propertyOwnership, setPropertyOwnership] = useState(lead.propertyStatus || 'Próprio');

  // Lost modal state
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [markingLost, setMarkingLost] = useState(false);

  // Commercial Pricing States (editable with smart defaults)
  const systemPowerKWp = sizing?.installedPowerKWp ?? (lead.averageConsumptionKWh ? Number((lead.averageConsumptionKWh / 120).toFixed(2)) : 5.85);
  const defaultEquipCost = Math.round(systemPowerKWp * 1000 * 1.85);
  const defaultLaborCost = Math.round(systemPowerKWp * 1000 * 0.45);
  const defaultEngCost = 1200;
  const defaultUtilityFee = 450;
  const defaultFreight = 600;

  const [equipmentCost, setEquipmentCost] = useState(defaultEquipCost);
  const [laborCost, setLaborCost] = useState(defaultLaborCost);
  const [engineeringCost, setEngineeringCost] = useState(defaultEngCost);
  const [utilityFee, setUtilityFee] = useState(defaultUtilityFee);
  const [freightCost, setFreightCost] = useState(defaultFreight);
  const [otherCosts, setOtherCosts] = useState(0);
  const [marginPercent, setMarginPercent] = useState(25);
  const [taxesPercent, setTaxesPercent] = useState(6.5);
  const [commissionPercent, setCommissionPercent] = useState(4.0);
  const [discountValue, setDiscountValue] = useState(0);

  // Dynamic calculations for Commercial Composition
  const totalDirectCosts = equipmentCost + laborCost + engineeringCost + utilityFee + freightCost + otherCosts;
  const totalDeductionsPercent = taxesPercent + commissionPercent;
  const markupMultiplier = 1 / (1 - (marginPercent + totalDeductionsPercent) / 100);
  const calculatedGrossPrice = Math.round(totalDirectCosts * (markupMultiplier > 1 ? markupMultiplier : 1.3));
  const finalSalePrice = Math.max(0, calculatedGrossPrice - discountValue);
  const pricePerWp = systemPowerKWp > 0 ? Number((finalSalePrice / (systemPowerKWp * 1000)).toFixed(2)) : 0;

  const monthlyGenKWh = sizing?.estimatedMonthlyGenerationKWh ?? (systemPowerKWp * 125);
  const tariffKWh = 0.92;
  const monthlySavings = Math.round(Math.min(monthlyGenKWh, (lead.averageConsumptionKWh || 800)) * tariffKWh);
  const annualSavings = monthlySavings * 12;
  const paybackYears = annualSavings > 0 ? Number((finalSalePrice / annualSavings).toFixed(1)) : 4.5;
  const co2SavedTons = Number(((monthlyGenKWh * 12 * 25 * 0.084) / 1000).toFixed(1));
  const treesEquivalent = Math.round(co2SavedTons * 6.2);

  const stageConfig = getStageConfig(lead.status);
  const isLost = lead.status === 'perdido';
  const isWon = lead.status === 'ganho';

  const formatCurrency = (val?: number) =>
    val != null
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
      : 'R$ 0,00';

  // Handler for Stage Stepper
  const handleStageStepClick = async (targetStage: LeadStage) => {
    if (lead.status === targetStage) return;

    if (targetStage === 'qualificado' && !lead.clientId) {
      setActiveTab('qualificacao');
      onShowToast('Preencha a qualificação para avançar para a etapa Qualificado.');
      return;
    }

    if (targetStage === 'perdido') {
      setLostModalOpen(true);
      return;
    }

    if (targetStage === 'ganho') {
      await handleWonSale();
      return;
    }

    try {
      const updated = await updateLeadStage(lead.id, targetStage);
      onLeadUpdated(updated);
      onShowToast(`Etapa alterada para "${getStageConfig(targetStage).label}".`);
    } catch (err) {
      onShowToast('Não foi possível alterar a etapa.');
    }
  };

  // Save commercial details (notes and responsible)
  const handleSaveDetails = async () => {
    setSavingDetails(true);
    try {
      const updated = await saveLeadDetails(lead.id, responsible, notes);
      onLeadUpdated(updated);
      onShowToast('Dados comerciais salvos.');
    } catch (err) {
      onShowToast('Não foi possível salvar os dados.');
    } finally {
      setSavingDetails(false);
    }
  };

  // Qualify lead action
  const handleQualifyLead = async () => {
    setQualifying(true);
    try {
      const qualificationNotes = `[Qualificação] Decisor: ${decisionMaker} · Imóvel: ${propertyOwnership} · Interesse: ${interestLevel} · Prazo: ${purchaseTimeframe} · Pagamento: ${paymentPreference}.\n${notes}`;
      const updated = await qualifyLead(lead.id, responsible, qualificationNotes);
      onLeadUpdated(updated);
      setActiveTab('dimensionamento');
      onShowToast('Interessado qualificado! Cliente e Unidade Consumidora criados.');
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Não foi possível qualificar o interessado.');
    } finally {
      setQualifying(false);
    }
  };

  // Register contact interaction
  const handleRegisterContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactSummary.trim()) {
      onShowToast('Informe um resumo do contato.');
      return;
    }

    setRegisteringContact(true);
    try {
      const updated = await registerLeadContact(
        lead.id,
        contactChannel,
        contactSummary.trim(),
        contactNextAt ? new Date(contactNextAt).toISOString() : undefined
      );
      onLeadUpdated(updated);
      setContactModalOpen(false);
      setContactSummary('');
      setContactNextAt('');
      onShowToast('Contato registrado no histórico.');
    } catch (err) {
      onShowToast('Erro ao registrar contato.');
    } finally {
      setRegisteringContact(false);
    }
  };

  // Mark as Won (Celebration)
  const handleWonSale = async () => {
    try {
      const updated = await updateLeadStage(lead.id, 'ganho');
      onLeadUpdated(updated);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      onShowToast('Parabéns! Atendimento concluído com VENDA FECHADA!');
    } catch (err) {
      onShowToast('Erro ao atualizar etapa de fechamento.');
    }
  };

  // Mark as Lost
  const handleMarkLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lostReason.trim().length < 3) {
      onShowToast('Informe o motivo da perda (mínimo 3 letras).');
      return;
    }

    setMarkingLost(true);
    try {
      const updated = await markLeadLost(lead.id, lostReason.trim());
      onLeadUpdated(updated);
      setLostModalOpen(false);
      onShowToast('Atendimento encerrado como Perdido.');
    } catch (err) {
      onShowToast('Erro ao encerrar atendimento.');
    } finally {
      setMarkingLost(false);
    }
  };

  // Reopen lost lead
  const handleReopen = async () => {
    try {
      const updated = await reopenLead(lead.id);
      onLeadUpdated(updated);
      onShowToast('Atendimento reaberto com sucesso.');
    } catch (err) {
      onShowToast('Não foi possível reabrir o atendimento.');
    }
  };

  // Delete permanently
  const handleDelete = async () => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o atendimento de ${lead.name}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await deleteLostLead(lead.id);
      onShowToast('Atendimento excluído permanentemente.');
      onBack();
    } catch (err) {
      onShowToast('Não foi possível excluir o atendimento.');
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setCreatingTask(true);
    try {
      const newTask = await createLeadTask(lead.id, taskTitle.trim(), new Date(taskDueAt).toISOString());
      onTasksUpdated([newTask, ...tasks]);
      setTaskTitle('');
      onShowToast('Tarefa agendada.');
    } catch (err) {
      onShowToast('Erro ao agendar tarefa.');
    } finally {
      setCreatingTask(false);
    }
  };

  // Complete Task
  const handleCompleteTask = async (taskId: string) => {
    try {
      const completed = await completeLeadTask(taskId);
      onTasksUpdated(tasks.map((t) => (t.id === taskId ? completed : t)));
      onShowToast('Tarefa concluída.');
    } catch (err) {
      onShowToast('Erro ao concluir tarefa.');
    }
  };

  // Proposal Object for Viewer
  const currentProposal: SolarProposal = {
    id: `prop-${lead.id}`,
    code: `PROP-${lead.id.slice(0, 5).toUpperCase()}`,
    clientName: lead.name,
    clientEmail: lead.email,
    clientPhone: lead.phone,
    clientCity: lead.city,
    clientState: lead.state,
    concessionaria: lead.distributor || 'Concessionária Local',
    monthlyConsumptionKWh: lead.averageConsumptionKWh || 800,
    currentMonthlyBill: lead.averageMonthlyBill || 750,
    systemPowerKWp: Number(systemPowerKWp.toFixed(2)),
    estimatedMonthlyGenKWh: Math.round(monthlyGenKWh),
    modulesCount: sizing?.modulesCount ?? Math.ceil((systemPowerKWp * 1000) / 585),
    moduleModel: sizing ? `${sizing.modulePowerW}W Tier 1 Alta Eficiência` : 'Canadian Solar 585W TOPCon Bi-facial',
    inverterModel: sizing ? `Inversor Solar ${sizing.inverterPowerKW}kW` : 'Inversor Deye Híbrido Trifásico',
    totalValue: finalSalePrice,
    estimatedMonthlySavings: monthlySavings,
    paybackYears,
    status: isWon ? 'Aprovada' : lead.status === 'proposta_enviada' ? 'Em negociação' : 'Pendente',
    createdAt: new Date().toLocaleDateString('pt-BR'),
    co2SavedTonsYear: Number((co2SavedTons / 25).toFixed(2)),
    treesEquivalent,
    co2AvoidedTons: co2SavedTons,
    treesPlanted: treesEquivalent,
  };

  const handleOpenWhatsApp = () => {
    const rawPhone = lead.phone.replace(/\D/g, '');
    const phoneWithDDI = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
    const text = encodeURIComponent(
      `Olá ${lead.name}, tudo bem? Aqui é ${responsible || 'da equipe Sol Amigo'}. Estou entrando em contato referente à sua solicitação de energia solar.`
    );
    window.open(`https://wa.me/${phoneWithDDI}?text=${text}`, '_blank');
  };

  const handleShareProposalWhatsApp = () => {
    const rawPhone = lead.phone.replace(/\D/g, '');
    const phoneWithDDI = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
    const text = encodeURIComponent(
      `Olá ${lead.name}! Preparei o estudo do seu sistema solar fotovoltaico de ${systemPowerKWp.toFixed(2)} kWp com economia estimada de ${formatCurrency(annualSavings)}/ano. Veja o resumo e proposta completa!`
    );
    window.open(`https://wa.me/${phoneWithDDI}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 sm:p-5 shadow-xl space-y-4">
        {/* Navigation & Basic Info Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="p-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#8B949E] hover:text-white transition-colors shrink-0"
              title="Voltar para a lista"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                  {lead.name}
                </h1>

                {/* Cliente / Lead Badge */}
                {lead.clientId ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                    <UserCheck className="w-3 h-3" />
                    Cliente Cadastrado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                    <User className="w-3 h-3" />
                    Interessado (Pré-venda)
                  </span>
                )}

                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: stageConfig.badgeBg, color: stageConfig.textColor }}
                >
                  {stageConfig.label}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#8B949E] mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {formatPhone(lead.phone)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {lead.city}/{lead.state}
                </span>
                <span>•</span>
                <span>{lead.propertyType}</span>
                {lead.distributor && (
                  <>
                    <span>•</span>
                    <span>{lead.distributor}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={handleOpenWhatsApp}
              className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => setContactModalOpen(true)}
              className="px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-[#C9D1D9] hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-blue-400" />
              <span>Registrar Contato</span>
            </button>

            {!isWon && !isLost && (
              <>
                <button
                  onClick={handleWonSale}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-colors"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Venda Fechada</span>
                </button>

                <button
                  onClick={() => setLostModalOpen(true)}
                  className="px-3 py-1.5 bg-rose-600/20 border border-rose-500/30 text-rose-300 hover:bg-rose-600/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Perdido</span>
                </button>
              </>
            )}

            {isLost && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReopen}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reabrir Atendimento</span>
                </button>

                <button
                  onClick={handleDelete}
                  className="p-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
                  title="Excluir definitivamente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Commercial Pipeline Stepper Bar */}
        <div className="pt-3 border-t border-[#30363D]">
          <span className="text-[10px] uppercase font-bold text-[#8B949E] tracking-wider mb-2 block">
            Avanço no Fluxo Comercial
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
            {ATTENDANCE_STAGES.map((st, index) => {
              const isCurrent = lead.status === st.key;
              const isPassed = !isLost && ATTENDANCE_STAGES.findIndex((s) => s.key === lead.status) >= index;

              return (
                <button
                  key={st.key}
                  onClick={() => handleStageStepClick(st.key)}
                  className={`px-2 py-1.5 rounded-lg text-left transition-all flex flex-col justify-between border ${
                    isCurrent
                      ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-500/10 shadow-sm'
                      : isPassed
                      ? 'border-[#30363D] bg-[#0D1117] hover:border-blue-500/50'
                      : 'border-[#21262D] bg-[#0D1117]/50 text-[#8B949E] hover:border-[#30363D]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-[#8B949E]">0{index + 1}</span>
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: st.color }}
                    />
                  </div>
                  <span
                    className={`text-[11px] font-semibold mt-1 truncate ${
                      isCurrent ? 'text-white' : isPassed ? 'text-[#C9D1D9]' : 'text-[#8B949E]'
                    }`}
                  >
                    {st.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Navigation for Atendimento */}
        <div className="pt-2 border-t border-[#30363D] flex items-center gap-1 overflow-x-auto">
          {[
            { key: 'dados', label: 'Dados do Interessado', icon: User },
            { key: 'qualificacao', label: 'Qualificação', icon: Target },
            { key: 'dimensionamento', label: 'Pré-Dimensionamento', icon: Sun },
            { key: 'composicao', label: 'Composição Comercial', icon: DollarSign },
            { key: 'proposta', label: 'Proposta Comercial', icon: FileCheck2 },
            { key: 'acompanhamento', label: 'Acompanhamento & Tarefas', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as AttendanceTab)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[#8B949E] hover:text-white hover:bg-[#21262D]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT 1: Dados do Interessado */}
      {activeTab === 'dados' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Informações Gerais */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                Ficha do Interessado
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-[#8B949E] block mb-0.5">Nome Completo</label>
                  <p className="font-semibold text-white text-sm">{lead.name}</p>
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-0.5">Telefone / WhatsApp</label>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-white">{formatPhone(lead.phone)}</p>
                    <button
                      onClick={handleOpenWhatsApp}
                      className="text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold"
                    >
                      Abrir no WhatsApp
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-0.5">E-mail</label>
                  <p className="text-white">{lead.email || 'Não informado'}</p>
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-0.5">Localização</label>
                  <p className="text-white">{lead.city} / {lead.state}</p>
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-0.5">Tipo do Imóvel</label>
                  <p className="text-white">{lead.propertyType}</p>
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-0.5">Condição do Imóvel</label>
                  <p className="text-white">{lead.propertyStatus || 'Próprio'}</p>
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-0.5">Distribuidora de Energia</label>
                  <p className="text-white">{lead.distributor || 'Não informada'}</p>
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-0.5">Canal de Origem</label>
                  <p className="text-white">{lead.source}</p>
                </div>
              </div>
            </div>

            {/* Consumo Energético */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Dados de Consumo Declarados
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-3">
                  <span className="text-[#8B949E] block">Valor Médio da Conta</span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    {formatCurrency(lead.averageMonthlyBill)}
                  </span>
                </div>

                <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-3">
                  <span className="text-[#8B949E] block">Consumo Médio</span>
                  <span className="text-lg font-bold text-amber-400 mt-1 block">
                    {lead.averageConsumptionKWh ? `${lead.averageConsumptionKWh} kWh/mês` : 'Não informado'}
                  </span>
                </div>

                <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-3">
                  <span className="text-[#8B949E] block">Potência Estimada</span>
                  <span className="text-lg font-bold text-blue-400 mt-1 block">
                    {systemPowerKWp.toFixed(2)} kWp
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Responsável e Notas */}
          <div className="space-y-4">
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-400" />
                Atribuição & Anotações Internas
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[#8B949E] block mb-1">Consultor Responsável</label>
                  <input
                    type="text"
                    placeholder="Nome do consultor"
                    value={responsible}
                    onChange={(e) => setResponsible(e.target.value)}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2 text-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-1">Notas Comerciais</label>
                  <textarea
                    rows={4}
                    placeholder="Histórico, condições de telhado, particularidades do interessado..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-hidden resize-none"
                  />
                </div>

                <button
                  onClick={handleSaveDetails}
                  disabled={savingDetails}
                  className="w-full py-2 bg-[#21262D] hover:bg-[#30363D] text-white rounded-lg font-semibold flex items-center justify-center gap-2 border border-[#30363D] transition-colors"
                >
                  {savingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Salvar Dados</span>
                </button>
              </div>
            </div>

            {/* Unidade Consumidora / Cliente vinculados */}
            {lead.clientId && (
              <div className="bg-[#161B22] border border-purple-500/30 rounded-xl p-5 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Cliente Vinculado
                </span>
                <p className="text-xs text-[#8B949E]">
                  Este interessado já passou pela qualificação formal. O registro de cliente e a unidade consumidora estão criados no banco.
                </p>
                <div className="text-xs font-mono bg-[#0D1117] p-2.5 rounded-lg border border-[#30363D] text-purple-300">
                  ID Cliente: {lead.clientId.slice(0, 13)}...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: Qualificação */}
      {activeTab === 'qualificacao' && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363D] pb-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                Qualificação Comercial do Interessado
              </h3>
              <p className="text-xs text-[#8B949E] mt-0.5">
                Avalie os critérios essenciais de viabilidade para converter o interessado em Cliente e Unidade Consumidora.
              </p>
            </div>

            {lead.clientId ? (
              <div className="flex items-center gap-2 bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold">
                <CheckCircle className="w-4 h-4" />
                <span>Interessado Qualificado com Sucesso</span>
              </div>
            ) : (
              <button
                onClick={handleQualifyLead}
                disabled={qualifying}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-colors"
              >
                {qualifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                <span>Qualificar e Criar Cliente</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 space-y-2">
              <label className="font-semibold text-white block">Decisor da Compra?</label>
              <select
                value={decisionMaker}
                onChange={(e) => setDecisionMaker(e.target.value)}
                disabled={Boolean(lead.clientId)}
                className="w-full bg-[#161B22] border border-[#30363D] rounded-lg p-2 text-white focus:border-purple-500 focus:outline-hidden"
              >
                <option value="Sim">Sim (Titular / Decisor direto)</option>
                <option value="Compartilhada">Compartilhada (Cônjuge / Sócios)</option>
                <option value="Não">Não (Terceiro / Colaborador)</option>
              </select>
              <span className="text-[11px] text-[#8B949E]">
                Importante para direcionar a apresentação da proposta.
              </span>
            </div>

            <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 space-y-2">
              <label className="font-semibold text-white block">Titularidade do Imóvel</label>
              <select
                value={propertyOwnership}
                onChange={(e) => setPropertyOwnership(e.target.value as any)}
                disabled={Boolean(lead.clientId)}
                className="w-full bg-[#161B22] border border-[#30363D] rounded-lg p-2 text-white focus:border-purple-500 focus:outline-hidden"
              >
                <option value="Próprio">Próprio (Telhado liberado)</option>
                <option value="Alugado">Alugado (Necessita autorização)</option>
                <option value="Em construção">Em construção (Previsão de ligação)</option>
                <option value="Outro">Outro</option>
              </select>
              <span className="text-[11px] text-[#8B949E]">
                Define a viabilidade estrutural e jurídica da instalação.
              </span>
            </div>

            <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 space-y-2">
              <label className="font-semibold text-white block">Nível de Interesse</label>
              <select
                value={interestLevel}
                onChange={(e) => setInterestLevel(e.target.value)}
                disabled={Boolean(lead.clientId)}
                className="w-full bg-[#161B22] border border-[#30363D] rounded-lg p-2 text-white focus:border-purple-500 focus:outline-hidden"
              >
                <option value="Alto">Alto (Quer fechar rápido)</option>
                <option value="Médio">Médio (Pesquisando orçamentos)</option>
                <option value="Baixo">Baixo (Apenas curiosidade)</option>
              </select>
              <span className="text-[11px] text-[#8B949E]">
                Ajuda na priorização da agenda de follow-up.
              </span>
            </div>

            <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 space-y-2">
              <label className="font-semibold text-white block">Prazo Pretendido</label>
              <select
                value={purchaseTimeframe}
                onChange={(e) => setPurchaseTimeframe(e.target.value)}
                disabled={Boolean(lead.clientId)}
                className="w-full bg-[#161B22] border border-[#30363D] rounded-lg p-2 text-white focus:border-purple-500 focus:outline-hidden"
              >
                <option value="Até 30 dias">Até 30 dias (Imediato)</option>
                <option value="1 a 3 meses">1 a 3 meses</option>
                <option value="3 a 6 meses">3 a 6 meses</option>
                <option value="Sem prazo definido">Sem prazo definido</option>
              </select>
              <span className="text-[11px] text-[#8B949E]">
                Estimativa para fechamento do contrato.
              </span>
            </div>

            <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 space-y-2">
              <label className="font-semibold text-white block">Forma de Pagamento Preferida</label>
              <select
                value={paymentPreference}
                onChange={(e) => setPaymentPreference(e.target.value)}
                disabled={Boolean(lead.clientId)}
                className="w-full bg-[#161B22] border border-[#30363D] rounded-lg p-2 text-white focus:border-purple-500 focus:outline-hidden"
              >
                <option value="Financiamento">Financiamento Solar (BV / Santander / etc.)</option>
                <option value="À vista">À vista (com desconto comercial)</option>
                <option value="Cartão / Consórcio">Cartão de Crédito / Consórcio</option>
                <option value="Ainda não definido">Ainda não definido</option>
              </select>
              <span className="text-[11px] text-[#8B949E]">
                Permite preparar a melhor simulação na proposta.
              </span>
            </div>

            <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 space-y-2">
              <label className="font-semibold text-white block">Objetivo Principal</label>
              <div className="p-2 bg-[#161B22] border border-[#30363D] rounded-lg text-white font-medium text-[11px]">
                Reduzir o custo mensal da energia elétrica e se proteger contra reajustes tarifários da distribuidora.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: Pré-Dimensionamento & Revisão Técnica */}
      {activeTab === 'dimensionamento' && (
        <div className="space-y-4">
          {/* Action Header */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-400" />
                Dimensionamento do Sistema Solar
              </h3>
              <p className="text-xs text-[#8B949E] mt-0.5">
                {sizing
                  ? `Dimensionamento versão ${sizing.calculationVersion} (${sizing.status === 'concluido' ? 'Concluído' : 'Rascunho'}) salvo.`
                  : 'Cálculo técnico preliminar pronto para ajuste refinado.'}
              </p>
            </div>

            <button
              onClick={() => {
                if (!lead.clientId) {
                  onShowToast('Qualifique o interessado antes de dimensionar.');
                  setActiveTab('qualificacao');
                  return;
                }
                onOpenSizingEditor();
              }}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-colors"
            >
              <Calculator className="w-4 h-4" />
              <span>Abrir Dimensionador Completo</span>
            </button>
          </div>

          {/* Cards de Resultados do Dimensionamento */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
              <span className="text-xs text-[#8B949E]">Potência do Sistema</span>
              <span className="text-xl font-bold text-amber-400 block mt-1">
                {(sizing?.installedPowerKWp ?? systemPowerKWp).toFixed(2)} kWp
              </span>
              <span className="text-[11px] text-[#8B949E] mt-1 block">
                {sizing?.modulesCount ?? Math.ceil((systemPowerKWp * 1000) / 585)} módulos de {sizing?.modulePowerW ?? 585}W
              </span>
            </div>

            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
              <span className="text-xs text-[#8B949E]">Geração Média Estimada</span>
              <span className="text-xl font-bold text-[#6EE7B7] block mt-1">
                {Math.round(sizing?.estimatedMonthlyGenerationKWh ?? monthlyGenKWh)} kWh/mês
              </span>
              <span className="text-[11px] text-[#8B949E] mt-1 block">
                ~{Math.round((sizing?.estimatedAnnualGenerationKWh ?? (monthlyGenKWh * 12)) / 1000)} MWh por ano
              </span>
            </div>

            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
              <span className="text-xs text-[#8B949E]">Área de Telhado</span>
              <span className="text-xl font-bold text-white block mt-1">
                {Math.round(sizing?.estimatedAreaM2 ?? (systemPowerKWp * 5.2))} m²
              </span>
              <span className="text-[11px] text-[#8B949E] mt-1 block">
                Espaço mínimo estimado
              </span>
            </div>

            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
              <span className="text-xs text-[#8B949E]">Relação CC / CA</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-bold text-blue-400">
                  {sizing ? Number(sizing.dcAcRatio).toFixed(2) : '1.18'}
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-1.5 py-0.5 rounded">
                  OK
                </span>
              </div>
              <span className="text-[11px] text-[#8B949E] mt-1 block">
                Ideal entre 0.8 e 1.3
              </span>
            </div>
          </div>

          {/* Gráfico / Tabela Mês a Mês */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider text-[#8B949E]">
              Previsão de Geração Mês a Mês (kWh)
            </h4>

            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 text-center text-xs">
              {MONTH_NAMES.map((m, i) => {
                const gen = sizing?.monthlyGenerationKWh?.[i] ?? Math.round(monthlyGenKWh * (0.88 + Math.sin(i / 2) * 0.22));
                return (
                  <div key={m} className="bg-[#0D1117] border border-[#30363D] rounded-lg p-2 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-[#8B949E]">{m}</span>
                    <span className="text-xs font-semibold text-white mt-2 font-mono">
                      {Math.round(gen)}
                    </span>
                    <span className="text-[9px] text-amber-400">kWh</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: Composição Comercial (Precificação & Margens) */}
      {activeTab === 'composicao' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Coluna Esquerda: Custos & Formação */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Composição de Custos Diretos
                </h3>
                <span className="text-xs font-mono font-bold text-white">
                  Total Custos: {formatCurrency(totalDirectCosts)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-[#8B949E] block mb-1">Kit Gerador Solar (Módulos + Inversor)</label>
                  <input
                    type="number"
                    value={equipmentCost}
                    onChange={(e) => setEquipmentCost(Number(e.target.value))}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-1">Mão de Obra e Instalação</label>
                  <input
                    type="number"
                    value={laborCost}
                    onChange={(e) => setLaborCost(Number(e.target.value))}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-1">Engenharia, Projeto & Vistoria</label>
                  <input
                    type="number"
                    value={engineeringCost}
                    onChange={(e) => setEngineeringCost(Number(e.target.value))}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-1">Taxas Concessionária & Padrão</label>
                  <input
                    type="number"
                    value={utilityFee}
                    onChange={(e) => setUtilityFee(Number(e.target.value))}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-1">Frete & Logística</label>
                  <input
                    type="number"
                    value={freightCost}
                    onChange={(e) => setFreightCost(Number(e.target.value))}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-1">Outras Despesas</label>
                  <input
                    type="number"
                    value={otherCosts}
                    onChange={(e) => setOtherCosts(Number(e.target.value))}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Margens e Impostos */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Percent className="w-4 h-4 text-blue-400" />
                Margens, Impostos & Desconto
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="text-[#8B949E] block mb-1">Margem de Lucro (%)</label>
                  <input
                    type="number"
                    value={marginPercent}
                    onChange={(e) => setMarginPercent(Number(e.target.value))}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-1">Impostos (%)</label>
                  <input
                    type="number"
                    value={taxesPercent}
                    onChange={(e) => setTaxesPercent(Number(e.target.value))}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-1">Comissão (%)</label>
                  <input
                    type="number"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(Number(e.target.value))}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-1">Desconto Comercial (R$)</label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Resumo do Preço Final */}
          <div className="space-y-4">
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
              <span className="text-xs uppercase font-bold text-[#8B949E] tracking-wider block">
                Resumo Comercial
              </span>

              <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 text-center">
                <span className="text-xs text-[#8B949E]">Valor Final de Venda</span>
                <span className="text-2xl sm:text-3xl font-bold text-emerald-400 block mt-1">
                  {formatCurrency(finalSalePrice)}
                </span>
                <span className="text-[11px] font-mono text-[#8B949E] mt-1 block">
                  R$ {pricePerWp.toFixed(2)} / Wp
                </span>
              </div>

              <div className="space-y-2 text-xs border-t border-[#30363D] pt-3">
                <div className="flex justify-between">
                  <span className="text-[#8B949E]">Economia Mensal Est.</span>
                  <span className="font-semibold text-white">{formatCurrency(monthlySavings)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B949E]">Economia Anual</span>
                  <span className="font-semibold text-[#6EE7B7]">{formatCurrency(annualSavings)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B949E]">Payback Estimado</span>
                  <span className="font-semibold text-amber-400">{paybackYears} anos</span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('proposta')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Gerar Proposta com este Valor</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: Proposta Comercial */}
      {activeTab === 'proposta' && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363D] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">
                  Proposta {currentProposal.code}
                </h3>
              </div>
              <p className="text-xs text-[#8B949E] mt-0.5">
                Proposta pronta para apresentação, impressão em PDF e envio direto pelo WhatsApp.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onOpenProposalViewer(currentProposal)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>Visualizar / Imprimir PDF</span>
              </button>

              <button
                onClick={handleShareProposalWhatsApp}
                className="px-3 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar no WhatsApp</span>
              </button>

              {lead.status !== 'proposta_enviada' && (
                <button
                  onClick={async () => {
                    const updated = await updateLeadStage(lead.id, 'proposta_enviada');
                    onLeadUpdated(updated);
                    onShowToast('Atendimento avançado para "Proposta Enviada"!');
                  }}
                  className="px-3 py-2 bg-[#21262D] border border-[#30363D] text-[#C9D1D9] hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-4 h-4 text-blue-400" />
                  <span>Marcar como Enviada</span>
                </button>
              )}
            </div>
          </div>

          {/* Destaques da Proposta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 space-y-2">
              <span className="text-[#8B949E] font-semibold block">Gerador Fotovoltaico</span>
              <p className="text-base font-bold text-white">
                {currentProposal.systemPowerKWp} kWp
              </p>
              <p className="text-[#8B949E] text-[11px]">
                {currentProposal.modulesCount}x {currentProposal.moduleModel}
              </p>
              <p className="text-[#8B949E] text-[11px]">
                1x {currentProposal.inverterModel}
              </p>
            </div>

            <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 space-y-2">
              <span className="text-[#8B949E] font-semibold block">Retorno do Investimento</span>
              <p className="text-base font-bold text-emerald-400">
                {formatCurrency(currentProposal.totalValue)}
              </p>
              <p className="text-white text-[11px]">
                Economia mensal: {formatCurrency(currentProposal.estimatedMonthlySavings)}
              </p>
              <p className="text-amber-400 text-[11px]">
                Retorno do capital (Payback): {currentProposal.paybackYears} anos
              </p>
            </div>

            <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 space-y-2">
              <span className="text-[#8B949E] font-semibold block">Sustentabilidade & Impacto</span>
              <p className="text-base font-bold text-[#6EE7B7] flex items-center gap-1.5">
                <Leaf className="w-4 h-4 text-emerald-400" />
                {currentProposal.co2AvoidedTons} ton CO₂
              </p>
              <p className="text-[#8B949E] text-[11px]">
                Equivalente a {currentProposal.treesPlanted} árvores preservadas em 25 anos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: Acompanhamento & Tarefas */}
      {activeTab === 'acompanhamento' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Tarefas */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-blue-400" />
                Tarefas & Retornos Agendados
              </h3>
              <span className="text-xs font-mono font-bold text-[#8B949E]">
                {tasks.filter((t) => t.status === 'pendente').length} pendentes
              </span>
            </div>

            {/* Form Nova Tarefa */}
            <form onSubmit={handleCreateTask} className="flex gap-2 text-xs">
              <input
                type="text"
                required
                placeholder="Ex: Ligar para alinhar forma de pagamento..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="flex-1 bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-1.5 text-white placeholder-[#484F58] focus:border-blue-500 focus:outline-hidden"
              />
              <input
                type="datetime-local"
                value={taskDueAt}
                onChange={(e) => setTaskDueAt(e.target.value)}
                className="bg-[#0D1117] border border-[#30363D] rounded-lg px-2 py-1.5 text-white text-[11px] focus:border-blue-500 focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={creatingTask}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Tasks List */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <p className="text-xs text-[#8B949E] text-center py-6">Nenhuma tarefa agendada.</p>
              ) : (
                tasks.map((task) => {
                  const isDone = task.status === 'concluida';
                  return (
                    <div
                      key={task.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs transition-colors ${
                        isDone
                          ? 'bg-[#0D1117]/50 border-[#21262D] text-[#484F58]'
                          : 'bg-[#0D1117] border-[#30363D] text-[#C9D1D9]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => !isDone && handleCompleteTask(task.id)}
                          disabled={isDone}
                          className="rounded border-[#30363D] text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <span className={`truncate ${isDone ? 'line-through' : 'font-medium text-white'}`}>
                          {task.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#8B949E] shrink-0 font-mono">
                        {new Date(task.dueAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Timeline de Atividades */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Histórico & Auditoria de Atividades
            </h3>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 text-xs">
              {activities.length === 0 ? (
                <p className="text-xs text-[#8B949E] text-center py-6">Nenhuma atividade registrada.</p>
              ) : (
                activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-[#0D1117] border border-[#30363D] rounded-lg space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{act.title}</span>
                      <span className="text-[10px] text-[#8B949E] font-mono">
                        {new Date(act.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {act.description && (
                      <p className="text-[11px] text-[#8B949E]">{act.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Contato */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl max-w-md w-full p-5 space-y-4 text-[#C9D1D9]">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-400" />
                Registrar Contato com {lead.name}
              </h3>
              <button onClick={() => setContactModalOpen(false)}>
                <X className="w-4 h-4 text-[#8B949E] hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleRegisterContact} className="space-y-3 text-xs">
              <div>
                <label className="text-[#8B949E] block mb-1">Canal de Contato</label>
                <select
                  value={contactChannel}
                  onChange={(e) => setContactChannel(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2 text-white"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Ligação">Ligação Telefônica</option>
                  <option value="E-mail">E-mail</option>
                  <option value="Presencial">Reunião Presencial</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="text-[#8B949E] block mb-1">Resumo da Interação *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="O que foi conversado? Dúvidas do cliente, proposta apresentada..."
                  value={contactSummary}
                  onChange={(e) => setContactSummary(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white resize-none"
                />
              </div>

              <div>
                <label className="text-[#8B949E] block mb-1">Agendar Próximo Contato (opcional)</label>
                <input
                  type="datetime-local"
                  value={contactNextAt}
                  onChange={(e) => setContactNextAt(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#30363D]">
                <button
                  type="button"
                  onClick={() => setContactModalOpen(false)}
                  className="px-3 py-1.5 border border-[#30363D] rounded-lg text-[#C9D1D9]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={registeringContact}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg"
                >
                  {registeringContact ? 'Salvando...' : 'Registrar Contato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Motivo da Perda */}
      {lostModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl max-w-md w-full p-5 space-y-4 text-[#C9D1D9]">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
              <h3 className="font-bold text-rose-400 text-sm flex items-center gap-2">
                <UserX className="w-4 h-4" />
                Encerrar Atendimento como Perdido
              </h3>
              <button onClick={() => setLostModalOpen(false)}>
                <X className="w-4 h-4 text-[#8B949E] hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleMarkLost} className="space-y-3 text-xs">
              <p className="text-[#8B949E]">
                Informe o motivo da perda para registrar na auditoria comercial do atendimento:
              </p>

              <div>
                <label className="text-[#8B949E] block mb-1">Motivo do Encerramento *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Preço mais alto que concorrente, falta de crédito bancário aprovado, desistência..."
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#30363D]">
                <button
                  type="button"
                  onClick={() => setLostModalOpen(false)}
                  className="px-3 py-1.5 border border-[#30363D] rounded-lg text-[#C9D1D9]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={markingLost}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg"
                >
                  {markingLost ? 'Encerrando...' : 'Confirmar Perda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
