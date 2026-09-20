export interface LeadNote {
  id: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  images?: string[]; // Data URLs ou URLs de imagens anexadas
  proposalId?: string; // ID da proposta vinculada (ex: prop-1)
  proposalCode?: string; // Código da proposta (ex: PROP-2026-084)
  proposalTitle?: string; // Título/resumo da proposta (ex: 28.08 kWp • On-Grid)
  proposalValue?: number; // Valor financeiro total da proposta
  proposalStatus?: string; // Status da proposta (ex: Aprovada, Em negociação)
}

/**
 * Converte o campo de notas bruto (que pode ser string legado ou JSON) em uma lista estruturada de notas.
 */
export function parseLeadNotes(rawNotes?: string | null): LeadNote[] {
  if (!rawNotes || !rawNotes.trim()) {
    return [];
  }

  const trimmed = rawNotes.trim();

  // Tenta analisar como JSON de anotações múltiplas
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item && (typeof item.text === 'string' || typeof item.content === 'string' || (Array.isArray(item.images) && item.images.length > 0)))
          .map((item, index) => ({
            id: String(item.id || `note-${index}-${Date.now()}`),
            text: typeof item.text === 'string' ? item.text : (typeof item.content === 'string' ? item.content : ''),
            createdAt: String(item.createdAt || item.created_at || new Date().toISOString()),
            updatedAt: item.updatedAt || item.updated_at ? String(item.updatedAt || item.updated_at) : undefined,
            images: Array.isArray(item.images) ? item.images.filter((img: unknown): img is string => typeof img === 'string') : [],
            proposalId: item.proposalId ? String(item.proposalId) : undefined,
            proposalCode: item.proposalCode ? String(item.proposalCode) : undefined,
            proposalTitle: item.proposalTitle ? String(item.proposalTitle) : undefined,
            proposalValue: typeof item.proposalValue === 'number' ? item.proposalValue : (item.proposal_value ? Number(item.proposal_value) : undefined),
            proposalStatus: item.proposalStatus ? String(item.proposalStatus) : (item.proposal_status ? String(item.proposal_status) : undefined),
          }));
      }
    } catch {
      // Falha no parse de JSON, cai para o formato legado
    }
  }

  // Formato legado: texto simples único
  return [
    {
      id: 'legacy-note',
      text: trimmed,
      createdAt: new Date().toISOString(),
      images: [],
    },
  ];
}

/**
 * Serializa a lista de notas para armazenamento no banco de dados.
 */
export function serializeLeadNotes(notes: LeadNote[]): string {
  if (!notes || notes.length === 0) {
    return '';
  }
  return JSON.stringify(notes);
}

/**
 * Comprime uma imagem selecionada pelo usuário usando canvas para economizar armazenamento
 * e garantir carregamento rápido e confiável.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao carregar a imagem para processamento.'));
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
