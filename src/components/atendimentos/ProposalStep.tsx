import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  Eye,
  FileCheck2,
  HelpCircle,
  History,
  Layers,
  Loader2,
  Mail,
  MessageCircle,
  Percent,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  KitEquipmentItem,
  Lead,
  OpportunityKitCosts,
  OpportunitySizing,
  PdfSettingsConfig,
  ProposalRecord,
  SolarProposal,
  ThemeConfig,
} from '../../types';
import {
  convertProposalToSolarProposal,
  fetchProposalByLeadId,
  markProposalAsSent,
  saveProposalVersion,
} from '../../services/proposals';
import { SolarFinancingSimulator } from '../SolarFinancingSimulator';

interface ProposalStepProps {
  lead: Lead;
  sizing: OpportunitySizing | null;
  theme: ThemeConfig;
  pdfSettings: PdfSettingsConfig;
  onOpenProposalViewer: (proposal: SolarProposal) => void;
  onShowToast: (message: string) => void;
  onLeadStageChanged?: () => void;
}

export const ProposalStep: React.FC<ProposalStepProps> = ({
  lead,
  sizing,
  theme,
  pdfSettings,
  onOpenProposalViewer,
  onShowToast,
  onLeadStageChanged,
}) => {
  const [proposalRecord, setProposalRecord] = useState<ProposalRecord | null>(null);
  const [loadingProposal, setLoadingProposal] = useState(false);
  const [savingProposal, setSavingProposal] = useState(false);
  const [sendingProposal, setSendingProposal] = useState(false);

  // Equipamentos
  const [equipmentItems, setEquipmentItems] = useState<KitEquipmentItem[]>([]);

  // Custos Diretos
  const [installationCost, setInstallationCost] = useState<number>(3000);
  const [engineeringCost, setEngineeringCost] = useState<number>(1500);
  const [utilityFee, setUtilityFee] = useState<number>(450);
  const [freightCost, setFreightCost] = useState<number>(600);
  const [otherCosts, setOtherCosts] = useState<number>(0);

  // Markups e Margens
  const [taxesPercent, setTaxesPercent] = useState<number>(6.5);
  const [commissionPercent, setCommissionPercent] = useState<number>(5.0);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(20.0);

  // Condições comerciais
  const [paymentMethods, setPaymentMethods] = useState(
    'À vista (50% no pedido e 50% na entrega) ou Financiamento bancário solar em até 84x com carência de 90 dias.'
  );
  const [warrantyTerms, setWarrantyTerms] = useState(
    '12 anos nos módulos, 10 anos no inversor e 1 ano total na instalação.'
  );
  const [deliveryTimeframe, setDeliveryTimeframe] = useState('Instalação em até 30 dias após aprovação da distribuidora.');
  const [customNotes, setCustomNotes] = useState('');

  // Carregar proposta existente do lead
  const loadProposal = async () => {
    setLoadingProposal(true);
    try {
      const record = await fetchProposalByLeadId(lead.id);
      setProposalRecord(record);

      if (record && record.currentVersion) {
        const ver = record.currentVersion;
        if (ver.equipmentSnapshot && ver.equipmentSnapshot.length > 0) {
          setEquipmentItems(ver.equipmentSnapshot);
        }
        if (ver.costsSnapshot) {
          const c = ver.costsSnapshot;
          setInstallationCost(c.installationCost ?? 3000);
          setEngineeringCost(c.engineeringCost ?? 1500);
          setUtilityFee(c.utilityFee ?? 450);
          setFreightCost(c.freightCost ?? 600);
          setOtherCosts(c.otherCosts ?? 0);
          setTaxesPercent(c.taxesPercent ?? 6.5);
          setCommissionPercent(c.commissionPercent ?? 5.0);
          setDiscountValue(c.discountValue ?? 0);
          setTargetMarginPercent(c.marginPercent ?? 20.0);
        }
        if (ver.commercialConditions) {
          setPaymentMethods(ver.commercialConditions.paymentMethods || paymentMethods);
          setWarrantyTerms(ver.commercialConditions.warrantyTerms || warrantyTerms);
          setDeliveryTimeframe(ver.commercialConditions.deliveryTimeframe || deliveryTimeframe);
        }
        if (ver.customNotes) {
          setCustomNotes(ver.customNotes);
        }
      } else {
        // Inicializar equipamentos padrão com base no dimensionamento
        initializeDefaultEquipment();
      }
    } catch (err) {
      console.error('Erro ao carregar proposta:', err);
    } finally {
      setLoadingProposal(false);
    }
  };

  const initializeDefaultEquipment = () => {
    const modulesCount = sizing?.modulesCount || 10;
    const modulePower = sizing?.modulePowerW || 550;
    const inverterPower = sizing?.inverterPowerKW || 5;

    setEquipmentItems([
      {
        id: '1',
        description: `Módulo Fotovoltaico ${modulePower}W Monocristalino Tier 1`,
        category: 'Módulo FV',
        quantity: modulesCount,
        unitCost: 450,
      },
      {
        id: '2',
        description: `Inversor Solar On-Grid ${inverterPower}kW com Wi-Fi`,
        category: 'Inversor',
        quantity: sizing?.inverterCount || 1,
        unitCost: 3800,
      },
      {
        id: '3',
        description: `Estrutura de fixação para telhado ${lead.property_type || 'Cerâmico'}`,
        category: 'Estrutura',
        quantity: modulesCount,
        unitCost: 65,
      },
      {
        id: '4',
        description: 'String Box CC/CA com DPS e cabos solares 6mm',
        category: 'String Box',
        quantity: 1,
        unitCost: 850,
      },
    ]);
  };

  useEffect(() => {
    loadProposal();
  }, [lead.id]);

  // Cálculos comerciais matemáticos rigorosos
  const totalEquipmentCost = equipmentItems.reduce(
    (sum, item) => sum + (Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.unitCost) || 0)),
    0
  );

  const directFixedCosts =
    Math.max(0, Number(installationCost) || 0) +
    Math.max(0, Number(engineeringCost) || 0) +
    Math.max(0, Number(utilityFee) || 0) +
    Math.max(0, Number(freightCost) || 0) +
    Math.max(0, Number(otherCosts) || 0);

  const directBaseCost = totalEquipmentCost + directFixedCosts;

  // Preço de Venda = Custo Direto / (1 - (Impostos + Comissão + Margem) / 100)
  const totalPercentDeductions =
    Math.max(0, Number(taxesPercent) || 0) +
    Math.max(0, Number(commissionPercent) || 0) +
    Math.max(0, Number(targetMarginPercent) || 0);

  const divisor = Math.max(0.1, 1 - totalPercentDeductions / 100);
  const grossSalePrice = directBaseCost > 0 ? directBaseCost / divisor : 0;
  const safeDiscount = Math.min(Math.max(0, Number(discountValue) || 0), grossSalePrice * 0.5);
  const finalSalePrice = Math.max(0, grossSalePrice - safeDiscount);

  const taxesValue = finalSalePrice * ((Number(taxesPercent) || 0) / 100);
  const commissionValue = finalSalePrice * ((Number(commissionPercent) || 0) / 100);
  const totalCostsWithDeductions = directBaseCost + taxesValue + commissionValue;
  const profit = finalSalePrice - totalCostsWithDeductions;
  const realMarginPercent = finalSalePrice > 0 ? (profit / finalSalePrice) * 100 : 0;

  const installedPowerWp = (sizing?.installedPowerKWp || 5.5) * 1000;
  const pricePerWp = installedPowerWp > 0 ? finalSalePrice / installedPowerWp : 0;

  const currentKitCosts: OpportunityKitCosts = {
    equipmentItems,
    installationCost,
    engineeringCost,
    utilityFee,
    freightCost,
    otherCosts,
    taxesPercent,
    commissionPercent,
    grossSalePrice,
    discountValue: safeDiscount,
    equipmentCost: totalEquipmentCost,
    fixedCosts: directFixedCosts,
    taxesValue,
    commissionValue,
    totalCost: totalCostsWithDeductions,
    finalSalePrice,
    profit,
    marginPercent: realMarginPercent,
    pricePerWp,
    status: 'concluido',
    updatedAt: new Date().toISOString(),
  };

  const handleAddEquipment = () => {
    const newItem: KitEquipmentItem = {
      id: String(Date.now()),
      description: 'Item adicional de equipamento',
      category: 'Outros',
      quantity: 1,
      unitCost: 100,
    };
    setEquipmentItems([...equipmentItems, newItem]);
  };

  const handleRemoveEquipment = (id: string) => {
    setEquipmentItems(equipmentItems.filter((i) => i.id !== id));
  };

  const handleUpdateEquipment = (id: string, field: keyof KitEquipmentItem, val: any) => {
    setEquipmentItems(
      equipmentItems.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleSaveProposal = async () => {
    if (finalSalePrice <= 0) {
      onShowToast('O preço de venda final precisa ser maior que zero.');
      return;
    }

    setSavingProposal(true);
    try {
      const mockSizing: OpportunitySizing = sizing || {
        id: 'temp',
        leadId: lead.id,
        calculationVersion: 'sa-sizing-v1',
        connectionType: 'Bifásica',
        monthlyConsumptionKWh: [450, 450, 450, 450, 450, 450, 450, 450, 450, 450, 450, 450],
        monthlySunHours: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
        targetCoveragePercent: 100,
        futureConsumptionKWh: 0,
        inclinationFactor: 1,
        temperatureLossPercent: 10,
        otherLossesPercent: 10,
        transformerLossPercent: 0,
        modulePowerW: 550,
        moduleAreaM2: 2.2,
        inverterPowerKW: 5,
        inverterCount: 1,
        notes: '',
        averageConsumptionKWh: 450,
        availabilityCostKWh: 50,
        compensableConsumptionKWh: 400,
        designConsumptionKWh: 400,
        averageCorrectedSunHours: 5,
        totalLossPercent: 20,
        performanceRatio: 80,
        theoreticalPowerKWp: 4.5,
        requiredPowerKWp: 4.5,
        modulesCount: 10,
        installedPowerKWp: 5.5,
        estimatedMonthlyGenerationKWh: 580,
        estimatedAnnualGenerationKWh: 6960,
        estimatedCoveragePercent: 100,
        estimatedAreaM2: 22,
        dcAcRatio: 1.1,
        dcAcStatus: 'ok',
        monthlyGenerationKWh: [580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580],
        status: 'concluido',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedRecord = await saveProposalVersion({
        leadId: lead.id,
        sizing: mockSizing,
        equipmentItems,
        kitCosts: currentKitCosts,
        commercialConditions: {
          paymentMethods,
          warrantyTerms,
          deliveryTimeframe,
          notes: customNotes,
        },
        pdfSettings,
        customNotes,
      });

      setProposalRecord(updatedRecord);
      onShowToast(`Versão v${updatedRecord.currentVersionNumber} da proposta salva com sucesso!`);
    } catch (err: any) {
      onShowToast(err?.message || 'Erro ao salvar proposta.');
    } finally {
      setSavingProposal(false);
    }
  };

  const handleSendProposal = async () => {
    if (!proposalRecord) {
      await handleSaveProposal();
    }

    const currentRec = proposalRecord || (await fetchProposalByLeadId(lead.id));
    if (!currentRec) return;

    setSendingProposal(true);
    try {
      await markProposalAsSent(currentRec.id, lead.id, currentRec.currentVersionNumber);
      await loadProposal();
      if (onLeadStageChanged) onLeadStageChanged();
      onShowToast('Proposta marcada como enviada! Atendimento movido para "Proposta enviada".');
    } catch (err: any) {
      onShowToast(err?.message || 'Falha ao marcar proposta como enviada.');
    } finally {
      setSendingProposal(false);
    }
  };

  const handleOpenViewer = () => {
    if (!proposalRecord) {
      // Cria objeto temporário para visualização rápida caso não tenha sido salvo ainda
      const solarProp: SolarProposal = {
        id: 'preview',
        code: 'PROP-PREVIEW',
        clientName: lead.name,
        clientEmail: lead.email,
        clientPhone: lead.phone,
        clientCity: lead.city,
        clientState: lead.state,
        concessionaria: lead.distributor || 'Concessionária Local',
        monthlyConsumptionKWh: sizing?.averageConsumptionKWh || 450,
        currentMonthlyBill: Number(lead.average_monthly_bill) || 500,
        systemPowerKWp: sizing?.installedPowerKWp || 5.5,
        estimatedMonthlyGenKWh: sizing?.estimatedMonthlyGenerationKWh || 580,
        modulesCount: sizing?.modulesCount || 10,
        moduleModel: `${sizing?.modulePowerW || 550}W Monocristalino Tier 1`,
        inverterModel: `${sizing?.inverterPowerKW || 5}kW Grid-Tie Homologado`,
        totalValue: finalSalePrice,
        estimatedMonthlySavings: 520,
        paybackYears: 3.6,
        status: 'Rascunho',
        createdAt: new Date().toISOString(),
        sizing: sizing || undefined,
        pricing: currentKitCosts,
      };
      onOpenProposalViewer(solarProp);
      return;
    }

    const solarProp = convertProposalToSolarProposal(proposalRecord, {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      city: lead.city,
      state: lead.state,
      distributor: lead.distributor,
    });
    onOpenProposalViewer(solarProp);
  };

  const handleCopyPublicLink = () => {
    const token = proposalRecord?.publicToken || proposalRecord?.id || 'demo';
    const url = `${window.location.origin}${window.location.pathname}?proposta=${token}`;
    navigator.clipboard.writeText(url);
    onShowToast('Link da proposta pública copiado!');
  };

  const handleShareWhatsApp = () => {
    const token = proposalRecord?.publicToken || proposalRecord?.id || 'demo';
    const url = `${window.location.origin}${window.location.pathname}?proposta=${token}`;
    const text = encodeURIComponent(
      `Olá, ${lead.name}! Segue a proposta comercial ${proposalRecord?.code || ''} da Sol Amigo PRO no valor de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalSalePrice)}:\n${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div id="proposal-step-container" className="space-y-5">
      {/* Top Banner & Actions */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">
              Proposta Comercial & Precificação
            </h3>
            {proposalRecord && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                {proposalRecord.code} (v{proposalRecord.currentVersionNumber})
              </span>
            )}
          </div>
          <p className="text-xs text-[#8B949E] mt-1">
            Composição completa de custos, margens líquidas de venda, geração de versões imutáveis e compartilhamento seguro.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={handleCopyPublicLink}
            className="px-3 py-2 bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#30363D]"
            title="Copiar Link Público"
          >
            <Copy className="w-3.5 h-3.5 text-blue-400" />
            <span>Copiar Link</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="px-3 py-2 bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#30363D]"
            title="Enviar no WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handleOpenViewer}
            className="px-3 py-2 bg-[#21262D] hover:bg-[#30363D] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#30363D]"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Ver PDF / Impressão</span>
          </button>

          <button
            onClick={handleSaveProposal}
            disabled={savingProposal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-600/20"
          >
            {savingProposal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Salvar Versão</span>
          </button>

          <button
            onClick={handleSendProposal}
            disabled={sendingProposal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
          >
            {sendingProposal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Marcar Enviada</span>
          </button>
        </div>
      </div>

      {/* Rastreamento de Acesso & Engajamento do Cliente */}
      {proposalRecord && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-3 ${
            proposalRecord.viewedAt
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
              : 'bg-[#161B22] border-[#30363D] text-[#8B949E]'
          }`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              proposalRecord.viewedAt ? 'bg-blue-500/20 text-blue-400' : 'bg-[#21262D] text-[#8B949E]'
            }`}>
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold block text-white">Visualização pelo Cliente</span>
              <span className="text-[11px] block mt-0.5">
                {proposalRecord.viewedAt
                  ? `Visualizou em ${new Date(proposalRecord.viewedAt).toLocaleString('pt-BR')}`
                  : 'Link gerado, aguardando abertura pelo cliente'}
              </span>
            </div>
          </div>

          <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-3 ${
            proposalRecord.status === 'aprovada'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : proposalRecord.status === 'recusada'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-[#161B22] border-[#30363D] text-[#8B949E]'
          }`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              proposalRecord.status === 'aprovada'
                ? 'bg-emerald-500/20 text-emerald-400'
                : proposalRecord.status === 'recusada'
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-[#21262D] text-[#8B949E]'
            }`}>
              {proposalRecord.status === 'aprovada' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : proposalRecord.status === 'recusada' ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>
            <div>
              <span className="font-bold block text-white">Status da Decisão</span>
              <span className="text-[11px] block mt-0.5 capitalize">
                {proposalRecord.status === 'aprovada'
                  ? '🎉 Aceite Digital Confirmado!'
                  : proposalRecord.status === 'recusada'
                  ? 'Solicitou Ajustes / Recusou'
                  : `Em andamento (${proposalRecord.status})`}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-[#161B22] border border-[#30363D] rounded-xl text-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold block text-white">Segurança & Validade</span>
              <span className="text-[11px] text-[#8B949E] block mt-0.5">
                Snapshot imutável com link assinado
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Equipamentos do Kit */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            Equipamentos do Kit Solar
          </h4>

          <button
            onClick={handleAddEquipment}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Equipamento</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#30363D] text-[#8B949E] text-[11px]">
                <th className="pb-2 font-medium">Descrição do Produto</th>
                <th className="pb-2 font-medium w-32">Categoria</th>
                <th className="pb-2 font-medium w-24 text-center">Quantidade</th>
                <th className="pb-2 font-medium w-28 text-right">Custo Unitário (R$)</th>
                <th className="pb-2 font-medium w-28 text-right">Total (R$)</th>
                <th className="pb-2 font-medium w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D]/60">
              {equipmentItems.map((item) => {
                const rowTotal = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
                return (
                  <tr key={item.id} className="hover:bg-[#1C2128]/50 transition-colors">
                    <td className="py-2.5 pr-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleUpdateEquipment(item.id, 'description', e.target.value)}
                        className="w-full bg-[#0D1117] border border-[#30363D] rounded p-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 pr-2">
                      <select
                        value={item.category}
                        onChange={(e) => handleUpdateEquipment(item.id, 'category', e.target.value)}
                        className="w-full bg-[#0D1117] border border-[#30363D] rounded p-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="Módulo FV">Módulo FV</option>
                        <option value="Inversor">Inversor</option>
                        <option value="Estrutura">Estrutura</option>
                        <option value="String Box">String Box</option>
                        <option value="Cabos">Cabos & Conectores</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </td>
                    <td className="py-2.5 pr-2 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateEquipment(item.id, 'quantity', Number(e.target.value))}
                        className="w-20 bg-[#0D1117] border border-[#30363D] rounded p-1.5 text-xs text-center font-mono text-white focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 pr-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={item.unitCost}
                        onChange={(e) => handleUpdateEquipment(item.id, 'unitCost', Number(e.target.value))}
                        className="w-24 bg-[#0D1117] border border-[#30363D] rounded p-1.5 text-xs text-right font-mono text-white focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 pr-2 text-right font-mono font-bold text-white">
                      {formatCurrency(rowTotal)}
                    </td>
                    <td className="py-2.5 text-center">
                      <button
                        onClick={() => handleRemoveEquipment(item.id)}
                        className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-500/10 cursor-pointer"
                        title="Remover Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#30363D] font-bold text-xs text-white">
                <td colSpan={4} className="pt-3 text-right text-[#8B949E]">
                  Subtotal de Equipamentos:
                </td>
                <td className="pt-3 text-right font-mono text-amber-400 text-sm">
                  {formatCurrency(totalEquipmentCost)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Custos Operacionais e Serviços */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Serviços & Custos Diretos
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[#8B949E] block mb-1">Mão de Obra e Instalação (R$)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={installationCost}
                onChange={(e) => setInstallationCost(Number(e.target.value))}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[#8B949E] block mb-1">Projeto & Engenharia / ART (R$)</label>
              <input
                type="number"
                min="0"
                step="50"
                value={engineeringCost}
                onChange={(e) => setEngineeringCost(Number(e.target.value))}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[#8B949E] block mb-1">Taxas Concessionária (R$)</label>
              <input
                type="number"
                min="0"
                step="50"
                value={utilityFee}
                onChange={(e) => setUtilityFee(Number(e.target.value))}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[#8B949E] block mb-1">Frete e Deslocamento (R$)</label>
              <input
                type="number"
                min="0"
                step="50"
                value={freightCost}
                onChange={(e) => setFreightCost(Number(e.target.value))}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[#8B949E] block mb-1">Outros Custos Diversos (R$)</label>
              <input
                type="number"
                min="0"
                step="50"
                value={otherCosts}
                onChange={(e) => setOtherCosts(Number(e.target.value))}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Formação de Preço e Margem */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <Percent className="w-4 h-4 text-purple-400" />
            Margens, Impostos & Preço Final
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[#8B949E] block mb-1">Margem Líquida Alvo (%)</label>
              <input
                type="number"
                min="1"
                max="60"
                step="0.5"
                value={targetMarginPercent}
                onChange={(e) => setTargetMarginPercent(Number(e.target.value))}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[#8B949E] block mb-1">Desconto Comercial (R$)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[#8B949E] block mb-1">Impostos Fiscais (%)</label>
              <input
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={taxesPercent}
                onChange={(e) => setTaxesPercent(Number(e.target.value))}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[#8B949E] block mb-1">Comissão Comercial (%)</label>
              <input
                type="number"
                min="0"
                max="25"
                step="0.5"
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(Number(e.target.value))}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Resumo do Preço Final */}
          <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8B949E]">Preço de Venda Final</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {formatCurrency(finalSalePrice)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#30363D] text-[11px]">
              <div>
                <span className="text-[#8B949E] block">Lucro Líquido</span>
                <span className="font-bold font-mono text-white">{formatCurrency(profit)}</span>
              </div>
              <div className="text-center">
                <span className="text-[#8B949E] block">Margem Real</span>
                <span className="font-bold font-mono text-purple-400">{realMarginPercent.toFixed(1)}%</span>
              </div>
              <div className="text-right">
                <span className="text-[#8B949E] block">Preço por Wp</span>
                <span className="font-bold font-mono text-blue-400">R$ {pricePerWp.toFixed(2)}/Wp</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulador de Financiamento Solar & Troca de Conta para WhatsApp */}
      <SolarFinancingSimulator
        totalValue={finalSalePrice}
        currentMonthlyBill={Number(lead.average_monthly_bill) || 0}
        clientName={lead.name}
        isPublicView={false}
        onShowToast={onShowToast}
      />

      {/* Histórico de Versões da Proposta (Requisito 13) */}
      {proposalRecord && proposalRecord.versions && proposalRecord.versions.length > 0 && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
          <h4 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            Versões Imutáveis Desta Proposta
          </h4>

          <div className="divide-y divide-[#30363D]">
            {proposalRecord.versions.map((ver) => {
              const isCurrent = ver.versionNumber === proposalRecord.currentVersionNumber;

              return (
                <div key={ver.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-white bg-[#0D1117] px-2 py-0.5 rounded border border-[#30363D]">
                      v{ver.versionNumber}
                    </span>
                    <div>
                      <span className="font-semibold text-white block">
                        {formatCurrency(ver.totalValue)}
                      </span>
                      <span className="text-[10px] text-[#8B949E]">
                        Criada em {new Date(ver.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        ver.status === 'aprovada'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : ver.status === 'recusada'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : ver.status === 'visualizada'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : ver.status === 'enviada'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-[#21262D] text-[#8B949E]'
                      }`}
                    >
                      {ver.status}
                    </span>

                    {isCurrent && (
                      <span className="text-[10px] text-blue-400 font-bold">
                        (Versão Ativa)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
