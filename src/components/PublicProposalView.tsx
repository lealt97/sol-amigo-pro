import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  HelpCircle,
  Leaf,
  Loader2,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sun,
  ThumbsDown,
  ThumbsUp,
  XCircle,
  Zap,
} from 'lucide-react';
import { decidePublicProposal, fetchPublicProposal } from '../services/proposals';

interface PublicProposalViewProps {
  token: string;
}

export const PublicProposalView: React.FC<PublicProposalViewProps> = ({ token }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Action states
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  const loadProposal = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchPublicProposal(token);
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Proposta não encontrada ou link expirado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadProposal();
    }
  }, [token]);

  const handleApprove = async () => {
    setSubmittingAction(true);
    try {
      const res = await decidePublicProposal(token, 'aprovada', actionReason || 'Proposta aprovada');
      setActionSuccessMessage(res.message);
      setIsApproveModalOpen(false);
      await loadProposal();
    } catch (err: any) {
      alert(err?.message || 'Não foi possível aprovar a proposta.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async () => {
    if (!actionReason.trim() || actionReason.trim().length < 3) {
      alert('Por favor, descreva o motivo ou os ajustes desejados.');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await decidePublicProposal(token, 'recusada', actionReason.trim());
      setActionSuccessMessage(res.message);
      setIsRejectModalOpen(false);
      await loadProposal();
    } catch (err: any) {
      alert(err?.message || 'Não foi possível registrar a recusa.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const formatCurrency = (val?: number) =>
    val != null
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
      : 'R$ 0,00';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex flex-col items-center justify-center p-4 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
        <p className="text-sm font-medium text-[#8B949E]">Carregando proposta solar segura...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#161B22] border border-[#30363D] rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Proposta Indisponível</h2>
          <p className="text-xs text-[#8B949E] leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#21262D] hover:bg-[#30363D] text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const { code, version, status, validUntil, totalValue, lead, system, equipment, commercialConditions } = data;

  const isAlreadyDecided = status === 'aprovada' || status === 'recusada';

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#C9D1D9] font-sans">
      {/* Header com Branding */}
      <header className="bg-[#161B22] border-b border-[#30363D] sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20 text-white">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-white block">Sol Amigo PRO</span>
              <span className="text-[10px] text-[#8B949E]">Proposta Comercial Solar</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                status === 'aprovada'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : status === 'recusada'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}
            >
              {status === 'aprovada'
                ? 'Aprovada'
                : status === 'recusada'
                ? 'Recusada'
                : 'Aguardando Decisão'}
            </span>
            <span className="text-xs text-[#8B949E] font-mono hidden sm:inline">
              {code} (v{version})
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Banner de Sucesso */}
        {actionSuccessMessage && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Hero Card */}
        <div className="bg-gradient-to-br from-[#161B22] to-[#1C2128] border border-[#30363D] rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-amber-400 tracking-wider uppercase">
                Proposta Personalizada
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                Olá, {lead.name}!
              </h1>
              <p className="text-xs sm:text-sm text-[#8B949E] mt-1 max-w-2xl leading-relaxed">
                Elaboramos o projeto de engenharia e a viabilidade econômica do seu sistema fotovoltaico para o imóvel em <strong>{lead.city}/{lead.state}</strong>.
              </p>
            </div>

            <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 text-right shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-[#8B949E] font-semibold block">
                Investimento Total
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-emerald-400 block mt-0.5">
                {formatCurrency(totalValue)}
              </span>
              {validUntil && (
                <span className="text-[10px] text-[#8B949E] block mt-1">
                  Válida até {new Date(validUntil).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Destaques Técnicos (4 Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8B949E] font-medium">Potência do Sistema</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-white font-mono block">
              {system.installedPowerKWp?.toFixed(2)} kWp
            </span>
            <span className="text-[10px] text-[#8B949E] block">
              {system.modulesCount} módulos fotovoltaicos
            </span>
          </div>

          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8B949E] font-medium">Geração Média</span>
              <Sun className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-blue-400 font-mono block">
              {Math.round(system.estimatedMonthlyGenerationKWh)} kWh
            </span>
            <span className="text-[10px] text-[#8B949E] block">por mês estimado</span>
          </div>

          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8B949E] font-medium">Geração Anual</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono block">
              {Math.round(system.estimatedAnnualGenerationKWh).toLocaleString('pt-BR')} kWh
            </span>
            <span className="text-[10px] text-[#8B949E] block">por ano de energia limpa</span>
          </div>

          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8B949E] font-medium">Área de Telhado</span>
              <MapPin className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-white font-mono block">
              {Math.round(system.estimatedAreaM2)} m²
            </span>
            <span className="text-[10px] text-[#8B949E] block">área estimada requerida</span>
          </div>
        </div>

        {/* Equipamentos Inclusos */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Equipamentos e Serviços Inclusos
          </h3>

          <div className="divide-y divide-[#30363D]">
            {equipment && equipment.length > 0 ? (
              equipment.map((eq: any, idx: number) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-white font-medium">{eq.description}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[#8B949E] font-mono">Qtd: {eq.quantity}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-3 text-xs text-[#8B949E]">
                Módulos fotovoltaicos de alta eficiência, inversores homologados pelo INMETRO, estruturas de fixação e cabeamento solar normatizado.
              </div>
            )}
          </div>
        </div>

        {/* Condições Comerciais e Garantias */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-white text-xs flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Condições de Pagamento
            </h4>
            <p className="text-xs text-[#8B949E] leading-relaxed">
              {commercialConditions?.paymentMethods ||
                'À vista com desconto especial, ou financiamento solar bancário com parcelas que se pagam com a própria economia da conta de luz.'}
            </p>
          </div>

          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-white text-xs flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              Garantias de Desempenho
            </h4>
            <p className="text-xs text-[#8B949E] leading-relaxed">
              {commercialConditions?.warrantyTerms ||
                'Garantia de 12 a 25 anos na geração linear dos painéis solares, 10 anos no inversor e garantia total de instalação técnica.'}
            </p>
          </div>
        </div>

        {/* Aviso Legal Obrigatório (Requisito 14) */}
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200/90 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Aviso de responsabilidade técnica:</strong> Os valores de geração de energia, economia mensal e retorno do investimento são estimativas baseadas nos dados históricos de irradiação solar da sua região e no histórico de consumo informado. A homologação final e instalação dependem de vistoria técnica no local e aprovação formal pela distribuidora de energia.
          </p>
        </div>

        {/* Floating / Bottom Decision Bar */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl">
          <div>
            <span className="text-xs font-semibold text-white block">
              Pronto para economizar com energia solar?
            </span>
            <span className="text-[11px] text-[#8B949E]">
              {isAlreadyDecided
                ? 'Sua resposta já foi registrada para este atendimento.'
                : 'Você pode aprovar esta proposta diretamente ou solicitar ajustes aos nossos consultores.'}
            </span>
          </div>

          {!isAlreadyDecided && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsRejectModalOpen(true)}
                className="px-4 py-2.5 bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
              >
                <ThumbsDown className="w-4 h-4 text-rose-400" />
                <span>Solicitar Ajustes / Recusar</span>
              </button>

              <button
                onClick={() => setIsApproveModalOpen(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-600/30"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Aprovar Proposta</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modal Aprovação */}
      {isApproveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-emerald-400" />
              Confirmar Aprovação da Proposta
            </h3>
            <p className="text-xs text-[#8B949E] leading-relaxed">
              Ao confirmar a aprovação da proposta <strong>{code}</strong> no valor de <strong>{formatCurrency(totalValue)}</strong>, nossa equipe iniciará o procedimento de formalização do contrato e cronograma de engenharia.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsApproveModalOpen(false)}
                disabled={submittingAction}
                className="px-4 py-2 bg-[#21262D] hover:bg-[#30363D] text-white rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleApprove}
                disabled={submittingAction}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2"
              >
                {submittingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Sim, Aprovar Proposta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Recusa / Ajuste */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ThumbsDown className="w-5 h-5 text-rose-400" />
              Solicitar Ajustes ou Recusar
            </h3>
            <p className="text-xs text-[#8B949E] leading-relaxed">
              Informe o motivo ou quais alterações você gostaria de ver na proposta (ex: prazo, equipamentos, condições de pagamento).
            </p>
            <div>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Descreva o motivo ou as condições necessárias..."
                rows={3}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                disabled={submittingAction}
                className="px-4 py-2 bg-[#21262D] hover:bg-[#30363D] text-white rounded-lg text-xs font-semibold"
              >
                Voltar
              </button>
              <button
                onClick={handleReject}
                disabled={submittingAction}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-2"
              >
                {submittingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Enviar Justificativa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
