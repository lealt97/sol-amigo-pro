import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  FileCheck2,
  HelpCircle,
  Home,
  Loader2,
  MapPin,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sun,
  User,
  Zap,
} from 'lucide-react';
import { Lead } from '../../types';
import { qualifyLead } from '../../services/leads';
import { supabase } from '../../lib/supabase';

interface QualificationStepProps {
  lead: Lead;
  onLeadUpdated: (lead: Lead) => void;
  onShowToast: (message: string) => void;
  onNextStep: () => void;
}

export const QualificationStep: React.FC<QualificationStepProps> = ({
  lead,
  onLeadUpdated,
  onShowToast,
  onNextStep,
}) => {
  const [propertyType, setPropertyType] = useState<string>(lead.property_type || lead.propertyType || 'Residencial');
  const [propertyStatus, setPropertyStatus] = useState<string>(lead.property_status || lead.propertyStatus || 'Próprio');
  const [connectionType, setConnectionType] = useState<'Monofásica' | 'Bifásica' | 'Trifásica'>('Bifásica');
  const [distributor, setDistributor] = useState<string>(lead.distributor || '');
  const [averageMonthlyBill, setAverageMonthlyBill] = useState<number>(
    Number(lead.average_monthly_bill || lead.averageMonthlyBill) || 0
  );
  const [averageConsumptionKWh, setAverageConsumptionKWh] = useState<number>(
    Number(lead.average_consumption_kwh || lead.averageConsumptionKWh) || 0
  );
  const [roofType, setRoofType] = useState<string>('Cerâmico');
  const [availableAreaM2, setAvailableAreaM2] = useState<number>(40);
  const [roofOrientation, setRoofOrientation] = useState<string>('Norte');
  const [hasShading, setHasShading] = useState<string>('Não');
  const [installationTimeframe, setInstallationTimeframe] = useState<string>('Até 30 dias');
  const [decisionMaker, setDecisionMaker] = useState<string>('Sim');
  const [notes, setNotes] = useState<string>(lead.notes || '');
  const [assignedTo, setAssignedTo] = useState<string>(lead.assigned_to || lead.assignedTo || '');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isQualified =
    lead.qualification_status === 'qualificado' || lead.qualification_completed || lead.status !== 'novo';

  const handleSaveQualification = async (markAsQualified = true) => {
    setSaving(true);
    setErrorMsg('');

    try {
      if (averageMonthlyBill <= 0 && averageConsumptionKWh <= 0) {
        throw new Error('Informe ao menos o valor médio da conta ou o consumo médio em kWh.');
      }

      const computedConsumption =
        averageConsumptionKWh > 0 ? averageConsumptionKWh : Math.round(averageMonthlyBill / 0.95);
      const qualNotes = `[Qualificação] Telhado: ${roofType}, Área: ${availableAreaM2}m², Orientação: ${roofOrientation}, Sombreamento: ${hasShading}, Decisor: ${decisionMaker}. ${notes}`.trim();

      // Salva os parâmetros atualizados na tabela de leads
      await supabase
        .from('leads')
        .update({
          average_monthly_bill: averageMonthlyBill > 0 ? averageMonthlyBill : null,
          average_consumption_kwh: computedConsumption > 0 ? computedConsumption : null,
          distributor: distributor.trim() || null,
          property_type: propertyType,
          property_status: propertyStatus,
        })
        .eq('id', lead.id);

      const updated = await qualifyLead(lead.id, assignedTo.trim(), qualNotes);

      onLeadUpdated(updated);
      onShowToast(markAsQualified ? 'Atendimento qualificado com sucesso!' : 'Dados de qualificação atualizados!');
      if (markAsQualified) {
        onNextStep();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao salvar a qualificação.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="qualification-step-container" className="space-y-4">
      {/* Header Banner */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-base">Qualificação Técnica e Comercial</h3>
          </div>
          <p className="text-xs text-[#8B949E] mt-1">
            Valide as características do imóvel, ligação elétrica e histórico de consumo para habilitar o dimensionamento solar.
          </p>
        </div>

        {isQualified && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-emerald-400 text-xs font-semibold shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>Atendimento Qualificado</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid de Formulário */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bloco 1: Unidade Consumidora e Rede Elétrica */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Rede Elétrica & Consumo
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[#8B949E] block mb-1">Distribuidora / Concessionária</label>
              <input
                type="text"
                value={distributor}
                onChange={(e) => setDistributor(e.target.value)}
                placeholder="Ex: CPFL, Enel, Cemig..."
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[#8B949E] block mb-1">Tipo de Ligação Elétrica</label>
              <select
                value={connectionType}
                onChange={(e) => setConnectionType(e.target.value as any)}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Monofásica">Monofásica (custo disp: 30 kWh)</option>
                <option value="Bifásica">Bifásica (custo disp: 50 kWh)</option>
                <option value="Trifásica">Trifásica (custo disp: 100 kWh)</option>
              </select>
            </div>

            <div>
              <label className="text-[#8B949E] block mb-1">Valor Médio da Conta (R$)</label>
              <input
                type="number"
                min="0"
                step="10"
                value={averageMonthlyBill || ''}
                onChange={(e) => setAverageMonthlyBill(Number(e.target.value))}
                placeholder="Ex: 650,00"
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[#8B949E] block mb-1">Consumo Médio (kWh/mês)</label>
              <input
                type="number"
                min="0"
                step="10"
                value={averageConsumptionKWh || ''}
                onChange={(e) => setAverageConsumptionKWh(Number(e.target.value))}
                placeholder="Ex: 680"
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-[#8B949E] mt-0.5 block">
                {averageMonthlyBill > 0 && !averageConsumptionKWh
                  ? `Estimado ~${Math.round(averageMonthlyBill / 0.95)} kWh (a confirmar na fatura)`
                  : 'Dado real retirado da fatura de energia'}
              </span>
            </div>
          </div>
        </div>

        {/* Bloco 2: Imóvel e Telhado */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <Home className="w-4 h-4 text-purple-400" />
            Características do Imóvel & Telhado
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[#8B949E] block mb-1">Tipo de Imóvel</label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Residencial">Residencial</option>
                <option value="Comercial">Comercial</option>
                <option value="Rural">Rural</option>
                <option value="Industrial">Industrial</option>
              </select>
            </div>

            <div>
              <label className="text-[#8B949E] block mb-1">Situação do Imóvel</label>
              <select
                value={propertyStatus}
                onChange={(e) => setPropertyStatus(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Próprio">Próprio</option>
                <option value="Alugado">Alugado</option>
                <option value="Em construção">Em construção</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="text-[#8B949E] block mb-1">Tipo de Telhado</label>
              <select
                value={roofType}
                onChange={(e) => setRoofType(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Cerâmico">Cerâmico (Colonial/Francesa)</option>
                <option value="Metálico">Metálico / Trapezoidal</option>
                <option value="Fibrocimento">Fibrocimento</option>
                <option value="Laje">Laje plana de concreto</option>
                <option value="Solo">Estrutura de Solo</option>
              </select>
            </div>

            <div>
              <label className="text-[#8B949E] block mb-1">Orientação Solar Predominante</label>
              <select
                value={roofOrientation}
                onChange={(e) => setRoofOrientation(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Norte">Norte (Ideal ~100%)</option>
                <option value="Nordeste">Nordeste (~95%)</option>
                <option value="Noroeste">Noroeste (~95%)</option>
                <option value="Leste">Leste (~85%)</option>
                <option value="Oeste">Oeste (~85%)</option>
                <option value="Sul">Sul (Desfavorável)</option>
              </select>
            </div>

            <div>
              <label className="text-[#8B949E] block mb-1">Área Disponível no Telhado (m²)</label>
              <input
                type="number"
                min="5"
                value={availableAreaM2}
                onChange={(e) => setAvailableAreaM2(Number(e.target.value))}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[#8B949E] block mb-1">Existência de Sombras</label>
              <select
                value={hasShading}
                onChange={(e) => setHasShading(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Não">Não há sombreamento</option>
                <option value="Parcial pela manhã">Parcial pela manhã</option>
                <option value="Parcial à tarde">Parcial à tarde</option>
                <option value="Severo">Sombreamento severo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bloco 3: Processo de Compra e Decisor */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            Perfil Comercial & Tomador de Decisão
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[#8B949E] block mb-1">Interessado é o Decisor?</label>
              <select
                value={decisionMaker}
                onChange={(e) => setDecisionMaker(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Sim">Sim, é o decisor final</option>
                <option value="Compartilhada">Decisão conjunta (família / sócios)</option>
                <option value="Não">Não, outra pessoa decide</option>
              </select>
            </div>

            <div>
              <label className="text-[#8B949E] block mb-1">Prazo Desejado de Instalação</label>
              <select
                value={installationTimeframe}
                onChange={(e) => setInstallationTimeframe(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Até 30 dias">Urgente (Até 30 dias)</option>
                <option value="1 a 3 meses">Curto prazo (1 a 3 meses)</option>
                <option value="3 a 6 meses">Médio prazo (3 a 6 meses)</option>
                <option value="Apenas pesquisando">Apenas pesquisando preços</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[#8B949E] block mb-1">Consultor Responsável</label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Nome do consultor da sua equipe"
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Bloco 4: Observações Técnicas */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-blue-400" />
            Notas Técnicas & Particularidades
          </h4>

          <div className="text-xs space-y-3">
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva detalhes como estado do telhado, acesso, quadro de disjuntores, horário preferencial para contato..."
              className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none resize-none"
            />
            <p className="text-[11px] text-[#8B949E]">
              Essas anotações ficam arquivadas na ficha técnica e são utilizadas na revisão prévia de engenharia.
            </p>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <span className="text-xs text-[#8B949E]">
          A qualificação formal cria a unidade consumidora e habilita a memória de cálculo fotovoltaica.
        </span>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleSaveQualification(false)}
            disabled={saving}
            className="px-4 py-2 bg-[#21262D] hover:bg-[#30363D] text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Salvar Rascunho</span>
          </button>

          <button
            onClick={() => handleSaveQualification(true)}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-md shadow-blue-600/30"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Salvar e Qualificar Atendimento</span>
          </button>
        </div>
      </div>
    </div>
  );
};
