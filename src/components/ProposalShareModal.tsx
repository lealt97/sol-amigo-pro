import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  Send,
  MessageCircle,
  ExternalLink,
  Download,
  QrCode as QrCodeIcon,
  Sparkles,
} from 'lucide-react';
import { ClientProposal, clientProposalToSolarProposal, updateProposalStatus } from '../services/proposals';
import { PdfSettingsConfig, SolarProposal, ThemeConfig } from '../types';
import { publishPublicProposal } from '../services/publicProposals';
import { formatCurrency } from '../utils/formatters';
import {
  shareProposalOnWhatsApp,
  createProposalCardImage,
  buildWhatsAppMessageText,
  copyCardImageToClipboard,
} from '../utils/whatsappShare';

interface ProposalShareModalProps {
  proposal: ClientProposal | null;
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  pdfSettings: PdfSettingsConfig;
  solarProposal?: SolarProposal | null;
  onShowToast: (msg: string) => void;
}

export const ProposalShareModal: React.FC<ProposalShareModalProps> = ({
  proposal,
  isOpen,
  onClose,
  theme,
  pdfSettings,
  solarProposal,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [cardDataUrl, setCardDataUrl] = useState<string>('');
  const [loadingQr, setLoadingQr] = useState(false);
  const [previewMode, setPreviewMode] = useState<'card' | 'qr'>('card');

  const [publicUrl, setPublicUrl] = useState('');
  const [publishError, setPublishError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const documentProposal = useMemo(() => solarProposal || (proposal ? clientProposalToSolarProposal(proposal) : null), [proposal, solarProposal]);
  const publication = useRef<{ proposal: SolarProposal; settings: PdfSettingsConfig; theme: ThemeConfig; attempt: number; promise: Promise<string> } | null>(null);

  useEffect(() => {
    setPublicUrl('');
    setQrDataUrl('');
    setCardDataUrl('');
    setCopied(false);
    setCopiedMessage(false);
    setCopiedQr(false);
    setPublishError('');
    if (!documentProposal || !isOpen) {
      publication.current = null;
      return;
    }
    let active = true;
    setLoadingQr(true);
    const previous = publication.current;
    if (!previous || previous.proposal !== documentProposal || previous.settings !== pdfSettings || previous.theme !== theme || previous.attempt !== attempt) {
      publication.current = { proposal: documentProposal, settings: pdfSettings, theme, attempt, promise: publishPublicProposal(documentProposal, pdfSettings, theme) };
    }
    publication.current!.promise.then(async link => {
      if (!active) return;
      const qr = await QRCode.toDataURL(link, { width: 500, margin: 2, color: { dark: '#0B1522', light: '#FFFFFF' }, errorCorrectionLevel: 'M' });
      let card = qr;
      if (documentProposal) {
        try {
          card = await createProposalCardImage(documentProposal, link, qr);
        } catch {
          card = qr;
        }
      }
      if (active) {
        setPublicUrl(link);
        setQrDataUrl(qr);
        setCardDataUrl(card);
      }
    }).catch(error => {
      if (active) setPublishError(error instanceof Error ? error.message : 'Não foi possível publicar a proposta.');
    }).finally(() => {
      if (active) setLoadingQr(false);
    });
    return () => { active = false; };
  }, [documentProposal, isOpen, pdfSettings, theme, attempt]);

  // Fechar com ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !proposal) return null;

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setPublishError('');
      setCopied(true);
      onShowToast('Link público copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setPublishError('Selecione e copie o link no campo abaixo.');
    }
  };


  const handleCopyMessage = async () => {
    if (!publicUrl) return;
    const msg = buildWhatsAppMessageText(proposal, publicUrl);
    try {
      await navigator.clipboard.writeText(msg);
      setCopiedMessage(true);
      onShowToast('Texto formatado copiado! Basta colar na legenda do WhatsApp.');
      setTimeout(() => setCopiedMessage(false), 3000);
    } catch {
      onShowToast('Não foi possível copiar o texto.');
    }
  };

  const handleCopyQrImage = async () => {
    const targetUrl = previewMode === 'card' ? (cardDataUrl || qrDataUrl) : qrDataUrl;
    if (!targetUrl) return;
    const ok = await copyCardImageToClipboard(targetUrl);
    if (ok) {
      setCopiedQr(true);
      onShowToast('Imagem copiada! No WhatsApp, aperte Ctrl+V para colar no balão da conversa.');
      setTimeout(() => setCopiedQr(false), 3000);
    } else {
      handleDownloadQr();
    }
  };

  const handleSendWhatsApp = async () => {
    if (!proposal) return;
    await shareProposalOnWhatsApp({
      proposal,
      solarProposal: documentProposal,
      publicUrl,
      qrDataUrl,
      pdfSettings,
      theme,
      onStatusChange: (newStatus) => {
        proposal.status = newStatus;
      },
      onShowToast,
    });
  };

  const handleOpenLink = () => {
    if (publicUrl) window.open(publicUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadQr = () => {
    const targetUrl = previewMode === 'card' ? (cardDataUrl || qrDataUrl) : qrDataUrl;
    if (!targetUrl) return;
    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = `proposta-solar-${proposal.code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast(`Imagem da proposta ${proposal.code} baixada com sucesso!`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-proposal-title"
    >
      <div
        className="w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: theme.primary,
          borderColor: theme.border,
          color: theme.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: theme.border }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <QrCodeIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 id="share-proposal-title" className="text-sm font-bold truncate">
                Compartilhar Proposta (Balão Único)
              </h2>
              <p className="text-xs opacity-60 font-mono truncate">
                {proposal.code} • {proposal.clientName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            style={{ borderColor: theme.border }}
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 overflow-y-auto space-y-4">
          {publishError && (
            <div role="alert" className="text-sm text-red-300">
              <p>{publishError}</p>
              {!publicUrl && (
                <button type="button" onClick={() => setAttempt((v) => v + 1)} className="mt-2 underline">
                  Tentar novamente
                </button>
              )}
            </div>
          )}

          {loadingQr && (
            <p role="status" className="text-xs text-center text-[var(--muted)]">
              Publicando proposta e gerando cartão executivo com QR Code...
            </p>
          )}

          {/* Alternador de Visualização da Imagem */}
          <div className="flex items-center justify-center gap-1.5 p-1 rounded-xl bg-black/25 border border-white/5 w-fit mx-auto text-xs">
            <button
              type="button"
              onClick={() => setPreviewMode('card')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                previewMode === 'card'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cartão Executivo + QR Code
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('qr')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                previewMode === 'qr'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Apenas QR Code
            </button>
          </div>

          {/* Prévia da Imagem do Cartão ou QR Code */}
          <div className="flex flex-col items-center text-center">
            <div className="relative p-2 rounded-2xl bg-white shadow-xl border border-slate-200 max-w-[280px]">
              {loadingQr ? (
                <div className="w-60 h-72 flex items-center justify-center bg-slate-100 rounded-xl">
                  <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                </div>
              ) : previewMode === 'card' && cardDataUrl ? (
                <img
                  src={cardDataUrl}
                  alt={`Cartão da proposta ${proposal.code}`}
                  className="w-60 max-h-72 rounded-lg block object-contain"
                />
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code da proposta ${proposal.code}`}
                  className="w-52 h-52 rounded-lg block object-contain mx-auto"
                />
              ) : null}
            </div>

            <p className="mt-2.5 text-xs font-semibold text-slate-300">
              {previewMode === 'card'
                ? 'Imagem executiva completa enviada junto com o link'
                : 'QR Code de alta resolução para escaneamento direto'}
            </p>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleCopyQrImage}
                disabled={!qrDataUrl}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
                title="Copiar imagem para colar no WhatsApp"
              >
                {copiedQr ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedQr ? 'Imagem Copiada!' : 'Copiar Imagem'}</span>
              </button>

              <span className="text-xs opacity-30">•</span>

              <button
                type="button"
                onClick={handleDownloadQr}
                disabled={!qrDataUrl}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer disabled:opacity-50"
                title="Baixar imagem em PNG"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Imagem</span>
              </button>
            </div>
          </div>

          {/* Campo Copia e Cola do Link Público */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold block opacity-90">
                Link público da proposta
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                disabled={!publicUrl}
                className="text-[11px] font-semibold text-sky-400 hover:underline cursor-pointer flex items-center gap-1"
                title="Copiar legenda formatada completa para WhatsApp"
              >
                {copiedMessage ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedMessage ? 'Legenda Copiada!' : 'Copiar Legenda WhatsApp'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                aria-label="Link público da proposta"
                placeholder={loadingQr ? "Publicando proposta..." : "Link disponível após a publicação"}
                onFocus={(e) => e.target.select()}
                className="flex-1 px-3 py-2 rounded-xl border text-xs font-mono bg-black/25 text-slate-200 outline-none truncate"
                style={{ borderColor: theme.border }}
              />

              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!publicUrl}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0 active:scale-95 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border'
                }`}
                style={!copied ? { borderColor: theme.border } : undefined}
                title="Copiar link da proposta"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>
          </div>

          {/* Destaque: Envio em Balão Único no WhatsApp */}
          <div
            className="p-3.5 rounded-xl border flex items-start gap-3 text-xs"
            style={{
              backgroundColor: 'color-mix(in srgb, #10b981 12%, transparent)',
              borderColor: 'color-mix(in srgb, #10b981 35%, transparent)',
              color: '#34d399',
            }}
          >
            <MessageCircle className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-emerald-300">
                Envio em Balão Único no WhatsApp:
              </p>
              <p className="text-[11px] leading-relaxed text-slate-300">
                A imagem executiva da proposta (com o QR Code) e o texto profissional com o link são enviados juntos como <strong>imagem + legenda</strong>, formando <strong>um único balão de mensagem</strong> no WhatsApp.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé com Botões de Ação (Enviar e Abrir) */}
        <div
          className="p-4 border-t flex flex-col sm:flex-row items-center justify-end gap-2 shrink-0 bg-black/10"
          style={{ borderColor: theme.border }}
        >
          {proposal.status !== 'Aprovada' && (
            <button
              type="button"
              onClick={async () => {
                const wasRejected =
                  Boolean((proposal as any).wasRejected) ||
                  proposal.status?.toLowerCase() === 'recusada' ||
                  (proposal as any).documentSnapshot?.status?.toLowerCase() === 'recusada';
                const targetStatus = wasRejected ? 'Em negociação' : 'Enviada';
                try {
                  await updateProposalStatus(proposal.id, targetStatus);
                  proposal.status = targetStatus;
                  if (wasRejected) {
                    (proposal as any).wasRejected = true;
                  }
                  onShowToast(
                    targetStatus === 'Em negociação'
                      ? `Proposta ${proposal.code} atualizada para "Em negociação"!`
                      : `Proposta ${proposal.code} marcada como Enviada!`
                  );
                } catch {}
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold hover:bg-sky-500/10 hover:border-sky-400 hover:text-sky-400 transition-all cursor-pointer"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {proposal.status?.toLowerCase() === 'recusada' || Boolean((proposal as any).wasRejected)
                  ? 'Reenviar em Negociação'
                  : 'Marcar como Enviada'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenLink}
            disabled={!publicUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-bold hover:bg-white/5 transition-all cursor-pointer"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>Abrir Proposta</span>
          </button>

          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={!publicUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all cursor-pointer active:scale-95"
            title="Enviar imagem e link em balão único no WhatsApp"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar no WhatsApp (Balão Único)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
