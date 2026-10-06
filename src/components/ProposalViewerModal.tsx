import React, { useEffect, useMemo, useState } from 'react';
import { fetchProposalCompany } from '../services/proposalCompany';
import { X, Printer } from 'lucide-react';
import { ProposalCoverPage } from './ProposalCoverPage';
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
  const [coverReady, setCoverReady] = useState(false);
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

  const documentProposal = useMemo(() => proposal ? { ...proposal, companyInfo: proposal.companyInfo || accountCompany } : null, [proposal, accountCompany]);
  if (!proposal || !documentProposal) return null;

  const handlePrint = () => {
    if (coverReady) window.print();
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
          {/* Barra Superior: Imprimir e Fechar */}
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
                disabled={!coverReady}
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
            {/* Folhas da Proposta Técnica & Comercial */}
            <ProposalCoverPage proposal={documentProposal} settings={pdfSettings} onReady={setCoverReady} />
            <SolarProposalDocument
              proposal={documentProposal}
              pdfSettings={pdfSettings}
              theme={theme}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
