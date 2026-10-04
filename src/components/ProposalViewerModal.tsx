import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Copy, Mail, MessageCircle } from "lucide-react";
import type { SolarProposal, PdfSettingsConfig, ThemeConfig } from "../types";
import { ProposalEditorialDocument } from "./ProposalEditorialDocument";

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
  const [printing, setPrinting] = useState(false);
  if (!proposal) return null;
  const proposalUrl = proposal.publicToken
    ? `${window.location.origin}${window.location.pathname}?proposta=${proposal.publicToken}`
    : "";
  const shareText = `Olá, ${proposal.clientName}! Segue a proposta ${proposal.code}: ${proposalUrl}`;
  const print = async () => {
    setPrinting(true);
    try {
      await document.fonts.ready;
      // Wait for the selected cover and all uploaded images before opening print.
      const coverReady = await new Promise<boolean>((resolve) => {
        const start = Date.now();
        const check = () => {
          if (document.querySelector(".editorial-cover-art svg")) resolve(true);
          else if (Date.now() - start > 10000) resolve(false);
          else setTimeout(check, 100);
        };
        check();
      });
      if (!coverReady) {
        onShowToast(
          "A capa ainda não carregou. Tente novamente antes de gerar o PDF.",
        );
        return;
      }
      await Promise.all(
        Array.from(
          document.querySelectorAll<HTMLImageElement>(".editorial-modal img"),
        ).map((img) => img.decode()),
      );
      window.print();
    } catch {
      onShowToast(
        "Não foi possível carregar uma imagem da proposta. Confira as imagens antes de imprimir.",
      );
    } finally {
      setPrinting(false);
    }
  };
  return createPortal(
    <div
      className="editorial-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Proposta ${proposal.code}`}
    >
      <div className="editorial-modal-shell">
        <div className="editorial-modal-toolbar">
          <div>
            <strong>{proposal.code}</strong>
            <p className="text-xs opacity-70">
              {proposal.clientName} • Proposta completa
            </p>
          </div>
          <div className="flex items-center gap-2">
            {proposalUrl && (
              <>
                <button
                  aria-label="Copiar link da proposta"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(proposalUrl)
                      .then(() => onShowToast("Link da proposta copiado."));
                  }}
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  aria-label="Compartilhar no WhatsApp"
                  onClick={() =>
                    window.open(
                      `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button
                  aria-label="Compartilhar por e-mail"
                  onClick={() => {
                    window.location.href = `mailto:${proposal.clientEmail || ""}?subject=${encodeURIComponent(`Proposta ${proposal.code}`)}&body=${encodeURIComponent(shareText)}`;
                  }}
                >
                  <Mail className="h-4 w-4" />
                </button>
              </>
            )}
            <button onClick={() => void print()} disabled={printing}>
              <Printer className="mr-2 inline h-4 w-4" />
              {printing ? "Preparando…" : "Imprimir / Salvar PDF"}
            </button>
            <button onClick={onClose} aria-label="Fechar proposta">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <ProposalEditorialDocument
          proposal={proposal}
          settings={pdfSettings}
          theme={theme}
        />
      </div>
    </div>,
    document.body,
  );
};
