import React from 'react';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Gauge,
  ListChecks,
  Plus,
  Ruler,
  Save,
  SlidersHorizontal,
  Sun,
  Trash2,
  Zap,
} from 'lucide-react';
import {
  LoadSurveyItem,
  Opportunity,
  OpportunitySizing,
  SizingInputMethod,
  ThemeConfig,
} from '../types';
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

const getLoadMonthlyConsumption = (item: LoadSurveyItem) =>
  (Math.max(0, Number(item.quantity || 0)) *
    Math.max(0, Number(item.powerW || 0)) *
    Math.max(0, Number(item.hoursPerDay || 0)) *
    Math.max(0, Number(item.daysPerMonth || 0))) /
  1000;

const createLoadItem = (): LoadSurveyItem => ({
  id: `carga-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  description: '',
  quantity: 1,
  powerW: 0,
  hoursPerDay: 0,
  daysPerMonth: 30,
});

const calculateSizing = (
  opportunity: Opportunity,
  base: Partial<OpportunitySizing> = {}
): OpportunitySizing => {
  const surveyAverage = Number(opportunity.energySurvey?.averageConsumptionKWh || 0);
  const inputMethod: SizingInputMethod = base.inputMethod ?? 'consumo_medio';
  const directAverageConsumptionKWh = Math.max(
    0,
    Number(base.directAverageConsumptionKWh ?? surveyAverage)
  );
  const loadSurveyItems = Array.isArray(base.loadSurveyItems) ? base.loadSurveyItems : [];
  const loadSurveyMonthlyConsumptionKWh = loadSurveyItems.reduce(
    (sum, item) => sum + getLoadMonthlyConsumption(item),
    0
  );
  const sourceConsumptionKWh =
    inputMethod === 'levantamento_carga'
      ? loadSurveyMonthlyConsumptionKWh
      : directAverageConsumptionKWh;

  const sunHoursPerDay = Math.max(0, Number(base.sunHoursPerDay ?? 4.8));
  const performanceRatio = Math.min(1, Math.max(0, Number(base.performanceRatio ?? 0.8)));
  const targetCoveragePercent = Math.max(0, Number(base.targetCoveragePercent ?? 100));
  const futureConsumptionKWh = Math.max(0, Number(base.futureConsumptionKWh ?? 0));
  const modulePowerW = Math.max(0, Number(base.modulePowerW ?? 585));
  const moduleAreaM2 = Math.max(0, Number(base.moduleAreaM2 ?? 2.58));

  const projectedConsumption = sourceConsumptionKWh + futureConsumptionKWh;
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
    inputMethod,
    directAverageConsumptionKWh,
    loadSurveyItems,
    loadSurveyMonthlyConsumptionKWh,
    sourceConsumptionKWh,
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

  const ready = Boolean(
    sizing.sourceConsumptionKWh > 0 &&
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

  const selectMethod = (method: SizingInputMethod) => {
    if (method === 'levantamento_carga' && sizing.loadSurveyItems.length === 0) {
      persist({ inputMethod: method, loadSurveyItems: [createLoadItem()] });
      return;
    }
    persist({ inputMethod: method });
  };

  const addLoadItem = () => {
    persist({ loadSurveyItems: [...sizing.loadSurveyItems, createLoadItem()] });
  };

  const updateLoadItem = (id: string, changes: Partial<LoadSurveyItem>) => {
    persist({
      loadSurveyItems: sizing.loadSurveyItems.map((item) =>
        item.id === id ? { ...item, ...changes } : item
      ),
    });
  };

  const removeLoadItem = (id: string) => {
    persist({ loadSurveyItems: sizing.loadSurveyItems.filter((item) => item.id !== id) });
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
      onShowToast('Informe o consumo e revise os parâmetros do dimensionamento antes de avançar.');
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
              Escolha como informar o consumo: digite a média mensal diretamente ou calcule pelo levantamento de carga.
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
          <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
            <div className="flex items-start gap-3">
              <ListChecks className="mt-0.5 h-4 w-4 shrink-0" style={{ color: theme.secondary }} />
              <div>
                <h4 className="text-sm font-extrabold">Como deseja informar o consumo?</h4>
                <p className="mt-1 text-xs" style={{ color: mutedText }}>
                  O método selecionado será a base do cálculo fotovoltaico.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => selectMethod('consumo_medio')}
                className="rounded-xl border p-4 text-left transition-all"
                style={{
                  borderColor: sizing.inputMethod === 'consumo_medio' ? theme.secondary : theme.border,
                  backgroundColor: sizing.inputMethod === 'consumo_medio'
                    ? `color-mix(in srgb, ${theme.secondary} 10%, ${panelAltBg})`
                    : panelAltBg,
                }}
              >
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" style={{ color: theme.secondary }} />
                  <span className="text-sm font-extrabold">Consumo médio mensal</span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed" style={{ color: mutedText }}>
                  Digite diretamente o consumo médio em kWh/mês. Se houver levantamento anterior, ele pode servir como valor inicial.
                </p>
              </button>

              <button
                type="button"
                onClick={() => selectMethod('levantamento_carga')}
                className="rounded-xl border p-4 text-left transition-all"
                style={{
                  borderColor: sizing.inputMethod === 'levantamento_carga' ? theme.secondary : theme.border,
                  backgroundColor: sizing.inputMethod === 'levantamento_carga'
                    ? `color-mix(in srgb, ${theme.secondary} 10%, ${panelAltBg})`
                    : panelAltBg,
                }}
              >
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4" style={{ color: theme.secondary }} />
                  <span className="text-sm font-extrabold">Levantamento de carga</span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed" style={{ color: mutedText }}>
                  Informe equipamentos, quantidades, potências e tempo de uso para calcular o consumo mensal estimado.
                </p>
              </button>
            </div>

            {sizing.inputMethod === 'consumo_medio' ? (
              <div className="mt-4 rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelAltBg }}>
                <label className="block max-w-md text-sm font-semibold">
                  <span className="mb-2 block">Consumo médio mensal</span>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={sizing.directAverageConsumptionKWh || ''}
                      onChange={(event) => persist({ directAverageConsumptionKWh: Number(event.target.value) || 0 })}
                      placeholder="Ex.: 850"
                      className="crm-input pr-20"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold" style={{ color: mutedText }}>kWh/mês</span>
                  </div>
                </label>
                {Number(survey?.averageConsumptionKWh || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => persist({ directAverageConsumptionKWh: Number(survey?.averageConsumptionKWh || 0) })}
                    className="btn-outline mt-3 rounded-lg border px-3 py-2 text-[11px] font-bold"
                    style={{ borderColor: theme.border }}
                  >
                    Usar média do levantamento: {formatNumber(Number(survey?.averageConsumptionKWh || 0))} kWh/mês
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelAltBg }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h5 className="text-sm font-extrabold">Cargas do local</h5>
                    <p className="mt-1 text-[11px]" style={{ color: mutedText }}>
                      Consumo mensal = quantidade × potência × horas/dia × dias/mês ÷ 1000.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addLoadItem}
                    className="btn-outline inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-bold"
                    style={{ borderColor: theme.border }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar carga
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <div className="min-w-[860px] space-y-2">
                    <div className="grid grid-cols-[minmax(180px,1.5fr)_80px_105px_105px_105px_110px_38px] gap-2 px-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: mutedText }}>
                      <span>Equipamento</span>
                      <span>Qtd.</span>
                      <span>Potência W</span>
                      <span>Horas/dia</span>
                      <span>Dias/mês</span>
                      <span>kWh/mês</span>
                      <span />
                    </div>

                    {sizing.loadSurveyItems.map((item) => {
                      const monthly = getLoadMonthlyConsumption(item);
                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-[minmax(180px,1.5fr)_80px_105px_105px_105px_110px_38px] items-center gap-2 rounded-lg border p-2"
                          style={{ borderColor: theme.border, backgroundColor: panelBg }}
                        >
                          <input
                            value={item.description}
                            onChange={(event) => updateLoadItem(item.id, { description: event.target.value })}
                            placeholder="Ex.: Ar-condicionado"
                            className="crm-input"
                          />
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.quantity || ''}
                            onChange={(event) => updateLoadItem(item.id, { quantity: Number(event.target.value) || 0 })}
                            className="crm-input"
                          />
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.powerW || ''}
                            onChange={(event) => updateLoadItem(item.id, { powerW: Number(event.target.value) || 0 })}
                            className="crm-input"
                          />
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={item.hoursPerDay || ''}
                            onChange={(event) => updateLoadItem(item.id, { hoursPerDay: Number(event.target.value) || 0 })}
                            className="crm-input"
                          />
                          <input
                            type="number"
                            min="0"
                            max="31"
                            step="1"
                            value={item.daysPerMonth || ''}
                            onChange={(event) => updateLoadItem(item.id, { daysPerMonth: Number(event.target.value) || 0 })}
                            className="crm-input"
                          />
                          <div className="rounded-lg border px-3 py-2 text-sm font-extrabold" style={{ borderColor: theme.border }}>
                            {formatNumber(monthly, 1)}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLoadItem(item.id)}
                            className="btn-outline flex h-9 w-9 items-center justify-center rounded-lg border"
                            style={{ borderColor: theme.border }}
                            aria-label="Remover carga"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {sizing.loadSurveyItems.length === 0 && (
                  <div className="mt-4 rounded-lg border border-dashed p-5 text-center text-xs" style={{ borderColor: theme.border, color: mutedText }}>
                    Adicione pelo menos uma carga para calcular o consumo.
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between rounded-lg border p-3" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
                  <span className="text-xs font-bold">Consumo mensal calculado</span>
                  <span className="text-lg font-extrabold" style={{ color: theme.secondary }}>
                    {formatNumber(sizing.loadSurveyMonthlyConsumptionKWh, 1)} kWh/mês
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
              <div className="text-[11px] font-semibold" style={{ color: mutedText }}>Consumo utilizado no cálculo</div>
              <div className="mt-1 text-lg font-extrabold">{formatNumber(sizing.sourceConsumptionKWh, 1)} kWh/mês</div>
              <div className="mt-1 text-[10px]" style={{ color: mutedText }}>
                {sizing.inputMethod === 'consumo_medio' ? 'Consumo médio informado' : 'Levantamento de carga'}
              </div>
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
              <div className="text-[11px] font-semibold" style={{ color: mutedText }}>Tarifa informada</div>
              <div className="mt-1 text-lg font-extrabold">R$ {formatNumber(Number(survey?.tariffPerKWh || 0), 2)}/kWh</div>
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
              <div className="text-[11px] font-semibold" style={{ color: mutedText }}>Tipo de ligação</div>
              <div className="mt-1 text-lg font-extrabold">{survey?.connectionType || 'Não informado'}</div>
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
              <div className="text-[11px] font-semibold" style={{ color: mutedText }}>Distribuidora</div>
              <div className="mt-1 truncate text-sm font-extrabold">{survey?.concessionaria || 'Não informada'}</div>
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
                <div className="text-[11px]" style={{ color: mutedText }}>Consumo base</div>
                <div className="mt-1 text-lg font-extrabold">{formatNumber(sizing.sourceConsumptionKWh, 1)} kWh/mês</div>
              </div>
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
              <p className="text-xs font-extrabold">{ready ? 'Dimensionamento válido' : 'Informe o consumo'}</p>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: mutedText }}>
              {ready
                ? 'O resultado está pronto para alimentar a seleção de equipamentos e a formação de custos.'
                : sizing.inputMethod === 'consumo_medio'
                  ? 'Digite um consumo médio mensal maior que zero.'
                  : 'Adicione cargas com potência e tempo de uso para obter um consumo mensal maior que zero.'}
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
