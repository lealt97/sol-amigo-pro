import { supabase, SUPABASE_URL } from '../lib/supabase';
import type { PdfSettingsConfig, SolarProposal, ThemeConfig } from '../types';
import { companyInfoFromUser } from './proposalCompany';
import { buildPublicProposalUrl, createPublicProposalDocument, createPublicProposalToken, hashPublicProposalToken, PUBLIC_PROPOSAL_TOKEN, type PublicProposalDocument, type PublicProposalResponse } from '../utils/publicProposal';

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
    document: createPublicProposalDocument({ ...proposal, companyInfo: proposal.companyInfo || companyInfoFromUser(auth.user) }, pdfSettings, theme),
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

export async function respondToPublicProposal(token: string, input: Omit<PublicProposalResponse, 'respondedAt'>): Promise<PublicProposalResponse> {
  if (!PUBLIC_PROPOSAL_TOKEN.test(token)) throw new Error('Solicite um novo link da proposta.');
  const url = new URL(`${SUPABASE_URL}/functions/v1/public-proposal`);
  url.searchParams.set('token', token);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: controller.signal });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Não foi possível registrar sua resposta.');
    return body.response;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('A conexão demorou demais. Tente novamente.');
    if (error instanceof TypeError) throw new Error('Não foi possível registrar sua resposta. Verifique sua conexão e tente novamente.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export interface PublicProposalSignal {
  id: string;
  source_id: string;
  code: string;
  client_name: string;
  total_value: string;
  viewed_at: string | null;
  responded_at: string | null;
  response: PublicProposalResponse | null;
}

export async function fetchPublicProposalSignals(): Promise<PublicProposalSignal[]> {
  const { data, error } = await supabase.from('public_proposal_documents')
    .select('id,source_id,code,viewed_at,responded_at,response,client_name:document->proposal->>clientName,total_value:document->proposal->>totalValue')
    .or('viewed_at.not.is.null,responded_at.not.is.null')
    .order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data || []) as unknown as PublicProposalSignal[];
}
