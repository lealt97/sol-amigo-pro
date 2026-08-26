import React from 'react';
import {
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  ClipboardList,
  Gauge,
  MapPin,
  Save,
  Zap,
} from 'lucide-react';
import { EnergySurvey, Opportunity, ThemeConfig } from '../types';
import { getContrastFg } from '../utils/themeEngine';

interface OpportunityEnergySurveyPanelProps {
  opportunity: Opportunity;
  theme: ThemeConfig;
  panelBg: string;
  panelAltBg: string;
  mutedText: string;
  onUpdateOpportunity: (id: string, changes: Partial<Opportunity>) => void;
  onUpdateStage: (id: string, stage: Opportunity['stage']) => void;
  onShowToast: (message: string) => void;
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const formatNumber = (value: number, decimals = 0) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value || 0));

const createBaseSurvey = (opportunity: Opportunity): EnergySurvey => ({
  id: `survey-${opportunity.id}`,
  opportunityId: opportunity.id,
  clientName: opportunity.clientName,
  concessionaria: '',
  consumerUnit: '',
  connectionType: 'Monofásica',
  consumerClass: opportunity.qualification?.customerProfile ?? 'Residencial',
  tariffMode: 'Convencional',
  installationAddress: '',
  monthlyConsumptionKWh: Array(12).fill(0),
  averageConsumptionKWh: 0,
  currentMonthlyBill: Number(opportunity.qualification?.averageMonthlyBill || 0),
  tariffPerKWh: 0,
  notes: '',
  status: 'rascunho',
  updatedAt: new Date().toISOString(),
});

export const OpportunityEnergySurveyPanel: React.FC<OpportunityEnergySurveyPanelProps> = ({
  opportunity,
  theme,
  panelBg,
  panelAltBg,
  mutedText,
  onUpdateOpportunity,
  onUpdateStage,
  onShowToast,
}) => {
  const survey = opportunity.energySurvey ?? createBaseSurvey(opportunity);
  const consumptions = Array.from({ length: 12 }, (_, index) => Number(survey.monthlyConsumptionKWh[index] || 0));
  const validMonths = consumptions.filter((value) => value > 0).length;
  const totalConsumption = consumptions.reduce((sum, value) => sum + value, 0);
  const averageConsumption = validMonths > 0 ? totalConsumption / validMonths : 0;
  const completeHistory = validMonths === 12;

  const ready = Boolean(
    survey.concessionaria.trim() &&
      survey.consumerUnit.trim() &&
      survey.connectionType &&
      survey.consumerClass &&
      survey.tariffMode &&
      survey.installationAddress.trim() &&
      completeHistory &&
      Number(survey.currentMonthlyBill || 0) > 0 &&
      Number(survey.tariffPerKWh || 0) > 0
  );

  const persist = (changes: Partial<EnergySurvey>) => {
    const current = opportunity.energySurvey ?? createBaseSurvey(opportunity);
    const nextConsumption = changes.monthlyConsumptionKWh ?? current.monthlyConsumptionKWh;
    const positive = nextConsumption.map(Number).filter((value) => value > 0);
    const average = positive.length
      ? positive.reduce((sum, value) => sum + value, 0) / positive.length
      : 0;

    onUpdateOpportunity(opportunity.id, {
      energySurvey: {
        ...current,
        ...changes,
        averageConsumptionKWh: average,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const updateMonth = (index: number, value: number) => {
    const next = [...consumptions];
    next[index] = Math.max(0, value || 0);
    persist({ monthlyConsumptionKWh: next, status: 'rascunho' });
  };

  const saveDraft = () => {
    persist({ status: opportunity.energySurvey?.status === 'concluido' ? 'concluido' : 'rascunho' });
    onShowToast('Levantamento energético salvo na oportunidade.');
  };

  const completeAndAdvance = () => {
    if (!ready) {
      onShowToast('Complete os dados obrigatórios do levantamento antes de avançar.');
      return;
    }

    persist({ status: 'concluido' });
    onUpdateStage(opportunity.id, 'dimensionamento');
    onShowToast('Levantamento concluído. Próxima etapa: dimensionamento fotovoltaico.');
  };

  const statusLabel = survey.status === 'concluido' ? 'Concluído' : 'Em preenchimento';

  return (
    <section
      className="overflow-hidden rounded-xl border"
      style={{
        borderColor: opportunity.stage === 'levantamento' ? theme.secondary : theme.border,
        backgroundColor: panelAltBg,
      }}
    >
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between" style={{ borderColor: theme.border }}>
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in srgb, ${theme.secondary} 18%, transparent)`, color: theme.secondary }}
          >
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold">3. Levantamento energético</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed" style={{ color: mutedText }}>
              Registre os dados da unidade consumidora e o histórico de 12 meses que alimentarão o dimensionamento.
            </p>
          </div>
        </div>

        <span
          className="w-fit rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider"
          style={{ borderColor: theme.border, color: survey.status === 'concluido' ? theme.accent : theme.secondary }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block text-sm font-semibold">
              <span className="mb-2 block">Distribuidora / concessionária</span>
              <input
                value={survey.concessionaria}
                onChange={(event) => persist({ concessionaria: event.target.value, status: 'rascunho' })}
                placeholder="Ex.: CPFL Paulista"
                className="crm-input"
              />
            </label>

            <label className="block text-sm font-semibold">
              <span className="mb-2 block">Unidade consumidora</span>
              <input
                value={survey.consumerUnit}
                onChange={(event) => persist({ consumerUnit: event.target.value, status: 'rascunho' })}
                placeholder="Número da UC"
                className="crm-input"
              />
            </label>

            <label className="block text-sm font-semibold">
              <span className="mb-2 block">Tipo de ligação</span>
              <select
                value={survey.connectionType}
                onChange={(event) => persist({ connectionType: event.target.value as EnergySurvey['connectionType'], status: 'rascunho' })}
                className="crm-input"
              >
                <option value="Monofásica">Monofásica</option>
                <option value="Bifásica">Bifásica</option>
                <option value="Trifásica">Trifásica</option>
              </select>
            </label>

            <label className="block text-sm font-semibold">
              <span className="mb-2 block">Classe de consumo</span>
              <select
                value={survey.consumerClass}
                onChange={(event) => persist({ consumerClass: event.target.value as EnergySurvey['consumerClass'], status: 'rascunho' })}
                className="crm-input"
              >
                <option value="Residencial">Residencial</option>
                <option value="Comercial">Comercial</option>
                <option value="Rural">Rural</option>
                <option value="Industrial">Industrial</option>
              </select>
            </label>

            <label className="block text-sm font-semibold">
              <span className="mb-2 block">Modalidade tarifária</span>
              <select
                value={survey.tariffMode}
                onChange={(event) => persist({ tariffMode: event.target.value as EnergySurvey['tariffMode'], status: 'rascunho' })}
                className="crm-input"
              >
                <option value="Convencional">Convencional</option>
                <option value="Tarifa Branca">Tarifa Branca</option>
                <option value="Grupo A">Grupo A</option>
              </select>
            </label>

            <label className="block text-sm font-semibold">
              <span className="mb-2 block">Conta atual / média</span>
              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: mutedText }} />
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={survey.currentMonthlyBill || ''}
                  onChange={(event) => persist({ currentMonthlyBill: Number(event.target.value) || 0, status: 'rascunho' })}
                  placeholder="R$"
                  className="crm-input pl-9"
                />
              </div>
            </label>

            <label className="block text-sm font-semibold xl:col-span-2">
              <span className="mb-2 block">Endereço da instalação</span>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: mutedText }} />
                <input
                  value={survey.installationAddress}
                  onChange={(event) => persist({ installationAddress: event.target.value, status: 'rascunho' })}
                  placeholder="Rua, número, bairro, cidade/UF"
                  className="crm-input pl-9"
                />
              </div>
            </label>

            <label className="block text-sm font-semibold">
              <span className="mb-2 block">Tarifa aproximada (R$/kWh)</span>
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: mutedText }} />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={survey.tariffPerKWh || ''}
                  onChange={(event) => persist({ tariffPerKWh: Number(event.target.value) || 0, status: 'rascunho' })}
                  placeholder="Ex.: 0,92"
                  className="crm-input pl-9"
                />
              </div>
            </label>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h4 className="text-sm font-extrabold">Histórico de consumo — 12 meses</h4>
                <p className="mt-1 text-xs" style={{ color: mutedText }}>
                  Informe o consumo em kWh de cada mês da fatura ou histórico da distribuidora.
                </p>
              </div>
              <span className="text-[11px] font-bold" style={{ color: completeHistory ? theme.accent : mutedText }}>
                {validMonths}/12 meses preenchidos
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {MONTHS.map((month, index) => (
                <label key={month} className="block">
                  <span className="mb-1.5 block text-[11px] font-bold" style={{ color: mutedText }}>{month}</span>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={consumptions[index] || ''}
                      onChange={(event) => updateMonth(index, Number(event.target.value))}
                      placeholder="kWh"
                      className="crm-input pr-10"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold" style={{ color: mutedText }}>kWh</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <label className="block text-sm font-semibold">
            <span className="mb-2 block">Observações do levantamento</span>
            <textarea
              value={survey.notes}
              onChange={(event) => persist({ notes: event.target.value, status: 'rascunho' })}
              placeholder="Registre particularidades da unidade consumidora, padrão de entrada, futura expansão de carga ou outras informações relevantes."
              className="min-h-[96px] w-full resize-y rounded-lg border bg-transparent px-3 py-2.5 text-sm outline-none focus:ring-2"
              style={{ borderColor: theme.border, color: theme.text }}
            />
          </label>
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
            <h4 className="text-sm font-extrabold">Resumo energético</h4>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
                <div className="flex items-center gap-2 text-[11px]" style={{ color: mutedText }}>
                  <Zap className="h-3.5 w-3.5" /> Consumo médio
                </div>
                <p className="mt-1 text-lg font-extrabold">{formatNumber(averageConsumption)} kWh/mês</p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
                <div className="flex items-center gap-2 text-[11px]" style={{ color: mutedText }}>
                  <Building2 className="h-3.5 w-3.5" /> Consumo anual
                </div>
                <p className="mt-1 text-lg font-extrabold">{formatNumber(totalConsumption)} kWh</p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
                <div className="text-[11px]" style={{ color: mutedText }}>Tarifa informada</div>
                <p className="mt-1 text-base font-extrabold">R$ {formatNumber(survey.tariffPerKWh, 2)}/kWh</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
            <h4 className="text-sm font-extrabold">Dados necessários</h4>
            <div className="mt-3 space-y-2">
              {[
                ['Distribuidora', Boolean(survey.concessionaria.trim())],
                ['Unidade consumidora', Boolean(survey.consumerUnit.trim())],
                ['Endereço da instalação', Boolean(survey.installationAddress.trim())],
                ['Histórico completo', completeHistory],
                ['Valor da conta', Number(survey.currentMonthlyBill || 0) > 0],
                ['Tarifa de energia', Number(survey.tariffPerKWh || 0) > 0],
              ].map(([label, done]) => (
                <div key={String(label)} className="flex items-center gap-2 text-[11px] font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: done ? theme.accent : mutedText }} />
                  <span style={{ color: done ? theme.text : mutedText }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: ready ? `color-mix(in srgb, ${theme.accent} 60%, ${theme.border})` : theme.border,
              backgroundColor: ready ? `color-mix(in srgb, ${theme.accent} 8%, ${panelBg})` : panelBg,
            }}
          >
            <p className="text-xs font-extrabold">{ready ? 'Pronto para dimensionar' : 'Levantamento incompleto'}</p>
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: mutedText }}>
              {ready
                ? 'Os dados necessários estão completos e podem alimentar o dimensionamento fotovoltaico.'
                : 'Complete os dados pendentes para liberar o dimensionamento.'}
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
          Salvar levantamento
        </button>

        {opportunity.stage === 'levantamento' && (
          <button
            type="button"
            onClick={completeAndAdvance}
            disabled={!ready}
            className="btn-filled inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold"
            style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}
          >
            Concluir e dimensionar
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
};
