import React, { useEffect, useState } from 'react';
import {
  Printer,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Share2,
  Sun,
  AlertCircle,
  ThumbsDown,
  X,
  FileCheck,
  Phone,
  User,
  CreditCard,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { fetchPublicProposal, respondToPublicProposal } from '../services/publicProposals';
import { DEFAULT_PDF_SETTINGS, DEFAULT_THEME } from '../utils/themeEngine';
import { formatCurrency } from '../utils/formatters';
import { ProposalCoverPage } from './ProposalCoverPage';
import { SolarProposalDocument } from './SolarProposalDocument';
import { SolarProposal, PdfSettingsConfig, ThemeConfig } from '../types';

interface PublicProposalViewProps {
  token: string;
}

const REFUSAL_REASONS = [
  'Preço / Condições de pagamento',
  'Decidi adiar o investimento',
  'Fechei com outro fornecedor',
  'Potência ou equipamentos não atenderam',
  'Falta de financiamento bancário',
  'Outro motivo',
];

export const PublicProposalView: React.FC<PublicProposalViewProps> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<SolarProposal | null>(null);
  const [pdfSettings, setPdfSettings] = useState<PdfSettingsConfig>(DEFAULT_PDF_SETTINGS);
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [coverReady, setCoverReady] = useState(false);
  const [status, setStatus] = useState<string>('Pendente');
  const [copied, setCopied] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  // Modais de Aceite e Recusa
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isRefuseModalOpen, setIsRefuseModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Campos do formulário de aceite
  const [acceptName, setAcceptName] = useState('');
  const [acceptDoc, setAcceptDoc] = useState('');
  const [acceptPhone, setAcceptPhone] = useState('');
  const [acceptNotes, setAcceptNotes] = useState('');
  const [acceptAgreed, setAcceptAgreed] = useState(false);

  // Campos do formulário de recusa
  const [refusalReason, setRefusalReason] = useState(REFUSAL_REASONS[0]);
  const [refusalNotes, setRefusalNotes] = useState('');

  // Mensagem temporária pós-ação
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'refused';
    text: string;
  } | null>(null);

  useEffect(() => {
    const referrer = document.createElement('meta');
    referrer.name = 'referrer'; referrer.content = 'no-referrer';
    const robots = document.createElement('meta');
    robots.name = 'robots'; robots.content = 'noindex, nofollow';
    document.head.append(referrer, robots);
    return () => { referrer.remove(); robots.remove(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    setProposal(null);
    setCoverReady(false);
    setFeedbackMessage(null);
    fetchPublicProposal(token, controller.signal).then(document => {
      if (controller.signal.aborted) return;
      setProposal(document.proposal);
      setPdfSettings(document.pdfSettings);
      setTheme(document.theme);
      setStatus(document.response?.status || document.proposal.status || 'Pendente');
      setAcceptName(document.proposal.clientName || '');
      setAcceptDoc(document.proposal.clientDocument || '');
      setAcceptPhone(document.proposal.clientPhone || '');
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(error.message || 'Não foi possível carregar a proposta.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [token]);

  const handlePrint = () => {
    if (coverReady) window.print();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setActionError('Copie o endereço da proposta na barra do navegador.');
    }
  };

  const handleWhatsApp = () => {
    if (!proposal) return;
    const phone = proposal.companyInfo?.phone?.replace(/\D/g, '') || '';
    const message = encodeURIComponent(
      `Olá! Estou visualizando a proposta comercial (${proposal.code}) de energia solar para ${proposal.clientName} e gostaria de falar com vocês.`
    );
    const url = phone ? `https://wa.me/55${phone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  const handleConfirmAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposal || !acceptAgreed || submitting) return;
    setSubmitting(true);
    setActionError('');
    try {
      const response = await respondToPublicProposal(token, {
        status: 'Aprovada', agreed: acceptAgreed, name: acceptName.trim() || proposal.clientName,
        document: acceptDoc.trim(), phone: acceptPhone.trim(), notes: acceptNotes.trim(),
      });
      setStatus(response.status);
      setIsAcceptModalOpen(false);
      setFeedbackMessage({ type: 'success', text: 'Sua aprovação foi registrada e ficará disponível para a integradora.' });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível registrar sua aprovação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmRefuse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposal || submitting) return;
    setSubmitting(true);
    setActionError('');
    try {
      const response = await respondToPublicProposal(token, { status: 'Recusada', reason: refusalReason, notes: refusalNotes.trim() });
      setStatus(response.status);
      setIsRefuseModalOpen(false);
      setFeedbackMessage({ type: 'refused', text: 'Agradecemos pelo retorno. Sua resposta foi registrada para a integradora.' });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível registrar sua resposta. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1522] text-white">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-3 border-amber-400 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-300">Carregando proposta comercial...</p>
          <p className="text-xs font-mono text-slate-400">Proposta comercial FV</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1522] text-white p-4">
        <div className="max-w-md w-full bg-[#132030] border border-slate-700/60 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold">Proposta não encontrada</h2>
          <p role="alert" className="text-xs text-slate-300 leading-relaxed">{loadError || 'Não foi possível carregar a proposta. Solicite um novo link à integradora.'}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const companyName = proposal.companyInfo?.name || 'Integradora solar';
  const isApproved = status === 'Aprovada';
  const isRefused = status === 'Recusada';

  return (
    <div className="min-h-screen bg-[#08101A] text-slate-100 flex flex-col font-sans antialiased pb-24 md:pb-0">
      {/* Barra Superior Fixa do Cliente (Oculta na Impressão) */}
      <header className="sticky top-0 z-40 bg-[#0E1B2C]/95 backdrop-blur-md border-b border-slate-800 shadow-md px-3 sm:px-6 py-2.5 print:hidden">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Identificação da Empresa e Proposta */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sun className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white truncate">{companyName}</span>
                {isApproved && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Aprovada
                  </span>
                )}
                {isRefused && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                    <XCircle className="w-3 h-3" /> Recusada
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate">
                Proposta {proposal.code} • {proposal.clientName}
              </div>
            </div>
          </div>

          {/* Botões de Ação para o Cliente no Topo */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleCopyLink}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 font-semibold transition-colors cursor-pointer"
              title="Copiar link da proposta"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copied ? 'Copiado!' : 'Compartilhar'}</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              title="Tirar dúvidas com o consultor solar via WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Falar no</span> WhatsApp
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!coverReady}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              title="Imprimir ou salvar PDF da proposta"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </button>

            {/* Botão de Recusa */}
            {!isApproved && !isRefused && (
              <button
                type="button"
                onClick={() => { setActionError(''); setIsRefuseModalOpen(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 text-xs font-bold transition-all cursor-pointer active:scale-95"
                title="Recusar proposta comercial"
              >
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span>Recusar</span>
              </button>
            )}

            {/* Botão de Aceite */}
            {!isApproved && !isRefused ? (
              <button
                type="button"
                onClick={() => { setActionError(''); setIsAcceptModalOpen(true); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all shadow-md cursor-pointer active:scale-95 bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                title="Aprovar e aceitar esta proposta comercial"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Aceitar Proposta</span>
              </button>
            ) : isApproved ? (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Proposta Aprovada</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span>Proposta Recusada</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Banner de Feedback (Sucesso ou Recusa) */}
      {feedbackMessage && (
        <div
          className={`px-4 py-3 text-center text-xs font-bold flex items-center justify-center gap-2 print:hidden animate-in fade-in slide-in-from-top-2 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 text-slate-200 border-b border-slate-700'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <Sparkles className="w-4 h-4 text-amber-300" />
          ) : (
            <ThumbsDown className="w-4 h-4 text-red-400" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Corpo da Proposta: Capa e Folhas A4 */}
      <div role="main" className="flex-1 py-4 sm:py-8 px-2 sm:px-4 flex justify-center print:p-0 print:m-0 print:bg-white">
        <div
          id="printable-solar-proposal"
          className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-700/40 overflow-hidden print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full"
          style={{ fontFamily: `${pdfSettings.font}, sans-serif` }}
        >
          {/* Capa personalizada do modelo selecionado */}
          <ProposalCoverPage
            proposal={proposal}
            settings={pdfSettings}
            onReady={setCoverReady}
          />

          {/* Folhas da proposta comercial (geração, economia, equipamentos, retorno) */}
          <SolarProposalDocument
            proposal={proposal}
            pdfSettings={pdfSettings}
            theme={theme}
          />
        </div>
      </div>

      {/* Barra Flutuante Inferior para Ações Rápidas (Aprovar / Recusar) */}
      {!isApproved && !isRefused && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-[#0E1B2C]/95 backdrop-blur-lg border-t border-slate-800 p-3 shadow-2xl print:hidden flex items-center justify-between gap-3 max-w-4xl mx-auto md:rounded-t-2xl">
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 truncate">
              Investimento total da proposta:
            </div>
            <div className="text-sm font-black text-white font-mono">
              {formatCurrency(proposal.totalValue)} • <span className="text-amber-400">{proposal.systemPowerKWp} kWp</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => { setActionError(''); setIsRefuseModalOpen(true); }}
              className="px-3.5 py-2 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Recusar</span>
            </button>

            <button
              type="button"
              onClick={() => { setActionError(''); setIsAcceptModalOpen(true); }}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aceitar Proposta</span>
            </button>
          </div>
        </div>
      )}

      {/* Rodapé do Visualizador Público (Oculto na impressão) */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-800/80 bg-[#070D16] print:hidden">
        <p>Proposta comercial emitida por <strong className="text-slate-300">{companyName}</strong>.</p>
        <p className="mt-1 text-[11px] text-slate-400">Validade da proposta sujeita às condições técnicas e comerciais especificadas.</p>
      </footer>

      {/* Modal de Aceite / Aprovação da Proposta */}
      {isAcceptModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setIsAcceptModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#111C2E] border border-slate-700 shadow-2xl text-white overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/80 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Aceitar Proposta Comercial</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {proposal.code} • {formatCurrency(proposal.totalValue)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setIsAcceptModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleConfirmAccept} className="p-5 space-y-4">
              {actionError && <p role="alert" className="text-sm text-red-300">{actionError}</p>}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5">
                <FileCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  Ao confirmar o aceite, sua decisão será registrada de imediato no sistema da integradora, atualizando o status da proposta para <strong>Aprovada</strong>.
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Nome completo do titular / aprovador *
                </label>
                <input
                  type="text"
                  required
                  value={acceptName}
                  onChange={(e) => setAcceptName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    CPF ou CNPJ (opcional)
                  </label>
                  <input
                    type="text"
                    value={acceptDoc}
                    onChange={(e) => setAcceptDoc(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Telefone / WhatsApp (opcional)
                  </label>
                  <input
                    type="text"
                    value={acceptPhone}
                    onChange={(e) => setAcceptPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  Observações ou melhor horário para contato (opcional)
                </label>
                <textarea
                  rows={2}
                  value={acceptNotes}
                  onChange={(e) => setAcceptNotes(e.target.value)}
                  placeholder="Ex: Entrar em contato após às 14h; tirar dúvidas sobre forma de pagamento..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/40 border border-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptAgreed}
                  onChange={(e) => setAcceptAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-[11px] text-slate-300 leading-relaxed">
                  Declaro que revisei a proposta comercial, estou ciente da potência instalada ({proposal.systemPowerKWp} kWp), equipamentos propostos e concordo com o valor de {formatCurrency(proposal.totalValue)}.
                </span>
              </label>

              {/* Botões do Modal */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsAcceptModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submitting || !acceptAgreed || !acceptName.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-black shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? (
                    <span>Registrando aceite...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar e Aprovar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Recusa da Proposta */}
      {isRefuseModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setIsRefuseModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#111C2E] border border-slate-700 shadow-2xl text-white overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/80 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Recusar Proposta Comercial</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {proposal.code} • {proposal.clientName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setIsRefuseModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleConfirmRefuse} className="p-5 space-y-4">
              {actionError && <p role="alert" className="text-sm text-red-300">{actionError}</p>}
              <p className="text-xs text-slate-300 leading-relaxed">
                Sentimos muito que a proposta não tenha atendido perfeitamente às suas necessidades. Selecione o motivo principal da recusa para que possamos aprimorar nossas condições:
              </p>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Motivo da recusa *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {REFUSAL_REASONS.map((r) => (
                    <label
                      key={r}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                        refusalReason === r
                          ? 'border-red-500 bg-red-500/15 text-white font-bold'
                          : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="refusalReason"
                        value={r}
                        checked={refusalReason === r}
                        onChange={() => setRefusalReason(r)}
                        className="text-red-500 focus:ring-0"
                      />
                      <span className="truncate">{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  Comentários adicionais (opcional)
                </label>
                <textarea
                  rows={3}
                  value={refusalNotes}
                  onChange={(e) => setRefusalNotes(e.target.value)}
                  placeholder="Conte-nos o que poderia ser diferente (ex: valor da parcela, outra marca de inversor, etc.)..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white outline-none focus:border-red-500 resize-none"
                />
              </div>

              {/* Botões do Modal */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsRefuseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-black shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? (
                    <span>Registrando...</span>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Confirmar Recusa</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
