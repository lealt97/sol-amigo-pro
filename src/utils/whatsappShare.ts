import QRCode from 'qrcode';
import { ClientProposal, clientProposalToSolarProposal, updateProposalStatus } from '../services/proposals';
import { PdfSettingsConfig, SolarProposal, ThemeConfig } from '../types';
import { publishPublicProposal } from '../services/publicProposals';
import { formatCurrency } from './formatters';

export interface ShareProposalWhatsAppOptions {
  proposal: ClientProposal | SolarProposal;
  solarProposal?: SolarProposal | null;
  publicUrl?: string;
  qrDataUrl?: string;
  pdfSettings: PdfSettingsConfig;
  theme: ThemeConfig;
  onStatusChange?: (newStatus: 'Enviada' | 'Em negociação') => void;
  onShowToast: (msg: string) => void;
}

export interface ShareWhatsAppResult {
  success: boolean;
  publicUrl: string;
  qrDataUrl: string;
  cardDataUrl: string;
  copiedImage: boolean;
  sharedNative: boolean;
}

/**
 * Converte dataURL base64 para Blob PNG binário
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const byteChars = atob(parts[1]);
  const byteNumbers = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([byteNumbers], { type: 'image/png' });
}

/**
 * Monta a legenda formatada padrão WhatsApp (apenas um balão quando enviada junto com a imagem)
 */
export function buildWhatsAppMessageText(
  proposal: ClientProposal | SolarProposal,
  publicUrl: string
): string {
  const p = proposal;
  const power = p.systemPowerKWp ? `${p.systemPowerKWp.toFixed(2)} kWp` : '';
  const type = p.systemType || 'On-Grid';
  const val = p.totalValue ? formatCurrency(p.totalValue) : '';
  const savings = p.estimatedMonthlySavings
    ? `${formatCurrency(p.estimatedMonthlySavings)}/mês`
    : '';

  return (
    `*PROPOSTA COMERCIAL SOLAR* ☀️\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Olá, *${p.clientName}*!\n\n` +
    `Segue a sua proposta comercial personalizada de energia solar fotovoltaica (*${p.code}*).\n\n` +
    `🔗 *Acesse a proposta interativa completa pelo link:*\n` +
    `${publicUrl}\n\n` +
    `📊 *Resumo do Sistema:*\n` +
    (power ? `⚡ *Potência:* ${power} (${type})\n` : '') +
    (val ? `💰 *Investimento:* ${val}\n` : '') +
    (savings ? `🌱 *Economia Estimada:* ${savings}\n` : '') +
    `\n📲 _Você também pode apontar a câmera do seu celular para o QR Code da imagem acima para abrir a proposta instantaneamente sem precisar de aplicativo._\n\n` +
    `Estamos à disposição para esclarecer dúvidas e avançar com o seu projeto!`
  );
}

/**
 * Cria um Cartão Executivo da Proposta (Imagem de alta resolução contendo QR Code,
 * dados da usina e link da proposta) para envio visual em balão único no WhatsApp.
 */
export async function createProposalCardImage(
  proposal: ClientProposal | SolarProposal,
  publicUrl: string,
  qrDataUrl: string
): Promise<string> {
  if (typeof document === 'undefined') return qrDataUrl;

  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 980;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(qrDataUrl);

      // Fundo Gradiente Executivo Navy
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 980);
      bgGrad.addColorStop(0, '#0B1320');
      bgGrad.addColorStop(0.5, '#111C2E');
      bgGrad.addColorStop(1, '#15243B');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 800, 980);

      // Iluminação solar sutil de topo
      const glowGrad = ctx.createRadialGradient(400, 0, 10, 400, 0, 480);
      glowGrad.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
      glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, 800, 480);

      // Moldura elegante
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, 768, 948);

      // Badge de Topo: "PROPOSTA COMERCIAL SOLAR"
      ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(250, 42, 300, 36, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('☀️  PROPOSTA COMERCIAL SOLAR', 400, 65);

      // Nome do Cliente
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      const clientName = (proposal.clientName || 'Cliente').slice(0, 32);
      ctx.fillText(clientName, 400, 118);

      // Código da Proposta
      ctx.fillStyle = '#94A3B8';
      ctx.font = '500 14px monospace, system-ui';
      ctx.fillText(proposal.code, 400, 144);

      // Caixa Branca do QR Code Central
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(190, 175, 420, 440, 24);
      ctx.fill();
      ctx.restore();

      // Carregar QR Code e estampar
      const qrImg = new Image();
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 225, 200, 350, 350);

        // Texto instrucional sob o QR Code
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Aponte a câmera para abrir a proposta', 400, 574);

        ctx.fillStyle = '#64748B';
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.fillText('Acesso online imediato sem necessidade de aplicativo', 400, 596);

        // Métricas da Usina em 3 Cards
        const power = proposal.systemPowerKWp ? `${proposal.systemPowerKWp.toFixed(2)} kWp` : '—';
        const savings = proposal.estimatedMonthlySavings
          ? `R$ ${proposal.estimatedMonthlySavings.toLocaleString('pt-BR')}/mês`
          : '—';
        const total = proposal.totalValue
          ? `R$ ${proposal.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '—';

        const metrics = [
          { label: 'POTÊNCIA', val: power, color: '#38BDF8' },
          { label: 'ECONOMIA ESTIMADA', val: savings, color: '#34D399' },
          { label: 'INVESTIMENTO', val: total, color: '#FBBF24' },
        ];

        const boxWidth = 224;
        const boxHeight = 84;
        const startX = 64;
        const gap = 32;
        const boxY = 648;

        metrics.forEach((m, idx) => {
          const x = startX + idx * (boxWidth + gap);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(x, boxY, boxWidth, boxHeight, 16);
          ctx.fill();
          ctx.stroke();

          // Rótulo
          ctx.fillStyle = '#94A3B8';
          ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(m.label, x + boxWidth / 2, boxY + 30);

          // Valor
          ctx.fillStyle = m.color;
          ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
          ctx.fillText(m.val, x + boxWidth / 2, boxY + 60);
        });

        // Linha divisória
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(80, 770);
        ctx.lineTo(720, 770);
        ctx.stroke();

        // Rodapé: Link e Assinatura
        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        const displayUrl = publicUrl.replace(/^https?:\/\//, '');
        ctx.fillText(`🔗 ${displayUrl.length > 55 ? displayUrl.slice(0, 52) + '...' : displayUrl}`, 400, 810);

        ctx.fillStyle = '#64748B';
        ctx.font = '11px system-ui, -apple-system, sans-serif';
        ctx.fillText('Sol Amigo Pro • Plataforma de Engenharia e Vendas Solar', 400, 836);

        resolve(canvas.toDataURL('image/png'));
      };
      qrImg.onerror = () => {
        resolve(qrDataUrl);
      };
      qrImg.src = qrDataUrl;
    } catch {
      resolve(qrDataUrl);
    }
  });
}

/**
 * Compartilha proposta completa no WhatsApp em APENAS UM BALÃO DE MENSAGEM:
 * - A imagem personalizada com o QR Code vai como arquivo de mídia.
 * - O texto profissional estruturado com o link vai como LEGENDA (caption) da imagem.
 * - No WhatsApp, a imagem e a legenda formam um único balão executivo e organizado.
 */
export async function shareProposalOnWhatsApp(
  options: ShareProposalWhatsAppOptions
): Promise<ShareWhatsAppResult> {
  const { proposal, solarProposal, pdfSettings, theme, onStatusChange, onShowToast } = options;

  const docProposal: SolarProposal =
    solarProposal ||
    ('technicalOutput' in proposal
      ? (proposal as SolarProposal)
      : clientProposalToSolarProposal(proposal as ClientProposal));

  // 1. Obter ou gerar link público
  let publicUrl = options.publicUrl || '';
  if (!publicUrl) {
    try {
      publicUrl = await publishPublicProposal(docProposal, pdfSettings, theme);
    } catch {
      const appBase =
        import.meta.env.VITE_PUBLIC_APP_URL ||
        (typeof window !== 'undefined'
          ? window.location.origin + window.location.pathname
          : 'https://lealt97.github.io/sol-amigo-pro/');
      const cleanBase = appBase.endsWith('/') ? appBase : `${appBase}/`;
      publicUrl = `${cleanBase}?proposta=${proposal.code || proposal.id}`;
    }
  }

  // 2. Gerar QR Code base
  let qrDataUrl = options.qrDataUrl || '';
  if (!qrDataUrl && publicUrl) {
    try {
      qrDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 600,
        margin: 2,
        color: { dark: '#0B1522', light: '#FFFFFF' },
        errorCorrectionLevel: 'M',
      });
    } catch {
      // Ignora erro de QR
    }
  }

  // 3. Gerar Cartão Executivo da Proposta (Imagem completa do QR Code + Identidade)
  const cardDataUrl = await createProposalCardImage(proposal, publicUrl, qrDataUrl);

  // 4. Montar a legenda formatada do WhatsApp (balão único)
  const messageText = buildWhatsAppMessageText(proposal, publicUrl);

  // 5. Tratar imagem e compartilhamento em balão único
  let sharedNative = false;
  let copiedImage = false;

  if (cardDataUrl) {
    try {
      const blob = dataUrlToBlob(cardDataUrl);
      const fileName = `proposta-solar-${proposal.code || 'cliente'}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // No mobile / Web Share API:
      // Passar o arquivo + texto (como legenda) faz o WhatsApp enviar TUDO EM UM ÚNICO BALÃO!
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Proposta Solar - ${proposal.code}`,
            text: messageText,
            files: [file],
          });
          sharedNative = true;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') {
            return {
              success: true,
              publicUrl,
              qrDataUrl,
              cardDataUrl,
              copiedImage: false,
              sharedNative: false,
            };
          }
        }
      }

      // No Desktop / WhatsApp Web:
      // Copia a imagem para o clipboard para colar diretamente com Ctrl+V na conversa
      if (!sharedNative && typeof navigator !== 'undefined' && navigator.clipboard && (window as any).ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({
              'image/png': blob,
            }),
          ]);
          copiedImage = true;
        } catch (clipErr) {
          console.warn('Não foi possível copiar imagem para o clipboard:', clipErr);
        }
      }

      // Fallback de download se não conseguiu copiar nem compartilhar nativamente
      if (!sharedNative && !copiedImage) {
        const a = document.createElement('a');
        a.href = cardDataUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e) {
      console.warn('Erro ao processar imagem da proposta:', e);
    }
  }

  // 6. Abrir WhatsApp Web com a legenda preenchida
  if (!sharedNative) {
    const rawPhone =
      (proposal as any).clientPhone ||
      (proposal as any).phone ||
      (proposal as any).documentSnapshot?.clientPhone ||
      (proposal as any).draftData?.selectedTarget?.phone ||
      '';
    const cleanPhone = String(rawPhone).replace(/\D/g, '');
    let waUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
    if (cleanPhone.length >= 10) {
      const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
    }
    window.open(waUrl, '_blank');
  }

  // 7. Atualizar status da proposta para Enviada ou Em negociação (caso tenha sido recusada)
  if (proposal.status !== 'Aprovada') {
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
      onStatusChange?.(targetStatus);
    } catch {
      // Ignora erro de rede no status
    }
  }

  // 8. Mensagem de orientação para o usuário
  const isNegociacao = proposal.status === 'Em negociação';
  if (sharedNative) {
    onShowToast(
      isNegociacao
        ? `Proposta ${proposal.code} atualizada para "Em negociação" e compartilhada no WhatsApp!`
        : `Proposta ${proposal.code} compartilhada em balão único no WhatsApp!`
    );
  } else if (copiedImage) {
    onShowToast(
      isNegociacao
        ? `Proposta atualizada para "Em negociação"! Imagem copiada; no WhatsApp aperte Ctrl+V para enviar em balão único.`
        : `Imagem copiada e WhatsApp aberto! No WhatsApp, aperte Ctrl+V para enviar a imagem e o texto em um único balão.`
    );
  } else {
    onShowToast(
      isNegociacao
        ? `Proposta ${proposal.code} atualizada para "Em negociação" e WhatsApp aberto com o link!`
        : `WhatsApp aberto com o link! A imagem da proposta foi baixada para você anexar.`
    );
  }

  return {
    success: true,
    publicUrl,
    qrDataUrl,
    cardDataUrl,
    copiedImage,
    sharedNative,
  };
}

/**
 * Utilitário para copiar a imagem do Cartão/QR diretamente
 */
export async function copyCardImageToClipboard(cardDataUrl: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard || !(window as any).ClipboardItem) {
    return false;
  }
  try {
    const blob = dataUrlToBlob(cardDataUrl);
    await navigator.clipboard.write([
      new (window as any).ClipboardItem({
        'image/png': blob,
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}
