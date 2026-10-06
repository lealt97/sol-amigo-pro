import React, { useEffect, useState } from 'react';
import { fetchProposalCompany } from '../services/proposalCompany';
import { X, Printer, Sun, MapPin } from 'lucide-react';
import { SolarProposalDocument } from './SolarProposalDocument';
import { SolarProposal, PdfSettingsConfig, ThemeConfig } from '../types';

interface ProposalViewerModalProps {
  proposal: SolarProposal | null;
  pdfSettings: PdfSettingsConfig;
  theme: ThemeConfig;
  onClose: () => void;
  onShowToast: (message: string) => void;
}

export const ProposalViewerModal: React.FC<ProposalViewerModalProps> = ({
  proposal,
  pdfSettings,
  theme,
  onClose,
}) => {
  const [accountCompany, setAccountCompany] = useState<SolarProposal['companyInfo']>();

  useEffect(() => {
    let active = true;
    setAccountCompany(undefined);
    if (proposal && !proposal.companyInfo) {
      fetchProposalCompany()
        .then((company) => {
          if (active) setAccountCompany(company);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [proposal?.id, proposal?.companyInfo]);

  // Tecla ESC para fechar o visualizador
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!proposal) return null;

  const isHybrid = proposal.systemType === 'Híbrido' || (proposal.batteryCount ?? 0) > 0;

  const effectivePrimary = pdfSettings.useAccountColors
    ? theme.primary
    : pdfSettings.primary;
  const effectiveSecondary = pdfSettings.useAccountColors
    ? theme.secondary
    : pdfSettings.secondary;

  const handlePrint = () => {
    window.print();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="proposal-viewer-overlay fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:fixed print:overflow-visible"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Visualizador de Proposta"
    >
      <div className="min-h-full flex flex-col items-center justify-start p-2 sm:p-4 md:p-6 print:p-0">
        <div className="proposal-viewer-shell bg-[#161B22] border border-[#30363D] rounded-xl max-w-4xl w-full p-3 md:p-4 shadow-2xl my-2 sm:my-4 space-y-3 print:m-0 print:p-0 print:max-w-none print:w-full print:shadow-none print:rounded-none">
          {/* Barra Superior Simples (Apenas Imprimir e Fechar) */}
          <div className="sticky top-2 z-40 flex items-center justify-between bg-[#1C2128]/95 backdrop-blur-md px-4 py-3 rounded-lg border border-[#30363D] shadow-lg print:hidden">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold text-blue-400 bg-[#21262D] border border-[#30363D] px-2.5 py-1 rounded">
                {proposal.code}
              </span>
              <h3 className="font-bold text-white text-xs truncate max-w-[200px] sm:max-w-[420px]">
                Proposta Comercial - {proposal.clientName}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2EA043] text-white font-mono text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                title="Imprimir proposta completa em PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>

              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                title="Fechar visualizador (ESC)"
                aria-label="Fechar visualizador"
              >
                <X className="w-4 h-4" />
                <span>Fechar</span>
              </button>
            </div>
          </div>

          {/* O Documento A4 Imprimível */}
          <div
            id="printable-solar-proposal"
            className="bg-white rounded-2xl border border-slate-200/90 shadow-lg print:border-none print:shadow-none"
            style={{ fontFamily: `${pdfSettings.font}, sans-serif` }}
          >
            {/* Folha 1: Capa Oficial da Proposta */}
            <div className="proposal-cover-page min-h-[850px] p-8 md:p-12 space-y-8">
              {/* Barra superior de cabeçalho */}
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

              {/* Hero Banner da Capa (se habilitado) */}
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
                      {isHybrid ? 'Sistema Híbrido com Armazenamento Inteligente' : 'Energia Limpa, Sustentável & Econômica'}
                    </span>
                    <h2 className="text-2xl font-black mt-0.5">
                      PROPOSTA TÉCNICA E COMERCIAL {isHybrid ? 'HÍBRIDA' : 'FOTOVOLTAICA'}
                    </h2>
                  </div>
                </div>
              )}

              {/* Detalhes do Cliente e Resumo */}
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
                    <div className="pt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        isHybrid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isHybrid ? '🔋 Sistema Híbrido (com Bateria)' : '☀️ Sistema On-Grid (Rede)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rodapé da Capa */}
              <div className="mt-auto pt-12 text-right text-xs text-slate-500">
                Proposta {proposal.code} · Página 1
              </div>
            </div>

            {/* Demais Folhas da Proposta Técnica & Comercial */}
            <SolarProposalDocument
              proposal={{ ...proposal, companyInfo: proposal.companyInfo || accountCompany }}
              pdfSettings={pdfSettings}
              theme={theme}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
