import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  DollarSign,
  FileCheck2,
  HelpCircle,
  Loader2,
  RefreshCw,
  Trophy,
  UserCheck,
  UserX,
  X,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Lead } from '../../types';
import { markLeadLost, reopenLead, updateLeadStage } from '../../services/leads';

interface OutcomeStepProps {
  lead: Lead;
  onLeadUpdated: (lead: Lead) => void;
  onShowToast: (message: string) => void;
  onRefreshDetails?: () => void;
}

const LOST_REASONS = [
  'Preço mais alto que o concorrente',
  'Optou por outro integrador / concorrente',
  'Sem interesse ou prioridade no momento',
  'Crédito bancário negado ou sem financiamento',
  'Inviabilidade técnica (telhado condenado / rede)',
  'Desistência por motivos pessoais / mudança',
  'Outro motivo',
];

export const OutcomeStep: React.FC<OutcomeStepProps> = ({
  lead,
  onLeadUpdated,
  onShowToast,
  onRefreshDetails,
}) => {
  const [markingWon, setMarkingWon] = useState(false);
  const [markingLost, setMarkingLost] = useState(false);
  const [reopening, setReopening] = useState(false);

  const [lostReasonCategory, setLostReasonCategory] = useState(LOST_REASONS[0]);
  const [lostNotes, setLostNotes] = useState('');
  const [lostModalOpen, setLostModalOpen] = useState(false);

  const isWon = lead.status === 'ganho';
  const isLost = lead.status === 'perdido';

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#3B82F6', '#F59E0B', '#6366F1'],
    });
  };

  const handleMarkWon = async () => {
    setMarkingWon(true);
    try {
      const updated = await updateLeadStage(lead.id, 'ganho');
      triggerConfetti();
      onLeadUpdated(updated);
      onShowToast('🎉 Parabéns! Atendimento ganho e convertido em Cliente com sucesso!');
      if (onRefreshDetails) onRefreshDetails();
    } catch (err: any) {
      onShowToast(err?.message || 'Erro ao marcar atendimento como ganho.');
    } finally {
      setMarkingWon(false);
    }
  };

  const handleConfirmLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostNotes.trim()) {
      onShowToast('Por favor, informe as observações da perda.');
      return;
    }

    setMarkingLost(true);
    try {
      const fullReason = `[${lostReasonCategory}] ${lostNotes.trim()}`;
      const updated = await markLeadLost(lead.id, fullReason);
      setLostModalOpen(false);
      onLeadUpdated(updated);
      onShowToast('Atendimento encerrado como Perdido.');
      if (onRefreshDetails) onRefreshDetails();
    } catch (err: any) {
      onShowToast(err?.message || 'Erro ao marcar como perdido.');
    } finally {
      setMarkingLost(false);
    }
  };

  const handleReopen = async () => {
    setReopening(true);
    try {
      const updated = await reopenLead(lead.id);
      onLeadUpdated(updated);
      onShowToast('Atendimento reaberto com sucesso!');
      if (onRefreshDetails) onRefreshDetails();
    } catch (err: any) {
      onShowToast(err?.message || 'Erro ao reabrir atendimento.');
    } finally {
      setReopening(false);
    }
  };

  return (
    <div id="outcome-step-container" className="space-y-5">
      {/* Top Banner */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">
              Resultado da Negociação
            </h3>
          </div>
          <p className="text-xs text-[#8B949E] mt-1">
            Conclusão formal do ciclo comercial: conversão em Cliente ou registro de motivo de perda para auditoria.
          </p>
        </div>

        {(isWon || isLost) && (
          <button
            onClick={handleReopen}
            disabled={reopening}
            className="px-3.5 py-2 bg-[#21262D] hover:bg-[#30363D] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#30363D] cursor-pointer shrink-0"
          >
            {reopening ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>Reabrir Atendimento</span>
          </button>
        )}
      </div>

      {/* Se Ganho: Exibir celebração e dados pós-venda */}
      {isWon && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-lg">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
            <Trophy className="w-8 h-8" />
          </div>

          <div className="max-w-lg mx-auto space-y-1">
            <h3 className="text-xl font-extrabold text-white">
              Venda Conquistada com Sucesso!
            </h3>
            <p className="text-xs text-emerald-300">
              {lead.name} agora é oficialmente um <strong>Cliente</strong> da sua empresa. A unidade consumidora e o histórico do atendimento foram salvos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto pt-2 text-left">
            <div className="bg-[#161B22] border border-[#30363D] p-3 rounded-xl">
              <span className="text-[10px] text-[#8B949E] block">Status do Interessado</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Cliente Ativo
              </span>
            </div>

            <div className="bg-[#161B22] border border-[#30363D] p-3 rounded-xl">
              <span className="text-[10px] text-[#8B949E] block">Próximo Passo</span>
              <span className="text-xs font-bold text-white block mt-0.5">
                Vistoria & Engenharia
              </span>
            </div>

            <div className="bg-[#161B22] border border-[#30363D] p-3 rounded-xl">
              <span className="text-[10px] text-[#8B949E] block">Homologação</span>
              <span className="text-xs font-bold text-blue-400 block mt-0.5">
                {lead.distributor || 'Distribuidora'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Se Perdido: Exibir detalhes da perda */}
      {isLost && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center border border-rose-500/30 shrink-0">
              <UserX className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Atendimento Perdido</h3>
              <p className="text-xs text-rose-300">
                Este atendimento foi encerrado sem fechamento comercial.
              </p>
            </div>
          </div>

          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-2 text-xs">
            <span className="text-[#8B949E] block font-semibold">Motivo registrado:</span>
            <p className="text-white font-mono bg-[#0D1117] p-2.5 rounded-lg border border-[#30363D]">
              {lead.lost_reason || 'Motivo não detalhado.'}
            </p>
          </div>
        </div>
      )}

      {/* Se em andamento: Escolher Ganho ou Perdido */}
      {!isWon && !isLost && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card Ganho */}
          <div className="bg-[#161B22] border border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-6 space-y-4 transition-all flex flex-col justify-between shadow-lg">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/30">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Marcar como Ganho</h4>
                <p className="text-xs text-[#8B949E] mt-1">
                  O interessado aceitou a proposta! O atendimento é concluído com sucesso e o lead é promovido a Cliente oficial da integradora.
                </p>
              </div>

              <ul className="text-xs text-[#8B949E] space-y-1.5 pt-2">
                <li className="flex items-center gap-2 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Converte Interessado em Cliente
                </li>
                <li className="flex items-center gap-2 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Vincula unidade consumidora no banco
                </li>
                <li className="flex items-center gap-2 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Cria tarefas pós-venda para engenharia
                </li>
              </ul>
            </div>

            <button
              onClick={handleMarkWon}
              disabled={markingWon}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/30 mt-4"
            >
              {markingWon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
              <span>Confirmar Venda Conquistada</span>
            </button>
          </div>

          {/* Card Perdido */}
          <div className="bg-[#161B22] border border-rose-500/30 hover:border-rose-500/60 rounded-2xl p-6 space-y-4 transition-all flex flex-col justify-between shadow-lg">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/30">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Marcar como Perdido</h4>
                <p className="text-xs text-[#8B949E] mt-1">
                  O interessado declinou a proposta ou o negócio não pôde ser concretizado. Requer motivo objetivo para inteligência comercial.
                </p>
              </div>

              <ul className="text-xs text-[#8B949E] space-y-1.5 pt-2">
                <li className="flex items-center gap-2 text-rose-400 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Exige motivo e observações da perda
                </li>
                <li className="flex items-center gap-2 text-rose-400 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Cancela tarefas pendentes automaticamente
                </li>
                <li className="flex items-center gap-2 text-rose-400 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Permite reabrir o atendimento no futuro
                </li>
              </ul>
            </div>

            <button
              onClick={() => setLostModalOpen(true)}
              className="w-full py-3 bg-[#21262D] hover:bg-rose-900/30 hover:border-rose-500/50 border border-[#30363D] text-rose-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer mt-4"
            >
              <UserX className="w-4 h-4" />
              <span>Encerrar Negociação como Perdida</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Perda */}
      {lostModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl max-w-md w-full p-6 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
              <h3 className="font-bold text-rose-400 text-sm flex items-center gap-2">
                <UserX className="w-4 h-4" />
                Registrar Motivo da Perda
              </h3>
              <button
                onClick={() => setLostModalOpen(false)}
                className="text-[#8B949E] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmLost} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#8B949E] block mb-1">Motivo Principal</label>
                <select
                  value={lostReasonCategory}
                  onChange={(e) => setLostReasonCategory(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-rose-500 focus:outline-none"
                >
                  {LOST_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#8B949E] block mb-1">
                  Observações detalhadas (Obrigatório)
                </label>
                <textarea
                  required
                  rows={3}
                  value={lostNotes}
                  onChange={(e) => setLostNotes(e.target.value)}
                  placeholder="Explique o que ocorreu (ex.: cliente achou o prazo longo, preferiu proposta concorrente com taxa menor, etc.)..."
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-rose-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#30363D]">
                <button
                  type="button"
                  onClick={() => setLostModalOpen(false)}
                  className="px-3.5 py-2 bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-white rounded-lg font-semibold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={markingLost}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-rose-600/20"
                >
                  {markingLost ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                  <span>Confirmar Perda</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
