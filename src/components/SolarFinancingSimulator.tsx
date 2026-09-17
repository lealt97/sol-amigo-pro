import React, { useState } from 'react';
import {
  Banknote,
  Calculator,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Info,
  Percent,
  Sparkles,
  TrendingDown,
  Zap,
} from 'lucide-react';

interface SolarFinancingSimulatorProps {
  totalValue: number;
  currentMonthlyBill?: number;
  clientName?: string;
  isPublicView?: boolean;
  onSelectPlan?: (plan: { months: number; monthlyInstallment: number; downPayment: number }) => void;
  onShowToast?: (msg: string) => void;
}

export const SolarFinancingSimulator: React.FC<SolarFinancingSimulatorProps> = ({
  totalValue,
  currentMonthlyBill = 0,
  clientName = 'Cliente',
  isPublicView = false,
  onSelectPlan,
  onShowToast,
}) => {
  const [downPayment, setDownPayment] = useState<number>(0);
  const [monthlyInterestRate, setMonthlyInterestRate] = useState<number>(1.39); // 1.39% a.m. padrão mercado solar
  const [selectedMonths, setSelectedMonths] = useState<number>(60);
  const [copied, setCopied] = useState(false);

  // Termos usuais de bancos solares (BV, Santander, Solfácil)
  const installmentTerms = [24, 36, 48, 60, 72, 84];

  // Cálculo da parcela Price
  const calculateInstallment = (principal: number, months: number, ratePercent: number) => {
    if (principal <= 0) return 0;
    const i = ratePercent / 100;
    if (i === 0) return principal / months;
    const factor = Math.pow(1 + i, months);
    return (principal * (i * factor)) / (factor - 1);
  };

  const financedAmount = Math.max(0, totalValue - downPayment);
  const currentInstallment = calculateInstallment(financedAmount, selectedMonths, monthlyInterestRate);

  // Estimativa de taxa mínima da concessionária (disponibilidade + iluminação pública ~ R$ 65)
  const estimatedMinBill = 65;
  const totalMonthlyWithSolar = currentInstallment + estimatedMinBill;
  const monthlyBalanceDuringFinancing = currentMonthlyBill > 0 ? currentMonthlyBill - totalMonthlyWithSolar : 0;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleCopyWhatsAppSummary = () => {
    const lines = [
      `☀️ *Simulação de Financiamento Solar - Sol Amigo PRO*`,
      `Olá, *${clientName}*! Veja como é fácil instalar seu sistema de energia solar sem tirar dinheiro do bolso:`,
      ``,
      `💰 *Investimento Total:* ${formatCurrency(totalValue)}`,
      downPayment > 0 ? `💵 *Entrada:* ${formatCurrency(downPayment)}` : `✨ *Condição:* 100% Financiado (Sem entrada!)`,
      `📅 *Carência:* Até 90 a 120 dias para começar a pagar`,
      ``,
      `📊 *Opções de Parcelamento Estimadas (Bancos BV / Santander / Solfácil):*`,
      ...installmentTerms.map((m) => {
        const p = calculateInstallment(financedAmount, m, monthlyInterestRate);
        const isSelected = m === selectedMonths ? ' 👉 ' : ' • ';
        return `${isSelected}*${m}x de ${formatCurrency(p)}*`;
      }),
      ``,
      currentMonthlyBill > 0
        ? `🔄 *Conceito Troca de Conta:* Sua conta de luz atual de *${formatCurrency(
            currentMonthlyBill
          )}* é substituída pela parcela do solar. Você paga o que já pagaria para a concessionária, mas investindo em um patrimônio que é seu!`
        : `🔄 *Troca de Boleto:* Troque sua conta de energia por parcelas fixas que valorizam o seu imóvel!`,
      ``,
      `Tem interesse em simular a aprovação de crédito bancário? Responda aqui para darmos andamento!`,
    ];

    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    if (onShowToast) {
      onShowToast('Simulação copiada! Pronta para colar no WhatsApp.');
    }
  };

  const handleSelectOption = (months: number) => {
    setSelectedMonths(months);
    const inst = calculateInstallment(financedAmount, months, monthlyInterestRate);
    if (onSelectPlan) {
      onSelectPlan({
        months,
        monthlyInstallment: Math.round(inst),
        downPayment,
      });
    }
  };

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363D] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Banknote className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">
              Simulador de Financiamento Solar
            </h3>
            <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              Troca de Conta
            </span>
          </div>
          <p className="text-xs text-[#8B949E] mt-1">
            Financiamento bancário em até 84 parcelas. Troque o valor pago na conta de luz por um bem próprio.
          </p>
        </div>

        {!isPublicView && (
          <button
            onClick={handleCopyWhatsAppSummary}
            className="px-3.5 py-2 bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-[#30363D] transition-colors cursor-pointer shrink-0"
            title="Copiar texto formatado para enviar no WhatsApp"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                <span>Copiar Opções p/ WhatsApp</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Controles de Simulação */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-[11px] font-medium text-[#8B949E] block mb-1">
            Valor do Sistema
          </label>
          <div className="bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-sm font-bold font-mono text-white">
            {formatCurrency(totalValue)}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium text-[#8B949E] block mb-1">
            Entrada (Opcional)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-xs text-[#8B949E]">R$</span>
            <input
              type="number"
              min={0}
              max={totalValue}
              step={500}
              value={downPayment || ''}
              onChange={(e) => setDownPayment(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0,00 (Sem entrada)"
              className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg pl-8 pr-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-medium text-[#8B949E]">
              Taxa de Juros Estimada
            </label>
            <span className="text-[10px] font-mono text-blue-400 font-semibold">
              {monthlyInterestRate.toFixed(2)}% a.m.
            </span>
          </div>
          <select
            value={monthlyInterestRate}
            onChange={(e) => setMonthlyInterestRate(Number(e.target.value))}
            className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value={1.19}>1,19% a.m. (Taxa Especial Produtor / PF)</option>
            <option value={1.39}>1,39% a.m. (Média Padrão de Mercado)</option>
            <option value={1.59}>1,59% a.m. (Linhas de Varejo Geral)</option>
          </select>
        </div>
      </div>

      {/* Grid de Prazos / Parcelas */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-white block">
          Escolha o Prazo de Financiamento:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {installmentTerms.map((months) => {
            const installment = calculateInstallment(financedAmount, months, monthlyInterestRate);
            const isSelected = selectedMonths === months;

            return (
              <button
                key={months}
                type="button"
                onClick={() => handleSelectOption(months)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10 ring-1 ring-blue-500'
                    : 'bg-[#0D1117] border-[#30363D] text-[#8B949E] hover:border-[#484F58] hover:text-white'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-400" />
                )}
                <span className="text-xs font-bold block">{months} meses</span>
                <span
                  className={`text-sm font-bold font-mono block mt-1 ${
                    isSelected ? 'text-emerald-400' : 'text-white'
                  }`}
                >
                  {formatCurrency(installment)}
                </span>
                <span className="text-[9px] text-[#8B949E] block mt-0.5">por mês</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cartão de Destaque: "Troca de Conta" */}
      <div className="bg-gradient-to-br from-[#0E1B2D] to-[#161B22] border border-blue-500/30 rounded-xl p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Análise Comparativa: Troca de Conta ({selectedMonths}x)
            </span>
          </div>
          <span className="text-[11px] text-blue-300 font-mono font-semibold">
            Sem mexer na reserva de emergência
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-[#0D1117]/80 border border-[#30363D] rounded-lg p-3">
            <span className="text-[10px] text-[#8B949E] block uppercase font-medium">
              Conta de Luz Atual (Sem Solar)
            </span>
            <span className="text-base sm:text-lg font-bold text-rose-400 font-mono block mt-0.5">
              {currentMonthlyBill > 0 ? formatCurrency(currentMonthlyBill) : 'R$ 500,00'}
            </span>
            <span className="text-[10px] text-[#8B949E] block mt-0.5">
              Dinheiro que vai e não volta
            </span>
          </div>

          <div className="bg-[#0D1117]/80 border border-[#30363D] rounded-lg p-3">
            <span className="text-[10px] text-[#8B949E] block uppercase font-medium">
              Parcela Solar + Taxa Mínima
            </span>
            <span className="text-base sm:text-lg font-bold text-amber-400 font-mono block mt-0.5">
              {formatCurrency(totalMonthlyWithSolar)}
            </span>
            <span className="text-[10px] text-[#8B949E] block mt-0.5">
              {formatCurrency(currentInstallment)} (parcela) + {formatCurrency(estimatedMinBill)} (fio)
            </span>
          </div>

          <div className="bg-[#0D1117]/80 border border-emerald-500/30 rounded-lg p-3">
            <span className="text-[10px] text-emerald-400 block uppercase font-bold">
              Após Quitar ({selectedMonths}º mês)
            </span>
            <span className="text-base sm:text-lg font-bold text-emerald-400 font-mono block mt-0.5">
              ~ {formatCurrency(estimatedMinBill)} / mês
            </span>
            <span className="text-[10px] text-emerald-300/80 block mt-0.5">
              Mais de 20 anos de pura economia
            </span>
          </div>
        </div>

        {monthlyBalanceDuringFinancing >= 0 ? (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Economia Imediata:</strong> Você já começa economizando{' '}
              <strong>{formatCurrency(monthlyBalanceDuringFinancing)}/mês</strong> mesmo pagando a parcela do sistema!
            </span>
          </div>
        ) : (
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-300 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Diferença de apenas <strong>{formatCurrency(Math.abs(monthlyBalanceDuringFinancing))}/mês</strong> durante o financiamento para construir um gerador próprio que durará mais de 25 anos.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
