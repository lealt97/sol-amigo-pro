import React, { useState, useMemo } from 'react';
import {
  Zap,
  BatteryCharging,
  SunMedium,
  Calendar,
  Layers,
  Plus,
  Trash2,
  TrendingUp,
  BarChart3,
  DollarSign,
  Info,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  Sliders,
  AlertTriangle,
  HelpCircle,
  Building2,
  Clock,
  Battery,
  Pencil,
} from 'lucide-react';
import { ThemeConfig, SolarConnectionType } from '../types';
import { ProposalTargetSelection } from './ProposalWizardModal';
import { AVAILABILITY_COST_KWH } from '../utils/solarSizing';

export interface WizardLoadItem {
  id: string;
  name: string;
  powerW: number;
  quantity: number;
  hoursPerDay: number;
  daysPerMonth: number;
  isPriorityBackup: boolean;
}

export const PRESET_APPLIANCES: Omit<WizardLoadItem, 'id'>[] = [
  { name: 'Ar-condicionado 9.000 BTUs Inverter', powerW: 800, quantity: 1, hoursPerDay: 8, daysPerMonth: 30, isPriorityBackup: false },
  { name: 'Ar-condicionado 12.000 BTUs Inverter', powerW: 1100, quantity: 1, hoursPerDay: 8, daysPerMonth: 30, isPriorityBackup: false },
  { name: 'Geladeira Frost Free Duplex', powerW: 150, quantity: 1, hoursPerDay: 10, daysPerMonth: 30, isPriorityBackup: true },
  { name: 'Freezer Vertical / Horizontal', powerW: 180, quantity: 1, hoursPerDay: 10, daysPerMonth: 30, isPriorityBackup: true },
  { name: 'Chuveiro Elétrico 5500W', powerW: 5500, quantity: 1, hoursPerDay: 0.6, daysPerMonth: 30, isPriorityBackup: false },
  { name: 'Micro-ondas 30L', powerW: 1200, quantity: 1, hoursPerDay: 0.3, daysPerMonth: 30, isPriorityBackup: false },
  { name: 'Air Fryer', powerW: 1500, quantity: 1, hoursPerDay: 0.5, daysPerMonth: 30, isPriorityBackup: false },
  { name: 'Máquina de Lavar Roupas', powerW: 500, quantity: 1, hoursPerDay: 1.5, daysPerMonth: 12, isPriorityBackup: false },
  { name: 'Secadora de Roupas', powerW: 2500, quantity: 1, hoursPerDay: 1.5, daysPerMonth: 8, isPriorityBackup: false },
  { name: 'Smart TV LED 55"', powerW: 120, quantity: 2, hoursPerDay: 5, daysPerMonth: 30, isPriorityBackup: true },
  { name: 'Iluminação Geral LED (Casa/Comércio)', powerW: 150, quantity: 1, hoursPerDay: 6, daysPerMonth: 30, isPriorityBackup: true },
  { name: 'Computador / Home Office', powerW: 200, quantity: 1, hoursPerDay: 8, daysPerMonth: 22, isPriorityBackup: true },
  { name: 'Internet Wi-Fi / Câmeras CFTV', powerW: 45, quantity: 1, hoursPerDay: 24, daysPerMonth: 30, isPriorityBackup: true },
  { name: 'Bomba de Piscina (0.5 CV)', powerW: 400, quantity: 1, hoursPerDay: 4, daysPerMonth: 30, isPriorityBackup: false },
  { name: 'Bomba de Poço / Pressurizador (1 CV)', powerW: 750, quantity: 1, hoursPerDay: 1.5, daysPerMonth: 30, isPriorityBackup: true },
  { name: 'Carregador Veicular Wallbox 7kW', powerW: 7000, quantity: 1, hoursPerDay: 3, daysPerMonth: 20, isPriorityBackup: false },
];

export const MONTH_LABELS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
] as const;

interface Step2ConsumptionBillsProps {
  theme: ThemeConfig;
  selectedTarget: ProposalTargetSelection | null;
  systemType: 'On-Grid' | 'Híbrido';
  setSystemType: (val: 'On-Grid' | 'Híbrido') => void;
  consumptionMode: 'direct' | 'monthly' | 'load_table';
  setConsumptionMode: (val: 'direct' | 'monthly' | 'load_table') => void;
  directAvgKWh: number | '';
  setDirectAvgKWh: (val: number | '') => void;
  monthlyValues: { month: string; value: number | '' }[];
  setMonthlyValues: React.Dispatch<React.SetStateAction<{ month: string; value: number | '' }[]>>;
  loadItems: WizardLoadItem[];
  setLoadItems: React.Dispatch<React.SetStateAction<WizardLoadItem[]>>;
  concessionaria: string;
  setConcessionaria: (val: string) => void;
  connectionType: SolarConnectionType;
  setConnectionType: (val: SolarConnectionType) => void;
  energyTariff: number;
  setEnergyTariff: (val: number) => void;
  publicLightingTax: number;
  setPublicLightingTax: (val: number) => void;
  backupAutonomyHours: number;
  setBackupAutonomyHours: (val: number) => void;
  effectiveAverageKWh: number;
  onShowToast?: (msg: string) => void;
}

export const ProposalWizardStep2: React.FC<Step2ConsumptionBillsProps> = ({
  theme,
  selectedTarget,
  systemType,
  setSystemType,
  consumptionMode,
  setConsumptionMode,
  directAvgKWh,
  setDirectAvgKWh,
  monthlyValues,
  setMonthlyValues,
  loadItems,
  setLoadItems,
  concessionaria,
  setConcessionaria,
  connectionType,
  setConnectionType,
  energyTariff,
  setEnergyTariff,
  publicLightingTax,
  setPublicLightingTax,
  backupAutonomyHours,
  setBackupAutonomyHours,
  effectiveAverageKWh,
  onShowToast,
}) => {
  // Estado para adicionar / editar carga na tabela
  const [isAddingCustomLoad, setIsAddingCustomLoad] = useState(false);
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null);

  // Campos do formulário de carga
  const [customLoadName, setCustomLoadName] = useState('');
  const [customLoadPowerW, setCustomLoadPowerW] = useState<number | ''>(500);
  const [customLoadQty, setCustomLoadQty] = useState<number | ''>(1);
  const [customLoadHours, setCustomLoadHours] = useState<number | ''>(4);
  const [customLoadDays, setCustomLoadDays] = useState<number | ''>(30);
  const [customLoadPriority, setCustomLoadPriority] = useState(false);

  // Valor padrão para preencher os 12 meses
  const [bulkMonthVal, setBulkMonthVal] = useState<number | ''>(
    effectiveAverageKWh > 0 ? effectiveAverageKWh : 450
  );

  // Limpa o formulário de carga
  const resetLoadForm = () => {
    setIsAddingCustomLoad(false);
    setEditingLoadId(null);
    setCustomLoadName('');
    setCustomLoadPowerW(500);
    setCustomLoadQty(1);
    setCustomLoadHours(4);
    setCustomLoadDays(30);
    setCustomLoadPriority(false);
  };

  // Iniciar edição de uma carga salva na tabela
  const handleStartEditSavedLoad = (item: WizardLoadItem) => {
    setEditingLoadId(item.id);
    setCustomLoadName(item.name);
    setCustomLoadPowerW(item.powerW);
    setCustomLoadQty(item.quantity);
    setCustomLoadHours(item.hoursPerDay);
    setCustomLoadDays(item.daysPerMonth);
    setCustomLoadPriority(item.isPriorityBackup);
    setIsAddingCustomLoad(true);
  };

  // Custo de disponibilidade baseado na conexão
  const availabilityCost = AVAILABILITY_COST_KWH[connectionType] || 50;
  const compensableKWh = Math.max(0, effectiveAverageKWh - availabilityCost);

  // Estimativa de conta de luz atual
  const estimatedBill = useMemo(() => {
    return effectiveAverageKWh * energyTariff + publicLightingTax;
  }, [effectiveAverageKWh, energyTariff, publicLightingTax]);

  // Cálculos da Tabela de Carga
  const loadTableMetrics = useMemo(() => {
    let totalKWhMonth = 0;
    let totalPeakPowerKW = 0;
    let priorityKWhDay = 0;
    let priorityPeakPowerKW = 0;
    loadItems.forEach((item) => {
      const pKw = (item.powerW * item.quantity) / 1000;
      const kwhMonth = (item.powerW * item.quantity * item.hoursPerDay * item.daysPerMonth) / 1000;
      totalKWhMonth += kwhMonth;
      totalPeakPowerKW += pKw;
      if (item.isPriorityBackup) {
        priorityPeakPowerKW += pKw;
        priorityKWhDay += (item.powerW * item.quantity * item.hoursPerDay) / 1000;
      }
    });
    return {
      totalKWhMonth: Math.round(totalKWhMonth),
      totalPeakPowerKW: Number(totalPeakPowerKW.toFixed(2)),
      priorityKWhDay: Number(priorityKWhDay.toFixed(2)),
      priorityPeakPowerKW: Number(priorityPeakPowerKW.toFixed(2)),
    };
  }, [loadItems]);

  // Cálculos do Histórico Mensal (12 meses)
  const monthlyMetrics = useMemo(() => {
    const filled = monthlyValues
      .map((m) => (typeof m.value === 'number' ? m.value : 0))
      .filter((v) => v > 0);
    const count = filled.length;
    if (count === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, totalAnnual: 0 };
    }
    const sum = filled.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / count);
    const min = Math.min(...filled);
    const max = Math.max(...filled);
    const totalAnnual = count === 12 ? sum : avg * 12;
    return { count, avg, min, max, totalAnnual };
  }, [monthlyValues]);

  // Adicionar carga pré-definida à tabela
  const handleAddPresetLoad = (presetIndex: number) => {
    const preset = PRESET_APPLIANCES[presetIndex];
    if (!preset) return;
    const newItem: WizardLoadItem = {
      ...preset,
      id: `load-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setLoadItems((prev) => [...prev, newItem]);
    onShowToast?.(`"${preset.name}" adicionada à tabela de cargas!`);
  };

  // Salvar carga (nova ou editada da tabela)
  const handleSaveLoad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLoadName.trim()) {
      alert('Informe o nome da carga.');
      return;
    }
    const power = Number(customLoadPowerW) || 100;
    const qty = Number(customLoadQty) || 1;
    const hours = Number(customLoadHours) || 1;
    const days = Math.min(31, Math.max(1, Number(customLoadDays) || 30));

    // Editando carga salva na tabela
    if (editingLoadId) {
      setLoadItems((prev) =>
        prev.map((item) =>
          item.id === editingLoadId
            ? {
                ...item,
                name: customLoadName.trim(),
                powerW: power,
                quantity: qty,
                hoursPerDay: hours,
                daysPerMonth: days,
                isPriorityBackup: customLoadPriority,
              }
            : item
        )
      );
      onShowToast?.(`Carga "${customLoadName.trim()}" atualizada com sucesso!`);
      resetLoadForm();
      return;
    }

    // Inserindo nova carga
    const newItem: WizardLoadItem = {
      id: `load-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: customLoadName.trim(),
      powerW: power,
      quantity: qty,
      hoursPerDay: hours,
      daysPerMonth: days,
      isPriorityBackup: customLoadPriority,
    };

    setLoadItems((prev) => [...prev, newItem]);
    resetLoadForm();
    onShowToast?.(`Carga "${newItem.name}" adicionada com sucesso!`);
  };

  // Remover carga
  const handleRemoveLoad = (id: string) => {
    setLoadItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Preencher todos os 12 meses com valor padrão
  const handleFillAllMonths = () => {
    const val = Number(bulkMonthVal);
    if (!val || val <= 0) return;
    setMonthlyValues(
      MONTH_LABELS.map((m) => ({
        month: m,
        value: val,
      }))
    );
    onShowToast?.(`Todos os 12 meses preenchidos com ${val} kWh`);
  };

  // Limpar os 12 meses
  const handleClearAllMonths = () => {
    setMonthlyValues(
      MONTH_LABELS.map((m) => ({
        month: m,
        value: '',
      }))
    );
  };

  // Sugestão de baterias se Híbrido
  const batteryRecommendation = useMemo(() => {
    // Estimativa de energia necessária durante a autonomia
    const dailyKWh = effectiveAverageKWh > 0 ? effectiveAverageKWh / 30 : 15;
    const hourlyAverageKWh = dailyKWh / 24;
    // Cargas prioritárias consom ~40% do total ou valor da tabela de carga
    const priorityHourlyKWh =
      loadTableMetrics.priorityKWhDay > 0
        ? loadTableMetrics.priorityKWhDay / 24
        : hourlyAverageKWh * 0.45;

    const neededEnergyKWh = priorityHourlyKWh * backupAutonomyHours;
    // Considerando DoD 90% e rendimento 92%
    const usableBatteryCapacityRequired = neededEnergyKWh / (0.9 * 0.92);
    // Módulos padrão LiFePO4 de 5.12 kWh
    const moduleSizeKWh = 5.12;
    const modulesCount = Math.max(1, Math.ceil(usableBatteryCapacityRequired / moduleSizeKWh));

    return {
      neededEnergyKWh: Number(neededEnergyKWh.toFixed(1)),
      suggestedCapacityKWh: Number((modulesCount * moduleSizeKWh).toFixed(1)),
      modulesCount,
      moduleSizeKWh,
    };
  }, [effectiveAverageKWh, backupAutonomyHours, loadTableMetrics.priorityKWhDay]);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* CARD SUPERIOR DE RESUMO DINÂMICO & TITULAR SELECIONADO                   */}
      {/* ========================================================================= */}
      <div
        className="p-4 rounded-2xl border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4"
        style={{ backgroundColor: theme.background, borderColor: theme.border }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-xs"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
              borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
              color: theme.secondary,
            }}
          >
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-[var(--text)]">
                {selectedTarget?.name || 'Cliente / Lead'}
              </h3>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--secondary) 10%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--secondary) 25%, transparent)',
                  color: theme.secondary,
                }}
              >
                {selectedTarget?.type === 'client' ? 'Cliente' : 'Lead'}
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] flex items-center gap-1.5 mt-0.5">
              <span>{selectedTarget?.city ? `${selectedTarget.city} - ${selectedTarget.state || 'SP'}` : 'Localidade não informada'}</span>
              <span>•</span>
              <span className="font-medium text-[var(--text)]">{concessionaria || 'Concessionária Local'}</span>
            </p>
          </div>
        </div>

        {/* Indicadores Chave de Saída da Etapa 2 */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div
            className="px-3.5 py-2 rounded-xl border flex flex-col justify-center min-w-[110px]"
            style={{ backgroundColor: theme.primary, borderColor: theme.border }}
          >
            <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">
              Consumo Adotado
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-lg font-black text-[var(--secondary)]">
                {effectiveAverageKWh > 0 ? effectiveAverageKWh.toLocaleString('pt-BR') : '0'}
              </span>
              <span className="text-[11px] font-semibold text-[var(--muted)]">kWh/mês</span>
            </div>
          </div>

          <div
            className="px-3.5 py-2 rounded-xl border flex flex-col justify-center min-w-[120px]"
            style={{ backgroundColor: theme.primary, borderColor: theme.border }}
          >
            <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">
              Fatura Atual Est.
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-lg font-black text-[var(--text)]">
                R$ {Math.round(estimatedBill).toLocaleString('pt-BR')}
              </span>
              <span className="text-[11px] font-semibold text-[var(--muted)]">/mês</span>
            </div>
          </div>

          <div
            className="px-3.5 py-2 rounded-xl border flex flex-col justify-center min-w-[110px]"
            style={{
              backgroundColor:
                systemType === 'Híbrido'
                  ? 'color-mix(in srgb, #8b5cf6 10%, var(--primary))'
                  : 'color-mix(in srgb, var(--secondary) 10%, var(--primary))',
              borderColor:
                systemType === 'Híbrido'
                  ? 'color-mix(in srgb, #8b5cf6 40%, transparent)'
                  : 'color-mix(in srgb, var(--secondary) 40%, transparent)',
            }}
          >
            <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">
              Tipo de Sistema
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {systemType === 'Híbrido' ? (
                <>
                  <BatteryCharging className="w-4 h-4 text-purple-400" />
                  <span className="text-xs sm:text-sm font-bold text-purple-300">Híbrido</span>
                </>
              ) : (
                <>
                  <SunMedium className="w-4 h-4 text-[var(--secondary)]" />
                  <span className="text-xs sm:text-sm font-bold text-[var(--secondary)]">On-Grid</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 1: ESCOLHA DO SISTEMA (ON-GRID vs HÍBRIDO)                          */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[var(--secondary)]" />
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--text)]">
              1. Tipo de Sistema Fotovoltaico
            </h4>
          </div>
          <span className="text-xs text-[var(--muted)]">
            Selecione a topologia da usina
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Opção ON-GRID */}
          <div
            onClick={() => setSystemType('On-Grid')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              systemType === 'On-Grid'
                ? 'shadow-lg scale-[1.005]'
                : 'opacity-75 hover:opacity-100 hover:border-[var(--dim)]'
            }`}
            style={{
              backgroundColor:
                systemType === 'On-Grid'
                  ? 'color-mix(in srgb, var(--secondary) 8%, var(--background))'
                  : theme.background,
              borderColor:
                systemType === 'On-Grid'
                  ? theme.secondary
                  : theme.border,
            }}
          >
            {systemType === 'On-Grid' && (
              <div
                className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: theme.secondary }}
              >
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center border"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                    color: theme.secondary,
                  }}
                >
                  <SunMedium className="w-4 h-4" />
                </div>
                <h5 className="text-sm font-bold text-[var(--text)]">
                  Sistema On-Grid (Conectado à Rede)
                </h5>
              </div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Conectado diretamente à rede da concessionária. Gera créditos de energia (Resolução ANEEL / Lei 14.300) para abater a conta.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: theme.border }}>
              <span className="text-[11px] font-semibold text-[var(--secondary)] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Mais Econômico • Menor Payback
              </span>
              <span className="text-[11px] text-[var(--muted)]">Sem baterias</span>
            </div>
          </div>

          {/* Opção HÍBRIDO */}
          <div
            onClick={() => setSystemType('Híbrido')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              systemType === 'Híbrido'
                ? 'shadow-lg scale-[1.005]'
                : 'opacity-75 hover:opacity-100 hover:border-[var(--dim)]'
            }`}
            style={{
              backgroundColor:
                systemType === 'Híbrido'
                  ? 'color-mix(in srgb, #8b5cf6 10%, var(--background))'
                  : theme.background,
              borderColor:
                systemType === 'Híbrido'
                  ? '#8b5cf6'
                  : theme.border,
            }}
          >
            {systemType === 'Híbrido' && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <BatteryCharging className="w-4 h-4" />
                </div>
                <h5 className="text-sm font-bold text-[var(--text)]">
                  Sistema Híbrido (Rede + Baterias)
                </h5>
              </div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Gera economia na fatura e mantém energia ininterrupta com banco de baterias LiFePO4 durante apagões e quedas de rede pública.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: theme.border }}>
              <span className="text-[11px] font-semibold text-purple-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Backup Anti-Apagão • Nobreak Solar
              </span>
              <span className="text-[11px] text-purple-300 font-bold">Com Baterias</span>
            </div>
          </div>
        </div>

        {/* Sub-painel de Configuração do Sistema Híbrido */}
        {systemType === 'Híbrido' && (
          <div
            className="p-4 rounded-2xl border space-y-4 animate-in fade-in duration-200"
            style={{
              backgroundColor: 'color-mix(in srgb, #8b5cf6 5%, var(--primary))',
              borderColor: 'color-mix(in srgb, #8b5cf6 30%, transparent)',
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-purple-400" />
                <h5 className="text-xs sm:text-sm font-bold text-[var(--text)]">
                  Dimensionamento do Banco de Baterias (Backup)
                </h5>
              </div>
              <span className="text-[11px] text-purple-300 font-medium">
                Tecnologia sugerida: Lítio LiFePO4 48V
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Seletor de Autonomia */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--dim)] mb-1.5">
                  Autonomia de Backup Desejada (Falta de Rede)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { hours: 2, label: '2h', desc: 'Essencial' },
                    { hours: 4, label: '4h', desc: 'Recomendada' },
                    { hours: 8, label: '8h', desc: 'Noturna' },
                    { hours: 12, label: '12h', desc: 'Prolongada' },
                  ].map((opt) => (
                    <button
                      key={opt.hours}
                      type="button"
                      onClick={() => setBackupAutonomyHours(opt.hours)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        backupAutonomyHours === opt.hours
                          ? 'border-purple-500 bg-purple-500/20 text-white font-bold shadow-xs'
                          : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      <div className="text-xs sm:text-sm">{opt.label}</div>
                      <div className="text-[10px] opacity-75">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recomendação de Bateria */}
              <div
                className="p-3 rounded-xl border flex flex-col justify-between"
                style={{
                  backgroundColor: theme.background,
                  borderColor: 'color-mix(in srgb, #8b5cf6 30%, transparent)',
                }}
              >
                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                  Capacidade Recomendada
                </span>
                <div className="my-1">
                  <div className="text-base sm:text-lg font-black text-[var(--text)]">
                    {batteryRecommendation.suggestedCapacityKWh} kWh
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">
                    {batteryRecommendation.modulesCount}x Módulo{batteryRecommendation.modulesCount > 1 ? 's' : ''} de {batteryRecommendation.moduleSizeKWh} kWh
                  </div>
                </div>
                <div className="text-[10px] text-purple-300 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Atende ~{backupAutonomyHours}h de cargas prioritárias
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 2: DETERMINAÇÃO DO CONSUMO (3 MODOS: DIRETA, 12 MESES, CARGAS)      */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--secondary)]" />
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--text)]">
              2. Como deseja definir o consumo médio?
            </h4>
          </div>
          <span className="text-xs text-[var(--muted)]">
            Escolha o método mais adequado ao cliente
          </span>
        </div>

        {/* Abas dos 3 Métodos */}
        <div
          className="p-1 rounded-2xl border grid grid-cols-1 sm:grid-cols-3 gap-1"
          style={{ backgroundColor: theme.background, borderColor: theme.border }}
        >
          <button
            type="button"
            onClick={() => setConsumptionMode('direct')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              consumptionMode === 'direct'
                ? 'shadow-xs text-[var(--secondary-fg)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            style={
              consumptionMode === 'direct'
                ? { backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }
                : {}
            }
          >
            <Zap className="w-4 h-4" />
            <span>Média Direta</span>
          </button>

          <button
            type="button"
            onClick={() => setConsumptionMode('monthly')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              consumptionMode === 'monthly'
                ? 'shadow-xs text-[var(--secondary-fg)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            style={
              consumptionMode === 'monthly'
                ? { backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }
                : {}
            }
          >
            <Calendar className="w-4 h-4" />
            <span>Mês a Mês (12 Meses)</span>
          </button>

          <button
            type="button"
            onClick={() => setConsumptionMode('load_table')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              consumptionMode === 'load_table'
                ? 'shadow-xs text-[var(--secondary-fg)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            style={
              consumptionMode === 'load_table'
                ? { backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }
                : {}
            }
          >
            <Layers className="w-4 h-4" />
            <span>Tabela de Carga (Estimado)</span>
          </button>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* MODO 1: MÉDIA DIRETA                                                   */}
        {/* ----------------------------------------------------------------------- */}
        {consumptionMode === 'direct' && (
          <div
            className="p-5 rounded-2xl border space-y-4 animate-in fade-in duration-150"
            style={{ backgroundColor: theme.background, borderColor: theme.border }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h5 className="text-sm font-bold text-[var(--text)]">
                  Informar Média Mensal de Consumo
                </h5>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Digite a média que consta no histórico da fatura de energia ou calculada para o imóvel.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Mais Rápido
              </span>
            </div>

            <div className="max-w-md space-y-2">
              <label className="block text-xs font-bold text-[var(--dim)]">
                Consumo Médio Mensal (kWh/mês) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={directAvgKWh}
                  onChange={(e) => setDirectAvgKWh(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Ex: 650"
                  className="w-full h-12 px-4 pr-24 rounded-xl border text-lg font-black outline-none focus:border-[var(--secondary)]"
                  style={{
                    backgroundColor: theme.primary,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--muted)]">
                  kWh / mês
                </span>
              </div>
            </div>

            {/* Atalhos Rápidos de Consumo */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-[var(--muted)]">
                Valores frequentes ou ajustes rápidos:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {[250, 450, 650, 850, 1200, 2000].map((presetVal) => (
                  <button
                    key={presetVal}
                    type="button"
                    onClick={() => setDirectAvgKWh(presetVal)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-[var(--dim)] hover:text-[var(--text)] hover:border-[var(--secondary)] transition-all cursor-pointer"
                    style={{ backgroundColor: theme.primary, borderColor: theme.border }}
                  >
                    {presetVal} kWh
                  </button>
                ))}
                {selectedTarget?.monthlyConsumptionKWh && selectedTarget.monthlyConsumptionKWh > 0 && (
                  <button
                    type="button"
                    onClick={() => setDirectAvgKWh(selectedTarget.monthlyConsumptionKWh || 450)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-bold text-[var(--secondary)] transition-all cursor-pointer flex items-center gap-1"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--secondary) 10%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                    }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Valor do Lead ({selectedTarget.monthlyConsumptionKWh} kWh)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* MODO 2: HISTÓRICO MÊS A MÊS (12 MESES)                                 */}
        {/* ----------------------------------------------------------------------- */}
        {consumptionMode === 'monthly' && (
          <div
            className="p-5 rounded-2xl border space-y-4 animate-in fade-in duration-150"
            style={{ backgroundColor: theme.background, borderColor: theme.border }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: theme.border }}>
              <div>
                <h5 className="text-sm font-bold text-[var(--text)]">
                  Histórico dos Últimos 12 Meses de Fatura
                </h5>
                <p className="text-xs text-[var(--muted)]">
                  Informe o consumo de cada mês para extrair a média ponderada com exatidão e analisar sazonalidade.
                </p>
              </div>

              {/* Botões de Ação em Lote */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={bulkMonthVal}
                    onChange={(e) => setBulkMonthVal(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Ex: 500"
                    className="w-20 h-8 px-2 rounded-lg border text-xs font-bold outline-none"
                    style={{ backgroundColor: theme.primary, borderColor: theme.border }}
                  />
                  <button
                    type="button"
                    onClick={handleFillAllMonths}
                    className="h-8 px-2.5 rounded-lg text-xs font-semibold border hover:border-[var(--secondary)] transition-colors cursor-pointer"
                    style={{ backgroundColor: theme.primary, borderColor: theme.border }}
                    title="Preencher todos os 12 meses com este valor"
                  >
                    Preencher Todos
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleClearAllMonths}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold text-[var(--muted)] hover:text-red-400 border transition-colors cursor-pointer"
                  style={{ borderColor: theme.border }}
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Grade dos 12 Meses */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {monthlyValues.map((item, idx) => (
                <div
                  key={item.month}
                  className="p-2.5 rounded-xl border flex flex-col gap-1 transition-all focus-within:border-[var(--secondary)]"
                  style={{ backgroundColor: theme.primary, borderColor: theme.border }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--muted)]">
                      {idx + 1}. {item.month}
                    </span>
                    {typeof item.value === 'number' && item.value > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={item.value}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : '';
                        setMonthlyValues((prev) =>
                          prev.map((m, i) => (i === idx ? { ...m, value: val } : m))
                        );
                      }}
                      placeholder="0"
                      className="w-full h-8 px-2 pr-9 rounded-lg border text-xs font-bold outline-none focus:border-[var(--secondary)]"
                      style={{
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        color: theme.text,
                      }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[var(--muted)]">
                      kWh
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Barra Visual de Sazonalidade */}
            {monthlyMetrics.count > 0 && (
              <div
                className="p-3.5 rounded-xl border space-y-2"
                style={{ backgroundColor: theme.primary, borderColor: theme.border }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--muted)] flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-[var(--secondary)]" />
                    Curva de Consumo Anual (Sazonalidade)
                  </span>
                  <span className="text-[11px] text-[var(--muted)]">
                    {monthlyMetrics.count} de 12 meses preenchidos
                  </span>
                </div>

                {/* Barrinhas */}
                <div className="h-14 flex items-end gap-1.5 pt-2">
                  {monthlyValues.map((m) => {
                    const val = typeof m.value === 'number' ? m.value : 0;
                    const maxVal = monthlyMetrics.max || 1;
                    const heightPercent = val > 0 ? Math.max(15, Math.round((val / maxVal) * 100)) : 4;
                    const isPeak = val === monthlyMetrics.max && val > 0;

                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <div
                          className="w-full rounded-t-md transition-all group relative"
                          style={{
                            height: `${heightPercent}%`,
                            backgroundColor: isPeak
                              ? 'var(--secondary)'
                              : 'color-mix(in srgb, var(--secondary) 40%, var(--border))',
                          }}
                          title={`${m.month}: ${val} kWh`}
                        />
                        <span className="text-[9px] font-semibold text-[var(--muted)]">
                          {m.month}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Métricas do Histórico */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t text-xs" style={{ borderColor: theme.border }}>
                  <div>
                    <span className="text-[10px] text-[var(--muted)] block">Média Extraída</span>
                    <strong className="text-sm font-black text-[var(--secondary)]">
                      {monthlyMetrics.avg} kWh/mês
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--muted)] block">Mês de Pico (Máx)</span>
                    <strong className="text-sm font-bold text-[var(--text)]">
                      {monthlyMetrics.max} kWh
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--muted)] block">Mês Mínimo</span>
                    <strong className="text-sm font-bold text-[var(--text)]">
                      {monthlyMetrics.min} kWh
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--muted)] block">Total Anual Estimado</span>
                    <strong className="text-sm font-bold text-[var(--text)]">
                      {monthlyMetrics.totalAnnual.toLocaleString('pt-BR')} kWh/ano
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* MODO 3: TABELA DE CARGA (CONSUMO ESTIMADO)                             */}
        {/* ----------------------------------------------------------------------- */}
        {consumptionMode === 'load_table' && (
          <div
            className="p-5 rounded-2xl border space-y-4 animate-in fade-in duration-150"
            style={{ backgroundColor: theme.background, borderColor: theme.border }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: theme.border }}>
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="text-sm font-bold text-[var(--text)]">
                    Tabela de Cargas (Levantamento de Aparelhos)
                  </h5>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Imóveis Novos / Sítios / Sem Fatura
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Adicione e edite os aparelhos para projetar o consumo com base na rotina de uso e potências reais.
                </p>
              </div>

              {/* Botão para Nova Carga */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    resetLoadForm();
                    setIsAddingCustomLoad(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
                  style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Nova Carga</span>
                </button>
              </div>
            </div>

            {/* Adição Rápida por Chips de Cargas Pré-definidas (Apenas clique para adicionar) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)] flex items-center gap-1.5">
                  <span>Cargas Pré-definidas (Clique para adicionar à tabela):</span>
                </span>
                <span className="text-[10px] text-[var(--muted)]">
                  {PRESET_APPLIANCES.length} aparelhos comuns
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap max-h-32 overflow-y-auto pr-1">
                {PRESET_APPLIANCES.map((preset, pIdx) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleAddPresetLoad(pIdx)}
                    className="px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold text-[var(--dim)] hover:text-[var(--text)] hover:border-[var(--secondary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98]"
                    style={{ backgroundColor: theme.primary, borderColor: theme.border }}
                    title={`Clique para adicionar "${preset.name}" à tabela de cargas`}
                  >
                    <Plus className="w-3 h-3 text-[var(--secondary)]" />
                    <span>{preset.name}</span>
                    <span className="text-[10px] opacity-60">({preset.powerW}W)</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Formulário de Adicionar / Editar Carga */}
            {isAddingCustomLoad && (
              <form
                onSubmit={handleSaveLoad}
                className="p-4 rounded-xl border space-y-3 animate-in fade-in duration-150"
                style={{
                  backgroundColor: theme.primary,
                  borderColor: 'color-mix(in srgb, var(--secondary) 40%, transparent)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {editingLoadId ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                        Editando Carga Salva
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        Nova Carga
                      </span>
                    )}
                    <h6 className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                      {editingLoadId
                        ? `Editar Carga: ${customLoadName || 'Equipamento'}`
                        : 'Adicionar Nova Carga Personalizada'}
                    </h6>
                  </div>

                  <button
                    type="button"
                    onClick={resetLoadForm}
                    className="btn-cancel btn-text text-xs text-[var(--muted)] hover:text-[var(--text)] cursor-pointer !bg-transparent hover:!bg-transparent transition-colors"
                    data-text-only="true"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-[var(--dim)] mb-1">
                      Nome da Carga / Equipamento *
                    </label>
                    <input
                      type="text"
                      required
                      value={customLoadName}
                      onChange={(e) => setCustomLoadName(e.target.value)}
                      placeholder="Ex: Ar-condicionado 9.000 BTUs, Geladeira..."
                      className="w-full h-9 px-3 rounded-lg border text-xs font-medium outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--dim)] mb-1">
                      Potência (Watts) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={customLoadPowerW}
                      onChange={(e) => setCustomLoadPowerW(e.target.value ? Number(e.target.value) : '')}
                      placeholder="Ex: 800"
                      className="w-full h-9 px-3 rounded-lg border text-xs font-medium outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--dim)] mb-1">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={customLoadQty}
                      onChange={(e) => setCustomLoadQty(e.target.value ? Number(e.target.value) : '')}
                      placeholder="1"
                      className="w-full h-9 px-3 rounded-lg border text-xs font-medium outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--dim)] mb-1">
                      Uso (Horas/dia)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="24"
                      value={customLoadHours}
                      onChange={(e) => setCustomLoadHours(e.target.value ? Number(e.target.value) : '')}
                      placeholder="4"
                      className="w-full h-9 px-3 rounded-lg border text-xs font-medium outline-none focus:border-[var(--secondary)]"
                      style={{ backgroundColor: theme.background, borderColor: theme.border }}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <label className="text-[11px] font-semibold text-[var(--dim)] mr-2">
                        Dias de uso no mês:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={customLoadDays}
                        onChange={(e) => setCustomLoadDays(e.target.value ? Number(e.target.value) : '')}
                        className="w-16 h-8 px-2 rounded-lg border text-xs text-center font-medium outline-none focus:border-[var(--secondary)]"
                        style={{ backgroundColor: theme.background, borderColor: theme.border }}
                      />
                    </div>

                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--text)]">
                      <input
                        type="checkbox"
                        checked={customLoadPriority}
                        onChange={(e) => setCustomLoadPriority(e.target.checked)}
                        className="rounded accent-[var(--secondary)] cursor-pointer"
                      />
                      <span>Prioritário para Backup (Híbrido)</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={resetLoadForm}
                      className="btn-cancel px-3 py-1.5 rounded-lg border text-xs text-[var(--muted)] hover:text-[var(--text)] cursor-pointer !bg-transparent hover:!bg-transparent transition-colors"
                      data-text-only="true"
                      style={{ borderColor: theme.border }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg text-xs font-bold shadow-xs hover:brightness-110 cursor-pointer flex items-center gap-1.5"
                      style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Carga</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Listagem das Cargas Cadastradas na Proposta */}
            {loadItems.length === 0 ? (
              <div
                className="p-8 rounded-xl border border-dashed text-center space-y-2"
                style={{ borderColor: theme.border }}
              >
                <Layers className="w-8 h-8 text-[var(--dim)] mx-auto opacity-50" />
                <p className="text-xs font-bold text-[var(--text)]">Nenhuma carga adicionada ainda</p>
                <p className="text-[11px] text-[var(--muted)] max-w-sm mx-auto">
                  Clique nas cargas pré-definidas acima ou adicione uma nova carga para calcular o consumo mensal estimado.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: theme.border }}>
                <table className="w-full text-left text-xs">
                  <thead
                    className="border-b text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider"
                    style={{ backgroundColor: theme.primary, borderColor: theme.border }}
                  >
                    <tr>
                      <th className="py-2.5 px-3">Carga / Equipamento</th>
                      <th className="py-2.5 px-2">Potência</th>
                      <th className="py-2.5 px-2 text-center">Qtd</th>
                      <th className="py-2.5 px-2 text-center">Horas/dia</th>
                      <th className="py-2.5 px-2 text-center">Dias/mês</th>
                      <th className="py-2.5 px-3 text-right">Consumo Mensal</th>
                      {systemType === 'Híbrido' && <th className="py-2.5 px-2 text-center">Backup?</th>}
                      <th className="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: theme.border }}>
                    {loadItems.map((item) => {
                      const kwh = (item.powerW * item.quantity * item.hoursPerDay * item.daysPerMonth) / 1000;
                      const isRowEditing = editingLoadId === item.id;
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isRowEditing
                              ? 'bg-[var(--secondary)]/10 font-medium'
                              : 'hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
                        >
                          <td className="py-2 px-3 font-semibold text-[var(--text)]">
                            <div className="flex items-center gap-1.5">
                              {isRowEditing && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)]" />
                              )}
                              <span>{item.name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-[var(--muted)] font-medium">
                            {item.powerW} W
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-[var(--text)]">
                            {item.quantity}
                          </td>
                          <td className="py-2 px-2 text-center text-[var(--muted)]">
                            {item.hoursPerDay}h
                          </td>
                          <td className="py-2 px-2 text-center text-[var(--muted)]">
                            {item.daysPerMonth}d
                          </td>
                          <td className="py-2 px-3 text-right font-black text-[var(--secondary)]">
                            {kwh.toFixed(1)} kWh
                          </td>
                          {systemType === 'Híbrido' && (
                            <td className="py-2 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={item.isPriorityBackup}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setLoadItems((prev) =>
                                    prev.map((it) =>
                                      it.id === item.id ? { ...it, isPriorityBackup: checked } : it
                                    )
                                  );
                                }}
                                className="rounded accent-purple-500 cursor-pointer"
                                title="Marcar como carga prioritária no backup de bateria"
                              />
                            </td>
                          )}
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditSavedLoad(item)}
                                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                                  isRowEditing
                                    ? 'bg-[var(--secondary)] text-[var(--secondary-fg)] border-transparent font-bold'
                                    : 'text-[var(--muted)] hover:text-[var(--text)] border-transparent hover:border-[var(--border)]'
                                }`}
                                title="Editar esta carga salva"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span className="text-[10px] hidden sm:inline">Editar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveLoad(item.id)}
                                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Remover carga da tabela"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totalizador da Tabela de Carga */}
            {loadItems.length > 0 && (
              <div
                className="p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                style={{
                  backgroundColor: theme.primary,
                  borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                }}
              >
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Total Estimado pela Tabela de Carga:
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xl font-black text-[var(--secondary)]">
                      {loadTableMetrics.totalKWhMonth} kWh/mês
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      • Potência instalada de cargas: {loadTableMetrics.totalPeakPowerKW} kW
                    </span>
                  </div>
                </div>

                {systemType === 'Híbrido' && loadTableMetrics.priorityKWhDay > 0 && (
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold uppercase text-purple-400">
                      Cargas Prioritárias (Backup):
                    </span>
                    <div className="text-xs font-bold text-purple-300">
                      {loadTableMetrics.priorityKWhDay} kWh/dia • Pico: {loadTableMetrics.priorityPeakPowerKW} kW
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 3: PARÂMETROS DA DISTRIBUIDORA & TARIFA ATUAL                       */}
      {/* ========================================================================= */}
      <div
        className="p-4 sm:p-5 rounded-2xl border space-y-4"
        style={{ backgroundColor: theme.background, borderColor: theme.border }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[var(--secondary)]" />
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--text)]">
              3. Parâmetros da Concessionária & Fatura
            </h4>
          </div>
          <span className="text-xs text-[var(--muted)]">
            Ajuste a tarifa e a infraestrutura de entrada
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Distribuidora */}
          <div>
            <label className="block text-xs font-semibold text-[var(--dim)] mb-1">
              Distribuidora de Energia
            </label>
            <input
              type="text"
              value={concessionaria}
              onChange={(e) => setConcessionaria(e.target.value)}
              placeholder="Ex: CPFL Paulista, Enel, Cemig, Light"
              className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)]"
              style={{
                backgroundColor: theme.primary,
                borderColor: theme.border,
                color: theme.text,
              }}
            />
          </div>

          {/* Tipo de Ligação / Custo de Disp. */}
          <div>
            <label className="block text-xs font-semibold text-[var(--dim)] mb-1">
              Padrão de Entrada (Ligação)
            </label>
            <select
              value={connectionType}
              onChange={(e) => setConnectionType(e.target.value as SolarConnectionType)}
              className="w-full h-10 px-3 rounded-lg border text-xs sm:text-sm font-medium outline-none focus:border-[var(--secondary)] cursor-pointer"
              style={{
                backgroundColor: theme.primary,
                borderColor: theme.border,
                color: theme.text,
              }}
            >
              <option value="Monofásica" style={{ backgroundColor: theme.primary, color: theme.text }}>
                Monofásica (Taxa mín: 30 kWh)
              </option>
              <option value="Bifásica" style={{ backgroundColor: theme.primary, color: theme.text }}>
                Bifásica (Taxa mín: 50 kWh)
              </option>
              <option value="Trifásica" style={{ backgroundColor: theme.primary, color: theme.text }}>
                Trifásica (Taxa mín: 100 kWh)
              </option>
            </select>
          </div>

          {/* Tarifa de Energia (R$/kWh) */}
          <div>
            <label className="block text-xs font-semibold text-[var(--dim)] mb-1">
              Tarifa com Impostos (R$/kWh)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--muted)]">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={energyTariff}
                onChange={(e) => setEnergyTariff(Number(e.target.value) || 0.92)}
                placeholder="0.92"
                className="w-full h-10 pl-9 pr-3 rounded-lg border text-xs sm:text-sm font-bold outline-none focus:border-[var(--secondary)]"
                style={{
                  backgroundColor: theme.primary,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              />
            </div>
          </div>

          {/* Iluminação Pública / Outros */}
          <div>
            <label className="block text-xs font-semibold text-[var(--dim)] mb-1">
              Taxa de Iluminação (CIP/COSIP)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--muted)]">
                R$
              </span>
              <input
                type="number"
                step="1"
                min="0"
                value={publicLightingTax}
                onChange={(e) => setPublicLightingTax(Number(e.target.value) || 0)}
                placeholder="35.00"
                className="w-full h-10 pl-9 pr-3 rounded-lg border text-xs sm:text-sm font-bold outline-none focus:border-[var(--secondary)]"
                style={{
                  backgroundColor: theme.primary,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              />
            </div>
          </div>
        </div>

        {/* Informações Regulatórias da Conexão */}
        <div
          className="p-3 rounded-xl border text-xs flex items-center justify-between flex-wrap gap-2 text-[var(--muted)]"
          style={{ backgroundColor: theme.primary, borderColor: theme.border }}
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[var(--secondary)] shrink-0" />
            <span>
              Custo de disponibilidade: <strong>{availabilityCost} kWh/mês</strong>. Consumo compensável solar estimado: <strong>{compensableKWh} kWh/mês</strong>.
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[var(--secondary)]">
            Fórmula de compensação homologada ANEEL
          </span>
        </div>
      </div>
    </div>
  );
};
