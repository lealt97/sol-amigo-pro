import React, { useEffect, useState } from 'react';
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
import { ClientProposal, getPublicProposalUrl } from '../services/proposals';
import { ThemeConfig } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ProposalShareModalProps {
  proposal: ClientProposal | null;
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  onShowToast: (msg: string) => void;
}

export const ProposalShareModal: React.FC<ProposalShareModalProps> = ({
  proposal,
  isOpen,
  onClose,
  theme,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loadingQr, setLoadingQr] = useState(false);

  const publicUrl = proposal ? getPublicProposalUrl(proposal.code) : '';

  useEffect(() => {
    if (!proposal || !isOpen || !publicUrl) return;

    let active = true;
    setLoadingQr(true);

    QRCode.toDataURL(publicUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0B1522',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Erro ao gerar QR Code:', err);
      })
      .finally(() => {
        if (active) setLoadingQr(false);
      });

    return () => {
      active = false;
    };
  }, [proposal, isOpen, publicUrl]);

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

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(publicUrl).then(() => {
        setCopied(true);
        onShowToast('Link público copiado para a área de transferência!');
        setTimeout(() => setCopied(false), 3000);
      });
    }
  };

  const handleSendWhatsApp = () => {
    const text = encodeURIComponent(
      `Olá ${proposal.clientName}! Segue o link público para você visualizar a sua proposta de energia solar (${proposal.code}):\n\n` +
        `🔗 ${publicUrl}\n\n` +
        `• Potência: ${proposal.systemPowerKWp || 0} kWp (${proposal.systemType || 'On-Grid'})\n` +
        `• Investimento: ${formatCurrency(proposal.totalValue || 0)}\n` +
        (proposal.estimatedMonthlySavings
          ? `• Economia estimada: ${formatCurrency(proposal.estimatedMonthlySavings)}/mês\n\n`
          : '\n') +
        `Abra no celular ou computador para ver os gráficos de geração e todos os equipamentos!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleOpenLink = () => {
    window.open(publicUrl, '_blank');
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qrcode-${proposal.code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast(`QR Code de ${proposal.code} baixado com sucesso!`);
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
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
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
                Compartilhar Proposta
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
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Cartão do QR Code Central */}
          <div className="flex flex-col items-center text-center">
            <div className="relative p-3 rounded-2xl bg-white shadow-xl border border-slate-200">
              {loadingQr ? (
                <div className="w-44 h-44 flex items-center justify-center bg-slate-100 rounded-xl">
                  <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code da proposta ${proposal.code}`}
                  className="w-44 h-44 rounded-lg block object-contain"
                />
              ) : null}
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-300">
              Aponte a câmera do celular para abrir
            </p>
            <p className="mt-0.5 text-[11px] opacity-60 max-w-xs">
              O cliente visualiza a proposta completa no celular sem precisar de login ou cadastro.
            </p>

            <button
              type="button"
              onClick={handleDownloadQr}
              className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar imagem do QR Code</span>
            </button>
          </div>

          {/* Campo Copia e Cola do Link Público */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold block opacity-90">
              Link público da proposta
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                onFocus={(e) => e.target.select()}
                className="flex-1 px-3 py-2 rounded-xl border text-xs font-mono bg-black/25 text-slate-200 outline-none truncate"
                style={{ borderColor: theme.border }}
              />

              <button
                type="button"
                onClick={handleCopyLink}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0 active:scale-95 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border'
                }`}
                style={!copied ? { borderColor: theme.border } : undefined}
                title="Copiar link da proposta"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <p className="text-[10px] opacity-50">
              Clique em copiar para colar em e-mails, mensagens ou redes sociais.
            </p>
          </div>

          {/* Resumo da Proposta */}
          <div
            className="p-3 rounded-xl border flex items-center justify-between text-xs"
            style={{ borderColor: theme.border, backgroundColor: theme.background }}
          >
            <div>
              <div className="text-[10px] opacity-50 uppercase tracking-wider font-bold">Potência</div>
              <div className="font-bold text-amber-400 font-mono">{proposal.systemPowerKWp} kWp</div>
            </div>
            <div>
              <div className="text-[10px] opacity-50 uppercase tracking-wider font-bold">Economia</div>
              <div className="font-bold text-emerald-400 font-mono">
                {proposal.estimatedMonthlySavings ? `${formatCurrency(proposal.estimatedMonthlySavings)}/mês` : '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] opacity-50 uppercase tracking-wider font-bold">Investimento</div>
              <div className="font-bold text-white font-mono">{formatCurrency(proposal.totalValue)}</div>
            </div>
          </div>
        </div>

        {/* Rodapé com Botões de Ação (Enviar e Abrir) */}
        <div
          className="p-4 border-t flex flex-col sm:flex-row items-center justify-end gap-2 shrink-0 bg-black/10"
          style={{ borderColor: theme.border }}
        >
          <button
            type="button"
            onClick={handleOpenLink}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-bold hover:bg-white/5 transition-all cursor-pointer"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>Abrir Proposta</span>
          </button>

          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all cursor-pointer active:scale-95"
            title="Enviar resumo e link no WhatsApp do cliente"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar no WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
