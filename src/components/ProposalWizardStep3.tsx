import React, { useState, useMemo, useEffect } from 'react';
import {
  Sun,
  Zap,
  Layers,
  Battery,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Search,
  Plus,
  ArrowRight,
  RotateCcw,
  Sliders,
  Info,
  Maximize2,
  Package,
  Wrench,
  Percent,
  X,
  FileCheck,
} from 'lucide-react';
import { ThemeConfig, SolarProposal, SolarConnectionType, SolarKit, SolarSystemType } from '../types';
import { calculateOnGridMonthlySizing } from '../utils/solarSizing';
import {
  BRAZIL_STATE_HSP,
  getStoredKits,
  saveStoredKits,
  addCustomKit,
} from '../data/initialKits';

interface ProposalWizardStep3Props {
  theme: ThemeConfig;
  clientState?: string;
  clientCity?: string;
  effectiveAverageKWh: number;
  systemType: 'On-Grid' | 'Híbrido';
  connectionType: SolarConnectionType;
  backupAutonomyHours: number;
  // Campos de dimensionamento controlados pelo Wizard pai
  hsp: number;
  setHsp: (val: number) => void;
  performanceRatio: number;
  setPerformanceRatio: (val: number) => void;
  targetCoveragePercent: number;
  setTargetCoveragePercent: (val: number) => void;
  modulePowerW: number;
  setModulePowerW: (val: number) => void;
  moduleModel: string;
  setModuleModel: (val: string) => void;
  modulesCount: number;
  setModulesCount: (val: number) => void;
  installedPowerKWp: number;
  setInstalledPowerKWp: (val: number) => void;
  inverterModel: string;
  setInverterModel: (val: string) => void;
  batteryModel: string;
  setBatteryModel: (val: string) => void;
  batteryCount: number;
  setBatteryCount: (val: number) => void;
  batteryCapacityKWh: number;
  setBatteryCapacityKWh: (val: number) => void;
  selectedKit: SolarKit | null;
  setSelectedKit: (kit: SolarKit | null) => void;
  estimatedMonthlyGenKWh: number;
  setEstimatedMonthlyGenKWh: (val: number) => void;
  totalKitPrice: number;
  setTotalKitPrice: (val: number) => void;
  onShowToast?: (msg: string) => void;
}

export const ProposalWizardStep3: React.FC<ProposalWizardStep3Props> = ({
  theme,
  clientState = 'SP',
  clientCity,
  effectiveAverageKWh,
  systemType,
  connectionType,
  backupAutonomyHours,
  hsp,
  setHsp,
  performanceRatio,
  setPerformanceRatio,
  targetCoveragePercent,
  setTargetCoveragePercent,
  modulePowerW,
  setModulePowerW,
  moduleModel,
  setModuleModel,
  modulesCount,
  setModulesCount,
  installedPowerKWp,
  setInstalledPowerKWp,
  inverterModel,
  setInverterModel,
  batteryModel,
  setBatteryModel,
  batteryCount,
  setBatteryCount,
  batteryCapacityKWh,
  setBatteryCapacityKWh,
  selectedKit,
  setSelectedKit,
  estimatedMonthlyGenKWh,
  setEstimatedMonthlyGenKWh,
  totalKitPrice,
  setTotalKitPrice,
  onShowToast,
}) => {
  // Catálogo de Kits carregado do armazenamento da futura aba Kits
  const [kitsList, setKitsList] = useState<SolarKit[]>(() => getStoredKits());
  const [kitFilterType, setKitFilterType] = useState<'all' | 'On-Grid' | 'Híbrido'>('all');
  const [kitSearchQuery, setKitSearchQuery] = useState('');
  const [showAddKitModal, setShowAddKitModal] = useState(false);

  // Formulário de Cadastro de Novo Kit para a futura aba "Kits"
  const [newKitName, setNewKitName] = useState('');
  const [newKitType, setNewKitType] = useState<SolarSystemType>(systemType);
  const [newKitPowerKWp, setNewKitPowerKWp] = useState<number | ''>(5.5);
  const [newKitModuleModel, setNewKitModuleModel] = useState('Canadian Solar 550W TOPCon');
  const [newKitModuleCount, setNewKitModuleCount] = useState<number | ''>(10);
  const [newKitModulePowerW, setNewKitModulePowerW] = useState<number | ''>(550);
  const [newKitInverterModel, setNewKitInverterModel] = useState('Inversor Solar Deye 5kW 220V');
  const [newKitBatteryModel, setNewKitBatteryModel] = useState('Bateria Lítio LiFePO4 5.12kWh 48V');
  const [newKitBatteryCap, setNewKitBatteryCap] = useState<number | ''>(5.12);
  const [newKitBatteryCount, setNewKitBatteryCount] = useState<number | ''>(1);
  const [newKitStructure, setNewKitStructure] = useState('Telhado Cerâmico / Fibrocimento');
  const [newKitEquipCost, setNewKitEquipCost] = useState<number | ''>(12500);
  const [newKitSuggestedPrice, setNewKitSuggestedPrice] = useState<number | ''>(17900);
  const [newKitWarranty, setNewKitWarranty] = useState('Módulos 12 anos / Inversor 10 anos');
  const [newKitNotes, setNewKitNotes] = useState('');
  const [applyKitImmediatelyOnCreate, setApplyKitImmediatelyOnCreate] = useState(true);

  // Sugestão de HSP com base no estado do cliente
  const stateHspSuggestion = useMemo(() => {
    const uf = (clientState || 'SP').toUpperCase().trim();
    return BRAZIL_STATE_HSP[uf] || 5.0;
  }, [clientState]);

  // Recalcular dimensionamento teórico instantâneo
  const theoreticalCalculations = useMemo(() => {
    const cons = effectiveAverageKWh > 0 ? effectiveAverageKWh : 450;
    const hspVal = Math.max(0.5, Number(hsp) || 5.0);
    const prVal = Math.max(10, Math.min(100, Number(performanceRatio) || 80)) / 100;
    const coverage = Math.max(1, Number(targetCoveragePercent) > 0 ? Number(targetCoveragePercent) : 100) / 100;

    // Usa a fonte única do pré-dimensionamento mensal On-Grid.
    // P (kWp) = (Consumo Mensal * Cobertura) / (30 dias * HSP * PR)
    const modW = Math.max(100, Number(modulePowerW) || 550);
    const sizing = calculateOnGridMonthlySizing({
      monthlyConsumptionKWh: cons,
      connectionType,
      hsp: hspVal,
      performanceRatioPercent: prVal * 100,
      targetCoveragePercent: coverage * 100,
      modulePowerW: modW,
    });
    const requiredPowerKWp = sizing.requiredPowerKWp;
    const calculatedModules = sizing.modulesCount;
    const calculatedInstalledKWp = sizing.installedPowerKWp;
    const calculatedGenKWh = Math.round(sizing.estimatedMonthlyGenerationKWh);

    // Área estimada de telhado (~2.58 m² por módulo de 550-650W)
    const estimatedAreaM2 = Number((calculatedModules * 2.58).toFixed(1));

    // Inversor sugerido
    const suggestedInverterKW = Math.max(3, Math.ceil(calculatedInstalledKWp));

    return {
      requiredPowerKWp: Number(requiredPowerKWp.toFixed(2)),
      calculatedModules,
      calculatedInstalledKWp,
      calculatedGenKWh,
      estimatedAreaM2,
      suggestedInverterKW,
      prPercent: Math.round(prVal * 100),
      lossPercent: Math.round((1 - prVal) * 100),
    };
  }, [effectiveAverageKWh, hsp, performanceRatio, targetCoveragePercent, modulePowerW]);

  // Se nenhum kit estiver selecionado, sincroniza os cálculos teóricos com as variáveis do pai
  useEffect(() => {
    if (!selectedKit) {
      setModulesCount(theoreticalCalculations.calculatedModules);
      setInstalledPowerKWp(theoreticalCalculations.calculatedInstalledKWp);
      setEstimatedMonthlyGenKWh(theoreticalCalculations.calculatedGenKWh);
      if (!inverterModel) {
        setInverterModel(
          systemType === 'Híbrido'
            ? `Inversor Híbrido Deye ${theoreticalCalculations.suggestedInverterKW}kW com Backup EPS`
            : `Inversor Solar Deye ${theoreticalCalculations.suggestedInverterKW}kW Monofásico/Bifásico`
        );
      }
      if (!moduleModel) {
        setModuleModel(`Painel Solar Canadian ${modulePowerW}W Bifacial TOPCon`);
      }
      if (totalKitPrice === 0) {
        const baseVal = Math.round(theoreticalCalculations.calculatedInstalledKWp * 2950);
        const hybridAdd = systemType === 'Híbrido' ? (batteryCount || 1) * 9800 + 3500 : 0;
        setTotalKitPrice(baseVal + hybridAdd);
      }
    }
  }, [
    selectedKit,
    theoreticalCalculations,
    systemType,
    modulePowerW,
    inverterModel,
    moduleModel,
    batteryCount,
    totalKitPrice,
    setModulesCount,
    setInstalledPowerKWp,
    setEstimatedMonthlyGenKWh,
    setInverterModel,
    setModuleModel,
    setTotalKitPrice,
  ]);

  // Se o usuário selecionar um Kit do catálogo da aba Kits
  const handleSelectKit = (kit: SolarKit) => {
    setSelectedKit(kit);
    const kwp = kit.powerKWp || kit.maxPowerKWp || 5.0;
    const modCount = kit.moduleCount || Math.ceil((kwp * 1000) / (kit.modulePowerW || 550));
    const modW = kit.modulePowerW || 550;
    const hspVal = Math.max(0.5, Number(hsp) || 5.0);
    const prVal = Math.max(10, Math.min(100, Number(performanceRatio) || 80)) / 100;
    const daysInMonth = 30;

    // Mantém o mesmo critério mensal do dimensionamento (30 dias).
    const genKWh = Math.round(kwp * hspVal * daysInMonth * prVal);

    setInstalledPowerKWp(kwp);
    setModulesCount(modCount);
    setModulePowerW(modW);
    if (kit.moduleModel) setModuleModel(kit.moduleModel);
    if (kit.inverterModel) setInverterModel(kit.inverterModel);
    if (kit.systemType === 'Híbrido') {
      if (kit.batteryModel) setBatteryModel(kit.batteryModel);
      if (kit.batteryCount) setBatteryCount(kit.batteryCount);
      if (kit.batteryCapacityKWh) setBatteryCapacityKWh(kit.batteryCapacityKWh);
    }
    setEstimatedMonthlyGenKWh(genKWh);

    const price = kit.suggestedPrice || Math.round(kwp * 3000);
    setTotalKitPrice(price);

    onShowToast?.(`Kit "${kit.name}" aplicado à proposta com sucesso!`);
  };

  // Desvincular kit e voltar ao dimensionamento livre
  const handleUnselectKit = () => {
    setSelectedKit(null);
    setModulesCount(theoreticalCalculations.calculatedModules);
    setInstalledPowerKWp(theoreticalCalculations.calculatedInstalledKWp);
    setEstimatedMonthlyGenKWh(theoreticalCalculations.calculatedGenKWh);
    const baseVal = Math.round(theoreticalCalculations.calculatedInstalledKWp * 2950);
    const hybridAdd = systemType === 'Híbrido' ? (batteryCount || 1) * 9800 + 3500 : 0;
    setTotalKitPrice(baseVal + hybridAdd);
    onShowToast?.('Kit desvinculado. Retornado para dimensionamento personalizado.');
  };

  // Salvar novo Kit no catálogo persistente da futura aba "Kits"
  const handleCreateNewKit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKitName.trim()) {
      onShowToast?.('Por favor, informe o nome do Kit.');
      return;
    }
    const kwpNum = Number(newKitPowerKWp) || 5.0;
    const modCountNum = Number(newKitModuleCount) || Math.ceil((kwpNum * 1000) / (Number(newKitModulePowerW) || 550));
    const modWNum = Number(newKitModulePowerW) || 550;

    const created = addCustomKit({
      name: newKitName.trim(),
      systemType: newKitType,
      powerKWp: kwpNum,
      minPowerKWp: Number((kwpNum * 0.95).toFixed(2)),
      maxPowerKWp: Number((kwpNum * 1.05).toFixed(2)),
      moduleModel: newKitModuleModel.trim(),
      moduleCount: modCountNum,
      modulePowerW: modWNum,
      inverterModel: newKitInverterModel.trim(),
      inverterPowerKW: Math.max(3, Math.ceil(kwpNum)),
      batteryModel: newKitType === 'Híbrido' ? newKitBatteryModel.trim() : undefined,
      batteryCapacityKWh: newKitType === 'Híbrido' ? Number(newKitBatteryCap) || 5.12 : undefined,
      batteryCount: newKitType === 'Híbrido' ? Number(newKitBatteryCount) || 1 : undefined,
      structureType: newKitStructure,
      equipmentCost: Number(newKitEquipCost) || Math.round(kwpNum * 2200),
      suggestedPrice: Number(newKitSuggestedPrice) || Math.round(kwpNum * 3100),
      warrantyTerms: newKitWarranty.trim() || 'Módulos 12 anos / Inversor 10 anos',
      notes: newKitNotes.trim() || 'Kit adicionado via dimensionamento.',
      active: true,
      installationCost: Math.round(kwpNum * 500),
      engineeringCost: 800,
      utilityFee: 350,
      freightCost: 500,
      otherCosts: 300,
      taxesPercent: 4.5,
      commissionPercent: 5.0,
      targetMarginPercent: 22.0,
      items: [],
    });

    const refreshed = getStoredKits();
    setKitsList(refreshed);
    setShowAddKitModal(false);

    if (applyKitImmediatelyOnCreate) {
      handleSelectKit(created);
      onShowToast?.(`Kit "${created.name}" cadastrado na aba Kits e aplicado à proposta!`);
    } else {
      onShowToast?.(`Kit "${created.name}" salvo no catálogo da aba Kits!`);
    }
  };

  // Filtragem dos kits no catálogo
  const filteredKits = useMemo(() => {
    return kitsList.filter((k) => {
      if (kitFilterType !== 'all' && k.systemType !== kitFilterType) return false;
      if (kitSearchQuery.trim()) {
        const q = kitSearchQuery.toLowerCase();
        const matchName = k.name.toLowerCase().includes(q);
        const matchSku = k.sku?.toLowerCase().includes(q);
        const matchMod = k.moduleModel?.toLowerCase().includes(q);
        const matchInv = k.inverterModel?.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchMod && !matchInv) return false;
      }
      return true;
    });
  }, [kitsList, kitFilterType, kitSearchQuery]);

  // Identificar o Kit mais compatível com a potência teórica requerida
  const bestMatchingKit = useMemo(() => {
    if (kitsList.length === 0) return null;
    const targetKWp = theoreticalCalculations.requiredPowerKWp;
    let closestKit: SolarKit | null = null;
    let minDiff = Infinity;

    kitsList.forEach((kit) => {
      // Prioriza mesmo tipo de sistema
      if (kit.systemType !== systemType) return;
      const kwp = kit.powerKWp || kit.maxPowerKWp || 0;
      const diff = Math.abs(kwp - targetKWp);
      if (diff < minDiff) {
        minDiff = diff;
        closestKit = kit;
      }
    });

    return closestKit;
  }, [kitsList, theoreticalCalculations.requiredPowerKWp, systemType]);

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DA ETAPA 3 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: theme.border }}>
        <div>
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-xs"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                color: theme.secondary,
              }}
            >
              Etapa 3 de 4
            </span>
            <span className="text-xs text-[var(--muted)]">Dimensionamento & Catálogo de Kits</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-[var(--text)] mt-0.5 flex items-center gap-2">
            <Sun className="w-5 h-5 text-[var(--secondary)]" />
            <span>Dimensionamento Solar & Seleção de Kits</span>
          </h4>
        </div>

        {/* Resumo da demanda vinda da Etapa 2 */}
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-xl border text-xs"
          style={{ backgroundColor: theme.primary, borderColor: theme.border }}
        >
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-[var(--muted)]">Consumo da Fatura</span>
            <span className="font-extrabold text-[var(--text)] text-sm">
              {effectiveAverageKWh.toLocaleString('pt-BR')} <span className="text-xs font-normal opacity-70">kWh/mês</span>
            </span>
          </div>
          <div className="w-[1px] h-6 bg-[var(--border)]" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-[var(--muted)]">Tipo de Sistema</span>
            <span
              className={`font-bold text-xs ${
                systemType === 'Híbrido' ? 'text-amber-500' : 'text-emerald-500'
              }`}
            >
              {systemType} ({connectionType})
            </span>
          </div>
        </div>
      </div>

      {/* SEÇÃO 1: PARÂMETROS TÉCNICOS FUNDAMENTAIS (HSP + FATOR DE RENDIMENTO) */}
      <div
        className="rounded-2xl border p-4 sm:p-5 space-y-4 shadow-xs"
        style={{ backgroundColor: theme.card, borderColor: theme.border }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center border shadow-xs"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                color: theme.secondary,
              }}
            >
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-[var(--text)]">Parâmetros de Radiação & Desempenho</h5>
              <p className="text-[11px] text-[var(--muted)]">
                Ajuste os índices para calcular a potência teórica e geração esperada.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setHsp(stateHspSuggestion);
              setPerformanceRatio(80);
              setTargetCoveragePercent(100);
              onShowToast?.('Valores padrão de HSP e Rendimento restaurados!');
            }}
            className="px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer flex items-center gap-1.5"
            style={{ borderColor: theme.border }}
            title="Restaurar valores padrão"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Restaurar Padrões</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* CAMPO 1: HSP (Horas de Sol Pleno) */}
          <div
            className="p-3.5 rounded-xl border space-y-2.5"
            style={{ backgroundColor: theme.primary, borderColor: theme.border }}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>HSP (Horas de Sol Pleno) *</span>
              </label>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                kWh/m²/dia
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="1.0"
                max="10.0"
                value={hsp}
                onChange={(e) => setHsp(Math.max(0.5, parseFloat(e.target.value) || 0))}
                className="w-full px-3 py-2 rounded-lg border text-sm font-bold text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--secondary)]"
                style={{ backgroundColor: theme.input, borderColor: theme.border }}
              />
              <button
                type="button"
                onClick={() => setHsp(stateHspSuggestion)}
                className="px-2.5 py-2 rounded-lg border text-[11px] font-semibold text-[var(--secondary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                style={{ borderColor: theme.border }}
                title={`Aplicar média sugerida para ${clientState || 'SP'} (${stateHspSuggestion} HSP)`}
              >
                Média {clientState || 'SP'} ({stateHspSuggestion})
              </button>
            </div>

            <p className="text-[10px] text-[var(--dim)] leading-tight pt-1">
              Irradiação solar diária média da localidade {clientCity ? `(${clientCity} - ${clientState})` : ''}.
            </p>
          </div>

          {/* CAMPO 2: FATOR DE RENDIMENTO (Performance Ratio - PR) */}
          <div
            className="p-3.5 rounded-xl border space-y-2.5"
            style={{ backgroundColor: theme.primary, borderColor: theme.border }}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-blue-500" />
                <span>Fator de Rendimento (PR) *</span>
              </label>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                {performanceRatio}% (Perdas: {100 - performanceRatio}%)
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="60"
                  max="95"
                  step="1"
                  value={performanceRatio}
                  onChange={(e) => setPerformanceRatio(parseInt(e.target.value) || 80)}
                  className="w-full accent-[var(--secondary)] cursor-pointer"
                />
                <input
                  type="number"
                  min="60"
                  max="95"
                  value={performanceRatio}
                  onChange={(e) => setPerformanceRatio(Math.max(50, Math.min(99, parseInt(e.target.value) || 80)))}
                  className="w-16 px-2 py-1 text-center rounded-lg border text-xs font-bold text-[var(--text)] focus:outline-hidden"
                  style={{ backgroundColor: theme.input, borderColor: theme.border }}
                />
              </div>
            </div>

            <p className="text-[10px] text-[var(--dim)] leading-tight">
              Eficiência global considerando temperatura, perdas CC/CA, sujidade e inversor.
            </p>
          </div>

          {/* CAMPO 3: META DE GERAÇÃO & POTÊNCIA DOS MÓDULOS */}
          <div
            className="p-3.5 rounded-xl border space-y-2.5"
            style={{ backgroundColor: theme.primary, borderColor: theme.border }}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-500" />
                <span>Módulos & Meta de Geração</span>
              </label>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 border border-purple-500/20">
                {targetCoveragePercent || 100}% Meta
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[var(--muted)] font-semibold block mb-1">
                  Potência do Módulo:
                </label>
                <select
                  value={modulePowerW}
                  onChange={(e) => {
                    const w = parseInt(e.target.value) || 550;
                    setModulePowerW(w);
                    setModuleModel(`Painel Solar Canadian ${w}W Bifacial TOPCon`);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg border text-xs font-bold text-[var(--text)] focus:outline-hidden"
                  style={{ backgroundColor: theme.input, borderColor: theme.border }}
                >
                  <option value={550}>550 Wp</option>
                  <option value={580}>580 Wp</option>
                  <option value={585}>585 Wp</option>
                  <option value={600}>600 Wp</option>
                  <option value={660}>660 Wp</option>
                  <option value={700}>700 Wp</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[var(--muted)] font-semibold block mb-1">
                  Meta de Geração:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    step="1"
                    placeholder="100"
                    value={targetCoveragePercent === 0 ? '' : targetCoveragePercent}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setTargetCoveragePercent(isNaN(val) ? 0 : val);
                    }}
                    className="w-full px-2.5 py-1.5 pr-7 rounded-lg border text-xs font-bold text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--secondary)]"
                    style={{ backgroundColor: theme.input, borderColor: theme.border }}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--muted)] pointer-events-none">
                    %
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-[var(--dim)] leading-tight pt-1">
              Digite a porcentagem desejada para dimensionar a geração em relação ao consumo da fatura.
            </p>
          </div>
        </div>

        {/* CARDS COM RESULTADOS DO DIMENSIONAMENTO CALCULADO */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div
            className="p-3 rounded-xl border flex flex-col justify-between"
            style={{ backgroundColor: theme.background, borderColor: theme.border }}
          >
            <span className="text-[10px] uppercase font-bold text-[var(--muted)] flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Potência Calculada</span>
            </span>
            <div className="mt-1">
              <div className="text-base sm:text-lg font-black text-[var(--text)]">
                {installedPowerKWp.toFixed(2)} <span className="text-xs font-bold text-[var(--secondary)]">kWp</span>
              </div>
              <span className="text-[10px] text-[var(--muted)] block">
                Teórico: {theoreticalCalculations.requiredPowerKWp} kWp
              </span>
            </div>
          </div>

          <div
            className="p-3 rounded-xl border flex flex-col justify-between"
            style={{ backgroundColor: theme.background, borderColor: theme.border }}
          >
            <span className="text-[10px] uppercase font-bold text-[var(--muted)] flex items-center gap-1">
              <Sun className="w-3 h-3 text-emerald-500" />
              <span>Geração Estimada</span>
            </span>
            <div className="mt-1">
              <div className="text-base sm:text-lg font-black text-[var(--text)]">
                {estimatedMonthlyGenKWh.toLocaleString('pt-BR')} <span className="text-xs font-bold text-emerald-500">kWh/mês</span>
              </div>
              <span className="text-[10px] text-[var(--muted)] block">
                {effectiveAverageKWh > 0 ? `${Math.round((estimatedMonthlyGenKWh / effectiveAverageKWh) * 100)}% de cobertura` : '100%'}
              </span>
            </div>
          </div>

          <div
            className="p-3 rounded-xl border flex flex-col justify-between"
            style={{ backgroundColor: theme.background, borderColor: theme.border }}
          >
            <span className="text-[10px] uppercase font-bold text-[var(--muted)] flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-500" />
              <span>Módulos Fotovoltaicos</span>
            </span>
            <div className="mt-1">
              <div className="text-base sm:text-lg font-black text-[var(--text)]">
                {modulesCount} <span className="text-xs font-bold text-[var(--muted)]">placas de {modulePowerW}W</span>
              </div>
              <span className="text-[10px] text-[var(--muted)] block">
                Área estimada: ~{(modulesCount * 2.58).toFixed(1)} m²
              </span>
            </div>
          </div>

          <div
            className="p-3 rounded-xl border flex flex-col justify-between"
            style={{ backgroundColor: theme.background, borderColor: theme.border }}
          >
            <span className="text-[10px] uppercase font-bold text-[var(--muted)] flex items-center gap-1">
              <Package className="w-3 h-3 text-purple-500" />
              <span>Inversor Indicado</span>
            </span>
            <div className="mt-1">
              <div className="text-sm font-bold text-[var(--text)] truncate" title={inverterModel}>
                {inverterModel.split(' ')[0]} {inverterModel.split(' ')[1] || ''}
              </div>
              <span className="text-[10px] text-[var(--secondary)] font-semibold truncate block">
                Razão CC/CA: {(installedPowerKWp / Math.max(3, Math.ceil(installedPowerKWp))).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BANNER SE HOUVER UM KIT SELECIONADO DA ABA KITS */}
      {selectedKit ? (
        <div
          className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-fadeIn"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--secondary) 12%, transparent)',
            borderColor: 'color-mix(in srgb, var(--secondary) 40%, transparent)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: theme.secondary,
                color: 'var(--secondary-fg)',
                borderColor: theme.secondary,
              }}
            >
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--secondary)] text-[var(--secondary-fg)]">
                  Kit da Aba Kits Vinculado
                </span>
                <span className="text-xs font-mono font-bold text-[var(--muted)]">
                  {selectedKit.sku || 'SKU-KIT'}
                </span>
              </div>
              <h5 className="text-sm font-extrabold text-[var(--text)]">
                {selectedKit.name}
              </h5>
              <div className="flex items-center gap-3 text-xs text-[var(--dim)] flex-wrap">
                <span>Potência: <strong>{(selectedKit.powerKWp || selectedKit.maxPowerKWp)} kWp</strong></span>
                <span>•</span>
                <span>{selectedKit.moduleCount || modulesCount}x Módulos ({selectedKit.modulePowerW || modulePowerW}W)</span>
                <span>•</span>
                <span>{selectedKit.inverterModel || inverterModel}</span>
                {selectedKit.systemType === 'Híbrido' && selectedKit.batteryCapacityKWh && (
                  <>
                    <span>•</span>
                    <span>Bateria: {selectedKit.batteryCapacityKWh} kWh ({selectedKit.batteryCount || 1}x)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <div className="text-right mr-2 hidden md:block">
              <span className="text-[10px] text-[var(--muted)] uppercase block font-semibold">Valor Sugerido</span>
              <span className="text-base font-extrabold text-[var(--text)]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalKitPrice)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleUnselectKit}
              className="px-3 py-1.5 rounded-xl border text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Remover kit e voltar para dimensionamento livre"
            >
              <X className="w-3.5 h-3.5" />
              <span>Desvincular Kit</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          className="p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs"
          style={{ backgroundColor: theme.primary, borderColor: theme.border }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--secondary)]" />
            <span className="text-[var(--dim)]">
              Você está no <strong>Dimensionamento Personalizado</strong>. Você pode vincular um Kit homologado da futura <strong>aba Kits</strong> abaixo ou continuar com a configuração avulsa.
            </span>
          </div>
          {bestMatchingKit && (
            <button
              type="button"
              onClick={() => handleSelectKit(bestMatchingKit)}
              className="px-3 py-1 rounded-lg text-xs font-bold text-[var(--secondary)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--secondary)]/40 transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <span>Aplicar Kit Recomendado ({bestMatchingKit.powerKWp} kWp)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* SEÇÃO 2: CATÁLOGO DE KITS DA FUTURA ABA "KITS" */}
      <div
        className="rounded-2xl border p-4 sm:p-5 space-y-4 shadow-xs"
        style={{ backgroundColor: theme.card, borderColor: theme.border }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center border shadow-xs"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                color: theme.secondary,
              }}
            >
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h5 className="text-sm font-bold text-[var(--text)]">Catálogo de Kits da Aba "Kits"</h5>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {kitsList.length} kits cadastrados
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                Selecione um kit pré-configurado ou adicione um novo kit para o catálogo compartilhado.
              </p>
            </div>
          </div>

          {/* Botão de Adicionar Kit para a Futura Aba Kits */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNewKitName(`Kit ${systemType} ${installedPowerKWp.toFixed(1)} kWp`);
                setNewKitPowerKWp(installedPowerKWp);
                setNewKitType(systemType);
                setNewKitModuleCount(modulesCount);
                setNewKitModulePowerW(modulePowerW);
                setNewKitModuleModel(moduleModel);
                setNewKitInverterModel(inverterModel);
                setNewKitSuggestedPrice(Math.round(installedPowerKWp * 3100));
                setNewKitEquipCost(Math.round(installedPowerKWp * 2200));
                setShowAddKitModal(true);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
              style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Adicionar Kit à Aba Kits</span>
            </button>
          </div>
        </div>

        {/* Filtros e Busca de Kits */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Buscar kit por nome, inversor, módulos ou potência (ex: 5.5, Deye, Canadian, Jinko)..."
              value={kitSearchQuery}
              onChange={(e) => setKitSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--secondary)]"
              style={{ backgroundColor: theme.primary, borderColor: theme.border }}
            />
            {kitSearchQuery && (
              <button
                type="button"
                onClick={() => setKitSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--text)]"
              >
                ✕
              </button>
            )}
          </div>

          <div
            className="flex items-center gap-1 p-1 rounded-xl border shrink-0 w-full sm:w-auto"
            style={{ backgroundColor: theme.primary, borderColor: theme.border }}
          >
            <button
              type="button"
              onClick={() => setKitFilterType('all')}
              className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                kitFilterType === 'all'
                  ? 'bg-[var(--secondary)] text-[var(--secondary-fg)] font-bold'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Todos ({kitsList.length})
            </button>
            <button
              type="button"
              onClick={() => setKitFilterType('On-Grid')}
              className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                kitFilterType === 'On-Grid'
                  ? 'bg-[var(--secondary)] text-[var(--secondary-fg)] font-bold'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              On-Grid
            </button>
            <button
              type="button"
              onClick={() => setKitFilterType('Híbrido')}
              className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                kitFilterType === 'Híbrido'
                  ? 'bg-[var(--secondary)] text-[var(--secondary-fg)] font-bold'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Híbridos
            </button>
          </div>
        </div>

        {/* LISTA / GRID DE KITS DA ABA KITS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
          {filteredKits.length === 0 ? (
            <div
              className="col-span-full py-8 text-center rounded-xl border border-dashed"
              style={{ borderColor: theme.border }}
            >
              <Package className="w-8 h-8 mx-auto text-[var(--muted)] mb-2" />
              <p className="text-xs font-bold text-[var(--text)]">Nenhum kit encontrado com os filtros atuais.</p>
              <p className="text-[11px] text-[var(--muted)] mt-1">
                Tente limpar a busca ou cadastre um novo kit clicando no botão acima.
              </p>
            </div>
          ) : (
            filteredKits.map((kit) => {
              const isSelected = selectedKit?.id === kit.id;
              const isRecommended = bestMatchingKit?.id === kit.id;
              const kwp = kit.powerKWp || kit.maxPowerKWp || 0;
              const diffKWp = Math.abs(kwp - theoreticalCalculations.requiredPowerKWp);

              return (
                <div
                  key={kit.id}
                  className={`p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'ring-2 ring-[var(--secondary)] shadow-md'
                      : 'hover:border-[var(--secondary)]/50'
                  }`}
                  style={{
                    backgroundColor: isSelected
                      ? 'color-mix(in srgb, var(--secondary) 8%, var(--card))'
                      : theme.primary,
                    borderColor: isSelected ? 'var(--secondary)' : theme.border,
                  }}
                >
                  <div className="space-y-2">
                    {/* Header do Kit com Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            kit.systemType === 'Híbrido'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {kit.systemType}
                        </span>
                        {isRecommended && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Compatível com Demanda</span>
                          </span>
                        )}
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--secondary)] text-[var(--secondary-fg)]">
                            Kit Selecionado
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-[var(--text)]">
                          {kwp.toFixed(2)} <span className="text-xs font-bold text-[var(--secondary)]">kWp</span>
                        </span>
                      </div>
                    </div>

                    {/* Nome do Kit */}
                    <h6 className="text-xs font-bold text-[var(--text)] line-clamp-1" title={kit.name}>
                      {kit.name}
                    </h6>

                    {/* Componentes do Kit */}
                    <div className="space-y-1 text-[11px] text-[var(--dim)] pt-1">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-[var(--muted)] shrink-0" />
                        <span className="truncate">
                          <strong>{kit.moduleCount || 10}x</strong> {kit.moduleModel || 'Módulos Solares'} ({kit.modulePowerW || 550}W)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-[var(--muted)] shrink-0" />
                        <span className="truncate">
                          <strong>Inversor:</strong> {kit.inverterModel || 'Inversor Solar'}
                        </span>
                      </div>
                      {kit.systemType === 'Híbrido' && (
                        <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400">
                          <Battery className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            <strong>Bateria:</strong> {kit.batteryModel || `${kit.batteryCapacityKWh || 5.12} kWh LiFePO4`}
                          </span>
                        </div>
                      )}
                      {kit.structureType && (
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
                          <Wrench className="w-3 h-3 shrink-0" />
                          <span>{kit.structureType}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rodapé do Card com Preço e Ação */}
                  <div
                    className="flex items-center justify-between gap-2 pt-3 mt-3 border-t"
                    style={{ borderColor: theme.border }}
                  >
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">Valor Sugerido</span>
                      <span className="text-xs font-extrabold text-[var(--text)]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          kit.suggestedPrice || Math.round(kwp * 3000)
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectKit(kit)}
                      disabled={isSelected}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[var(--secondary)] text-[var(--secondary-fg)] opacity-90 cursor-default'
                          : 'border text-[var(--secondary)] hover:bg-[var(--secondary)] hover:text-[var(--secondary-fg)]'
                      }`}
                      style={{
                        borderColor: isSelected ? 'transparent' : 'var(--secondary)',
                      }}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aplicado</span>
                        </>
                      ) : (
                        <>
                          <Package className="w-3.5 h-3.5" />
                          <span>Aplicar Kit</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL PARA CADASTRO DE NOVO KIT NA ABA KITS */}
      {showAddKitModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div
            className="w-full max-w-xl rounded-2xl border p-4 sm:p-6 shadow-2xl space-y-4 my-auto"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center border shadow-xs"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
                    color: theme.secondary,
                  }}
                >
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-[var(--text)]">Cadastrar Novo Kit Solar</h4>
                  <p className="text-[11px] text-[var(--muted)]">
                    Este kit será salvo no catálogo persistente da futura aba "Kits".
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddKitModal(false)}
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewKit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-[var(--text)] block mb-1">
                    Nome Comercial do Kit *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Kit On-Grid 5.5 kWp Canadian + Inversor Deye 5kW"
                    value={newKitName}
                    onChange={(e) => setNewKitName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border font-semibold text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--secondary)]"
                    style={{ backgroundColor: theme.input, borderColor: theme.border }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[var(--text)] block mb-1">
                    Tipo do Sistema *
                  </label>
                  <select
                    value={newKitType}
                    onChange={(e) => setNewKitType(e.target.value as SolarSystemType)}
                    className="w-full px-3 py-2 rounded-lg border font-semibold text-[var(--text)] focus:outline-hidden"
                    style={{ backgroundColor: theme.input, borderColor: theme.border }}
                  >
                    <option value="On-Grid">On-Grid</option>
                    <option value="Híbrido">Híbrido</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[var(--text)] block mb-1">
                    Potência Nominal (kWp) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    required
                    value={newKitPowerKWp}
                    onChange={(e) => setNewKitPowerKWp(parseFloat(e.target.value) || '')}
                    className="w-full px-3 py-2 rounded-lg border font-semibold text-[var(--text)] focus:outline-hidden"
                    style={{ backgroundColor: theme.input, borderColor: theme.border }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[var(--text)] block mb-1">
                    Qtd. Módulos *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newKitModuleCount}
                    onChange={(e) => setNewKitModuleCount(parseInt(e.target.value) || '')}
                    className="w-full px-3 py-2 rounded-lg border font-semibold text-[var(--text)] focus:outline-hidden"
                    style={{ backgroundColor: theme.input, borderColor: theme.border }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[var(--text)] block mb-1">
                    Potência Módulo (W)
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="100"
                    value={newKitModulePowerW}
                    onChange={(e) => setNewKitModulePowerW(parseInt(e.target.value) || '')}
                    className="w-full px-3 py-2 rounded-lg border font-semibold text-[var(--text)] focus:outline-hidden"
                    style={{ backgroundColor: theme.input, borderColor: theme.border }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[var(--text)] block mb-1">
                    Modelo dos Módulos
                  </label>
                  <input
                    type="text"
                    value={newKitModuleModel}
                    onChange={(e) => setNewKitModuleModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-[var(--text)] focus:outline-hidden"
                    style={{ backgroundColor: theme.input, borderColor: theme.border }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[var(--text)] block mb-1">
                    Modelo do Inversor
                  </label>
                  <input
                    type="text"
                    value={newKitInverterModel}
                    onChange={(e) => setNewKitInverterModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-[var(--text)] focus:outline-hidden"
                    style={{ backgroundColor: theme.input, borderColor: theme.border }}
                  />
                </div>
              </div>

              {/* Se for Híbrido, campos da Bateria */}
              {newKitType === 'Híbrido' && (
                <div
                  className="p-3 rounded-xl border space-y-2.5"
                  style={{ backgroundColor: theme.primary, borderColor: theme.border }}
                >
                  <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1.5">
                    <Battery className="w-3.5 h-3.5" />
                    <span>Configuração do Banco de Baterias</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-[var(--muted)] font-semibold block mb-0.5">
                        Modelo da Bateria
                      </label>
                      <input
                        type="text"
                        value={newKitBatteryModel}
                        onChange={(e) => setNewKitBatteryModel(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border text-[var(--text)] focus:outline-hidden"
                        style={{ backgroundColor: theme.input, borderColor: theme.border }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--muted)] font-semibold block mb-0.5">
                        Capacidade (kWh)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newKitBatteryCap}
                        onChange={(e) => setNewKitBatteryCap(parseFloat(e.target.value) || '')}
                        className="w-full px-2.5 py-1.5 rounded-lg border text-[var(--text)] focus:outline-hidden"
                        style={{ backgroundColor: theme.input, borderColor: theme.border }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[var(--text)] block mb-1">
                    Custo de Equipamentos (R$)
                  </label>
                  <input
                    type="number"
                    value={newKitEquipCost}
                    onChange={(e) => setNewKitEquipCost(parseFloat(e.target.value) || '')}
                    className="w-full px-3 py-2 rounded-lg border font-semibold text-[var(--text)] focus:outline-hidden"
                    style={{ backgroundColor: theme.input, borderColor: theme.border }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[var(--text)] block mb-1">
                    Preço de Venda Sugerido (R$)
                  </label>
                  <input
                    type="number"
                    value={newKitSuggestedPrice}
                    onChange={(e) => setNewKitSuggestedPrice(parseFloat(e.target.value) || '')}
                    className="w-full px-3 py-2 rounded-lg border font-bold text-[var(--secondary)] focus:outline-hidden"
                    style={{ backgroundColor: theme.input, borderColor: theme.border }}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text)] block mb-1">
                  Estrutura de Fixação
                </label>
                <input
                  type="text"
                  value={newKitStructure}
                  onChange={(e) => setNewKitStructure(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-[var(--text)] focus:outline-hidden"
                  style={{ backgroundColor: theme.input, borderColor: theme.border }}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="applyImmediately"
                  checked={applyKitImmediatelyOnCreate}
                  onChange={(e) => setApplyKitImmediatelyOnCreate(e.target.checked)}
                  className="w-4 h-4 rounded-sm accent-[var(--secondary)] cursor-pointer"
                />
                <label htmlFor="applyImmediately" className="text-xs font-semibold text-[var(--text)] cursor-pointer">
                  Já aplicar este novo kit diretamente a esta proposta
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: theme.border }}>
                <button
                  type="button"
                  onClick={() => setShowAddKitModal(false)}
                  className="btn-cancel btn-text px-3.5 py-2 rounded-xl text-xs text-[var(--muted)] hover:text-[var(--text)] cursor-pointer !bg-transparent hover:!bg-transparent transition-colors"
                  data-text-only="true"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
                  style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Salvar Kit no Catálogo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
