export interface PublicProposalResponse {
  status: 'Aprovada' | 'Recusada';
  name?: string;
  document?: string;
  phone?: string;
  notes?: string;
  reason?: string;
  agreed?: boolean;
  respondedAt: string;
}

export function validatePublicProposalResponse(input: unknown, respondedAt: string): PublicProposalResponse {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Resposta inválida.');
  const body = input as Record<string, unknown>;
  const text = (key: string, max: number) => {
    if (body[key] === undefined) return '';
    if (typeof body[key] !== 'string' || body[key].length > max) throw new Error(`Campo ${key} inválido ou muito longo.`);
    return body[key].trim();
  };
  const notes = text('notes', 2000);
  if (body.status === 'Aprovada') {
    const name = text('name', 160);
    if (name.length < 2 || body.agreed !== true) throw new Error('Informe seu nome e confirme que aceita as condições da proposta.');
    return { status: 'Aprovada', name, document: text('document', 32), phone: text('phone', 32), notes, agreed: true, respondedAt };
  }
  if (body.status === 'Recusada') {
    const reason = text('reason', 200);
    if (reason.length < 2) throw new Error('Informe o motivo da recusa.');
    return { status: 'Recusada', reason, notes, respondedAt };
  }
  throw new Error('Resposta inválida.');
}
