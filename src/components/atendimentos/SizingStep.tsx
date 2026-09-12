import React from 'react';
import {
  AlertTriangle,
  Award,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  MapPin,
  Maximize2,
  ShieldAlert,
  Sun,
  Wrench,
  Zap,
} from 'lucide-react';
import { Lead, OpportunitySizing } from '../../types';

interface SizingStepProps {
  lead: Lead;
  sizing: OpportunitySizing | null;
  onOpenEditor: () => void;
  onNextStep: () => void;
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const SizingStep: React.FC<SizingStepProps> = ({
  lead,
  sizing,
  onOpenEditor,
  onNextStep,
}) => {
  const isComplete = sizing && sizing.status === 'concluido';
  const isDraft = sizing && sizing.status === 'rascunho';

  // Fallback estimates if no sizing has been saved yet
  const monthlyConsumption =
    lead.average_consumption_kwh ||
    lead.averageConsumptionKWh ||
    (lead.average_monthly_bill ? Math.round(Number(lead.average_monthly_bill) / 0.95) : 450);

  const fallbackPowerKWp = Number(((monthlyConsumption / (30 * 4.8 * 0.8)) ).toFixed(2));
  const fallbackModules = Math.ceil((fallbackPowerKWp * 1000) / 550);

  const formatKWp = (val?: number) => (val != null ? `${val.toFixed(2)} kWp` : '-');
  const formatKWh = (val?: number) => (val != null ? `${Math.round(val).toLocaleString('pt-BR')} kWh` : '-');

  return (
    <div id="sizing-step-container" className="space-y-4">
      {/* Header Banner */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">
              Dimensionamento Fotovoltaico On-Grid
            </h3>
          </div>
          <p className="text-xs text-[#8B949E] mt-1 max-w-2xl">
            Cálculo das perdas térmicas, disponibilidade da rede (conforme tipo de ligação), horas de sol pleno (HSP) e seleção de módulos e inversores.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenEditor}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-md shadow-blue-600/20"
          >
            <Wrench className="w-4 h-4" />
            <span>{sizing ? 'Editar Dimensionamento' : 'Abrir Dimensionador Completo'}</span>
          </button>
        </div>
      </div>

      {/* Avisos Técnicos Obrigatórios */}
      {(!sizing || sizing.monthlySunHours.every((h) => h === 5)) && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>Atenção à Irradiação Solar (HSP):</strong> Os cálculos prévios utilizam a referência genérica de 5,00 h/dia. No dimensionamento definitivo, confirme a irradiação real da localidade ({lead.city || 'cidade do interessado'}) para evitar desvios de geração.
          </div>
        </div>
      )}

      {/* Status do Dimensionamento */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            Parâmetros do Sistema Fotovoltaico
          </h4>

          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              isComplete
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : isDraft
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-[#21262D] text-[#8B949E] border border-[#30363D]'
            }`}
          >
            {isComplete
              ? 'Dimensionamento Concluído'
              : isDraft
              ? 'Rascunho em Andamento'
              : 'Pré-Dimensionamento Estimativo'}
          </span>
        </div>

        {/* 4 Cards de Métricas Principais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] text-[#8B949E] block">Potência Instalada</span>
            <span className="text-xl sm:text-2xl font-bold text-amber-400 font-mono block">
              {sizing ? formatKWp(sizing.installedPowerKWp) : `${fallbackPowerKWp} kWp*`}
            </span>
            <span className="text-[10px] text-[#8B949E]">
              {sizing ? `${sizing.modulesCount} módulos` : `~${fallbackModules} módulos`}
            </span>
          </div>

          <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] text-[#8B949E] block">Geração Média Mensal</span>
            <span className="text-xl sm:text-2xl font-bold text-blue-400 font-mono block">
              {sizing ? formatKWh(sizing.estimatedMonthlyGenerationKWh) : `${Math.round(monthlyConsumption * 0.95)} kWh*`}
            </span>
            <span className="text-[10px] text-[#8B949E]">mês estimado</span>
          </div>

          <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] text-[#8B949E] block">Geração Anual</span>
            <span className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono block">
              {sizing ? formatKWh(sizing.estimatedAnnualGenerationKWh) : `${Math.round(monthlyConsumption * 12 * 0.95)} kWh*`}
            </span>
            <span className="text-[10px] text-[#8B949E]">energia limpa/ano</span>
          </div>

          <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] text-[#8B949E] block">Área Mínima Requerida</span>
            <span className="text-xl sm:text-2xl font-bold text-white font-mono block">
              {sizing ? `${Math.round(sizing.estimatedAreaM2)} m²` : `${Math.round(fallbackModules * 2.2)} m²*`}
            </span>
            <span className="text-[10px] text-[#8B949E]">em telhado favorável</span>
          </div>
        </div>

        {/* Detalhes Técnicos Avançados */}
        {sizing && (
          <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 space-y-3">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">
              Equipamentos Selecionados & Relação DC/AC
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#161B22] rounded-lg border border-[#30363D]">
                <span className="text-[#8B949E] block">Módulos FV</span>
                <span className="font-bold text-white text-sm block mt-0.5">
                  {sizing.modulesCount}x {sizing.modulePowerW}W
                </span>
                <span className="text-[10px] text-[#8B949E]">
                  Área unitária: {sizing.moduleAreaM2?.toFixed(2)} m²
                </span>
              </div>

              <div className="p-3 bg-[#161B22] rounded-lg border border-[#30363D]">
                <span className="text-[#8B949E] block">Inversor(es)</span>
                <span className="font-bold text-white text-sm block mt-0.5">
                  {sizing.inverterCount}x {sizing.inverterPowerKW} kW
                </span>
                <span className="text-[10px] text-[#8B949E]">
                  Total inversor: {(sizing.inverterCount * sizing.inverterPowerKW).toFixed(1)} kW
                </span>
              </div>

              <div className="p-3 bg-[#161B22] rounded-lg border border-[#30363D]">
                <span className="text-[#8B949E] block">FDR (Relação CC/CA)</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-bold font-mono text-sm text-white">
                    {(sizing.dcAcRatio * 100).toFixed(0)}%
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      sizing.dcAcStatus === 'ok'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {sizing.dcAcStatus === 'ok' ? 'FDR Ideal' : 'Atenção'}
                  </span>
                </div>
                <span className="text-[10px] text-[#8B949E]">
                  Performance Ratio: {sizing.performanceRatio?.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Geração Mês a Mês */}
            {sizing.monthlyGenerationKWh && sizing.monthlyGenerationKWh.length === 12 && (
              <div className="pt-2">
                <span className="text-[11px] text-[#8B949E] block mb-2 font-medium">
                  Curva de Geração Mensal Estimada (kWh)
                </span>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 text-center">
                  {sizing.monthlyGenerationKWh.map((gen, idx) => (
                    <div
                      key={idx}
                      className="bg-[#161B22] border border-[#30363D] p-1.5 rounded-lg flex flex-col justify-between"
                    >
                      <span className="text-[9px] text-[#8B949E] font-medium">{MONTH_NAMES[idx]}</span>
                      <span className="text-xs font-mono font-bold text-blue-400 mt-1">
                        {Math.round(gen)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <span className="text-xs text-[#8B949E]">
          Com o dimensionamento concluído, avance para a composição comercial dos custos e elaboração da proposta.
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={onNextStep}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-md shadow-blue-600/30"
          >
            Avançar para Proposta Comercial
          </button>
        </div>
      </div>
    </div>
  );
};
