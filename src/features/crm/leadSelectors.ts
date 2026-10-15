import type { Lead } from '../../types';
export const isLeadConverted = (lead?: Lead | Partial<Lead> | null): boolean => {
  if (!lead) return false;
  return Boolean(lead.clientId || (lead.status as string) === 'Cliente' || lead.status === 'ganho');
};
