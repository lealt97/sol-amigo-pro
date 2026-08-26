import React from 'react';
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Home,
  Landmark,
  MessageSquareText,
  Save,
  UserCheck,
  UserRound,
} from 'lucide-react';
import { Opportunity, OpportunityQualification, ThemeConfig } from '../types';
import { getContrastFg } from '../utils/themeEngine';

interface OpportunityQualificationPanelProps {
  opportunity: Opportunity;
  theme: ThemeConfig;
  panelBg: string;
  panelAltBg: string;
  mutedText: string;
  onUpdateOpportunity: (id: string, changes: Partial<Opportunity>) => void;
  onUpdateStage: (id: string, stage: Opportunity['stage']) => void;
  onShowToast: (message: string) => void;
}

const formatMoney = (value?: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const OpportunityQualificationPanel: React.FC<OpportunityQualificationPanelProps> = ({
  opportunity,
  theme,
  panelBg,
  panelAltBg,
  mutedText,
  onUpdateOpportunity,
  onUpdateStage,
  onShowToast,
}) => {
  const qualification = opportunity.qualification;
  const ready = Boolean(
    qualification?.customerProfile &&
      Number(qualification?.averageMonthlyBill || 0) > 0 &&
      qualification?.propertyOwnership &&
      qualification?.decisionMaker &&
      qualification?.interestLevel &&
      qualification?.purchaseTimeframe &&
      qualification?.paymentPreference
  );

  const updateQualification = (changes: Partial<OpportunityQualification>) => {
    const current: OpportunityQualification = opportunity.qualification ?? {
      status: 'pendente',
      updatedAt: new Date().toISOString(),
    };

    onUpdateOpportunity(opportunity.id, {
      qualification: {
        ...current,
        ...changes,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const save = () => {
    updateQualification({ status: opportunity.qualification?.status ?? 'pendente' });
    onShowToast('Qualificação salva na oportunidade.');
  };

  const qualifyAndAdvance = () => {
    if (!ready) {
      onShowToast('Preencha os critérios principais da qualificação antes de avançar.');
      return;
    }
    updateQualification({ status: 'qualificado' });
    onUpdateStage(opportunity.id, 'levantamento');
    onShowToast('Oportunidade qualificada. Próxima etapa: levantamento energético.');
  };

  const disqualify = () => {
    updateQualification({ status: 'nao_qualificado' });
    onUpdateStage(opportunity.id, 'perdido');
    onShowToast('Oportunidade não qualificada e movida para Perdida.');
  };

  const statusLabel =
    qualification?.status === 'qualificado'
      ? 'Qualificado'
      : qualification?.status === 'nao_qualificado'
        ? 'Não qualificado'
        : 'Pendente';

  return (
    <section
      className="overflow-hidden rounded-xl border"
      style={{
        borderColor: opportunity.stage === 'qualificacao' ? theme.secondary : theme.border,
        backgroundColor: panelAltBg,
      }}
    >
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between" style={{ borderColor: theme.border }}>
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in srgb, ${theme.secondary} 18%, transparent)`, color: theme.secondary }}
          >
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold">2. Qualificação comercial</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed" style={{ color: mutedText }}>
              Confirme se existe potencial real de venda antes de investir tempo no levantamento e dimensionamento.
            </p>
          </div>
        </div>

        <span
          className="w-fit rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider"
          style={{
            borderColor: qualification?.status === 'nao_qualificado' ? '#ef444455' : theme.border,
            color:
              qualification?.status === 'qualificado'
                ? theme.accent
                : qualification?.status === 'nao_qualificado'
                  ? '#ef4444'
                  : theme.secondary,
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            <span className="mb-2 block">Perfil do cliente</span>
            <select
              value={qualification?.customerProfile ?? ''}
              onChange={(event) => updateQualification({ customerProfile: event.target.value as OpportunityQualification['customerProfile'] })}
              className="crm-input"
            >
              <option value="">Selecione</option>
              <option value="Residencial">Residencial</option>
              <option value="Comercial">Comercial</option>
              <option value="Rural">Rural</option>
              <option value="Industrial">Industrial</option>
            </select>
          </label>

          <label className="block text-sm font-semibold">
            <span className="mb-2 block">Conta média de energia</span>
            <div className="relative">
              <BadgeDollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: mutedText }} />
              <input
                type="number"
                min="0"
                step="10"
                value={qualification?.averageMonthlyBill ?? ''}
                onChange={(event) => updateQualification({ averageMonthlyBill: Number(event.target.value) || 0 })}
                placeholder="Ex.: 850"
                className="crm-input pl-9"
              />
            </div>
          </label>

          <label className="block text-sm font-semibold">
            <span className="mb-2 block">Situação do imóvel</span>
            <select
              value={qualification?.propertyOwnership ?? ''}
              onChange={(event) => updateQualification({ propertyOwnership: event.target.value as OpportunityQualification['propertyOwnership'] })}
              className="crm-input"
            >
              <option value="">Selecione</option>
              <option value="Próprio">Próprio</option>
              <option value="Alugado">Alugado</option>
              <option value="Outro">Outro</option>
            </select>
          </label>

          <label className="block text-sm font-semibold">
            <span className="mb-2 block">É o decisor da compra?</span>
            <select
              value={qualification?.decisionMaker ?? ''}
              onChange={(event) => updateQualification({ decisionMaker: event.target.value as OpportunityQualification['decisionMaker'] })}
              className="crm-input"
            >
              <option value="">Selecione</option>
              <option value="Sim">Sim</option>
              <option value="Compartilhada">Decisão compartilhada</option>
              <option value="Não">Não</option>
            </select>
          </label>

          <label className="block text-sm font-semibold">
            <span className="mb-2 block">Nível de interesse</span>
            <select
              value={qualification?.interestLevel ?? ''}
              onChange={(event) => updateQualification({ interestLevel: event.target.value as OpportunityQualification['interestLevel'] })}
              className="crm-input"
            >
              <option value="">Selecione</option>
              <option value="Alto">Alto</option>
              <option value="Médio">Médio</option>
              <option value="Baixo">Baixo</option>
            </select>
          </label>

          <label className="block text-sm font-semibold">
            <span className="mb-2 block">Prazo pretendido</span>
            <select
              value={qualification?.purchaseTimeframe ?? ''}
              onChange={(event) => updateQualification({ purchaseTimeframe: event.target.value as OpportunityQualification['purchaseTimeframe'] })}
              className="crm-input"
            >
              <option value="">Selecione</option>
              <option value="Até 30 dias">Até 30 dias</option>
              <option value="1 a 3 meses">1 a 3 meses</option>
              <option value="3 a 6 meses">3 a 6 meses</option>
              <option value="Mais de 6 meses">Mais de 6 meses</option>
              <option value="Sem prazo">Sem prazo definido</option>
            </select>
          </label>

          <label className="block text-sm font-semibold sm:col-span-2">
            <span className="mb-2 block">Preferência de pagamento</span>
            <select
              value={qualification?.paymentPreference ?? ''}
              onChange={(event) => updateQualification({ paymentPreference: event.target.value as OpportunityQualification['paymentPreference'] })}
              className="crm-input"
            >
              <option value="">Selecione</option>
              <option value="À vista">À vista</option>
              <option value="Financiamento">Financiamento</option>
              <option value="Ainda não definido">Ainda não definido</option>
            </select>
          </label>

          <label className="block text-sm font-semibold sm:col-span-2">
            <span className="mb-2 block">Objetivo principal do cliente</span>
            <input
              value={qualification?.mainObjective ?? ''}
              onChange={(event) => updateQualification({ mainObjective: event.target.value })}
              placeholder="Ex.: reduzir a conta, previsibilidade de custo, investimento..."
              className="crm-input"
            />
          </label>

          <label className="block text-sm font-semibold sm:col-span-2">
            <span className="mb-2 block">Observações da qualificação</span>
            <textarea
              value={qualification?.notes ?? ''}
              onChange={(event) => updateQualification({ notes: event.target.value })}
              placeholder="Registre objeções e contexto da conversa."
              className="min-h-[96px] w-full resize-y rounded-lg border bg-transparent px-3 py-2.5 text-sm outline-none focus:ring-2"
              style={{ borderColor: theme.border, color: theme.text }}
            />
          </label>
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border p-4" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
            <h4 className="text-sm font-extrabold">Critérios para avançar</h4>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: mutedText }}>
              Complete o mínimo necessário para liberar o levantamento energético.
            </p>

            <div className="mt-4 space-y-2">
              {[
                { label: 'Perfil definido', done: Boolean(qualification?.customerProfile), icon: UserRound },
                { label: `Conta média ${qualification?.averageMonthlyBill ? formatMoney(qualification.averageMonthlyBill) : ''}`, done: Number(qualification?.averageMonthlyBill || 0) > 0, icon: BadgeDollarSign },
                { label: 'Situação do imóvel', done: Boolean(qualification?.propertyOwnership), icon: Home },
                { label: 'Decisor identificado', done: Boolean(qualification?.decisionMaker), icon: UserCheck },
                { label: 'Interesse identificado', done: Boolean(qualification?.interestLevel), icon: MessageSquareText },
                { label: 'Prazo definido', done: Boolean(qualification?.purchaseTimeframe), icon: Clock3 },
                { label: 'Pagamento avaliado', done: Boolean(qualification?.paymentPreference), icon: Landmark },
              ].map((criterion) => {
                const Icon = criterion.icon;
                return (
                  <div key={criterion.label} className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: theme.border }}>
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{
                        backgroundColor: criterion.done
                          ? `color-mix(in srgb, ${theme.accent} 18%, transparent)`
                          : `color-mix(in srgb, ${theme.secondary} 10%, transparent)`,
                        color: criterion.done ? theme.accent : mutedText,
                      }}
                    >
                      {criterion.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: criterion.done ? theme.text : mutedText }}>
                      {criterion.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: ready ? `color-mix(in srgb, ${theme.accent} 60%, ${theme.border})` : theme.border,
              backgroundColor: ready ? `color-mix(in srgb, ${theme.accent} 8%, ${panelBg})` : panelBg,
            }}
          >
            <p className="text-xs font-extrabold">{ready ? 'Pronto para decisão' : 'Qualificação incompleta'}</p>
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: mutedText }}>
              {ready
                ? 'Os critérios principais foram preenchidos. Você pode seguir para o levantamento.'
                : 'Complete os critérios pendentes antes de liberar a próxima etapa.'}
            </p>
          </div>
        </aside>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:items-center sm:justify-end" style={{ borderColor: theme.border }}>
        <button
          type="button"
          onClick={save}
          className="btn-outline inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-bold"
          style={{ borderColor: theme.border }}
        >
          <Save className="h-4 w-4" />
          Salvar qualificação
        </button>

        {opportunity.stage === 'qualificacao' && (
          <>
            <button
              type="button"
              onClick={disqualify}
              className="btn-outline rounded-lg border px-4 py-2.5 text-xs font-bold"
              style={{ borderColor: '#ef444455', color: '#ef4444' }}
            >
              Não qualificar
            </button>
            <button
              type="button"
              onClick={qualifyAndAdvance}
              disabled={!ready}
              className="btn-filled inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold"
              style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}
            >
              Qualificar e avançar
              <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </section>
  );
};
