import React from 'react';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Gauge,
  Ruler,
  Save,
  SlidersHorizontal,
  Sun,
  Zap,
} from 'lucide-react';
import { Opportunity, OpportunitySizing, ThemeConfig } from '../types';
import { getContrastFg } from '../utils/themeEngine';

interface OpportunitySizingPanelProps {
  opportunity: Opportunity;
  theme: ThemeConfig;
  panelBg: string;
  panelAltBg: string;
  mutedText: string;
  onUpdateOpportunity: (id: string, changes: Partial<Opportunity>) => void;
  onUpdateStage: (id: string, stage: Opportunity['stage']) => void;
  onShowToast: (message: string) => void;
}

const formatNumber = (value: number, decimals = 0) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value || 0));

const calculateSizing = (
  opportunity: Opportunity,
  base: Partial<OpportunitySizing> = {}
): OpportunitySizing => {
  const surveyAverage = Number(opportunity.energySurvey?.averageConsumptionKWh || 0);
  const sunHoursPerDay = Math.max(0, Number(base.sunHoursPerDay ?? 4.8));
  const performanceRatio = Math.min(1, Math.max(0, Number(base.performanceRatio ?? 0.8)));
  const targetCoveragePercent = Math.max(0, Number(base.targetCoveragePercent ?? 100));
  const futureConsumptionKWh = Math.max(0, Number(base.futureConsumptionKWh ?? 0));
  const modulePowerW = Math.max(0, Number(base.modulePowerW ?? 585));
  const moduleAreaM2 = Math.max(0, Number(base.moduleAreaM2 ?? 2.58));

  const projectedConsumption = surveyAverage + futureConsumptionKWh;
  const designConsumptionKWh = projectedConsumption * (targetCoveragePercent / 100);
  const dailyDesignConsumption = designConsumptionKWh / 30;
  const denominator = sunHoursPerDay * performanceRatio;
  const requiredPowerKWp = denominator > 0 ? dailyDesignConsumption / denominator : 0;
  const modulesCount = modulePowerW > 0 ? Math.ceil((requiredPowerKWp * 1000) / modulePowerW) : 0;
  const installedPowerKWp = (modulesCount * modulePowerW) / 1000;
  const estimatedMonthlyGenerationKWh = installedPowerKWp * sunHoursPerDay * 30 * performanceRatio;
  const estimatedAnnualGenerationKWh = estimatedMonthlyGenerationKWh * 12;
  const estimatedCoveragePercent = projectedConsumption > 0
    ? (estimatedMonthlyGenerationKWh / projectedConsumption) * 100
    : 0;
  const estimatedAreaM2 = modulesCount * moduleAreaM2;

  return {
    sunHoursPerDay,
    performanceRatio,
    targetCoveragePercent,
    futureConsumptionKWh,
    modulePowerW,
    moduleAreaM2,
    designConsumptionKWh,
    requiredPowerKWp,
    modulesCount,
    installedPowerKWp,
    estimatedMonthlyGenerationKWh,
    estimatedAnnualGenerationKWh,
    estimatedCoveragePercent,
    estimatedAreaM2,
    status: base.status ?? 'rascunho',
    updatedAt: new Date().toISOString(),
  };
};

export const OpportunitySizingPanel: React.FC<OpportunitySizingPanelProps> = ({
  opportunity,
  theme,
  panelBg,
  panelAltBg,
  mutedText,
  onUpdateOpportunity,
  onUpdateStage,
  onShowToast,
}) => {
  const sizing = calculateSizing(opportunity, opportunity.sizing);
  const survey = opportunity.energySurvey;
  const surveyReady = survey?.status === 'concluido' && Number(survey.averageConsumptionKWh || 0) > 0;

  const ready = Boolean(
    surveyReady &&
      sizing.sunHoursPerDay > 0 &&
      sizing.performanceRatio > 0 &&
      sizing.targetCoveragePercent > 0 &&
      sizing.modulePowerW > 0 &&
      sizing.requiredPowerKWp > 0 &&
      sizing.modulesCount > 0 &&
      sizing.installedPowerKWp > 0
  );

  const persist = (changes: Partial<OpportunitySizing>) => {
    const next = calculateSizing(opportunity, {
      ...sizing,
      ...changes,
      status: 'rascunho',
    });

    onUpdateOpportunity(opportunity.id, {
      sizing: next,
      systemPowerKWp: next.installedPowerKWp,
    });
  };

  const saveDraft = () => {
    const next = calculateSizing(opportunity, {
      ...sizing,
      status: opportunity.sizing?.status === 'concluido' ? 'concluido' : 'rascunho',
    });
    onUpdateOpportunity(opportunity.id, {
      sizing: next,
      systemPowerKWp: next.installedPowerKWp,
    });
    onShowToast('Dimensionamento salvo na oportunidade.');
  };

  const completeAndAdvance = () => {
    if (!ready) {
      onShowToast('Revise os parâmetros do dimensionamento antes de avançar.');
      return;
    }

    const next = calculateSizing(opportunity, { ...sizing, status: 'concluido' });
    onUpdateOpportunity(opportunity.id, {
      sizing: next,
      systemPowerKWp: next.installedPowerKWp,
    });
    onUpdateStage(opportunity.id, 'kit_custos');
    onShowToast('Dimensionamento concluído. Próxima etapa: Kit & Custos.');
  };

  return (
    <section
      className="overflow-hidden rounded-xl border"
      style={{
        borderColor: opportunity.stage === 'dimensionamento' ? theme.secondary : theme.border,
        backgroundColor: panelAltBg,
      }}
    >
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between" style={{ borderColor: theme.border }}>
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in srgb, ${theme.secondary} 18%, transparent)`, color: theme.secondary }}
          >
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold">4. Dimensionamento fotovoltaico</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed" style={{ color: mutedText }}>
              O consumo do levantamento alimenta automaticamente o cálculo de potência, módulos, geração e área estimada.
            </p>
          </div>
        </div>

        <span
          className="w-fit rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider"
          style={{ borderColor: theme.border, color: sizing.status === 'concluido' ? theme.accent : theme.secondary }}
        >
          {sizing.status === 'concluido' ? 'Concluído' : 'Em cálculo'}
        </span>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
              <div className="text-[11px] font-semibold" style={{ color: mutedText }}>Consumo médio do levantamento</div>
              <div className="mt-1 text-lg font-extrabold">{formatNumber(Number(survey?.averageConsumptionKWh || 0))} kWh/mês</div>
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
              <div className="text-[11px] font-semibold" style={{ color: mutedText }}>Tarifa informada</div>
              <div className="mt-1 text-lg font-extrabold">R$ {formatNumber(Number(survey?.tariffPerKWh || 0), 2)}/kWh</div>
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
              <div className="text-[11px] font-semibold" style={{ color: mutedText }}>Tipo de ligação</div>
              <div className="mt-1 text-lg font-extrabold">{survey?.connectionType || '—'}</div>
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
              <div className="text-[11px] font-semibold" style={{ color: mutedText }}>Distribuidora</div>
              <div className="mt-1 truncate text-sm font-extrabold">{survey?.concessionaria || '—'}</div>
            </div>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
            <div className="flex items-start gap-3">
              <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0" style={{ color: theme.secondary }} />
              <div>
                <h4 className="text-sm font-extrabold">Parâmetros do cálculo</h4>
                <p className="mt-1 text-xs" style={{ color: mutedText }}>
                  Ajuste as premissas quando necessário. O resultado é recalculado automaticamente.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <label className="block text-sm font-semibold">
                <span className="mb-2 block">HSP — horas de sol pleno</span>
                <div className="relative">
                  <Sun className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: mutedText }} />
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={sizing.sunHoursPerDay || ''}
                    onChange={(event) => persist({ sunHoursPerDay: Number(event.target.value) || 0 })}
                    className="crm-input pl-9"
                  />
                </div>
              </label>

              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Performance do sistema (%)</span>
                <div className="relative">
                  <Gauge className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: mutedText }} />
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={Math.round(sizing.performanceRatio * 100) || ''}
                    onChange={(event) => persist({ performanceRatio: (Number(event.target.value) || 0) / 100 })}
                    className="crm-input pl-9"
                  />
                </div>
              </label>

              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Cobertura desejada (%)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={sizing.targetCoveragePercent || ''}
                  onChange={(event) => persist({ targetCoveragePercent: Number(event.target.value) || 0 })}
                  className="crm-input"
                />
              </label>

              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Aumento futuro de consumo</span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={sizing.futureConsumptionKWh || ''}
                    onChange={(event) => persist({ futureConsumptionKWh: Number(event.target.value) || 0 })}
                    placeholder="0"
                    className="crm-input pr-12"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold" style={{ color: mutedText }}>kWh</span>
                </div>
              </label>

              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Potência do módulo</span>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="5"
                    value={sizing.modulePowerW || ''}
                    onChange={(event) => persist({ modulePowerW: Number(event.target.value) || 0 })}
                    className="crm-input pr-10"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold" style={{ color: mutedText }}>Wp</span>
                </div>
              </label>

              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Área aproximada por módulo</span>
                <div className="relative">
                  <Ruler className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: mutedText }} />
                  <input
                    type="number"
                    min="0.1"
                    step="0.01"
                    value={sizing.moduleAreaM2 || ''}
                    onChange={(event) => persist({ moduleAreaM2: Number(event.target.value) || 0 })}
                    className="crm-input pl-9 pr-10"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold" style={{ color: mutedText }}>m²</span>
                </div>
              </label>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: mutedText }}><Calculator className="h-3.5 w-3.5" /> Potência mínima calculada</div>
              <div className="mt-2 text-2xl font-extrabold">{formatNumber(sizing.requiredPowerKWp, 2)} kWp</div>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: mutedText }}><Zap className="h-3.5 w-3.5" /> Potência instalada</div>
              <div className="mt-2 text-2xl font-extrabold" style={{ color: theme.secondary }}>{formatNumber(sizing.installedPowerKWp, 2)} kWp</div>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
              <div className="text-[11px]" style={{ color: mutedText }}>Quantidade de módulos</div>
              <div className="mt-2 text-2xl font-extrabold">{sizing.modulesCount}</div>
              <div className="mt-1 text-[10px]" style={{ color: mutedText }}>{formatNumber(sizing.modulePowerW)} Wp cada</div>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: mutedText }}><Ruler className="h-3.5 w-3.5" /> Área estimada</div>
              <div className="mt-2 text-2xl font-extrabold">{formatNumber(sizing.estimatedAreaM2, 1)} m²</div>
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
            <h4 className="text-sm font-extrabold">Resultado energético</h4>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
                <div className="text-[11px]" style={{ color: mutedText }}>Consumo considerado</div>
                <div className="mt-1 text-lg font-extrabold">{formatNumber(sizing.designConsumptionKWh)} kWh/mês</div>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
                <div className="text-[11px]" style={{ color: mutedText }}>Geração mensal estimada</div>
                <div className="mt-1 text-lg font-extrabold">{formatNumber(sizing.estimatedMonthlyGenerationKWh)} kWh/mês</div>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
                <div className="text-[11px]" style={{ color: mutedText }}>Geração anual estimada</div>
                <div className="mt-1 text-lg font-extrabold">{formatNumber(sizing.estimatedAnnualGenerationKWh)} kWh/ano</div>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
                <div className="text-[11px]" style={{ color: mutedText }}>Cobertura estimada real</div>
                <div className="mt-1 text-lg font-extrabold">{formatNumber(sizing.estimatedCoveragePercent, 1)}%</div>
              </div>
            </div>
          </div>

          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: ready ? `color-mix(in srgb, ${theme.accent} 60%, ${theme.border})` : theme.border,
              backgroundColor: ready ? `color-mix(in srgb, ${theme.accent} 8%, ${panelBg})` : panelBg,
            }}
          >
            <div className="flex items-center gap-2">
              {ready ? <CheckCircle2 className="h-4 w-4" style={{ color: theme.accent }} /> : <Zap className="h-4 w-4" style={{ color: theme.secondary }} />}
              <p className="text-xs font-extrabold">{ready ? 'Dimensionamento válido' : 'Revisão necessária'}</p>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: mutedText }}>
              {ready
                ? 'O resultado está pronto para alimentar a seleção de equipamentos e a formação de custos.'
                : 'O levantamento precisa estar concluído e os parâmetros principais devem ser maiores que zero.'}
            </p>
          </div>
        </aside>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:items-center sm:justify-end" style={{ borderColor: theme.border }}>
        <button
          type="button"
          onClick={saveDraft}
          className="btn-outline inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-bold"
          style={{ borderColor: theme.border }}
        >
          <Save className="h-4 w-4" />
          Salvar dimensionamento
        </button>

        {opportunity.stage === 'dimensionamento' && (
          <button
            type="button"
            onClick={completeAndAdvance}
            disabled={!ready}
            className="btn-filled inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold"
            style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary), opacity: ready ? 1 : 0.45 }}
          >
            Concluir e montar kit
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
};
