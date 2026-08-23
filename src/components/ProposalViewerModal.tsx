import React, { useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Share2,
  Sun,
  Zap,
  Leaf,
  ShieldCheck,
  Calendar,
  MapPin,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { SolarProposal, PdfSettingsConfig, ThemeConfig } from '../types';

interface ProposalViewerModalProps {
  proposal: SolarProposal | null;
  pdfSettings: PdfSettingsConfig;
  theme: ThemeConfig;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const ProposalViewerModal: React.FC<ProposalViewerModalProps> = ({
  proposal,
  pdfSettings,
  theme,
  onClose,
  onShowToast,
}) => {
  if (!proposal) return null;

  const effectivePrimary = pdfSettings.useAccountColors
    ? theme.primary
    : pdfSettings.primary;
  const effectiveSecondary = pdfSettings.useAccountColors
    ? theme.secondary
    : pdfSettings.secondary;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(
      `https://solamigo.com.br/proposta/${proposal.code}?auth=demo`
    );
    onShowToast('Link da proposta copiado para a área de transferência!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:fixed">
      <div className="bg-[#161B22] border border-[#30363D] rounded-lg max-w-4xl w-full p-3 md:p-4 shadow-2xl my-6 space-y-3 print:m-0 print:p-0 print:max-w-none print:w-full print:shadow-none print:rounded-none">
        {/* Modal Toolbar (Hidden on Print) */}
        <div className="flex items-center justify-between bg-[#1C2128] p-3 rounded-lg border border-[#30363D] print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-blue-400 bg-[#21262D] border border-[#30363D] px-2 py-0.5 rounded">
              {proposal.code}
            </span>
            <h3 className="font-bold text-white text-xs">
              Proposta Comercial - {proposal.clientName}
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShare}
              className="p-1.5 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#8B949E] hover:text-white transition-colors cursor-pointer"
              title="Copiar Link"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#238636] hover:bg-[#2EA043] text-white font-mono text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-[#8B949E] hover:text-white hover:bg-[#21262D] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The Printable A4 Proposal Document */}
        <div
          id="printable-solar-proposal"
          className="bg-white rounded-2xl border border-slate-200/90 shadow-lg p-8 md:p-12 space-y-8 print:border-none print:shadow-none print:p-8"
          style={{ fontFamily: `${pdfSettings.font}, sans-serif` }}
        >
          {/* Top Bar Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-6">
            <div className="flex items-center gap-3">
              {pdfSettings.showLogo && pdfSettings.customLogoUrl ? (
                <img
                  src={pdfSettings.customLogoUrl}
                  alt="Empresa Logo"
                  className="h-10 object-contain"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
                    style={{ backgroundColor: effectiveSecondary }}
                  >
                    <Sun className="w-6 h-6" />
                  </div>
                  <div>
                    <h1
                      className="text-lg font-black tracking-tight"
                      style={{ color: effectivePrimary }}
                    >
                      SOL AMIGO PRO
                    </h1>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-widest">
                      Engenharia Solar & Projetos
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="text-right text-xs">
              <span className="font-mono font-bold text-slate-900 block text-sm">
                {proposal.code}
              </span>
              <span className="text-slate-400 block">Data: {proposal.createdAt}</span>
              <span className="text-slate-400 block">Validade: {proposal.validUntil}</span>
            </div>
          </div>

          {/* Cover Hero Banner (if enabled) */}
          {pdfSettings.showCoverPhoto && (
            <div
              className="h-36 rounded-2xl overflow-hidden relative flex items-end p-6 text-white"
              style={{
                background: pdfSettings.customCoverUrl
                  ? `url(${pdfSettings.customCoverUrl}) center/cover`
                  : `linear-gradient(135deg, ${effectivePrimary}, ${effectiveSecondary})`,
              }}
            >
              <div className="relative z-10">
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
                  Energia Limpa, Sustentável & Econômica
                </span>
                <h2 className="text-2xl font-black mt-0.5">
                  PROPOSTA TÉCNICA E COMERCIAL FOTOVOLTAICA
                </h2>
              </div>
            </div>
          )}

          {/* Client Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Dados do Cliente
              </span>
              <h4 className="text-base font-extrabold text-slate-900">
                {proposal.clientName}
              </h4>
              <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {proposal.clientCity}, {proposal.clientState} · Concessionária: {proposal.concessionaria}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Consumo e Dimensionamento
              </span>
              <div className="text-xs text-slate-700 mt-1 space-y-1">
                <div>Consumo Médio Histórico: <b>{proposal.monthlyConsumptionKWh} kWh/mês</b></div>
                <div>Geração Solar Média Estimada: <b className="text-emerald-700">{proposal.estimatedMonthlyGenKWh} kWh/mês</b></div>
              </div>
            </div>
          </div>

          {/* Financial and Power Highlight Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                Potência Instalada
              </span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {proposal.systemPowerKWp} kWp
              </span>
              <span className="text-[10px] text-slate-500">
                {proposal.modulesCount} Módulos Fotovoltaicos
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                Economia Mensal
              </span>
              <span className="text-xl font-black text-emerald-600 mt-1 block">
                R$ {proposal.estimatedMonthlySavings.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] text-slate-500">
                R$ {(proposal.estimatedMonthlySavings * 12).toLocaleString('pt-BR')} / ano
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                Tempo de Payback
              </span>
              <span className="text-xl font-black text-blue-600 mt-1 block">
                {proposal.paybackYears} anos
              </span>
              <span className="text-[10px] text-slate-500">
                Retorno do investimento
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                Investimento Total
              </span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                R$ {proposal.totalValue.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] text-slate-500">
                Turn-key (Com instalação)
              </span>
            </div>
          </div>

          {/* Technical Hardware Section (if enabled) */}
          {pdfSettings.showEquipment && (
            <div className="space-y-3">
              <h4
                className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100"
                style={{ color: effectivePrimary }}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                Especificações Técnicas dos Equipamentos
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                  <span className="font-bold text-slate-900 block text-sm">
                    Gerador Solar Fotovoltaico
                  </span>
                  <div className="text-slate-600">{proposal.moduleModel}</div>
                  <div className="text-slate-500">Quantidade: <b>{proposal.modulesCount} unidades</b></div>
                  <div className="text-slate-500">Garantia do Fabricante: <b>12 anos produto / 25 anos performance (84.8%)</b></div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                  <span className="font-bold text-slate-900 block text-sm">
                    Inversor Central & Proteções
                  </span>
                  <div className="text-slate-600">{proposal.inverterModel}</div>
                  <div className="text-slate-500">Monitoramento via Wi-Fi / App Mobile incluso</div>
                  <div className="text-slate-500">Stringbox CC + CA com DPS e Disjuntores inclusos</div>
                </div>
              </div>
            </div>
          )}

          {/* Environmental Impact Section (if enabled) */}
          {pdfSettings.showEnvironmental && (
            <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">
                    Impacto Ambiental Positivo em 25 Anos
                  </h4>
                  <p className="text-xs text-emerald-800">
                    Sua decisão ajuda a preservar o planeta e reduzir as emissões de gases estufa.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs font-bold text-emerald-900">
                <div>
                  <span className="text-base font-black block">{proposal.co2AvoidedTons}t</span>
                  CO₂ Evitado
                </div>
                <div>
                  <span className="text-base font-black block">{proposal.treesPlanted}</span>
                  Árvores Equivalentes
                </div>
              </div>
            </div>
          )}

          {/* Footer with contacts and engineering guarantee */}
          {pdfSettings.showFooter && (
            <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-3">
              <div>
                <b>Sol Amigo Energia Solar Ltda</b> · CNPJ: 38.129.450/0001-92 · CREA-SP
              </div>
              <div className="flex items-center gap-4">
                <span>(19) 98822-4411</span>
                <span>contato@solamigo.com.br</span>
                <span>solamigo.com.br</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
