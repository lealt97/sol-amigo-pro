import { supabase, SUPABASE_URL } from '../lib/supabase';
import type { PdfSettingsConfig, SolarProposal, ThemeConfig } from '../types';
import { buildPublicProposalUrl, createPublicProposalDocument, createPublicProposalToken, hashPublicProposalToken, PUBLIC_PROPOSAL_TOKEN, type PublicProposalDocument } from '../utils/publicProposal';

export async function publishPublicProposal(proposal: SolarProposal, pdfSettings: PdfSettingsConfig, theme: ThemeConfig): Promise<string> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Entre na sua conta para gerar o link público.');
  const token = createPublicProposalToken();
  const url = buildPublicProposalUrl(token, import.meta.env.VITE_PUBLIC_APP_URL || undefined);
  const { error } = await supabase.from('public_proposal_documents').insert({
    user_id: auth.user.id,
    source_id: proposal.id,
    code: proposal.code,
    token_hash: await hashPublicProposalToken(token),
    document: createPublicProposalDocument(proposal, pdfSettings, theme),
  });
  if (error) throw new Error('Não foi possível publicar a proposta. Tente novamente.');
  return url;
}

export async function revokePublicProposalLinks(sourceId: string): Promise<void> {
  const { error } = await supabase.from('public_proposal_documents').delete().eq('source_id', sourceId);
  if (error) throw new Error('Não foi possível desativar os links desta proposta.');
}

export async function fetchPublicProposal(token: string, signal?: AbortSignal): Promise<PublicProposalDocument> {
  if (!PUBLIC_PROPOSAL_TOKEN.test(token)) throw new Error('Este link antigo não contém um identificador público válido. Solicite à integradora um novo link da proposta.');
  const url = new URL(`${SUPABASE_URL}/functions/v1/public-proposal`);
  url.searchParams.set('token', token);
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const timeout = setTimeout(abort, 20000);
  let response: Response;
  let document: PublicProposalDocument | undefined;
  try {
    response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (response.ok) document = await response.json();
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Não foi possível carregar a proposta. Verifique sua conexão e tente novamente.');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
  if (response.status === 404 || response.status === 410) throw new Error('Esta proposta não está disponível. O link pode ter expirado ou sido desativado. Solicite um novo link à integradora.');
  if (!response.ok) throw new Error('Não foi possível carregar a proposta. Tente novamente.');
  if (!document) throw new Error('Os dados da proposta estão incompletos. Solicite um novo link à integradora.');
  if (!document?.proposal?.code || !document.pdfSettings || !document.theme) throw new Error('Os dados da proposta estão incompletos. Solicite um novo link à integradora.');
  return document;
}
