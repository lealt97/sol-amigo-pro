import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  Gauge,
  MapPin,
  Save,
  Target,
  UserRound,
  Zap,
} from 'lucide-react';
import { Client, EnergySurvey, Opportunity, ThemeConfig } from '../types';
import { getContrastFg } from '../utils/themeEngine';

interface LevantamentoEnergeticoViewProps {
  opportunities: Opportunity[];
  clients: Client[];
  surveys: EnergySurvey[];
  initialOpportunityId?: string | null;
  theme: ThemeConfig;
  onSave: (survey: EnergySurvey) => void;
  onShowToast: (msg: string) => void;
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value || 0);

export const LevantamentoEnergeticoView: React.FC<LevantamentoEnergeticoViewProps> = ({
  opportunities,
  clients,
  surveys,
  initialOpportunityId,
  theme,
  onSave,
  onShowToast,
}) => {
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(initialOpportunityId ?? opportunities[0]?.id ?? '');
  const [concessionaria, setConcessionaria] = useState('');
  const [consumerUnit, setConsumerUnit] = useState('');
  const [connectionType, setConnectionType] = useState<EnergySurvey['connectionType']>('Monofásica');
  const [consumerClass, setConsumerClass] = useState<EnergySurvey['consumerClass']>('Residencial');
  const [tariffMode, setTariffMode] = useState<EnergySurvey['tariffMode']>('Convencional');
  const [installationAddress, setInstallationAddress] = useState('');
  const [monthlyConsumptionKWh, setMonthlyConsumptionKWh] = useState<number[]>(Array(12).fill(0));
  const [currentMonthlyBill, setCurrentMonthlyBill] = useState(0);
  const [tariffPerKWh, setTariffPerKWh] = useState(0);
  const [notes, setNotes] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    opportunity: true,
    consumer: true,
    consumption: true,
    billing: true,
  });

  const backgroundIsDark = getContrastFg(theme.background) === '#FFFFFF';
  const panelBg = backgroundIsDark
    ? `color-mix(in srgb, ${theme.background} 88%, #FFFFFF)`
    : `color-mix(in srgb, ${theme.background} 94%, #000000)`;
  const panelAltBg = backgroundIsDark
    ? `color-mix(in srgb, ${theme.background} 82%, #FFFFFF)`
    : `color-mix(in srgb, ${theme.background} 90%, #000000)`;
  const mutedText = `color-mix(in srgb, ${theme.text} 62%, transparent)`;

  const selectedOpportunity = useMemo(
    () => opportunities.find((item) => item.id === selectedOpportunityId) ?? null,
    [opportunities, selectedOpportunityId]
  );

  const selectedClient = useMemo(
    () => clients.find((item) => item.name === selectedOpportunity?.clientName) ?? null,
    [clients, selectedOpportunity]
  );

  const informedMonths = monthlyConsumptionKWh.filter((value) => Number(value) > 0);
  const averageConsumptionKWh = informedMonths.length
    ? informedMonths.reduce((sum, value) => sum + Number(value || 0), 0) / informedMonths.length
    : 0;

  const estimatedAnnualConsumption = averageConsumptionKWh * 12;

  useEffect(() => {
    if (initialOpportunityId && opportunities.some((item) => item.id === initialOpportunityId)) {
      setSelectedOpportunityId(initialOpportunityId);
    }
  }, [initialOpportunityId, opportunities]);

  useEffect(() => {
    if (!selectedOpportunityId) return;

    const opportunity = opportunities.find((item) => item.id === selectedOpportunityId);
    const client = clients.find((item) => item.name === opportunity?.clientName);
    const existing = surveys.find((item) => item.opportunityId === selectedOpportunityId);

    if (existing) {
      setConcessionaria(existing.concessionaria);
      setConsumerUnit(existing.consumerUnit);
      setConnectionType(existing.connectionType);
      setConsumerClass(existing.consumerClass);
      setTariffMode(existing.tariffMode);
      setInstallationAddress(existing.installationAddress);
      setMonthlyConsumptionKWh(
        existing.monthlyConsumptionKWh.length === 12
          ? existing.monthlyConsumptionKWh
          : [...existing.monthlyConsumptionKWh, ...Array(12).fill(0)].slice(0, 12)
      );
      setCurrentMonthlyBill(existing.currentMonthlyBill);
      setTariffPerKWh(existing.tariffPerKWh);
      setNotes(existing.notes);
      return;
    }

    setConcessionaria(client?.concessionaria ?? '');
    setConsumerUnit(client?.consumerUnit ?? '');
    setConnectionType(client?.connectionType ?? 'Monofásica');
    setConsumerClass(client?.type ?? 'Residencial');
    setTariffMode('Convencional');
    setInstallationAddress(client ? `${client.city}${client.state ? ` - ${client.state}` : ''}` : '');
    setMonthlyConsumptionKWh(Array(12).fill(0));
    setCurrentMonthlyBill(client?.avgMonthlyBill ?? 0);
    setTariffPerKWh(0);
    setNotes('');
  }, [selectedOpportunityId, opportunities, clients, surveys]);

  const toggleSection = (key: string) => {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const updateMonth = (index: number, value: string) => {
    const numeric = Math.max(0, Number(value) || 0);
    setMonthlyConsumptionKWh((current) => current.map((item, itemIndex) => itemIndex === index ? numeric : item));
  };

  const fillFromClientAverage = () => {
    if (!selectedClient?.avgConsumptionKWh) {
      onShowToast('Este cliente não possui consumo médio cadastrado.');
      return;
    }
    setMonthlyConsumptionKWh(Array(12).fill(selectedClient.avgConsumptionKWh));
  };

  const handleSave = () => {
    if (!selectedOpportunity) {
      onShowToast('Selecione uma oportunidade para salvar o levantamento.');
      return;
    }

    const existing = surveys.find((item) => item.opportunityId === selectedOpportunity.id);
    const survey: EnergySurvey = {
      id: existing?.id ?? `survey-${Date.now()}`,
      opportunityId: selectedOpportunity.id,
      clientName: selectedOpportunity.clientName,
      concessionaria: concessionaria.trim(),
      consumerUnit: consumerUnit.trim(),
      connectionType,
      consumerClass,
      tariffMode,
      installationAddress: installationAddress.trim(),
      monthlyConsumptionKWh,
      averageConsumptionKWh,
      currentMonthlyBill: Number(currentMonthlyBill) || 0,
      tariffPerKWh: Number(tariffPerKWh) || 0,
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    };

    onSave(survey);
    onShowToast('Levantamento energético salvo com sucesso!');
  };

  const renderSectionHeader = (
    key: string,
    icon: React.ElementType,
    title: string,
    subtitle: string,
    badge?: string
  ) => {
    const Icon = icon;
    const open = openSections[key];
    return (
      <button
        type="button"
        onClick={() => toggleSection(key)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: `color-mix(in srgb, ${theme.secondary} 18%, transparent)`,
              color: theme.secondary,
            }}
          >
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-extrabold">{title}</h2>
              {badge && (
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
                  style={{ borderColor: theme.border, color: mutedText }}
                >
                  {badge}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs" style={{ color: mutedText }}>{subtitle}</p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    );
  };

  return (
    <div id="levantamento-page" className="mx-auto max-w-[1480px] space-y-5" style={{ color: theme.text }}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div
            className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]"
            style={{ color: mutedText }}
          >
            <ClipboardList className="h-4 w-4" />
            Comercial · Etapa técnica
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Levantamento energético</h1>
          <p className="mt-1 max-w-3xl text-sm" style={{ color: mutedText }}>
            Reúna os dados da unidade consumidora e do histórico de consumo que serão usados no dimensionamento fotovoltaico.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="btn-filled inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold shadow-sm"
          style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}
        >
          <Save className="h-4 w-4" />
          Salvar levantamento
        </button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: 'Oportunidade',
            value: selectedOpportunity?.title ?? 'Não selecionada',
            icon: Target,
          },
          {
            label: 'Cliente',
            value: selectedOpportunity?.clientName ?? 'Não informado',
            icon: UserRound,
          },
          {
            label: 'Consumo médio',
            value: `${averageConsumptionKWh.toFixed(0)} kWh/mês`,
            icon: Gauge,
          },
          {
            label: 'Conta atual',
            value: formatMoney(currentMonthlyBill),
            icon: BadgeDollarSign,
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="rounded-xl border p-4"
              style={{ backgroundColor: panelBg, borderColor: theme.border }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: mutedText }}>{metric.label}</p>
                  <p className="mt-2 truncate text-sm font-extrabold" title={metric.value}>{metric.value}</p>
                </div>
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${theme.secondary} 18%, transparent)`,
                    color: theme.secondary,
                  }}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-xl border" style={{ backgroundColor: panelBg, borderColor: theme.border }}>
        {renderSectionHeader(
          'opportunity',
          Target,
          'Oportunidade vinculada',
          'Defina qual negociação receberá este levantamento energético.',
          selectedOpportunity ? 'Vinculada' : 'Pendente'
        )}
        {openSections.opportunity && (
          <div className="border-t p-4" style={{ borderColor: theme.border, backgroundColor: panelAltBg }}>
            <label className="block text-sm font-semibold">
              <span className="mb-2 block">Oportunidade</span>
              <select
                value={selectedOpportunityId}
                onChange={(event) => setSelectedOpportunityId(event.target.value)}
                className="crm-input"
              >
                <option value="">Selecione uma oportunidade</option>
                {opportunities.map((opp) => (
                  <option key={opp.id} value={opp.id}>{opp.title} · {opp.clientName}</option>
                ))}
              </select>
            </label>

            {selectedOpportunity && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: mutedText }}>Cliente</p>
                  <p className="mt-1 truncate text-sm font-bold">{selectedOpportunity.clientName}</p>
                </div>
                <div className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: mutedText }}>Responsável</p>
                  <p className="mt-1 truncate text-sm font-bold">{selectedOpportunity.assignedTo}</p>
                </div>
                <div className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: mutedText }}>Potência preliminar</p>
                  <p className="mt-1 text-sm font-bold">{selectedOpportunity.systemPowerKWp || 0} kWp</p>
                </div>
                <div className="rounded-lg border p-3" style={{ borderColor: theme.border }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: mutedText }}>Valor estimado</p>
                  <p className="mt-1 text-sm font-bold">{formatMoney(selectedOpportunity.value)}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border" style={{ backgroundColor: panelBg, borderColor: theme.border }}>
        {renderSectionHeader(
          'consumer',
          Building2,
          'Unidade consumidora',
          'Cadastre os dados elétricos e de localização da instalação.',
          consumerUnit ? 'Identificada' : 'Em preenchimento'
        )}
        {openSections.consumer && (
          <div className="border-t p-4" style={{ borderColor: theme.border, backgroundColor: panelAltBg }}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Concessionária / distribuidora</span>
                <input
                  value={concessionaria}
                  onChange={(event) => setConcessionaria(event.target.value)}
                  className="crm-input"
                  placeholder="Ex.: CPFL, Enel, Cemig"
                />
              </label>

              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Unidade consumidora</span>
                <input
                  value={consumerUnit}
                  onChange={(event) => setConsumerUnit(event.target.value)}
                  className="crm-input"
                  placeholder="Número da UC"
                />
              </label>

              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Tipo de ligação</span>
                <select
                  value={connectionType}
                  onChange={(event) => setConnectionType(event.target.value as EnergySurvey['connectionType'])}
                  className="crm-input"
                >
                  <option>Monofásica</option>
                  <option>Bifásica</option>
                  <option>Trifásica</option>
                </select>
              </label>

              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Classe de consumo</span>
                <select
                  value={consumerClass}
                  onChange={(event) => setConsumerClass(event.target.value as EnergySurvey['consumerClass'])}
                  className="crm-input"
                >
                  <option>Residencial</option>
                  <option>Comercial</option>
                  <option>Rural</option>
                  <option>Industrial</option>
                </select>
              </label>

              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Modalidade tarifária</span>
                <select
                  value={tariffMode}
                  onChange={(event) => setTariffMode(event.target.value as EnergySurvey['tariffMode'])}
                  className="crm-input"
                >
                  <option>Convencional</option>
                  <option>Tarifa Branca</option>
                  <option>Grupo A</option>
                </select>
              </label>

              <label className="block text-sm font-semibold md:col-span-2 xl:col-span-1">
                <span className="mb-2 flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Endereço da instalação</span>
                <input
                  value={installationAddress}
                  onChange={(event) => setInstallationAddress(event.target.value)}
                  className="crm-input"
                  placeholder="Endereço ou cidade da instalação"
                />
              </label>
            </div>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border" style={{ backgroundColor: panelBg, borderColor: theme.border }}>
        {renderSectionHeader(
          'consumption',
          Zap,
          'Histórico de consumo',
          'Informe os consumos mensais em kWh para calcular a média usada no dimensionamento.',
          `${informedMonths.length}/12 meses`
        )}
        {openSections.consumption && (
          <div className="border-t p-4" style={{ borderColor: theme.border, backgroundColor: panelAltBg }}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold">Consumo mensal (kWh)</p>
                <p className="mt-1 text-xs" style={{ color: mutedText }}>
                  Média calculada automaticamente com os meses informados.
                </p>
              </div>
              <button
                type="button"
                onClick={fillFromClientAverage}
                className="btn-outline rounded-lg border px-3 py-2 text-xs font-bold"
                style={{ borderColor: theme.border, color: theme.text }}
              >
                Usar média cadastrada do cliente
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {MONTHS.map((month, index) => (
                <label key={month} className="block text-xs font-semibold">
                  <span className="mb-1.5 block" style={{ color: mutedText }}>{month}</span>
                  <input
                    type="number"
                    min="0"
                    value={monthlyConsumptionKWh[index] || ''}
                    onChange={(event) => updateMonth(index, event.target.value)}
                    className="crm-input"
                    placeholder="0"
                  />
                </label>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: mutedText }}>Média mensal</p>
                <p className="mt-1 text-lg font-extrabold">{averageConsumptionKWh.toFixed(0)} kWh</p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: mutedText }}>Consumo anual estimado</p>
                <p className="mt-1 text-lg font-extrabold">{estimatedAnnualConsumption.toFixed(0)} kWh</p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: theme.border, backgroundColor: panelBg }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: mutedText }}>Meses informados</p>
                <p className="mt-1 text-lg font-extrabold">{informedMonths.length} de 12</p>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border" style={{ backgroundColor: panelBg, borderColor: theme.border }}>
        {renderSectionHeader(
          'billing',
          FileText,
          'Conta de energia e observações',
          'Registre o valor da conta, tarifa e informações adicionais relevantes para o projeto.',
          currentMonthlyBill > 0 ? 'Conta informada' : 'Em preenchimento'
        )}
        {openSections.billing && (
          <div className="border-t p-4" style={{ borderColor: theme.border, backgroundColor: panelAltBg }}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Valor médio da conta (R$)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentMonthlyBill || ''}
                  onChange={(event) => setCurrentMonthlyBill(Number(event.target.value) || 0)}
                  className="crm-input"
                  placeholder="0,00"
                />
              </label>

              <label className="block text-sm font-semibold">
                <span className="mb-2 block">Tarifa aproximada (R$/kWh)</span>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={tariffPerKWh || ''}
                  onChange={(event) => setTariffPerKWh(Number(event.target.value) || 0)}
                  className="crm-input"
                  placeholder="0,0000"
                />
              </label>

              <label className="block text-sm font-semibold md:col-span-2">
                <span className="mb-2 block">Observações do levantamento</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm outline-none transition focus:ring-2"
                  style={{ borderColor: theme.border, color: theme.text }}
                  placeholder="Ex.: previsão de aumento de carga, mudança de padrão, nova instalação, sombreamento observado..."
                />
              </label>
            </div>
          </div>
        )}
      </section>

      <section
        className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
        style={{ backgroundColor: panelBg, borderColor: theme.border }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: `color-mix(in srgb, ${theme.accent} 18%, transparent)`,
              color: theme.accent,
            }}
          >
            <CheckCircle2 className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold">Próxima etapa: Dimensionamento fotovoltaico</h2>
            <p className="mt-1 text-xs" style={{ color: mutedText }}>
              O consumo médio e os dados elétricos deste levantamento serão a base para calcular a potência necessária do sistema.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="btn-filled inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold"
          style={{ backgroundColor: theme.secondary, color: getContrastFg(theme.secondary) }}
        >
          <Save className="h-4 w-4" />
          Salvar levantamento
        </button>
      </section>
    </div>
  );
};
