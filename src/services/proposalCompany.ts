import { supabase } from '../lib/supabase';
import type { ProposalCompanyInfo } from '../types';

export function companyInfoFromUser(user: { email?: string; user_metadata?: Record<string, unknown> }): ProposalCompanyInfo {
  const metadata = user.user_metadata ?? {};
  const text = (key: string) => typeof metadata[key] === 'string' ? String(metadata[key]).trim() : '';
  return {
    name: text('company'), representative: text('full_name'), document: text('cnpj'),
    email: user.email || '', phone: text('phone'), description: text('company_description'),
  };
}

export async function fetchProposalCompany(): Promise<ProposalCompanyInfo | undefined> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return undefined;
  return companyInfoFromUser(data.user);
}
