import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Eye,
  FileCheck2,
  HelpCircle,
  Layers,
  Leaf,
  ListTodo,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Plus,
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
  deleteLostLead,
  reopenLead,
  saveLeadDetails,
  updateLeadStage,
} from '../../services/leads';
import { AttendanceStepper } from './AttendanceStepper';
import { QualificationStep } from './QualificationStep';
import { SizingStep } from './SizingStep';
import { ProposalStep } from './ProposalStep';
import { FollowUpStep } from './FollowUpStep';
import { OutcomeStep } from './OutcomeStep';

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

  // Form states for editable general notes & responsible
  const [responsible, setResponsible] = useState(lead.assigned_to || lead.responsible || '');
  const [notes, setNotes] = useState(lead.notes || '');
  const [savingDetails, setSavingDetails] = useState(false);

  const stageConfig = getStageConfig(lead.status);
  const isLost = lead.status === 'perdido';
  const isWon = lead.status === 'ganho';

  const formatCurrency = (val?: number | null) =>
    val != null
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
      : '-';

  const handleStageStepClick = async (targetStage: LeadStage) => {
    if (lead.status === targetStage) return;

    if (targetStage === 'qualificado' && !lead.clientId && lead.qualification_status !== 'qualificado') {
      setActiveTab('qualificacao');
      onShowToast('Preencha e confirme a qualificação técnica para avançar para a etapa Qualificado.');
      return;
    }

    try {
      const updated = await updateLeadStage(lead.id, targetStage);
      onLeadUpdated(updated);
      onShowToast(`Etapa alterada para "${getStageConfig(targetStage).label}"`);
    } catch (err: any) {
      onShowToast(err?.message || 'Erro ao alterar etapa.');
    }
  };

  const handleSaveDetails = async () => {
    setSavingDetails(true);
    try {
      const updated = await saveLeadDetails(
        lead.id,
        responsible.trim(),
        notes.trim()
      );
      onLeadUpdated(updated);
      onShowToast('Informações internas salvas!');
    } catch (err: any) {
      onShowToast(err?.message || 'Erro ao salvar informações.');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const rawDigits = (lead.phone || '').replace(/\D/g, '');
    const phoneWithCountry = rawDigits.startsWith('55') ? rawDigits : `55${rawDigits}`;
    const text = encodeURIComponent(
      `Olá, ${lead.name}! Aqui é da equipe Sol Amigo. Gostaria de dar andamento ao seu atendimento de energia solar.`
    );
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        'Tem certeza que deseja excluir este atendimento definitivamente? Esta ação não pode ser desfeita.'
      )
    ) {
      return;
    }

    try {
      await deleteLostLead(lead.id);
      onShowToast('Atendimento excluído permanentemente.');
      onBack();
    } catch (err: any) {
      onShowToast(err?.message || 'Erro ao excluir atendimento.');
    }
  };

  return (
    <div id="attendance-detail-container" className="space-y-4 pb-12">
      {/* Top Header Card: Identity, Stage progression & Direct Actions */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-white transition-colors cursor-pointer mt-0.5"
              title="Voltar para a listagem"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isWon
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : isLost
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}
                >
                  {isWon ? 'Cliente Sol Amigo' : 'Interessado'}
                </span>

                <span className="text-xs text-[#8B949E]">
                  Canal: {lead.source_channel || lead.lead_source || 'Manual'}
                </span>

                {lead.created_at && (
                  <span className="text-xs text-[#8B949E]">
                    · Aberto em {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold text-white mt-1">{lead.name}</h2>

              <div className="flex items-center gap-3 text-xs text-[#8B949E] mt-1 flex-wrap">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    {lead.city && lead.state ? `${lead.city} / ${lead.state}` : 'Local não informado'}
                  </span>
                </div>

                <div className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{formatPhone(lead.phone)}</span>
                </div>

                {lead.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{lead.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={handleOpenWhatsApp}
              className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp</span>
            </button>

            {!isWon && !isLost && (
              <>
                <button
                  onClick={() => setActiveTab('resultado')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-colors cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Fechar Venda</span>
                </button>

                <button
                  onClick={() => setActiveTab('resultado')}
                  className="px-3 py-1.5 bg-rose-600/20 border border-rose-500/30 text-rose-300 hover:bg-rose-600/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Perdido</span>
                </button>
              </>
            )}

            {isLost && (
              <button
                onClick={handleDelete}
                className="p-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                title="Excluir definitivamente"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Commercial Pipeline Stepper Bar */}
        <div className="pt-3 border-t border-[#30363D]">
          <span className="text-[10px] uppercase font-bold text-[#8B949E] tracking-wider mb-2 block">
            Avanço no Fluxo Comercial (Clique para alterar etapa)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
            {ATTENDANCE_STAGES.map((st, index) => {
              const isCurrent = lead.status === st.key;
              const isPassed = !isLost && ATTENDANCE_STAGES.findIndex((s) => s.key === lead.status) >= index;

              return (
                <button
                  key={st.key}
                  onClick={() => handleStageStepClick(st.key)}
                  className={`px-2 py-1.5 rounded-lg text-left transition-all flex flex-col justify-between border cursor-pointer ${
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
      </div>

      {/* Stepper Horizontal das Etapas do Atendimento */}
      <AttendanceStepper
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        lead={lead}
        sizing={sizing}
        hasProposal={Boolean(lead.proposal_code || lead.status === 'proposta_enviada')}
        tasksCount={tasks.filter((t) => t.status === 'pendente').length}
      />

      {/* TAB CONTENT 1: Dados do Interessado */}
      {activeTab === 'dados' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Informações Gerais */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                Ficha Geral do Interessado
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
                      className="text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold cursor-pointer"
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
                  <p className="text-white">{lead.city || 'Cidade não informada'} / {lead.state || 'UF'}</p>
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-0.5">Tipo do Imóvel</label>
                  <p className="text-white">{lead.property_type || lead.propertyType || 'Residencial'}</p>
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-0.5">Condição do Imóvel</label>
                  <p className="text-white">{lead.property_status || lead.propertyStatus || 'Próprio'}</p>
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-0.5">Distribuidora de Energia</label>
                  <p className="text-white">{lead.distributor || 'Não informada'}</p>
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-0.5">Canal de Origem</label>
                  <p className="text-white">{lead.source_channel || lead.lead_source || 'Manual'}</p>
                </div>
              </div>
            </div>

            {/* Consumo Energético Declarado */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Dados de Consumo Declarados
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-3">
                  <span className="text-[#8B949E] block">Valor Médio da Conta</span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    {formatCurrency(lead.average_monthly_bill || lead.averageMonthlyBill)}
                  </span>
                </div>

                <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-3">
                  <span className="text-[#8B949E] block">Consumo Médio</span>
                  <span className="text-lg font-bold text-amber-400 mt-1 block">
                    {lead.average_consumption_kwh || lead.averageConsumptionKWh
                      ? `${lead.average_consumption_kwh || lead.averageConsumptionKWh} kWh/mês`
                      : 'Não informado'}
                  </span>
                </div>

                <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-3">
                  <span className="text-[#8B949E] block">Potência Estimada</span>
                  <span className="text-lg font-bold text-blue-400 mt-1 block">
                    {sizing?.installedPowerKWp
                      ? `${sizing.installedPowerKWp.toFixed(2)} kWp`
                      : lead.average_consumption_kwh
                      ? `${(Number(lead.average_consumption_kwh) / 120).toFixed(2)} kWp*`
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Responsável e Notas Internas */}
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
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[#8B949E] block mb-1">Notas Comerciais</label>
                  <textarea
                    rows={4}
                    placeholder="Histórico, particularidades do interessado, observações técnicas..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>

                <button
                  onClick={handleSaveDetails}
                  disabled={savingDetails}
                  className="w-full py-2 bg-[#21262D] hover:bg-[#30363D] text-white rounded-lg font-semibold flex items-center justify-center gap-2 border border-[#30363D] transition-colors cursor-pointer"
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
                  Cliente Formalizado
                </span>
                <p className="text-xs text-[#8B949E]">
                  Este atendimento já possui cliente e unidade consumidora associados na base de dados.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: Qualificação */}
      {activeTab === 'qualificacao' && (
        <QualificationStep
          lead={lead}
          onLeadUpdated={onLeadUpdated}
          onShowToast={onShowToast}
          onNextStep={() => setActiveTab('dimensionamento')}
        />
      )}

      {/* TAB CONTENT 3: Dimensionamento */}
      {activeTab === 'dimensionamento' && (
        <SizingStep
          lead={lead}
          sizing={sizing}
          onOpenEditor={onOpenSizingEditor}
          onNextStep={() => setActiveTab('proposta')}
        />
      )}

      {/* TAB CONTENT 4: Proposta Comercial & Custos */}
      {activeTab === 'proposta' && (
        <ProposalStep
          lead={lead}
          sizing={sizing}
          theme={theme}
          pdfSettings={pdfSettings}
          onOpenProposalViewer={onOpenProposalViewer}
          onShowToast={onShowToast}
          onLeadStageChanged={() => {
            onLeadUpdated({ ...lead, status: 'proposta_enviada' });
          }}
        />
      )}

      {/* TAB CONTENT 5: Acompanhamento & Tarefas */}
      {activeTab === 'acompanhamento' && (
        <FollowUpStep
          lead={lead}
          tasks={tasks}
          activities={activities}
          onLeadUpdated={onLeadUpdated}
          onTasksUpdated={onTasksUpdated}
          onActivitiesUpdated={onActivitiesUpdated}
          onShowToast={onShowToast}
        />
      )}

      {/* TAB CONTENT 6: Resultado da Negociação */}
      {activeTab === 'resultado' && (
        <OutcomeStep
          lead={lead}
          onLeadUpdated={onLeadUpdated}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
