import React, { useState } from 'react';
import {
  Sun,
  Zap,
  Calculator,
  DollarSign,
  TrendingUp,
  Leaf,
  X,
  Sparkles,
  Check,
} from 'lucide-react';
import { SolarProposal, ThemeConfig, Client } from '../types';

interface NewProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  theme: ThemeConfig;
  onSaveProposal: (proposal: SolarProposal) => void;
  onShowToast: (msg: string) => void;
}

export const NewProposalModal: React.FC<NewProposalModalProps> = ({
  isOpen,
  onClose,
  clients,
  theme,
  onSaveProposal,
  onShowToast,
}) => {
  if (!isOpen) return null;

  // Form states
  const [selectedClientName, setSelectedClientName] = useState(
    clients[0]?.name || 'Fazenda Santa Rita'
  );
  const [clientCity, setClientCity] = useState('Campinas');
  const [clientState, setClientState] = useState('SP');
  const [concessionaria, setConcessionaria] = useState('CPFL Paulista');

  const [monthlyConsumptionKWh, setMonthlyConsumptionKWh] = useState<number>(1200);
  const [tariffKWh, setTariffKWh] = useState<number>(0.92);
  const [sunHoursPerDay, setSunHoursPerDay] = useState<number>(4.8); // HSP (Horas de Sol Pleno)
  const [modulePowerW, setModulePowerW] = useState<number>(585);
  const [moduleBrand, setModuleBrand] = useState('Canadian Solar 585W TOPCon Bi-facial');
  const [inverterModel, setInverterModel] = useState('Inversor Deye 12kW Híbrido Trifásico');
  const [pricePerWatt, setPricePerWatt] = useState<number>(3.6); // R$ / Wp

  // Live Solar Calculations:
  // Required power: (monthlyConsumption / 30) / (sunHours * 0.80 performance ratio)
  const perfRatio = 0.8;
  const dailyNeededKWh = monthlyConsumptionKWh / 30;
  const neededKWp = dailyNeededKWh / (sunHoursPerDay * perfRatio);
  const calculatedModules = Math.ceil((neededKWp * 1000) / modulePowerW);
  const finalKWp = Number(((calculatedModules * modulePowerW) / 1000).toFixed(2));
  const estimatedGenMonthly = Math.round(finalKWp * sunHoursPerDay * 30 * perfRatio);
  const totalValue = Math.round(finalKWp * 1000 * pricePerWatt);
  const monthlySavings = Math.round(Math.min(estimatedGenMonthly, monthlyConsumptionKWh) * tariffKWh);
  const yearlySavings = monthlySavings * 12;
  const paybackYears = Number((totalValue / (yearlySavings || 1)).toFixed(1));
  const co2AvoidedTons = Number(((estimatedGenMonthly * 12 * 25 * 0.084) / 1000).toFixed(1));
  const treesPlanted = Math.round(co2AvoidedTons * 6.2);

  const handleClientChange = (name: string) => {
    setSelectedClientName(name);
    const found = clients.find((c) => c.name === name);
    if (found) {
      setClientCity(found.city);
      setClientState(found.state);
      setConcessionaria(found.concessionaria);
      setMonthlyConsumptionKWh(found.avgConsumptionKWh);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const codeNum = Math.floor(1000 + Math.random() * 9000);
    const newProposal: SolarProposal = {
      id: `prop-${Date.now()}`,
      code: `PROP-${codeNum}`,
      clientName: selectedClientName,
      clientCity,
      clientState,
      concessionaria,
      monthlyConsumptionKWh,
      systemPowerKWp: finalKWp,
      modulesCount: calculatedModules,
      moduleModel: moduleBrand,
      inverterModel,
      totalValue,
      estimatedMonthlyGenKWh: estimatedGenMonthly,
      estimatedMonthlySavings: monthlySavings,
      paybackYears,
      co2AvoidedTons,
      treesPlanted,
      status: 'Pendente',
      createdAt: new Date().toLocaleDateString('pt-BR'),
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
    };

    onSaveProposal(newProposal);
    onClose();
    onShowToast(`Proposta ${newProposal.code} dimensionada com sucesso!`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#161B22] border border-[#30363D] rounded-lg max-w-3xl w-full p-5 shadow-2xl space-y-4 my-6 text-[#C9D1D9]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#21262D] border border-[#30363D] text-amber-400 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                Calculadora & Dimensionamento Solar Fotovoltaico
              </h3>
              <p className="text-[10px] text-[#8B949E]">
                Gere uma proposta comercial precisa baseada no histórico de consumo do cliente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          {/* Client and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-white mb-1">
                Selecionar Cliente Cadastrado
              </label>
              <select
                value={selectedClientName}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full h-8 px-2.5 rounded bg-[#0D1117] border border-[#30363D] text-xs font-mono text-white outline-none focus:border-blue-500"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.name} className="bg-[#161B22] text-white">
                    {c.name} ({c.city}/{c.state})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-white mb-1">
                  Cidade / UF
                </label>
                <input
                  type="text"
                  value={`${clientCity} / ${clientState}`}
                  onChange={(e) => setClientCity(e.target.value.split('/')[0])}
                  className="w-full h-8 px-2.5 rounded bg-[#0D1117] border border-[#30363D] text-xs font-mono text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white mb-1">
                  Distribuidora
                </label>
                <input
                  type="text"
                  value={concessionaria}
                  onChange={(e) => setConcessionaria(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#0D1117] border border-[#30363D] text-xs font-mono text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Consumption & Sizing Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-[#1C2128] border border-[#30363D]">
            <div>
              <label className="block text-[10px] uppercase font-mono text-[#8B949E] mb-1">
                Consumo Médio (kWh/mês)
              </label>
              <input
                type="number"
                min="50"
                max="50000"
                value={monthlyConsumptionKWh}
                onChange={(e) => setMonthlyConsumptionKWh(Number(e.target.value))}
                className="w-full h-8 px-2.5 rounded bg-[#0D1117] border border-[#30363D] text-xs font-mono font-bold text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono text-[#8B949E] mb-1">
                Tarifa Energia (R$/kWh)
              </label>
              <input
                type="number"
                step="0.01"
                value={tariffKWh}
                onChange={(e) => setTariffKWh(Number(e.target.value))}
                className="w-full h-8 px-2.5 rounded bg-[#0D1117] border border-[#30363D] text-xs font-mono font-bold text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono text-[#8B949E] mb-1">
                Índice Solar HSP (h/dia)
              </label>
              <input
                type="number"
                step="0.1"
                value={sunHoursPerDay}
                onChange={(e) => setSunHoursPerDay(Number(e.target.value))}
                className="w-full h-8 px-2.5 rounded bg-[#0D1117] border border-[#30363D] text-xs font-mono font-bold text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Hardware Kit Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-white mb-1">
                Módulos Fotovoltaicos
              </label>
              <select
                value={moduleBrand}
                onChange={(e) => setModuleBrand(e.target.value)}
                className="w-full h-8 px-2.5 rounded bg-[#0D1117] border border-[#30363D] text-xs font-mono text-white outline-none focus:border-blue-500"
              >
                <option value="Canadian Solar 585W TOPCon Bi-facial" className="bg-[#161B22] text-white">Canadian Solar 585W TOPCon Bi-facial</option>
                <option value="Jinko Solar 575W Tiger Neo N-Type" className="bg-[#161B22] text-white">Jinko Solar 575W Tiger Neo N-Type</option>
                <option value="Trina Solar 660W Vertex High-Power" className="bg-[#161B22] text-white">Trina Solar 660W Vertex High-Power</option>
                <option value="JA Solar 550W DeepBlue 3.0 Mono" className="bg-[#161B22] text-white">JA Solar 550W DeepBlue 3.0 Mono</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-white mb-1">
                Inversor / Microinversor
              </label>
              <select
                value={inverterModel}
                onChange={(e) => setInverterModel(e.target.value)}
                className="w-full h-8 px-2.5 rounded bg-[#0D1117] border border-[#30363D] text-xs font-mono text-white outline-none focus:border-blue-500"
              >
                <option value="Inversor Deye 12kW Híbrido Trifásico" className="bg-[#161B22] text-white">Inversor Deye 12kW Híbrido Trifásico</option>
                <option value="Inversor Growatt 8kW On-Grid Dual MPPT" className="bg-[#161B22] text-white">Inversor Growatt 8kW On-Grid Dual MPPT</option>
                <option value="Fronius Symo 15kW Trifásico 380V" className="bg-[#161B22] text-white">Fronius Symo 15kW Trifásico 380V</option>
                <option value="Microinversor Hoymiles 2000W 4 MPPTs" className="bg-[#161B22] text-white">Microinversor Hoymiles 2000W 4 MPPTs</option>
              </select>
            </div>
          </div>

          {/* Sizing Results Card */}
          <div className="p-3.5 rounded-lg bg-[#1C2128] border border-[#30363D] text-[#C9D1D9] space-y-3">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Resultado do Dimensionamento Automático
              </span>
              <span className="text-[10px] text-white font-mono font-bold">
                {calculatedModules} Módulos ({finalKWp} kWp)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-[#0D1117] p-2.5 rounded border border-[#30363D]">
                <span className="text-[9px] uppercase font-mono text-[#8B949E] block">Geração Estimada</span>
                <span className="text-sm font-mono font-bold text-white">
                  {estimatedGenMonthly} kWh/mês
                </span>
              </div>
              <div className="bg-[#0D1117] p-2.5 rounded border border-[#30363D]">
                <span className="text-[9px] uppercase font-mono text-[#8B949E] block">Economia Mensal</span>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  R$ {monthlySavings.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="bg-[#0D1117] p-2.5 rounded border border-[#30363D]">
                <span className="text-[9px] uppercase font-mono text-[#8B949E] block">Investimento Total</span>
                <span className="text-sm font-mono font-bold text-amber-300">
                  R$ {totalValue.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="bg-[#0D1117] p-2.5 rounded border border-[#30363D]">
                <span className="text-[9px] uppercase font-mono text-[#8B949E] block">Tempo de Retorno</span>
                <span className="text-sm font-mono font-bold text-white">
                  {paybackYears} anos
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-[#8B949E] pt-0.5">
              <span className="flex items-center gap-1">
                <Leaf className="w-3 h-3 text-emerald-400" />
                {co2AvoidedTons}t de CO₂ evitadas em 25 anos
              </span>
              <span>🌳 {treesPlanted} árvores equivalentes</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#30363D]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md border border-[#30363D] bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] font-mono text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-[#238636] hover:bg-[#2EA043] text-white font-mono text-xs font-semibold transition-colors cursor-pointer"
            >
              Gerar & Salvar Proposta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
