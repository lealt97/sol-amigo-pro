import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Loader2,
  Save,
  Sun,
  X,
  Zap,
} from 'lucide-react';
import {
  Lead,
  OpportunitySizing,
  SizingStatus,
  SolarSizingInputs,
  ThemeConfig,
} from '../types';
import { saveOpportunitySizing } from '../services/solarSizing';
import {
  calculateSolarSizing,
  createInitialSolarSizingInputs,
  MONTHS,
} from '../utils/solarSizing';
import { getContrastFg } from '../utils/themeEngine';

interface SolarSizingEditorProps {
  lead: Lead;
  existingSizing: OpportunitySizing | null;
  theme: ThemeConfig;
  onClose: () => void;
  onSaved: (sizing: OpportunitySizing) => void;
  onShowToast: (message: string) => void;
}

const averageValue = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;

const numberValue = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value: number, digits = 2) =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const SolarSizingEditor: React.FC<SolarSizingEditorProps> = ({
  lead,
  existingSizing,
  theme,
  onClose,
  onSaved,
  onShowToast,
}) => {
  const initialInputs: SolarSizingInputs = existingSizing
    ? {
        connectionType: existingSizing.connectionType,
        monthlyConsumptionKWh: [...existingSizing.monthlyConsumptionKWh],
        monthlySunHours: [...existingSizing.monthlySunHours],
        targetCoveragePercent: existingSizing.targetCoveragePercent,
        futureConsumptionKWh: existingSizing.futureConsumptionKWh,
        inclinationFactor: existingSizing.inclinationFactor,
        temperatureLossPercent: existingSizing.temperatureLossPercent,
        otherLossesPercent: existingSizing.otherLossesPercent,
        transformerLossPercent: existingSizing.transformerLossPercent,
        modulePowerW: existingSizing.modulePowerW,
        moduleAreaM2: existingSizing.moduleAreaM2,
        inverterPowerKW: existingSizing.inverterPowerKW,
        inverterCount: existingSizing.inverterCount,
        notes: existingSizing.notes,
      }
    : createInitialSolarSizingInputs(lead);

  const [inputs, setInputs] = useState<SolarSizingInputs>(initialInputs);
  const [uniformHsp, setUniformHsp] = useState(
    averageValue(existingSizing?.monthlySunHours ?? initialInputs.monthlySunHours)
  );
  const [savingStatus, setSavingStatus] = useState<SizingStatus | null>(null);
  const [formError, setFormError] = useState('');

  const backgroundIsDark = getContrastFg(theme.background) === '#FFFFFF';
  const modalBg = backgroundIsDark
    ? `color-mix(in srgb, ${theme.background} 88%, #FFFFFF)`
    : `color-mix(in srgb, ${theme.background} 96%, #000000)`;
  const panelBg = backgroundIsDark
    ? `color-mix(in srgb, ${theme.background} 82%, #FFFFFF)`
    : `color-mix(in srgb, ${theme.background} 91%, #000000)`;
  const mutedText = `color-mix(in srgb, ${theme.text} 62%, transparent)`;

  const calculation = useMemo(() => {
    try {
      return { results: calculateSolarSizing(inputs), error: '' };
    } catch (error) {
      return {
        results: null,
        error: error instanceof Error ? error.message : 'Revise os dados do dimensionamento.',
      };
    }
  }, [inputs]);

  const usesReferenceHsp = inputs.monthlySunHours.every((value) => value === 5);

  const updateInput = <Key extends keyof SolarSizingInputs>(
    key: Key,
    value: SolarSizingInputs[Key]
  ) => setInputs((current) => ({ ...current, [key]: value }));

  const updateMonth = (
    key: 'monthlyConsumptionKWh' | 'monthlySunHours',
    index: number,
    value: number
  ) => {
    setInputs((current) => {
      const values = [...current[key]];
      values[index] = value;
      return { ...current, [key]: values };
    });
  };

  const applyLeadAverage = () => {
    if (lead.averageConsumptionKWh == null) {
      onShowToast('Este lead não possui consumo médio informado.');
      return;
    }
    updateInput(
      'monthlyConsumptionKWh',
      Array.from({ length: 12 }, () => lead.averageConsumptionKWh ?? 0)
    );
  };

  const applyUniformHsp = () => {
    updateInput('monthlySunHours', Array.from({ length: 12 }, () => uniformHsp));
  };

  const handleSave = async (status: SizingStatus) => {
    if (!calculation.results || savingStatus) {
      setFormError(calculation.error || 'Revise os dados antes de salvar.');
      return;
    }

    setSavingStatus(status);
    setFormError('');
    try {
      const saved = await saveOpportunitySizing(
        lead,
        inputs,
        status,
        existingSizing?.status
      );
      onSaved(saved);
      onShowToast(
        status === 'concluido'
          ? 'Dimensionamento concluído e salvo.'
          : 'Rascunho do dimensionamento salvo.'
      );
      onClose();
    } catch (error) {
      console.error('save solar sizing error', error);
      setFormError(
        error instanceof Error ? error.message : 'Não foi possível salvar o dimensionamento.'
      );
    } finally {
      setSavingStatus(null);
    }
  };

  const fieldClass = 'crm-input mt-1 w-full';
  const fieldLabelClass = 'text-[10px] font-extrabold uppercase tracking-[0.08em]';
  const results = calculation.results;

  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto bg-black/70 p-2 backdrop-blur-sm sm:p-4"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <div
        className="mx-auto min-h-full max-w-6xl overflow-hidden rounded-2xl border shadow-2xl"
        style={{ backgroundColor: modalBg, borderColor: theme.border, color: theme.text }}
      >
        <header
          className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6"
          style={{ backgroundColor: modalBg, borderColor: theme.border }}
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: theme.secondary }}>
              <Calculator className="h-4 w-4" /> Dimensionamento fotovoltaico
            </p>
            <h2 className="mt-1 truncate text-lg font-extrabold">{lead.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
            style={{ borderColor: theme.border, color: theme.text }}
            aria-label="Fechar dimensionamento"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)] sm:p-6">
          <main className="space-y-4">
            <section className="rounded-xl border p-4" style={{ backgroundColor: panelBg, borderColor: theme.border }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-extrabold">Consumo e irradiação</h3>
                  <p className="mt-1 text-[11px]" style={{ color: mutedText }}>
                    Informe o histórico de 12 meses e as horas de sol pico (HSP) do local.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={applyLeadAverage}
                  className="h-9 rounded-lg border px-3 text-[10px] font-extrabold"
                  style={{ borderColor: theme.border, color: theme.text }}
                >
                  Usar média do lead
                </button>
              </div>

              {usesReferenceHsp && (
                <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 text-[11px] text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>5,0 HSP é apenas uma referência inicial. Substitua pela irradiação mensal da localização antes de concluir.</span>
                </div>
              )}

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[610px] border-separate border-spacing-y-1 text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide" style={{ color: mutedText }}>
                      <th className="px-2 py-1">Mês</th>
                      <th className="px-2 py-1">Consumo (kWh)</th>
                      <th className="px-2 py-1">HSP (h/dia)</th>
                      <th className="px-2 py-1">Geração estimada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONTHS.map((month, index) => (
                      <tr key={month}>
                        <td className="px-2 py-1 text-xs font-extrabold">{month}</td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={inputs.monthlyConsumptionKWh[index]}
                            onChange={(event) => updateMonth('monthlyConsumptionKWh', index, numberValue(event.target.value))}
                            className="crm-input h-9"
                            aria-label={`Consumo de ${month}`}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min="0.1"
                            max="12"
                            step="0.01"
                            value={inputs.monthlySunHours[index]}
                            onChange={(event) => updateMonth('monthlySunHours', index, numberValue(event.target.value))}
                            className="crm-input h-9"
                            aria-label={`HSP de ${month}`}
                          />
                        </td>
                        <td className="px-2 py-1 text-xs font-bold">
                          {results ? `${formatNumber(results.monthlyGenerationKWh[index], 0)} kWh` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-end" style={{ borderColor: theme.border }}>
                <label className={fieldLabelClass} style={{ color: mutedText }}>
                  Aplicar uma HSP em todos os meses
                  <input
                    type="number"
                    min="0.1"
                    max="12"
                    step="0.01"
                    value={uniformHsp}
                    onChange={(event) => setUniformHsp(numberValue(event.target.value))}
                    className={`${fieldClass} sm:w-40`}
                  />
                </label>
                <button
                  type="button"
                  onClick={applyUniformHsp}
                  className="h-[42px] rounded-lg border px-4 text-[10px] font-extrabold"
                  style={{ borderColor: theme.border, color: theme.text }}
                >
                  Aplicar HSP
                </button>
              </div>
            </section>

            <section className="rounded-xl border p-4" style={{ backgroundColor: panelBg, borderColor: theme.border }}>
              <h3 className="text-sm font-extrabold">Premissas do projeto</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className={fieldLabelClass} style={{ color: mutedText }}>
                  Tipo de ligação
                  <select
                    value={inputs.connectionType}
                    onChange={(event) => updateInput('connectionType', event.target.value as SolarSizingInputs['connectionType'])}
                    className={fieldClass}
                  >
                    <option>Monofásica</option><option>Bifásica</option><option>Trifásica</option>
                  </select>
                </label>
                <label className={fieldLabelClass} style={{ color: mutedText }}>
                  Cobertura desejada (%)
                  <input type="number" min="1" max="150" step="1" value={inputs.targetCoveragePercent} onChange={(event) => updateInput('targetCoveragePercent', numberValue(event.target.value))} className={fieldClass} />
                </label>
                <label className={fieldLabelClass} style={{ color: mutedText }}>
                  Consumo futuro (kWh/mês)
                  <input type="number" min="0" step="1" value={inputs.futureConsumptionKWh} onChange={(event) => updateInput('futureConsumptionKWh', numberValue(event.target.value))} className={fieldClass} />
                </label>
                <label className={fieldLabelClass} style={{ color: mutedText }}>
                  Fator de inclinação
                  <input type="number" min="0.5" max="1.5" step="0.01" value={inputs.inclinationFactor} onChange={(event) => updateInput('inclinationFactor', numberValue(event.target.value))} className={fieldClass} />
                </label>
                <label className={fieldLabelClass} style={{ color: mutedText }}>
                  Perda por temperatura (%)
                  <input type="number" min="0" max="50" step="0.01" value={inputs.temperatureLossPercent} onChange={(event) => updateInput('temperatureLossPercent', numberValue(event.target.value))} className={fieldClass} />
                </label>
                <label className={fieldLabelClass} style={{ color: mutedText }}>
                  Outras perdas (%)
                  <input type="number" min="0" max="50" step="0.01" value={inputs.otherLossesPercent} onChange={(event) => updateInput('otherLossesPercent', numberValue(event.target.value))} className={fieldClass} />
                </label>
                <label className={fieldLabelClass} style={{ color: mutedText }}>
                  Perda do transformador (%)
                  <input type="number" min="0" max="20" step="0.01" value={inputs.transformerLossPercent} onChange={(event) => updateInput('transformerLossPercent', numberValue(event.target.value))} className={fieldClass} />
                </label>
              </div>
            </section>

            <section className="rounded-xl border p-4" style={{ backgroundColor: panelBg, borderColor: theme.border }}>
              <h3 className="text-sm font-extrabold">Equipamentos</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className={fieldLabelClass} style={{ color: mutedText }}>
                  Módulo (W)
                  <input type="number" min="50" step="5" value={inputs.modulePowerW} onChange={(event) => updateInput('modulePowerW', numberValue(event.target.value))} className={fieldClass} />
                </label>
                <label className={fieldLabelClass} style={{ color: mutedText }}>
                  Área por módulo (m²)
                  <input type="number" min="0.1" step="0.01" value={inputs.moduleAreaM2} onChange={(event) => updateInput('moduleAreaM2', numberValue(event.target.value))} className={fieldClass} />
                </label>
                <label className={fieldLabelClass} style={{ color: mutedText }}>
                  Inversor (kW)
                  <input type="number" min="0.1" step="0.1" value={inputs.inverterPowerKW} onChange={(event) => updateInput('inverterPowerKW', numberValue(event.target.value))} className={fieldClass} />
                </label>
                <label className={fieldLabelClass} style={{ color: mutedText }}>
                  Quantidade de inversores
                  <input type="number" min="1" step="1" value={inputs.inverterCount} onChange={(event) => updateInput('inverterCount', numberValue(event.target.value))} className={fieldClass} />
                </label>
              </div>
              <label className={`${fieldLabelClass} mt-4 block`} style={{ color: mutedText }}>
                Observações técnicas
                <textarea
                  value={inputs.notes}
                  onChange={(event) => updateInput('notes', event.target.value)}
                  maxLength={4000}
                  rows={3}
                  className="crm-input mt-1 min-h-[82px] resize-y py-3"
                  placeholder="Sombreamento, orientação, restrições do telhado, premissas adotadas..."
                />
              </label>
            </section>
          </main>

          <aside className="space-y-4 lg:sticky lg:top-[82px] lg:self-start">
            <section className="rounded-xl border p-4" style={{ backgroundColor: panelBg, borderColor: theme.border }}>
              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: theme.secondary }}>
                <Sun className="h-4 w-4" /> Resultado em tempo real
              </p>

              {results ? (
                <>
                  <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}>
                    <p className="text-[10px] font-extrabold uppercase tracking-wide opacity-75">Potência instalada</p>
                    <p className="mt-1 text-3xl font-black">{formatNumber(results.installedPowerKWp)} kWp</p>
                    <p className="mt-1 text-xs font-bold">{results.modulesCount} módulos de {inputs.modulePowerW} W</p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      ['Potência necessária', `${formatNumber(results.requiredPowerKWp)} kWp`],
                      ['Geração mensal', `${formatNumber(results.estimatedMonthlyGenerationKWh, 0)} kWh`],
                      ['Geração anual', `${formatNumber(results.estimatedAnnualGenerationKWh, 0)} kWh`],
                      ['Cobertura estimada', `${formatNumber(results.estimatedCoveragePercent, 1)}%`],
                      ['Área estimada', `${formatNumber(results.estimatedAreaM2, 1)} m²`],
                      ['Consumo de projeto', `${formatNumber(results.designConsumptionKWh, 0)} kWh`],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
                        <p className="text-[9px] font-bold" style={{ color: mutedText }}>{label}</p>
                        <p className="mt-1 text-xs font-extrabold">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className={`mt-3 flex gap-2 rounded-lg border p-3 text-[11px] ${results.dcAcStatus === 'ok' ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/35 bg-amber-500/10 text-amber-300'}`}>
                    {results.dcAcStatus === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                    <span><strong>Relação DC/AC: {formatNumber(results.dcAcRatio, 2)}</strong><br />{results.dcAcStatus === 'ok' ? 'Dentro da faixa de referência de 0,75 a 1,30.' : 'Fora da faixa de referência. Revise a potência dos inversores.'}</span>
                  </div>

                  <dl className="mt-4 space-y-2 border-t pt-4 text-[11px]" style={{ borderColor: theme.border }}>
                    {[
                      ['Consumo médio', `${formatNumber(results.averageConsumptionKWh, 1)} kWh/mês`],
                      ['Custo de disponibilidade', `${formatNumber(results.availabilityCostKWh, 0)} kWh/mês`],
                      ['Consumo compensável', `${formatNumber(results.compensableConsumptionKWh, 1)} kWh/mês`],
                      ['HSP corrigida média', `${formatNumber(results.averageCorrectedSunHours, 2)} h/dia`],
                      ['Perdas totais', `${formatNumber(results.totalLossPercent, 2)}%`],
                      ['Performance ratio', `${formatNumber(results.performanceRatio * 100, 2)}%`],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-3">
                        <dt style={{ color: mutedText }}>{label}</dt><dd className="text-right font-extrabold">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <div className="mt-4 rounded-lg border border-red-500/35 bg-red-500/10 p-3 text-xs font-bold text-red-300">
                  {calculation.error}
                </div>
              )}
            </section>

            {(formError || calculation.error) && (
              <div className="rounded-lg border border-red-500/35 bg-red-500/10 p-3 text-xs font-bold text-red-300">
                {formError || calculation.error}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <button
                type="button"
                onClick={() => void handleSave('rascunho')}
                disabled={savingStatus !== null || !results}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-50"
                style={{ borderColor: theme.border, color: theme.text }}
              >
                {savingStatus === 'rascunho' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar rascunho
              </button>
              <button
                type="button"
                onClick={() => void handleSave('concluido')}
                disabled={savingStatus !== null || !results}
                className="flex h-11 items-center justify-center gap-2 rounded-lg text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}
              >
                {savingStatus === 'concluido' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {existingSizing?.status === 'concluido' ? 'Salvar alterações' : 'Concluir dimensionamento'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
