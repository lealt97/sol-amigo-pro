import React, { useEffect, useState } from 'react';
import { fetchProposalCompany } from '../services/proposalCompany';
import { X, Printer, Sun, MapPin, MessageCircle, Mail, Copy } from 'lucide-react';
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
  onShowToast,
}) => {
  const [accountCompany, setAccountCompany] = useState<SolarProposal['companyInfo']>();
  useEffect(() => {
    let active = true;
    setAccountCompany(undefined);
    if (proposal && !proposal.companyInfo) {
      fetchProposalCompany().then(company => { if (active) setAccountCompany(company); }).catch(() => {});
    }
    return () => { active = false; };
  }, [proposal?.id, proposal?.companyInfo]);
  if (!proposal) return null;

  const isHybrid = proposal.systemType === 'Híbrido' || proposal.batteryCount! > 0;

  const effectivePrimary = pdfSettings.useAccountColors
    ? theme.primary
    : pdfSettings.primary;
  const effectiveSecondary = pdfSettings.useAccountColors
    ? theme.secondary
    : pdfSettings.secondary;

  const proposalUrl = proposal.publicToken
    ? `${window.location.origin}${window.location.pathname}?proposta=${proposal.publicToken}`
    : '';

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (!proposalUrl) {
      onShowToast('Gere um link seguro na etapa Proposta antes de compartilhar.');
      return;
    }
    navigator.clipboard.writeText(proposalUrl);
    onShowToast('Link público da proposta copiado para a área de transferência!');
  };

  const handleShareWhatsApp = () => {
    if (!proposalUrl) {
      onShowToast('Gere um link seguro na etapa Proposta antes de compartilhar.');
      return;
    }
    const text = encodeURIComponent(
      `Olá, ${proposal.clientName}! Segue a proposta comercial ${proposal.code} da Sol Amigo PRO no valor de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposal.totalValue)}:\n${proposalUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleShareEmail = () => {
    if (!proposalUrl) {
      onShowToast('Gere um link seguro na etapa Proposta antes de compartilhar.');
      return;
    }
    const subject = encodeURIComponent(`Proposta Comercial ${proposal.code} - Sol Amigo PRO`);
    const body = encodeURIComponent(
      `Olá, ${proposal.clientName}!\n\nSegue o link para visualização e aprovação da sua proposta técnica e comercial:\n${proposalUrl}\n\nFicamos à disposição para quaisquer esclarecimentos.`
    );
    window.location.href = `mailto:${proposal.clientEmail || ''}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="proposal-viewer-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:fixed">
      <div className="proposal-viewer-shell bg-[#161B22] border border-[#30363D] rounded-lg max-w-4xl w-full p-3 md:p-4 shadow-2xl my-6 space-y-3 print:m-0 print:p-0 print:max-w-none print:w-full print:shadow-none print:rounded-none">
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

          <div className="flex items-center gap-1.5 flex-wrap">
            {proposalUrl && (
              <>
                <button onClick={handleCopyLink} className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#8B949E] hover:text-white transition-colors cursor-pointer text-xs" title="Copiar Link Público">
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Copiar Link</span>
                </button>
                <button onClick={handleShareWhatsApp} className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#8B949E] hover:text-white transition-colors cursor-pointer text-xs" title="Compartilhar no WhatsApp">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
                <button onClick={handleShareEmail} className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#8B949E] hover:text-white transition-colors cursor-pointer text-xs" title="Abrir E-mail">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">E-mail</span>
                </button>
              </>
            )}
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
          className="bg-white rounded-2xl border border-slate-200/90 shadow-lg print:border-none print:shadow-none"
          style={{ fontFamily: `${pdfSettings.font}, sans-serif` }}
        >
          <div className="proposal-cover-page min-h-[850px] p-8 md:p-12 space-y-8">
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
                  {isHybrid ? 'Sistema Híbrido com Armazenamento Inteligente' : 'Energia Limpa, Sustentável & Econômica'}
                </span>
                <h2 className="text-2xl font-black mt-0.5">
                  PROPOSTA TÉCNICA E COMERCIAL {isHybrid ? 'HÍBRIDA' : 'FOTOVOLTAICA'}
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

          <div className="mt-auto pt-12 text-right text-xs text-slate-500">Proposta {proposal.code} · Página 1</div>
          </div>
          <SolarProposalDocument proposal={{ ...proposal, companyInfo: proposal.companyInfo || accountCompany }} pdfSettings={pdfSettings} theme={theme} />

        </div>
      </div>
    </div>
  );
};
